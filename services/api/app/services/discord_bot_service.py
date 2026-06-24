"""Discord bot — youth-facing SafeNight chat via Discord DMs.

Flow:
  Youth DMs the bot → discord.py gateway receives it → SafeNight AI replies → worker notified.
  !start  → welcome + link instructions
  !link   → links the Discord user ID to a youth profile
  text    → full SafeNight pipeline, reply sent back, worker alerted if risk high

Runs as an asyncio task inside FastAPI's lifespan — no separate process needed.
Synchronous DB/AI work is offloaded to a thread executor so the event loop stays free.
"""

import asyncio
import logging

import discord
from sqlalchemy import select

from app.config import get_settings
from app.database import SessionLocal
from app.models.audit_log import AuditLog
from app.models.conversation import Conversation, ConversationStatus, RiskLevel
from app.models.handoff_brief import HandoffBrief
from app.models.message import Message, SenderType
from app.models.signal import Signal
from app.models.worker_notification_settings import WorkerNotificationSettings
from app.models.youth_profile import YouthProfile
from app.services.ai_service import (
    analyse_risk,
    apply_risk_to_conversation,
    build_consent_confirmation_reply,
    build_handoff_brief_with_ai,
    detect_verbal_consent,
    generate_safenight_reply,
    get_conversation_messages,
    persist_signals,
)
from app.services.notifications import notify_worker
from app.services.safenight_service import assess_safe_night_message
from app.timeutil import naive_utcnow

logger = logging.getLogger("signalbridge.discord_bot")

_WELCOME = (
    "Hi, I'm SafeNight — SignalBridge's after-hours support companion.\n\n"
    "I'm here to listen, and I'll never share what you say without asking you first.\n\n"
    "To connect this chat to your SignalBridge account, send:\n"
    "!link YOUR_YOUTH_ID\n\n"
    "Once linked, just type normally — no commands needed."
)

_LINK_USAGE = "Send `!link` followed by your youth ID, e.g.:\n`!link youth_abc123`"
_NOT_LINKED = (
    "I don't recognise this account yet.\n\n"
    "Send `!link YOUR_YOUTH_ID` to connect, or ask your worker for your youth ID."
)
_LINKED_OK = "Linked! You can now chat with SafeNight right here. Just type whenever you're ready."
_ALREADY_LINKED = "This Discord account is already linked to a SignalBridge account."


# ---------------------------------------------------------------------------
# Synchronous DB helpers (called via asyncio.to_thread so they don't block)
# ---------------------------------------------------------------------------

def _get_active_discord_conversation(db, youth: YouthProfile) -> Conversation:
    conv = db.scalar(
        select(Conversation)
        .where(
            Conversation.youth_id == youth.id,
            Conversation.channel == "Discord",
            Conversation.status != ConversationStatus.closed,
        )
        .order_by(Conversation.last_message_at.desc().nullslast(), Conversation.created_at.desc())
    )
    if conv is None:
        conv = Conversation(
            youth_id=youth.id,
            channel="Discord",
            status=ConversationStatus.active,
            risk_level=RiskLevel.low,
            risk_score=0,
        )
        db.add(conv)
        db.flush()
    return conv


def _handle_link(discord_user_id: str, youth_id: str) -> str:
    """Link a Discord user ID to a youth profile. Returns the reply string."""
    db = SessionLocal()
    try:
        youth = db.get(YouthProfile, youth_id)
        if youth is None:
            return "Youth ID not found. Ask your worker for your exact ID."

        if youth.discord_user_id and youth.discord_user_id != discord_user_id:
            return _ALREADY_LINKED

        existing = db.scalar(select(YouthProfile).where(YouthProfile.discord_user_id == discord_user_id))
        if existing and existing.id != youth_id:
            return "This Discord account is already linked to another youth profile."

        youth.discord_user_id = discord_user_id
        db.commit()
        return _LINKED_OK
    finally:
        db.close()


def _handle_message(discord_user_id: str, content: str) -> str:
    """Run the full SafeNight pipeline. Returns the AI reply string."""
    db = SessionLocal()
    try:
        youth = db.scalar(select(YouthProfile).where(YouthProfile.discord_user_id == discord_user_id))
        if youth is None:
            return _NOT_LINKED

        conversation = _get_active_discord_conversation(db, youth)
        now = naive_utcnow()

        assessment = assess_safe_night_message(content)
        history = get_conversation_messages(db, conversation.id)

        youth_msg = Message(
            conversation_id=conversation.id,
            sender_type=SenderType.youth,
            content=content,
            created_at=now,
        )
        db.add(youth_msg)
        db.flush()

        # Verbal consent detection
        ai_triggered_consent = False
        risk_rank = {"low": 1, "medium": 2, "high": 3, "critical": 4}
        if not conversation.consent_to_handoff and risk_rank.get(conversation.risk_level.value, 1) >= 2:
            last_ai = next((m for m in reversed(history) if m.sender_type == SenderType.ai), None)
            if detect_verbal_consent(content, last_ai.content if last_ai else None):
                ai_triggered_consent = True

        if ai_triggered_consent:
            reply_content = build_consent_confirmation_reply()
            conversation.consent_to_handoff = True
            conversation.unresolved_handoff = True
            conversation.status = ConversationStatus.needs_review
            all_messages = list(history) + [youth_msg]
            full_assessment = analyse_risk([m.content for m in all_messages], all_messages)
            apply_risk_to_conversation(conversation, full_assessment)
            existing_handoff = db.scalar(
                select(HandoffBrief).where(HandoffBrief.conversation_id == conversation.id)
            )
            if existing_handoff is None:
                handoff, _ = build_handoff_brief_with_ai(db, conversation, all_messages, full_assessment)
                db.add(handoff)
        else:
            reply_content = generate_safenight_reply(
                content, history, assessment,
                consent_to_handoff=conversation.consent_to_handoff,
            )

        ai_reply = Message(
            conversation_id=conversation.id,
            sender_type=SenderType.ai,
            content=reply_content,
            safety_status=assessment.safety_status,
            created_at=now,
        )
        db.add(ai_reply)
        db.flush()

        # Deduplicate signals per conversation
        existing_types = {
            t for (t,) in db.execute(
                select(Signal.type).where(Signal.conversation_id == conversation.id)
            ).all()
        }
        for detected in assessment.signals:
            if detected.type in existing_types:
                continue
            db.add(Signal(
                conversation_id=conversation.id,
                youth_id=youth.id,
                type=detected.type,
                severity=detected.severity,
                reason=detected.reason,
                source="safenight_discord",
            ))
            existing_types.add(detected.type)

        conversation.last_message_at = now
        if not ai_triggered_consent:
            if risk_rank.get(assessment.risk_level.value, 1) >= risk_rank.get(conversation.risk_level.value, 1):
                conversation.risk_level = assessment.risk_level
            conversation.risk_score = max(conversation.risk_score, assessment.risk_score)
            if assessment.handoff_recommended:
                conversation.status = ConversationStatus.needs_review
                conversation.unresolved_handoff = True

        db.add(AuditLog(
            actor_user_id=youth.user_id,
            event_type="discord_message_received",
            entity_type="conversation",
            entity_id=conversation.id,
            details=f'{{"riskLevel":"{assessment.risk_level.value}","riskScore":{assessment.risk_score}}}',
        ))
        db.commit()

        # Notify assigned worker if risk is elevated
        if youth.assigned_worker_id and assessment.risk_level.value in ("high", "critical"):
            ns = db.query(WorkerNotificationSettings).filter_by(user_id=youth.assigned_worker_id).first()
            if ns:
                from app.models.user import User
                user = db.get(User, youth.user_id)
                youth_name = user.name if user else "A youth"
                notify_worker(
                    ns.telegram_chat_id,
                    ns.discord_webhook_url,
                    title=f"💬 Discord message — {assessment.risk_level.value} risk",
                    body=f"{youth_name} sent a message on Discord.\nRisk score: {assessment.risk_score}/100\n\"{content[:120]}{'…' if len(content) > 120 else ''}\"",
                    risk_level=assessment.risk_level.value,
                )

        return reply_content

    except Exception:
        logger.exception("Error processing Discord message from user %s", discord_user_id)
        return "I ran into a problem. Please try again in a moment, or contact your worker directly."
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Discord client
# ---------------------------------------------------------------------------

class SafeNightDiscordBot(discord.Client):
    async def on_ready(self) -> None:
        logger.info("Discord bot connected as %s (id=%s)", self.user, self.user.id)

    async def on_message(self, message: discord.Message) -> None:
        if message.author == self.user:
            return
        if not isinstance(message.channel, discord.DMChannel):
            return

        discord_user_id = str(message.author.id)
        text = (message.content or "").strip()
        if not text:
            return

        if text.lower().startswith("!start"):
            await message.channel.send(_WELCOME)
            return

        if text.lower().startswith("!link"):
            parts = text.split(maxsplit=1)
            if len(parts) < 2 or not parts[1].strip():
                await message.channel.send(_LINK_USAGE)
                return
            youth_id = parts[1].strip()
            reply = await asyncio.to_thread(_handle_link, discord_user_id, youth_id)
            await message.channel.send(reply)
            return

        # Regular message — run SafeNight pipeline in thread executor
        async with message.channel.typing():
            reply = await asyncio.to_thread(_handle_message, discord_user_id, text)
        await message.channel.send(reply)


def build_discord_bot() -> SafeNightDiscordBot | None:
    """Create and return the bot client, or None if no token is configured."""
    settings = get_settings()
    if not settings.discord_bot_token:
        logger.info("SIGNALBRIDGE_DISCORD_BOT_TOKEN not set — Discord bot disabled.")
        return None

    intents = discord.Intents.default()
    intents.message_content = True
    intents.dm_messages = True
    return SafeNightDiscordBot(intents=intents)

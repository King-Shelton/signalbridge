"""Discord bot for SafeNight DMs and server-thread conversations."""

import asyncio
import logging
import re

from sqlalchemy import select

try:
    import discord
    DISCORD_AVAILABLE = True
except ModuleNotFoundError:  # pragma: no cover - import-time deployment guard.
    DISCORD_AVAILABLE = False

    class _DiscordShim:
        class Client:
            pass

        class DMChannel:
            pass

        class Message:
            pass

        class Intents:
            @staticmethod
            def default():
                raise RuntimeError("discord.py is not installed")

    discord = _DiscordShim()

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
)
from app.services.notifications import notify_worker
from app.services.safenight_service import assess_safe_night_message
from app.timeutil import naive_utcnow

logger = logging.getLogger("signalbridge.discord_bot")

_WELCOME = (
    "Hi, I'm SafeNight, SignalBridge's after-hours support companion.\n\n"
    "I'm here to listen, and I'll never share what you say without asking you first.\n\n"
    "To connect this chat to your SignalBridge account, send:\n"
    "!link YOUR_YOUTH_ID\n\n"
    "Once linked, just type normally."
)

_LINK_USAGE = "Send `!link` followed by your youth ID, e.g.:\n`!link youth_mira`"
_PUBLIC_USAGE = "Start a SafeNight thread with `!safenight YOUR_YOUTH_ID`, e.g. `!safenight youth_mira`."
_NOT_LINKED = (
    "I don't recognise this account yet.\n\n"
    "Send `!link YOUR_YOUTH_ID` in DM, or start from the server with `!safenight YOUR_YOUTH_ID`."
)
_LINKED_OK = "Linked! You can now chat with SafeNight right here. Just type whenever you're ready."
_ALREADY_LINKED = "This Discord account is already linked to a SignalBridge account."
_THREAD_READY = "SafeNight is ready here. Keep typing in this thread."


def _get_active_discord_conversation(
    db,
    youth: YouthProfile,
    discord_thread_id: str | None = None,
) -> Conversation:
    if discord_thread_id:
        conv = db.scalar(
            select(Conversation)
            .where(
                Conversation.discord_thread_id == discord_thread_id,
                Conversation.youth_id == youth.id,
                Conversation.status != ConversationStatus.closed,
            )
            .order_by(Conversation.last_message_at.desc().nullslast(), Conversation.created_at.desc())
        )
        if conv is not None:
            return conv

    conv = db.scalar(
        select(Conversation)
        .where(
            Conversation.youth_id == youth.id,
            Conversation.channel == "Discord",
            Conversation.discord_thread_id.is_(None),
            Conversation.status != ConversationStatus.closed,
        )
        .order_by(Conversation.last_message_at.desc().nullslast(), Conversation.created_at.desc())
    )
    if conv is None:
        conv = Conversation(
            youth_id=youth.id,
            channel="Discord",
            discord_thread_id=discord_thread_id,
            status=ConversationStatus.active,
            risk_level=RiskLevel.low,
            risk_score=0,
        )
        db.add(conv)
        db.flush()
    elif discord_thread_id and conv.discord_thread_id is None:
        conv.discord_thread_id = discord_thread_id
    return conv


def _handle_link(discord_user_id: str, youth_id: str) -> str:
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


def _ensure_thread_conversation(discord_user_id: str, youth_id: str, discord_thread_id: str) -> str:
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
        conversation = _get_active_discord_conversation(db, youth, discord_thread_id)
        conversation.discord_thread_id = discord_thread_id
        db.commit()
        return _THREAD_READY
    finally:
        db.close()


def _handle_message(
    discord_user_id: str,
    content: str,
    discord_thread_id: str | None = None,
) -> str:
    db = SessionLocal()
    try:
        youth = db.scalar(select(YouthProfile).where(YouthProfile.discord_user_id == discord_user_id))
        if youth is None:
            return _NOT_LINKED

        conversation = _get_active_discord_conversation(db, youth, discord_thread_id)
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
                content,
                history,
                assessment,
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

        if youth.assigned_worker_id and assessment.risk_level.value in ("high", "critical"):
            ns = db.query(WorkerNotificationSettings).filter_by(user_id=youth.assigned_worker_id).first()
            if ns:
                from app.models.user import User
                user = db.get(User, youth.user_id)
                youth_name = user.name if user else "A youth"
                notify_worker(
                    ns.telegram_chat_id,
                    ns.discord_webhook_url,
                    title=f"Discord message - {assessment.risk_level.value} risk",
                    body=f"{youth_name} sent a message on Discord.\nRisk score: {assessment.risk_score}/100\n\"{content[:120]}{'...' if len(content) > 120 else ''}\"",
                    risk_level=assessment.risk_level.value,
                )

        return reply_content

    except Exception:
        logger.exception("Error processing Discord message from user %s", discord_user_id)
        return "I ran into a problem. Please try again in a moment, or contact your worker directly."
    finally:
        db.close()


def _clean_thread_name(display_name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_-]+", "-", display_name).strip("-")
    return f"SafeNight-{cleaned or 'chat'}"[:90]


class SafeNightDiscordBot(discord.Client):
    async def on_ready(self) -> None:
        logger.info("Discord bot connected as %s (id=%s)", self.user, self.user.id)

    async def on_message(self, message: discord.Message) -> None:
        if message.author.bot:
            return

        text = (message.content or "").strip()
        if not text:
            return

        if isinstance(message.channel, discord.DMChannel):
            await self._handle_dm(message, text)
            return

        if isinstance(message.channel, discord.Thread):
            await self._handle_thread_message(message, text)
            return

        await self._handle_entry_channel_message(message, text)

    async def _handle_dm(self, message: discord.Message, text: str) -> None:
        discord_user_id = str(message.author.id)

        if text.lower().startswith("!start"):
            await message.channel.send(_WELCOME)
            return

        if text.lower().startswith("!link"):
            parts = text.split(maxsplit=1)
            if len(parts) < 2 or not parts[1].strip():
                await message.channel.send(_LINK_USAGE)
                return
            reply = await asyncio.to_thread(_handle_link, discord_user_id, parts[1].strip())
            await message.channel.send(reply)
            return

        async with message.channel.typing():
            reply = await asyncio.to_thread(_handle_message, discord_user_id, text)
        await message.channel.send(reply)

    async def _handle_entry_channel_message(self, message: discord.Message, text: str) -> None:
        settings = get_settings()
        entry_channel_id = settings.discord_entry_channel_id
        if not message.guild or not entry_channel_id or str(message.channel.id) != entry_channel_id:
            return

        if not text.lower().startswith("!safenight"):
            return

        parts = text.split(maxsplit=1)
        if len(parts) < 2 or not parts[1].strip():
            await message.reply(_PUBLIC_USAGE, mention_author=False)
            return

        youth_id = parts[1].strip()
        thread_name = _clean_thread_name(message.author.display_name)
        try:
            thread = await message.channel.create_thread(
                name=thread_name,
                type=discord.ChannelType.private_thread,
                invitable=False,
                auto_archive_duration=1440,
            )
            await thread.add_user(message.author)
        except Exception:
            logger.exception("Could not create private Discord thread; falling back to message thread.")
            thread = await message.create_thread(name=thread_name, auto_archive_duration=1440)

        reply = await asyncio.to_thread(
            _ensure_thread_conversation,
            str(message.author.id),
            youth_id,
            str(thread.id),
        )
        await thread.send(reply)
        await message.reply("I started a SafeNight thread for you.", mention_author=False)

    async def _handle_thread_message(self, message: discord.Message, text: str) -> None:
        discord_user_id = str(message.author.id)
        async with message.channel.typing():
            reply = await asyncio.to_thread(_handle_message, discord_user_id, text, str(message.channel.id))
        await message.channel.send(reply)


def build_discord_bot() -> SafeNightDiscordBot | None:
    settings = get_settings()
    if not settings.discord_bot_token:
        logger.info("SIGNALBRIDGE_DISCORD_BOT_TOKEN not set - Discord bot disabled.")
        return None

    if not DISCORD_AVAILABLE:
        logger.warning("discord.py is not installed; Discord bot disabled.")
        return None

    intents = discord.Intents.default()
    intents.dm_messages = True
    intents.guild_messages = True
    intents.message_content = True
    return SafeNightDiscordBot(intents=intents)

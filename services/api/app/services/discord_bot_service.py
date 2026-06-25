"""Discord bot - youth-facing SafeNight chat via Discord DMs and threads.

Flow:
  Youth DMs the bot -> discord.py gateway receives it -> SafeNight AI replies -> worker notified.
  !link in DM links the Discord user ID to a youth profile.
  !safenight in the configured server channel creates a private thread.

Runs as an asyncio task inside FastAPI's lifespan. Synchronous DB/AI work is
offloaded to a thread executor so the event loop stays free.
"""

import asyncio
import hashlib
import logging
import re
from datetime import timedelta

import discord
from sqlalchemy import select

from app.config import get_settings
from app.database import SessionLocal
from app.models.audit_log import AuditLog
from app.models.case import Case, CaseStatus
from app.models.conversation import Conversation, ConversationStatus, RiskLevel
from app.models.handoff_brief import HandoffBrief
from app.models.message import Message, SenderType
from app.models.signal import Signal
from app.models.user import User, UserRole
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
from app.services.rate_limit import allow as rate_allow
from app.services.safenight_service import assess_safe_night_message
from app.timeutil import naive_utcnow

_RATE_MAX_EVENTS = 15
_RATE_WINDOW_SECONDS = 60.0

logger = logging.getLogger("signalbridge.discord_bot")

_PUBLIC_INTAKE_PENDING_STYLE = "__discord_public_intake_awaiting_name__"
_PUBLIC_INTAKE_STYLE = "Started through public Discord intake. Use a calm first response and confirm details gently."

_bot_instance: "SafeNightDiscordBot | None" = None


def send_discord_dm(discord_user_id: str, content: str) -> None:
    """Send a DM to a Discord user via the running bot gateway."""
    if _bot_instance is None or _bot_instance.loop is None or _bot_instance.loop.is_closed():
        logger.warning("send_discord_dm: bot not running, message not delivered to %s", discord_user_id)
        return

    async def _send() -> None:
        try:
            user = await _bot_instance.fetch_user(int(discord_user_id))
            dm = await user.create_dm()
            await dm.send(content)
        except Exception:
            logger.exception("send_discord_dm: failed to send DM to %s", discord_user_id)

    asyncio.run_coroutine_threadsafe(_send(), _bot_instance.loop)


_WELCOME_NEW = (
    "Hey, I'm SafeNight - I'm here with you.\n\n"
    "I won't share anything you say without asking first. "
    "Before we start, what name or nickname should I use for you?"
)
_LINKED_OK = "Linked! You can now chat with SafeNight right here. Just type whenever you're ready."
_ALREADY_LINKED = "This Discord account is already linked to a SignalBridge account."
_NAME_RECORDED = "Thanks, {name}. I'm here. What feels hardest tonight?"
_THREAD_READY = "SafeNight is ready here. Keep typing in this thread."
_PUBLIC_USAGE = "Start a SafeNight thread with `!safenight`, or use `!safenight YOUR_YOUTH_ID` if your worker gave you one."


def _discord_hash(discord_user_id: str) -> str:
    return hashlib.sha256(discord_user_id.encode("utf-8")).hexdigest()[:16]


def _default_worker_id(db) -> str | None:
    worker = db.get(User, "user_worker_1")
    if worker and worker.role == UserRole.worker:
        return worker.id
    worker = db.scalar(select(User).where(User.role == UserRole.worker).order_by(User.created_at.asc()))
    return worker.id if worker else None


def _get_or_create_public_intake_discord_youth(
    db,
    discord_user_id: str,
    display_name: str,
    *,
    awaiting_name: bool = True,
) -> YouthProfile:
    youth = db.scalar(select(YouthProfile).where(YouthProfile.discord_user_id == discord_user_id))
    if youth is not None:
        if not awaiting_name and _is_awaiting_name(youth):
            _record_intake_name(db, youth, display_name)
            db.refresh(youth)
        return youth

    suffix = _discord_hash(discord_user_id)
    user_id = f"user_discord_{suffix}"
    youth_id = f"youth_discord_{suffix}"
    case_id = f"case_discord_{suffix}"
    now = naive_utcnow()
    clean_name = " ".join(display_name.split())[:80] or "Discord youth"

    user = db.get(User, user_id)
    if user is None:
        user = User(
            id=user_id,
            name=clean_name,
            email=f"discord-{suffix}@signalbridge.local",
            password_hash="discord-public-intake-no-login",
            role=UserRole.youth,
            created_at=now,
        )
        db.add(user)
    else:
        user.name = clean_name

    youth = db.get(YouthProfile, youth_id)
    if youth is None:
        youth = YouthProfile(
            id=youth_id,
            user_id=user_id,
            assigned_worker_id=_default_worker_id(db),
            preferred_channel="Discord",
            discord_user_id=discord_user_id,
            support_style=_PUBLIC_INTAKE_PENDING_STYLE if awaiting_name else _PUBLIC_INTAKE_STYLE,
            stressors="Public Discord intake; details to be confirmed by worker.",
            created_at=now,
        )
        db.add(youth)
    else:
        youth.discord_user_id = discord_user_id
        youth.preferred_channel = "Discord"
        youth.support_style = _PUBLIC_INTAKE_PENDING_STYLE if awaiting_name else _PUBLIC_INTAKE_STYLE
        if youth.assigned_worker_id is None:
            youth.assigned_worker_id = _default_worker_id(db)

    db.flush()

    case = db.get(Case, case_id)
    if case is None:
        summary = "Public Discord intake awaiting youth context." if awaiting_name else f"Public Discord intake for {clean_name}."
        case = Case(
            id=case_id,
            youth_id=youth_id,
            assigned_worker_id=youth.assigned_worker_id,
            status=CaseStatus.new,
            priority="medium",
            summary=summary,
            created_at=now,
            updated_at=now,
        )
        db.add(case)

    db.commit()
    db.refresh(youth)
    return youth


def _is_awaiting_name(youth: YouthProfile) -> bool:
    return youth.support_style == _PUBLIC_INTAKE_PENDING_STYLE


def _record_intake_name(db, youth: YouthProfile, name: str) -> str:
    clean_name = " ".join(name.split())[:80] or "Discord youth"
    user = db.get(User, youth.user_id)
    if user:
        user.name = clean_name
    youth.support_style = _PUBLIC_INTAKE_STYLE
    youth.preferred_channel = "Discord"
    case = db.query(Case).filter(Case.youth_id == youth.id).order_by(Case.created_at.desc()).first()
    if case:
        case.summary = f"Public Discord intake for {clean_name}."
        case.updated_at = naive_utcnow()
    db.commit()
    return clean_name


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
            Conversation.discord_thread_id.is_(None) if discord_thread_id is None else Conversation.discord_thread_id == discord_thread_id,
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
        if existing and existing.id != youth.id:
            return "This Discord account is already linked to another youth profile."

        youth.discord_user_id = discord_user_id
        youth.preferred_channel = "Discord"
        db.commit()
        return _LINKED_OK
    finally:
        db.close()


def _ensure_thread_conversation(
    discord_user_id: str,
    youth_id: str | None,
    discord_thread_id: str,
    display_name: str = "Discord youth",
) -> str:
    db = SessionLocal()
    try:
        youth = db.get(YouthProfile, youth_id) if youth_id else None
        if youth is None:
            youth = _get_or_create_public_intake_discord_youth(
                db,
                discord_user_id,
                display_name,
                awaiting_name=True,
            )
            return _WELCOME_NEW

        if youth.discord_user_id and youth.discord_user_id != discord_user_id:
            return _ALREADY_LINKED

        existing = db.scalar(select(YouthProfile).where(YouthProfile.discord_user_id == discord_user_id))
        if existing and existing.id != youth.id:
            return "This Discord account is already linked to another youth profile."

        youth.discord_user_id = discord_user_id
        youth.preferred_channel = "Discord"
        conversation = _get_active_discord_conversation(db, youth, discord_thread_id)
        conversation.discord_thread_id = discord_thread_id
        db.commit()
        return _THREAD_READY
    finally:
        db.close()


def _handle_message(
    discord_user_id: str,
    content: str,
    display_name: str = "",
    discord_thread_id: str | None = None,
) -> str:
    db = SessionLocal()
    try:
        youth = db.scalar(select(YouthProfile).where(YouthProfile.discord_user_id == discord_user_id))

        if youth is None:
            if discord_thread_id:
                youth = _get_or_create_public_intake_discord_youth(
                    db,
                    discord_user_id,
                    display_name,
                    awaiting_name=True,
                )
                return _WELCOME_NEW
            else:
                _get_or_create_public_intake_discord_youth(db, discord_user_id, display_name)
                return _WELCOME_NEW

        if _is_awaiting_name(youth):
            clean_name = _record_intake_name(db, youth, content)
            db.refresh(youth)
            return _NAME_RECORDED.format(name=clean_name)

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
            created_at=now + timedelta(milliseconds=1),
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
        if message.author == self.user or message.author.bot:
            return

        discord_user_id = str(message.author.id)
        text = (message.content or "").strip()
        if not text:
            return

        if not rate_allow(f"dc:{discord_user_id}", _RATE_MAX_EVENTS, _RATE_WINDOW_SECONDS):
            logger.warning("Discord rate limit hit for user %s", discord_user_id)
            await message.channel.send("You're sending messages very quickly - give me a moment to catch up.")
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

        if text.lower().startswith("!link"):
            parts = text.split(maxsplit=1)
            if len(parts) < 2 or not parts[1].strip():
                await message.channel.send("Send `!link` followed by your youth ID, e.g.:\n`!link youth_abc123`")
                return
            reply = await asyncio.to_thread(_handle_link, discord_user_id, parts[1].strip())
            await message.channel.send(reply)
            return

        display_name = str(message.author.display_name or message.author.name or "")
        async with message.channel.typing():
            reply = await asyncio.to_thread(_handle_message, discord_user_id, text, display_name)
        await message.channel.send(reply)

    async def _handle_entry_channel_message(self, message: discord.Message, text: str) -> None:
        settings = get_settings()
        entry_channel_id = settings.discord_entry_channel_id
        if not message.guild or not entry_channel_id or str(message.channel.id) != entry_channel_id:
            return

        if not text.lower().startswith("!safenight"):
            return

        parts = text.split(maxsplit=1)
        youth_id = parts[1].strip() if len(parts) == 2 and parts[1].strip() else None
        thread_name = _clean_thread_name(str(message.author.display_name or message.author.name or "chat"))
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
            discord_user_id,
            youth_id,
            str(thread.id),
            str(message.author.display_name or message.author.name or "Discord youth"),
        )
        await thread.send(reply)
        await message.reply("I started a SafeNight thread for you.", mention_author=False)

    async def _handle_thread_message(self, message: discord.Message, text: str) -> None:
        discord_user_id = str(message.author.id)
        display_name = str(message.author.display_name or message.author.name or "")
        async with message.channel.typing():
            reply = await asyncio.to_thread(
                _handle_message,
                discord_user_id,
                text,
                display_name,
                str(message.channel.id),
            )
        await message.channel.send(reply)


def build_discord_bot() -> "SafeNightDiscordBot | None":
    global _bot_instance  # noqa: PLW0603
    settings = get_settings()
    if not settings.discord_bot_token:
        logger.info("SIGNALBRIDGE_DISCORD_BOT_TOKEN not set - Discord bot disabled.")
        return None

    intents = discord.Intents.default()
    intents.dm_messages = True
    intents.guild_messages = True
    intents.message_content = True
    bot = SafeNightDiscordBot(intents=intents)
    _bot_instance = bot
    return bot

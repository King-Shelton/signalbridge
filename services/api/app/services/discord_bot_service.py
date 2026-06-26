"""Discord bot - youth-facing SafeNight chat via Discord DMs, threads, and private channels.

Existing flows (unchanged):
  DM intake:      Youth DMs the bot → SafeNight AI replies → worker notified.
  Thread intake:  !safenight in the entry channel creates a private thread.
  !link in DM:    Links the Discord user ID to a youth profile.

New flow — Private Case Channels:
  Each worker-youth pair gets a dedicated private text channel in the SignalBridge
  server that only the worker, the youth, and the bot can see.

  Worker setup:
    1. Worker DMs the bot: !register_worker <signalbridge_worker_id>
       → WorkerProfile.discord_user_id is stored.
    2. Worker types !open_case @youth_mention in the entry channel (or vice-versa).
       → Bot creates #case-youthname-xxxxxx under the "Youth Cases" category.
       → Permission overwrites: @everyone denied, worker + youth + bot allowed.
       → Conversation record created with channel_type="discord_private_channel".
       → Channel topic embeds conversation_id and worker_id for fast routing.

  During work hours:
    Worker and youth chat normally. Every message is logged to SignalBridge.

  After work hours (is_after_hours() returns True):
    SafeNight AI takes over. Bot replies in the private channel. Risk analysis,
    consent detection, handoff brief generation all run as normal.

Runs as an asyncio task inside FastAPI's lifespan. Synchronous DB/AI work is
offloaded to a thread executor so the event loop stays free.
"""

import asyncio
import hashlib
import json
import logging
import re
from datetime import timedelta

import discord
from sqlalchemy import func as sqlfunc, select

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
from app.models.worker_profile import WorkerProfile
from app.models.youth_profile import YouthProfile
from app.services.after_hours_service import (
    ensure_worker_profile,
    get_worker_id_from_discord_user,
    is_after_hours,
)
from app.services.memory_card_service import update_memory_card
from app.services.ai_service import (
    analyse_risk,
    apply_risk_to_conversation,
    build_consent_confirmation_reply,
    build_handoff_brief_with_ai,
    detect_verbal_consent,
    generate_safenight_reply,
    get_conversation_messages,
    upsert_handoff_brief_with_ai,
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


def send_discord_channel_message(channel_id: str, content: str) -> None:
    """Send a message to a Discord text channel (e.g. a private case channel)."""
    if _bot_instance is None or _bot_instance.loop is None or _bot_instance.loop.is_closed():
        logger.warning("send_discord_channel_message: bot not running, message not delivered to channel %s", channel_id)
        return

    async def _send() -> None:
        try:
            channel = _bot_instance.get_channel(int(channel_id))
            if channel is None:
                channel = await _bot_instance.fetch_channel(int(channel_id))
            await channel.send(content)
        except Exception:
            logger.exception("send_discord_channel_message: failed to send to channel %s", channel_id)

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

# ── Private channel strings ──────────────────────────────────────────────────
# Embedded in every private case channel topic so on_message can detect them
# without a DB query on every guild message.
_CASE_TOPIC_MARKER = "sb:conv="

_PRIVATE_CHANNEL_WELCOME = (
    "🔒 **Private Support Channel**\n\n"
    "This channel is just for the two of you, and me — SafeNight.\n"
    "Everything here stays private. I'll step in to support {name} outside work hours "
    "and make sure nothing gets lost between sessions."
)
_REGISTER_WORKER_OK = (
    "✅ Registered! Your Discord account is now linked to your SignalBridge worker profile.\n\n"
    "You can now use `!open_case <youth mention|username|user id>` in the server entry channel "
    "or DM me the same command to create a private case channel."
)
_REGISTER_WORKER_NOT_FOUND = (
    "I couldn't find a SignalBridge worker account with that ID.\n\n"
    "Usage: `!register_worker <your_signalbridge_worker_id>`\n"
    "You can find your worker ID in the SignalBridge cockpit URL."
)
_OPEN_CASE_USAGE = "Usage: `!open_case <youth mention|username|user id>`"
_OPEN_CASE_DM_HINT = "For a private setup, DM me `!open_case <youth name or user id>` and I will open the case without posting it in the server."
_OPEN_CASE_NOT_WORKER = "Only registered workers can open case channels. DM me `!register_worker <your_id>` first."
_OPEN_CASE_NO_GUILD = "This command only works inside the SignalBridge server."
_OPEN_CASE_NO_SERVER = "I need the SignalBridge server configured before I can open a case from DM. Ask an admin to set SIGNALBRIDGE_DISCORD_GUILD_ID."
_OPEN_CASE_NO_CATEGORY = "The Youth Cases category isn't configured yet. Ask your admin to set SIGNALBRIDGE_DISCORD_YOUTH_CASES_CATEGORY_ID."


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


# ── Private channel sync helpers ────────────────────────────────────────────

def _build_channel_topic(conv_id: str, worker_id: str) -> str:
    """Embeds routing data in the channel topic — parsed by on_message to avoid a DB lookup."""
    return f"SignalBridge private case | {_CASE_TOPIC_MARKER}{conv_id} | worker={worker_id}"


def _parse_channel_topic(topic: str) -> tuple[str, str] | None:
    """Return (conv_id, worker_id) from a case channel topic, or None if not a case channel."""
    if _CASE_TOPIC_MARKER not in topic:
        return None
    try:
        conv_id = topic.split(_CASE_TOPIC_MARKER)[1].split()[0]
        worker_id = topic.split("worker=")[1].split()[0]
        return conv_id, worker_id
    except (IndexError, ValueError):
        return None


def _normalize_discord_lookup_text(raw_text: str) -> str:
    text = raw_text.strip()
    if text.startswith("<@") and text.endswith(">"):
        text = text[2:-1]
        if text.startswith("!"):
            text = text[1:]
    if text.startswith("@"):
        text = text[1:]
    return text.strip()


async def _resolve_discord_member(guild: discord.Guild, raw_target: str) -> discord.Member | None:
    """Resolve a Discord member from a mention, user id, or cached username."""
    target = _normalize_discord_lookup_text(raw_target)
    if not target:
        return None

    if target.isdigit():
        try:
            return await guild.fetch_member(int(target))
        except (discord.NotFound, discord.Forbidden):
            return None
        except Exception:
            logger.exception("Failed to fetch Discord member %s", target)
            return None

    lowered = target.casefold()
    exact_matches: list[discord.Member] = []
    partial_matches: list[discord.Member] = []
    for member in guild.members:
        candidates = (
            member.name,
            member.display_name,
            getattr(member, "global_name", None),
        )
        if any(candidate and candidate.casefold() == lowered for candidate in candidates):
            exact_matches.append(member)
        elif any(candidate and lowered in candidate.casefold() for candidate in candidates):
            partial_matches.append(member)

    if len(exact_matches) == 1:
        return exact_matches[0]
    if len(exact_matches) > 1:
        return None
    if len(partial_matches) == 1:
        return partial_matches[0]
    return None


def _get_or_create_private_channel_youth(
    db, discord_user_id: str, worker_id: str, display_name: str
) -> YouthProfile:
    """Find or create a YouthProfile for a youth in a private case channel."""
    youth = db.scalar(select(YouthProfile).where(YouthProfile.discord_user_id == discord_user_id))
    if youth is not None:
        return youth

    suffix = _discord_hash(discord_user_id)
    user_id = f"user_dcpriv_{suffix}"
    youth_id = f"youth_dcpriv_{suffix}"
    case_id = f"case_dcpriv_{suffix}"
    now = naive_utcnow()
    clean_name = " ".join(display_name.split())[:80] or "Discord youth"

    user = db.get(User, user_id)
    if user is None:
        user = User(
            id=user_id,
            name=clean_name,
            email=f"dcpriv-{suffix}@signalbridge.local",
            password_hash="discord-private-channel-no-login",
            role=UserRole.youth,
            created_at=now,
        )
        db.add(user)

    youth = db.get(YouthProfile, youth_id)
    if youth is None:
        youth = YouthProfile(
            id=youth_id,
            user_id=user_id,
            assigned_worker_id=worker_id,
            preferred_channel="Discord Private",
            discord_user_id=discord_user_id,
            support_style=_PUBLIC_INTAKE_STYLE,
            stressors="Youth in a private case channel with their assigned worker.",
            created_at=now,
        )
        db.add(youth)

    db.flush()

    case = db.get(Case, case_id)
    if case is None:
        case = Case(
            id=case_id,
            youth_id=youth_id,
            assigned_worker_id=worker_id,
            status=CaseStatus.new,
            priority="medium",
            summary=f"Private Discord case channel opened for {clean_name}.",
            created_at=now,
            updated_at=now,
        )
        db.add(case)

    db.commit()
    db.refresh(youth)
    return youth


def _get_active_private_channel_conversation(
    db, youth: YouthProfile, discord_channel_id: str
) -> Conversation:
    """Return the open private-channel conversation for this channel, or create one."""
    conv = db.scalar(
        select(Conversation).where(
            Conversation.discord_channel_id == discord_channel_id,
            Conversation.status != ConversationStatus.closed,
        )
    )
    if conv is None:
        conv = Conversation(
            youth_id=youth.id,
            channel="Discord Private",
            channel_type="discord_private_channel",
            discord_channel_id=discord_channel_id,
            status=ConversationStatus.active,
            risk_level=RiskLevel.low,
            risk_score=0,
        )
        db.add(conv)
        db.flush()
    return conv


def _get_worker_pre_handoff_messages(messages: list, n: int = 5) -> list[str]:
    """Last N messages sent by the worker — captured in handoff brief as pre-handoff context."""
    return [m.content for m in messages if m.sender_type == SenderType.worker][-n:]


def _create_conversation_for_channel(
    youth_id: str, worker_id: str, discord_channel_id: str
) -> str:
    """Create a Conversation record for a newly created private channel. Returns conv_id."""
    db = SessionLocal()
    try:
        conv = Conversation(
            youth_id=youth_id,
            channel="Discord Private",
            channel_type="discord_private_channel",
            discord_channel_id=discord_channel_id,
            status=ConversationStatus.active,
            risk_level=RiskLevel.low,
            risk_score=0,
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)
        return conv.id
    finally:
        db.close()


def _handle_private_channel_message_sync(
    discord_user_id: str,
    content: str,
    discord_channel_id: str,
    conv_id: str,
    worker_id: str,
    display_name: str,
    is_worker_message: bool,
) -> str | None:
    """Process a private-channel message. Returns reply text or None (no reply needed)."""
    db = SessionLocal()
    try:
        # Resolve youth profile (only needed if the sender is the youth).
        if is_worker_message:
            conversation = db.get(Conversation, conv_id)
            if conversation is None:
                return None
            db.add(Message(
                conversation_id=conv_id,
                sender_type=SenderType.worker,
                content=content,
                created_at=naive_utcnow(),
            ))
            conversation.last_message_at = naive_utcnow()
            db.commit()
            return None  # worker is handling it themselves

        # Youth message path.
        youth = db.scalar(select(YouthProfile).where(YouthProfile.discord_user_id == discord_user_id))
        if youth is None:
            youth = _get_or_create_private_channel_youth(db, discord_user_id, worker_id, display_name)

        conversation = db.get(Conversation, conv_id)
        if conversation is None:
            conversation = _get_active_private_channel_conversation(db, youth, discord_channel_id)

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

        # Always log, but only reply after hours.
        conversation.last_message_at = now
        db.commit()

        if not is_after_hours(worker_id, db):
            return None  # within work hours — worker handles it

        # ── After hours: SafeNight takes over ───────────────────────────────
        # Return a one-time handover notice as a prefix so the youth knows
        # they're talking to an AI, not the worker directly.
        has_prior_ai = db.scalar(
            select(sqlfunc.count(Message.id)).where(
                Message.conversation_id == conversation.id,
                Message.sender_type == SenderType.ai,
            )
        ) or 0
        handover_prefix = (
            "👋 Just so you know — your worker is offline right now. "
            "I'm SafeNight, an AI support companion covering for them after hours. "
            "Everything you share stays private, and your worker will see this when they're back.\n\n"
        ) if has_prior_ai == 0 else ""

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
                handoff.platform = "discord_private_channel"
                handoff.pre_handoff_context = json.dumps(_get_worker_pre_handoff_messages(all_messages))
                db.add(handoff)
        else:
            reply_content = generate_safenight_reply(
                content,
                history,
                assessment,
                consent_to_handoff=conversation.consent_to_handoff,
                db=db,
                conversation_id=conversation.id,
                youth_id=youth.id,
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
                source="safenight_discord_private",
            ))
            existing_types.add(detected.type)

        if not ai_triggered_consent:
            if risk_rank.get(assessment.risk_level.value, 1) >= risk_rank.get(conversation.risk_level.value, 1):
                conversation.risk_level = assessment.risk_level
            conversation.risk_score = max(conversation.risk_score, assessment.risk_score)
            if assessment.handoff_recommended:
                conversation.status = ConversationStatus.needs_review
                conversation.unresolved_handoff = True

        if conversation.consent_to_handoff:
            all_messages = list(history) + [youth_msg, ai_reply]
            full_assessment = analyse_risk([m.content for m in all_messages], all_messages)
            apply_risk_to_conversation(conversation, full_assessment)
            handoff, _ = upsert_handoff_brief_with_ai(db, conversation, all_messages, full_assessment, youth_id=youth.id)
            handoff.platform = "discord_private_channel"
            handoff.pre_handoff_context = json.dumps(_get_worker_pre_handoff_messages(all_messages))
            db.add(handoff)

        db.add(AuditLog(
            actor_user_id=youth.user_id,
            event_type="discord_private_channel_message",
            entity_type="conversation",
            entity_id=conversation.id,
            details=f'{{"riskLevel":"{assessment.risk_level.value}","riskScore":{assessment.risk_score},"workerId":"{worker_id}"}}',
        ))
        db.commit()

        update_memory_card(
            youth_id=youth.id,
            signal_types={s.type for s in assessment.signals},
            risk_level=assessment.risk_level,
            risk_score=assessment.risk_score,
            message_text=content,
            db=db,
        )

        if youth.assigned_worker_id and assessment.risk_level.value in ("high", "critical"):
            ns = db.query(WorkerNotificationSettings).filter_by(user_id=youth.assigned_worker_id).first()
            if ns:
                user = db.get(User, youth.user_id)
                youth_name = user.name if user else "A youth"
                notify_worker(
                    ns.telegram_chat_id,
                    ns.discord_webhook_url,
                    title=f"🔒 Private channel — {assessment.risk_level.value} risk",
                    body=(
                        f"{youth_name} sent a message in their private channel after hours.\n"
                        f"Risk score: {assessment.risk_score}/100\n"
                        f"\"{content[:120]}{'…' if len(content) > 120 else ''}\""
                    ),
                    risk_level=assessment.risk_level.value,
                )

        return handover_prefix + reply_content

    except Exception:
        logger.exception("Error processing private channel message from %s", discord_user_id)
        return "I ran into a problem. Please try again in a moment, or contact your worker directly."
    finally:
        db.close()


def _register_worker_discord(discord_user_id: str, worker_signalbridge_id: str) -> str:
    """Link a Discord user_id to a SignalBridge worker account. Called from !register_worker."""
    db = SessionLocal()
    try:
        worker = db.get(User, worker_signalbridge_id)
        if worker is None or worker.role not in (UserRole.worker, UserRole.supervisor, UserRole.admin):
            return _REGISTER_WORKER_NOT_FOUND
        profile = ensure_worker_profile(worker_signalbridge_id, db)
        profile.discord_user_id = discord_user_id
        db.commit()
        logger.info("Worker %s registered Discord user_id %s", worker_signalbridge_id, discord_user_id)
        return _REGISTER_WORKER_OK
    finally:
        db.close()


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
                db=db,
                conversation_id=conversation.id,
                youth_id=youth.id,
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

        update_memory_card(
            youth_id=youth.id,
            signal_types={s.type for s in assessment.signals},
            risk_level=assessment.risk_level,
            risk_score=assessment.risk_score,
            message_text=content,
            db=db,
        )

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


def _clean_channel_name(display_name: str, conv_id: str) -> str:
    cleaned = re.sub(r"[^a-z0-9-]+", "-", display_name.lower()).strip("-")
    return f"case-{cleaned or 'youth'}-{conv_id[:6]}"[:100]


async def create_private_channel(
    guild: discord.Guild,
    worker_member: discord.Member,
    youth_member: discord.Member,
    youth_name: str,
    worker_id: str,
    youth_discord_id: str,
) -> discord.TextChannel | None:
    """Create a private text channel for a worker-youth pair.

    Sets permissions so only the worker, youth, and bot can see the channel.
    Creates a Conversation record, embeds the conv_id in the channel topic so
    on_message can route messages without a DB lookup on every guild message.
    """
    settings = get_settings()
    category: discord.CategoryChannel | None = None
    if settings.discord_youth_cases_category_id:
        cat = guild.get_channel(int(settings.discord_youth_cases_category_id))
        if isinstance(cat, discord.CategoryChannel):
            category = cat

    # Temporarily create the conversation to get its ID for the channel topic.
    # We need the ID before the channel exists so we can embed it in the topic.
    youth_profile = None
    db = SessionLocal()
    try:
        youth_profile = db.scalar(
            select(YouthProfile).where(YouthProfile.discord_user_id == youth_discord_id)
        )
        if youth_profile is None:
            youth_profile = _get_or_create_private_channel_youth(
                db, youth_discord_id, worker_id, youth_name
            )
        youth_id = youth_profile.id
    finally:
        db.close()

    # Placeholder channel_id — updated after channel creation.
    conv_id = _create_conversation_for_channel(youth_id, worker_id, "pending")

    channel_name = _clean_channel_name(youth_name, conv_id)
    topic = _build_channel_topic(conv_id, worker_id)

    overwrites = {
        guild.default_role: discord.PermissionOverwrite(view_channel=False),
        guild.me: discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True),
        worker_member: discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True),
        youth_member: discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True),
    }

    try:
        channel = await guild.create_text_channel(
            name=channel_name,
            category=category,
            overwrites=overwrites,
            topic=topic,
            reason="SignalBridge private case channel",
        )
    except discord.Forbidden:
        logger.error("Bot lacks MANAGE_CHANNELS permission in guild %s", guild.id)
        return None
    except Exception:
        logger.exception("Failed to create private channel for %s", youth_name)
        return None

    # Update the placeholder channel_id in the conversation record.
    db = SessionLocal()
    try:
        conv = db.get(Conversation, conv_id)
        if conv:
            conv.discord_channel_id = str(channel.id)
            db.commit()
    finally:
        db.close()

    # Update the channel topic with the now-final conv_id (it was already correct —
    # we just patch the channel_id in DB; the topic already has the right conv_id).
    youth_display = youth_name or "them"
    await channel.send(
        _PRIVATE_CHANNEL_WELCOME.format(name=youth_display)
    )
    logger.info("Private channel #%s created (conv=%s)", channel_name, conv_id)
    return channel


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

        # Detect private case channels by their topic marker before falling
        # through to the general entry-channel handler.
        if isinstance(message.channel, discord.TextChannel):
            topic = message.channel.topic or ""
            parsed = _parse_channel_topic(topic)
            if parsed is not None:
                await self._handle_private_channel_message(message, text, parsed)
                return

        await self._handle_entry_channel_message(message, text)

    async def _handle_dm(self, message: discord.Message, text: str) -> None:
        discord_user_id = str(message.author.id)

        if text.lower().startswith("!open_case"):
            await self._handle_open_case(message)
            return

        if text.lower().startswith("!link"):
            parts = text.split(maxsplit=1)
            if len(parts) < 2 or not parts[1].strip():
                await message.channel.send("Send `!link` followed by your youth ID, e.g.:\n`!link youth_abc123`")
                return
            reply = await asyncio.to_thread(_handle_link, discord_user_id, parts[1].strip())
            await message.channel.send(reply)
            return

        # Worker registration: !register_worker <signalbridge_worker_id>
        if text.lower().startswith("!register_worker"):
            parts = text.split(maxsplit=1)
            if len(parts) < 2 or not parts[1].strip():
                await message.channel.send(
                    "Usage: `!register_worker <your_signalbridge_worker_id>`\n"
                    "You can find your worker ID in the SignalBridge cockpit URL."
                )
                return
            reply = await asyncio.to_thread(_register_worker_discord, discord_user_id, parts[1].strip())
            await message.channel.send(reply)
            return

        display_name = str(message.author.display_name or message.author.name or "")
        async with message.channel.typing():
            reply = await asyncio.to_thread(_handle_message, discord_user_id, text, display_name)
        await message.channel.send(reply)

    async def _handle_private_channel_message(
        self,
        message: discord.Message,
        text: str,
        parsed_topic: tuple[str, str],
    ) -> None:
        """Route a message in a private case channel through the SafeNight pipeline."""
        conv_id, worker_id = parsed_topic
        discord_user_id = str(message.author.id)
        display_name = str(message.author.display_name or message.author.name or "")
        discord_channel_id = str(message.channel.id)

        # Determine if the sender is the worker (looked up from WorkerProfile).
        def _check_is_worker() -> bool:
            db = SessionLocal()
            try:
                return get_worker_id_from_discord_user(discord_user_id, db) == worker_id
            finally:
                db.close()

        is_worker_message = await asyncio.to_thread(_check_is_worker)

        async with message.channel.typing():
            reply = await asyncio.to_thread(
                _handle_private_channel_message_sync,
                discord_user_id,
                text,
                discord_channel_id,
                conv_id,
                worker_id,
                display_name,
                is_worker_message,
            )

        if reply:
            await message.channel.send(reply)

    async def _handle_entry_channel_message(self, message: discord.Message, text: str) -> None:
        settings = get_settings()
        entry_channel_id = settings.discord_entry_channel_id
        if not message.guild or not entry_channel_id or str(message.channel.id) != entry_channel_id:
            return

        # !open_case @youth_mention — worker creates a private channel for a youth.
        if text.lower().startswith("!open_case"):
            await self._handle_open_case(message)
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

    async def _handle_open_case(self, message: discord.Message) -> None:
        """Handle !open_case and create a private channel for a worker-youth pair."""
        settings = get_settings()
        guild = message.guild
        if guild is None:
            if not settings.discord_guild_id:
                await message.reply(_OPEN_CASE_NO_SERVER, mention_author=False)
                return
            try:
                guild = self.get_guild(int(settings.discord_guild_id))
                if guild is None:
                    guild = await self.fetch_guild(int(settings.discord_guild_id))
            except Exception:
                logger.exception("Unable to resolve configured Discord guild for open_case")
                await message.reply(_OPEN_CASE_NO_SERVER, mention_author=False)
                return

        discord_user_id = str(message.author.id)

        # Confirm the sender is a registered worker.
        def _lookup_worker() -> str | None:
            db = SessionLocal()
            try:
                return get_worker_id_from_discord_user(discord_user_id, db)
            finally:
                db.close()

        worker_id = await asyncio.to_thread(_lookup_worker)
        if worker_id is None:
            await message.reply(_OPEN_CASE_NOT_WORKER, mention_author=False)
            return

        if not settings.discord_youth_cases_category_id:
            await message.reply(_OPEN_CASE_NO_CATEGORY, mention_author=False)
            return

        raw_target = re.sub(r"^!open_case(?:\s+|$)", "", (message.content or "").strip(), flags=re.IGNORECASE).strip()
        target_text = raw_target or (message.mentions[0].mention if message.mentions else "")

        if not target_text:
            await message.reply(_OPEN_CASE_USAGE, mention_author=False)
            return

        youth_discord_user = message.mentions[0] if message.mentions else await _resolve_discord_member(guild, target_text)
        if youth_discord_user is None:
            await message.reply(
                _OPEN_CASE_USAGE + "\n" + _OPEN_CASE_DM_HINT,
                mention_author=False,
            )
            return

        if youth_discord_user.bot:
            await message.reply("You can't open a case for a bot.", mention_author=False)
            return

        youth_discord_id = str(youth_discord_user.id)
        youth_name = str(youth_discord_user.display_name or youth_discord_user.name or "youth")

        try:
            worker_member = await guild.fetch_member(int(discord_user_id))
            youth_member = await guild.fetch_member(int(youth_discord_id))
        except discord.NotFound:
            await message.reply(
                "Both you and the youth need to be members of this server first.",
                mention_author=False,
            )
            return

        channel = await create_private_channel(
            message.guild,
            worker_member,
            youth_member,
            youth_name,
            worker_id,
            youth_discord_id,
        )
        if channel:
            await message.reply(
                f"✅ Private channel created: {channel.mention}",
                mention_author=False,
            )
        else:
            await message.reply(
                "Couldn't create the channel. Check my permissions and try again.",
                mention_author=False,
            )

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

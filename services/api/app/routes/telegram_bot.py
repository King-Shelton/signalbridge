"""Telegram bot webhook — youth-facing SafeNight chat via Telegram.

Flow:
  Youth messages the bot → Telegram POSTs here → SafeNight AI replies → worker notified.
  /start  → welcome + link instructions
  /link   → links the Telegram chat_id to a youth profile
  text    → full SafeNight pipeline, reply sent back, worker alerted if risk high
"""

import logging
import hashlib
from datetime import timedelta
from typing import Any

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.case import Case, CaseStatus
from app.models.conversation import Conversation, ConversationStatus, RiskLevel
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
    upsert_handoff_brief_with_ai,
)
from app.services.notifications import notify_worker
from app.services.rate_limit import allow as rate_allow
from app.services.safenight_service import assess_safe_night_message

# Public intake guard: per-chat message ceiling. Generous enough for a real
# distressed youth typing fast, low enough to stop a script spamming new profiles.
_RATE_MAX_EVENTS = 15
_RATE_WINDOW_SECONDS = 60.0
from app.models.handoff_brief import HandoffBrief
from app.timeutil import naive_utcnow

logger = logging.getLogger("signalbridge.telegram_bot")

router = APIRouter(prefix="/telegram", tags=["telegram"])

_PUBLIC_INTAKE_PENDING_STYLE = "__telegram_public_intake_awaiting_name__"

_WELCOME = (
    "Hi, I'm SafeNight — SignalBridge's after-hours support companion.\n\n"
    "I'm here to listen, and I'll never share what you say without asking you first.\n\n"
    "Before we start, what name or nickname should I use for you?"
)

_LINK_USAGE = "Send /link followed by your youth ID, e.g.:\n/link youth_abc123"
_NOT_LINKED = (
    "I don't recognise this account yet.\n\n"
    "Send /link YOUR_YOUTH_ID to connect, or ask your worker for your youth ID."
)
_LINKED_OK = "Linked! You can now chat with SafeNight right here. Just type whenever you're ready."
_ALREADY_LINKED = "This chat is already linked to a SignalBridge account."
_ASK_NAME = "Before we start, what name or nickname should I use for you?"
_NAME_RECORDED = "Thanks, {name}. I'm here with you now. What feels hardest tonight?"


def _bot_url(token: str, method: str) -> str:
    return f"https://api.telegram.org/bot{token}/{method}"


def register_webhook_if_configured() -> str | None:
    """Tell Telegram where to deliver updates.

    Called once on API startup. Telegram only delivers updates to a webhook it
    has been told about, so without this the bot silently receives nothing even
    when the token is valid. Returns the registered URL, or None if skipped.
    """
    settings = get_settings()
    token = settings.telegram_bot_token
    base = (settings.public_base_url or "").rstrip("/")
    if not token or not base:
        logger.info(
            "Telegram webhook not registered (token=%s, public_base_url=%s).",
            "set" if token else "missing",
            base or "missing",
        )
        return None

    webhook_url = f"{base}/telegram/webhook"
    payload: dict[str, Any] = {
        "url": webhook_url,
        "allowed_updates": ["message", "edited_message"],
        "drop_pending_updates": True,
    }
    if settings.telegram_webhook_secret:
        payload["secret_token"] = settings.telegram_webhook_secret

    try:
        with httpx.Client(timeout=10) as client:
            r = client.post(_bot_url(token, "setWebhook"), json=payload)
        if r.is_success:
            logger.info("Telegram webhook registered at %s", webhook_url)
            return webhook_url
        logger.warning("Telegram setWebhook failed: %s %s", r.status_code, r.text[:200])
    except Exception as exc:
        logger.warning("Telegram setWebhook error: %s", exc)
    return None


def _send_telegram_message(token: str, chat_id: str | int, text: str) -> None:
    try:
        with httpx.Client(timeout=8) as client:
            r = client.post(
                _bot_url(token, "sendMessage"),
                json={"chat_id": chat_id, "text": text},
            )
        if not r.is_success:
            logger.warning("Telegram reply failed: %s %s", r.status_code, r.text[:200])
    except Exception as exc:
        logger.warning("Telegram reply error: %s", exc)


def _telegram_hash(chat_id: str) -> str:
    return hashlib.sha256(chat_id.encode("utf-8")).hexdigest()[:16]


def _default_worker_id(db: Session) -> str | None:
    worker = db.get(User, "user_worker_1")
    if worker and worker.role == UserRole.worker:
        return worker.id
    worker = db.scalar(select(User).where(User.role == UserRole.worker).order_by(User.created_at.asc()))
    return worker.id if worker else None


def _get_or_create_public_intake_youth(db: Session, chat_id: str) -> YouthProfile:
    suffix = _telegram_hash(chat_id)
    user_id = f"user_telegram_{suffix}"
    youth_id = f"youth_telegram_{suffix}"
    case_id = f"case_telegram_{suffix}"

    youth = db.scalar(select(YouthProfile).where(YouthProfile.telegram_chat_id == chat_id))
    if youth is not None:
        return youth

    now = naive_utcnow()
    user = db.get(User, user_id)
    if user is None:
        user = User(
            id=user_id,
            name="Telegram youth",
            email=f"telegram-{suffix}@signalbridge.local",
            password_hash="telegram-public-intake-no-login",
            role=UserRole.youth,
            created_at=now,
        )
        db.add(user)

    youth = db.get(YouthProfile, youth_id)
    if youth is None:
        youth = YouthProfile(
            id=youth_id,
            user_id=user_id,
            assigned_worker_id=_default_worker_id(db),
            preferred_channel="Telegram",
            telegram_chat_id=chat_id,
            support_style=_PUBLIC_INTAKE_PENDING_STYLE,
            stressors="Public Telegram intake; details to be confirmed by worker.",
            created_at=now,
        )
        db.add(youth)

    db.flush()

    case = db.get(Case, case_id)
    if case is None:
        case = Case(
            id=case_id,
            youth_id=youth_id,
            assigned_worker_id=youth.assigned_worker_id,
            status=CaseStatus.new,
            priority="medium",
            summary="Public Telegram intake awaiting youth context.",
            created_at=now,
            updated_at=now,
        )
        db.add(case)

    db.commit()
    db.refresh(youth)
    return youth


def _is_awaiting_name(youth: YouthProfile) -> bool:
    return youth.support_style == _PUBLIC_INTAKE_PENDING_STYLE


def _record_public_intake_name(db: Session, youth: YouthProfile, name: str) -> str:
    clean_name = " ".join(name.split())[:80] or "Telegram youth"
    user = db.get(User, youth.user_id)
    if user:
        user.name = clean_name
    youth.support_style = "Started through public Telegram intake. Use a calm first response and confirm details gently."
    case = db.query(Case).filter(Case.youth_id == youth.id).order_by(Case.created_at.desc()).first()
    if case:
        case.summary = f"Public Telegram intake for {clean_name}."
        case.updated_at = naive_utcnow()
    db.commit()
    return clean_name


def _link_chat_to_youth(db: Session, token: str, chat_id: str, youth_id: str) -> bool:
    youth = db.get(YouthProfile, youth_id)
    if youth is None:
        _send_telegram_message(token, chat_id, "Youth ID not found. Ask your worker for your exact invite link.")
        return False

    if youth.telegram_chat_id and youth.telegram_chat_id != chat_id:
        _send_telegram_message(token, chat_id, _ALREADY_LINKED)
        return False

    existing = db.scalar(select(YouthProfile).where(YouthProfile.telegram_chat_id == chat_id))
    if existing and existing.id != youth_id:
        _send_telegram_message(token, chat_id, "This Telegram account is already linked to another youth profile.")
        return False

    youth.telegram_chat_id = chat_id
    db.commit()
    _send_telegram_message(token, chat_id, _LINKED_OK)
    return True


def _get_active_telegram_conversation(db: Session, youth: YouthProfile) -> Conversation:
    """Return the most recent open Telegram conversation, or create one."""
    conv = db.scalar(
        select(Conversation)
        .where(
            Conversation.youth_id == youth.id,
            Conversation.channel == "Telegram",
            Conversation.status != ConversationStatus.closed,
        )
        .order_by(Conversation.last_message_at.desc().nullslast(), Conversation.created_at.desc())
    )
    if conv is None:
        conv = Conversation(
            youth_id=youth.id,
            channel="Telegram",
            status=ConversationStatus.active,
            risk_level=RiskLevel.low,
            risk_score=0,
        )
        db.add(conv)
        db.flush()
    return conv


def _process_youth_message(
    db: Session,
    youth: YouthProfile,
    content: str,
) -> str:
    """Run the full SafeNight pipeline and return the AI reply text."""
    conversation = _get_active_telegram_conversation(db, youth)
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
            db=db,
            conversation_id=conversation.id,
        )

    ai_reply = Message(
        conversation_id=conversation.id,
        sender_type=SenderType.ai,
        content=reply_content,
        safety_status=assessment.safety_status,
        # +1ms so the reply always sorts after the youth message in the thread.
        created_at=now + timedelta(milliseconds=1),
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
            source="safenight_telegram",
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

    if conversation.consent_to_handoff:
        all_messages = list(history) + [youth_msg, ai_reply]
        full_assessment = analyse_risk([m.content for m in all_messages], all_messages)
        apply_risk_to_conversation(conversation, full_assessment)
        handoff, _ = upsert_handoff_brief_with_ai(db, conversation, all_messages, full_assessment)
        db.add(handoff)

    db.add(AuditLog(
        actor_user_id=youth.user_id,
        event_type="telegram_message_received",
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
                title=f"📱 Telegram message — {assessment.risk_level.value} risk",
                body=f"{youth_name} sent a message on Telegram.\nRisk score: {assessment.risk_score}/100\n\"{content[:120]}{'…' if len(content) > 120 else ''}\"",
                risk_level=assessment.risk_level.value,
            )

    return reply_content


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def telegram_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
) -> dict[str, str]:
    settings = get_settings()
    token = settings.telegram_bot_token
    if not token:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Telegram not configured.")

    # Verify secret token if one is set
    if settings.telegram_webhook_secret:
        if x_telegram_bot_api_secret_token != settings.telegram_webhook_secret:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid webhook secret.")

    body: dict[str, Any] = await request.json()
    message: dict[str, Any] | None = body.get("message") or body.get("edited_message")
    if not message:
        return {"ok": "true"}

    chat_id: str = str(message.get("chat", {}).get("id", ""))
    text: str = (message.get("text") or "").strip()

    if not chat_id or not text:
        return {"ok": "true"}

    # Drop floods before any DB work or profile creation.
    if not rate_allow(f"tg:{chat_id}", _RATE_MAX_EVENTS, _RATE_WINDOW_SECONDS):
        logger.warning("Telegram rate limit hit for chat %s", chat_id)
        _send_telegram_message(token, chat_id, "You're sending messages very quickly — give me a moment to catch up. 💛")
        return {"ok": "true"}

    # /start or /start <youth_id> from a Telegram deep link.
    if text.startswith("/start"):
        parts = text.split(maxsplit=1)
        if len(parts) == 2 and parts[1].strip():
            _link_chat_to_youth(db, token, chat_id, parts[1].strip())
            return {"ok": "true"}
        _get_or_create_public_intake_youth(db, chat_id)
        _send_telegram_message(token, chat_id, _WELCOME)
        return {"ok": "true"}

    # /link <youth_id>
    if text.startswith("/link"):
        parts = text.split(maxsplit=1)
        if len(parts) < 2 or not parts[1].strip():
            _send_telegram_message(token, chat_id, _LINK_USAGE)
            return {"ok": "true"}

        _link_chat_to_youth(db, token, chat_id, parts[1].strip())
        return {"ok": "true"}

    # Regular message — look up linked youth profile
    youth = db.scalar(select(YouthProfile).where(YouthProfile.telegram_chat_id == chat_id))
    if youth is None:
        _get_or_create_public_intake_youth(db, chat_id)
        _send_telegram_message(token, chat_id, _ASK_NAME)
        return {"ok": "true"}

    if _is_awaiting_name(youth):
        name = _record_public_intake_name(db, youth, text)
        _send_telegram_message(token, chat_id, _NAME_RECORDED.format(name=name))
        return {"ok": "true"}

    try:
        reply = _process_youth_message(db, youth, text)
        _send_telegram_message(token, chat_id, reply)
    except Exception as exc:
        logger.exception("Error processing Telegram message: %s", exc)
        _send_telegram_message(
            token, chat_id,
            "I ran into a problem. Please try again in a moment, or contact your worker directly."
        )

    return {"ok": "true"}

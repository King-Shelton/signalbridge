import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.conversation import Conversation, ConversationStatus
from app.models.handoff_brief import HandoffBrief
from app.models.message import Message, SenderType
from app.models.signal import Signal
from app.models.user import User, UserRole
from app.models.youth_profile import YouthProfile
from app.schemas.youth import (
    HandoffConsentRequest,
    HandoffConsentResponse,
    MessagePublic,
    SignalPublic,
    YouthConversationPublic,
    YouthConversationsResponse,
    YouthMessageCreate,
    YouthMessageCreateResponse,
)
from app.services.auth_service import get_current_user
from app.services.safenight_service import assess_safe_night_message
from app.services.ai_service import analyse_risk, apply_risk_to_conversation, build_handoff_brief_with_ai, generate_safenight_reply, get_conversation_messages, persist_signals
from app.routes.operations import handoff_payload

router = APIRouter()


def require_youth_profile(db: Session, user: User) -> YouthProfile:
    if user.role != UserRole.youth:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only youth users can use youth conversation endpoints.",
        )

    youth = db.scalar(select(YouthProfile).where(YouthProfile.user_id == user.id))
    if youth is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Youth profile not found for current user.",
        )
    return youth


def serialize_message(message: Message) -> MessagePublic:
    return MessagePublic(
        id=message.id,
        conversationId=message.conversation_id,
        senderType=message.sender_type.value,
        content=message.content,
        safetyStatus=message.safety_status,
        createdAt=message.created_at,
    )


def serialize_signal(signal: Signal) -> SignalPublic:
    return SignalPublic(
        id=signal.id,
        type=signal.type,
        severity=signal.severity,
        reason=signal.reason,
        source=signal.source,
        createdAt=signal.created_at,
    )


def serialize_conversation(db: Session, conversation: Conversation) -> YouthConversationPublic:
    youth = db.get(YouthProfile, conversation.youth_id)
    youth_name = "Unknown youth"
    if youth is not None:
        user = db.get(User, youth.user_id)
        if user is not None:
            youth_name = user.name

    messages = db.scalars(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.asc())
    ).all()
    signals = db.scalars(
        select(Signal)
        .where(Signal.conversation_id == conversation.id)
        .order_by(Signal.created_at.desc())
    ).all()

    return YouthConversationPublic(
        id=conversation.id,
        youthId=conversation.youth_id,
        youthName=youth_name,
        channel=conversation.channel,
        status=conversation.status.value,
        riskLevel=conversation.risk_level.value,
        riskScore=conversation.risk_score,
        consentToHandoff=conversation.consent_to_handoff,
        unresolvedHandoff=conversation.unresolved_handoff,
        lastMessageAt=conversation.last_message_at,
        createdAt=conversation.created_at,
        messages=[serialize_message(message) for message in messages],
        signals=[serialize_signal(signal) for signal in signals],
    )


def get_owned_conversation(db: Session, youth_id: str, conversation_id: str) -> Conversation:
    conversation = db.get(Conversation, conversation_id)
    if conversation is None or conversation.youth_id != youth_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
    return conversation


def write_audit_log(
    db: Session,
    actor_user_id: str | None,
    event_type: str,
    entity_type: str,
    entity_id: str,
    details: dict[str, object],
) -> None:
    db.add(
        AuditLog(
            actor_user_id=actor_user_id,
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            details=json.dumps(details),
        )
    )


@router.get("/conversations", response_model=YouthConversationsResponse)
def list_youth_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> YouthConversationsResponse:
    youth = require_youth_profile(db, current_user)
    conversations = db.scalars(
        select(Conversation)
        .where(Conversation.youth_id == youth.id)
        .order_by(Conversation.last_message_at.desc().nullslast(), Conversation.created_at.desc())
    ).all()

    return YouthConversationsResponse(
        conversations=[serialize_conversation(db, conversation) for conversation in conversations]
    )


@router.post("/conversations/{conversation_id}/messages", response_model=YouthMessageCreateResponse)
def create_youth_message(
    conversation_id: str,
    payload: YouthMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> YouthMessageCreateResponse:
    youth = require_youth_profile(db, current_user)
    conversation = get_owned_conversation(db, youth.id, conversation_id)
    now = datetime.utcnow()
    assessment = assess_safe_night_message(payload.content)

    history = get_conversation_messages(db, conversation.id)

    message = Message(
        conversation_id=conversation.id,
        sender_type=SenderType.youth,
        content=payload.content,
    )
    db.add(message)
    db.flush()

    reply_content = generate_safenight_reply(payload.content, history, assessment)
    ai_reply = Message(
        conversation_id=conversation.id,
        sender_type=SenderType.ai,
        content=reply_content,
        safety_status=assessment.safety_status,
    )
    db.add(ai_reply)
    db.flush()

    created_signals: list[Signal] = []
    for detected_signal in assessment.signals:
        signal = Signal(
            conversation_id=conversation.id,
            youth_id=youth.id,
            type=detected_signal.type,
            severity=detected_signal.severity,
            reason=detected_signal.reason,
            source="safenight_fallback",
        )
        db.add(signal)
        created_signals.append(signal)

    conversation.last_message_at = now
    risk_rank = {"low": 1, "medium": 2, "high": 3, "critical": 4}
    if risk_rank[assessment.risk_level.value] >= risk_rank[conversation.risk_level.value]:
        conversation.risk_level = assessment.risk_level
    conversation.risk_score = max(conversation.risk_score, assessment.risk_score)
    if assessment.handoff_recommended:
        conversation.status = ConversationStatus.needs_review
        conversation.unresolved_handoff = True

    write_audit_log(
        db,
        actor_user_id=current_user.id,
        event_type="message_created",
        entity_type="message",
        entity_id=message.id,
        details={
            "conversationId": conversation.id,
            "senderType": SenderType.youth.value,
            "riskLevel": conversation.risk_level.value,
            "riskScore": conversation.risk_score,
        },
    )
    write_audit_log(
        db,
        actor_user_id=None,
        event_type="safenight_fallback_response_created",
        entity_type="message",
        entity_id=ai_reply.id,
        details={
            "conversationId": conversation.id,
            "safetyStatus": assessment.safety_status,
            "handoffRecommended": assessment.handoff_recommended,
        },
    )

    db.commit()
    db.refresh(message)
    db.refresh(ai_reply)
    for signal in created_signals:
        db.refresh(signal)
    db.refresh(conversation)

    return YouthMessageCreateResponse(
        conversation=serialize_conversation(db, conversation),
        message=serialize_message(message),
        aiReply=serialize_message(ai_reply),
        signals=[serialize_signal(signal) for signal in created_signals],
        handoffRecommended=assessment.handoff_recommended,
        handoffPrompt="Would you like SignalBridge to prepare a short handoff note for your worker?",
    )


@router.post("/conversations/{conversation_id}/handoff-consent", response_model=HandoffConsentResponse)
def set_handoff_consent(
    conversation_id: str,
    payload: HandoffConsentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> HandoffConsentResponse:
    youth = require_youth_profile(db, current_user)
    conversation = get_owned_conversation(db, youth.id, conversation_id)
    conversation.consent_to_handoff = payload.consentGiven
    conversation.unresolved_handoff = payload.consentGiven
    if payload.consentGiven:
        conversation.status = ConversationStatus.needs_review
        existing_handoff = db.scalar(select(HandoffBrief).where(HandoffBrief.conversation_id == conversation.id))
        if existing_handoff is None:
            messages = get_conversation_messages(db, conversation.id)
            assessment = analyse_risk([message.content for message in messages], messages)
            apply_risk_to_conversation(conversation, assessment)
            persist_signals(db, conversation, assessment)
            handoff, _ = build_handoff_brief_with_ai(db, conversation, messages, assessment)
            db.add(handoff)

    write_audit_log(
        db,
        actor_user_id=current_user.id,
        event_type="handoff_consent_updated",
        entity_type="conversation",
        entity_id=conversation.id,
        details={
            "conversationId": conversation.id,
            "consentGiven": payload.consentGiven,
            "nextAction": "generate_handoff" if payload.consentGiven else "continue_safenight_chat",
        },
    )
    db.commit()
    db.refresh(conversation)

    return HandoffConsentResponse(
        conversation=serialize_conversation(db, conversation),
        conversationId=conversation.id,
        consentToHandoff=conversation.consent_to_handoff,
        unresolvedHandoff=conversation.unresolved_handoff,
        nextAction="generate_handoff" if conversation.consent_to_handoff else "continue_safenight_chat",
    )


@router.get("/handoffs")
def youth_handoffs(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    youth = require_youth_profile(db, current_user)
    handoffs = db.query(HandoffBrief).filter(HandoffBrief.youth_id == youth.id).order_by(HandoffBrief.created_at.desc()).all()
    visible = []
    for item in handoffs:
        conversation = db.get(Conversation, item.conversation_id)
        if conversation is not None and conversation.consent_to_handoff:
            visible.append(item)
    return {"handoffs": [handoff_payload(db, item) for item in visible]}

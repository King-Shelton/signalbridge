from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.conversation import Conversation, ConversationStatus, RiskLevel
from app.models.message import Message, SenderType
from app.models.signal import Signal
from app.models.youth_profile import YouthProfile
from app.schemas.conversation import (
    ConversationPublic,
    ConversationResponse,
    HandoffConsentRequest,
    HandoffConsentResponse,
    MessagePublic,
    SendMessageRequest,
    SendMessageResponse,
    SignalPublic,
)

router = APIRouter()

MIRA_CONVERSATION_ID = "conv_mira_after_hours"


def serialize_message(message: Message) -> MessagePublic:
    return MessagePublic(
        id=message.id,
        senderType=message.sender_type.value,
        content=message.content,
        safetyStatus=message.safety_status,
        createdAt=message.created_at,
    )


def serialize_signal(signal: Signal) -> SignalPublic:
    return SignalPublic(type=signal.type, severity=signal.severity, reason=signal.reason)


def get_conversation_or_404(db: Session, conversation_id: str) -> Conversation:
    conversation = db.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    return conversation


def build_conversation(db: Session, conversation: Conversation) -> ConversationPublic:
    youth = db.get(YouthProfile, conversation.youth_id)
    youth_name = "Mira Tan"
    if youth and youth.user:
        youth_name = youth.user.name

    messages = db.scalars(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.asc())
    ).all()
    signals = db.scalars(
        select(Signal)
        .where(Signal.conversation_id == conversation.id)
        .order_by(Signal.created_at.asc())
    ).all()

    return ConversationPublic(
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
        messages=[serialize_message(message) for message in messages],
        signals=[serialize_signal(signal) for signal in signals],
    )


def ensure_demo_conversation(db: Session) -> Conversation:
    conversation = db.get(Conversation, MIRA_CONVERSATION_ID)
    if conversation is not None:
        return conversation

    youth = db.get(YouthProfile, "youth_mira")
    if youth is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo youth profile not seeded",
        )

    conversation = Conversation(
        id=MIRA_CONVERSATION_ID,
        youth_id=youth.id,
        channel="Web Chat",
        status=ConversationStatus.active,
        risk_level=RiskLevel.low,
        risk_score=0,
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


@router.get("/youth/conversation", response_model=ConversationResponse)
def get_youth_conversation(db: Session = Depends(get_db)) -> ConversationResponse:
    conversation = ensure_demo_conversation(db)
    return ConversationResponse(conversation=build_conversation(db, conversation))


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=SendMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def send_message(
    conversation_id: str,
    payload: SendMessageRequest,
    db: Session = Depends(get_db),
) -> SendMessageResponse:
    conversation = get_conversation_or_404(db, conversation_id)
    now = datetime.utcnow()
    content = payload.content.strip()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message content cannot be blank",
        )

    youth_message = Message(
        conversation_id=conversation.id,
        sender_type=SenderType.youth,
        content=content,
        created_at=now,
    )
    ai_reply = Message(
        conversation_id=conversation.id,
        sender_type=SenderType.ai,
        content=(
            "I hear how tiring that is. I can help keep the details organised "
            "and prepare a short handoff note for your youth worker, so you do "
            "not need to explain everything again tomorrow."
        ),
        safety_status="passed",
        created_at=now,
    )

    conversation.status = ConversationStatus.needs_review
    conversation.risk_level = RiskLevel.high
    conversation.risk_score = max(conversation.risk_score, 78)
    conversation.unresolved_handoff = True
    conversation.last_message_at = now

    db.add(youth_message)
    db.add(ai_reply)
    db.add(
        AuditLog(
            actor_user_id=None,
            event_type="ai_response_generated",
            entity_type="conversation",
            entity_id=conversation.id,
            details="SafeNight generated a safety-bounded after-hours reply.",
        )
    )
    db.commit()
    db.refresh(youth_message)
    db.refresh(ai_reply)

    signals = db.scalars(
        select(Signal)
        .where(Signal.conversation_id == conversation.id)
        .order_by(Signal.created_at.asc())
    ).all()

    return SendMessageResponse(
        message=serialize_message(youth_message),
        aiReply=serialize_message(ai_reply),
        signals=[serialize_signal(signal) for signal in signals],
        handoffRecommended=True,
    )


@router.post("/handoffs/consent", response_model=HandoffConsentResponse)
def record_handoff_consent(
    payload: HandoffConsentRequest,
    db: Session = Depends(get_db),
) -> HandoffConsentResponse:
    conversation = get_conversation_or_404(db, payload.conversation_id)
    conversation.consent_to_handoff = payload.consent_given
    conversation.unresolved_handoff = payload.consent_given
    if payload.consent_given:
        conversation.status = ConversationStatus.needs_review

    db.add(
        AuditLog(
            actor_user_id=None,
            event_type="handoff_consent_received" if payload.consent_given else "handoff_consent_declined",
            entity_type="conversation",
            entity_id=conversation.id,
            details="Youth updated consent for sharing a handoff note.",
        )
    )
    db.commit()

    return HandoffConsentResponse(
        conversationId=conversation.id,
        consentToHandoff=conversation.consent_to_handoff,
        nextAction="generate_handoff" if conversation.consent_to_handoff else "continue_chat",
    )

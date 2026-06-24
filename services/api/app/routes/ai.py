from dataclasses import replace

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.conversation import Conversation, RiskLevel
from app.models.handoff_brief import HandoffBrief
from app.models.message import Message
from app.models.signal import Signal
from app.models.user import User, UserRole
from app.models.youth_profile import YouthProfile
from app.schemas.ai import (
    GenerateHandoffRequest,
    GenerateHandoffResponse,
    HandoffBriefPublic,
    RiskAnalysisResponse,
    SafetyCheckRequest,
    SafetyCheckResponse,
    SignalAnalysisItem,
    SignalAnalysisRequest,
    SuggestReplyRequest,
    SuggestReplyResponse,
)
from app.services.ai_service import (
    AI_MODE,
    apply_risk_to_conversation,
    analyse_risk,
    build_handoff_brief_with_ai,
    get_conversation_messages,
    get_youth_name,
    persist_signals,
    safety_check,
    suggest_worker_reply,
    write_audit_log,
)
from app.services.auth_service import get_current_user
from app.services.notifications import notify_worker
from app.models.worker_notification_settings import WorkerNotificationSettings
from app.models.youth_profile import YouthProfile as _YouthProfile

router = APIRouter()


def _alert_assigned_worker(db: Session, conversation: Conversation, title: str, body: str, risk_level: str) -> None:
    youth = db.get(_YouthProfile, conversation.youth_id)
    if youth is None or youth.assigned_worker_id is None:
        return
    settings = db.query(WorkerNotificationSettings).filter_by(user_id=youth.assigned_worker_id).first()
    if settings is None:
        return
    notify_worker(settings.telegram_chat_id, settings.discord_webhook_url, title, body, risk_level)


def require_conversation(db: Session, conversation_id: str) -> Conversation:
    conversation = db.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
    return conversation


def request_messages(payload: SignalAnalysisRequest) -> list[str]:
    messages = [message for message in payload.messages if message.strip()]
    if payload.content:
        messages.append(payload.content)
    if not messages and payload.conversationId is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide content, messages, or a conversationId.",
        )
    return messages


def serialize_signal(signal: Signal, matched_terms: list[str] | None = None) -> SignalAnalysisItem:
    return SignalAnalysisItem(
        id=signal.id,
        type=signal.type,
        severity=signal.severity,
        reason=signal.reason,
        matchedTerms=matched_terms or [],
        source=signal.source,
        createdAt=signal.created_at,
    )


def serialize_rule_signal(signal, source: str = AI_MODE) -> SignalAnalysisItem:
    return SignalAnalysisItem(
        type=signal.type,
        severity=signal.severity,
        reason=signal.reason,
        matchedTerms=signal.matched_terms,
        source=source,
    )


def serialize_handoff(db: Session, handoff: HandoffBrief) -> HandoffBriefPublic:
    return HandoffBriefPublic(
        id=handoff.id,
        conversationId=handoff.conversation_id,
        youthId=handoff.youth_id,
        youthName=get_youth_name(db, handoff.youth_id),
        mainConcern=handoff.main_concern,
        emotionalState=handoff.emotional_state,
        riskLevel=handoff.risk_level.value,
        riskScore=handoff.risk_score,
        keyQuote=handoff.key_quote,
        whatAiDid=handoff.what_ai_did,
        whatNotToRepeat=handoff.what_not_to_repeat,
        suggestedWorkerResponse=handoff.suggested_worker_response,
        recommendedNextStep=handoff.recommended_next_step,
        reviewStatus=handoff.review_status.value,
        createdAt=handoff.created_at,
    )


def risk_level_from_score(score: int) -> RiskLevel:
    if score >= 90:
        return RiskLevel.critical
    if score >= 70:
        return RiskLevel.high
    if score >= 40:
        return RiskLevel.medium
    return RiskLevel.low


@router.post("/analyse-risk", response_model=RiskAnalysisResponse)
def analyse_risk_endpoint(
    payload: SignalAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RiskAnalysisResponse:
    conversation = require_conversation(db, payload.conversationId) if payload.conversationId else None
    stored_messages = get_conversation_messages(db, conversation.id) if conversation else []
    incoming_messages = request_messages(payload)
    if not incoming_messages and stored_messages:
        incoming_messages = [message.content for message in stored_messages]

    assessment = analyse_risk(incoming_messages, stored_messages)
    created_signals: list[Signal] = []
    if conversation and payload.persist:
        created_signals = persist_signals(db, conversation, assessment)
        apply_risk_to_conversation(conversation, assessment)
        write_audit_log(
            db,
            actor_user_id=current_user.id,
            event_type="ai_risk_analysis_completed",
            entity_type="conversation",
            entity_id=conversation.id,
            details={
                "riskLevel": assessment.risk_level.value,
                "riskScore": assessment.risk_score,
                "signalTypes": [signal.type for signal in assessment.signals],
                "aiMode": assessment.ai_mode,
            },
        )
        db.commit()
        for signal in created_signals:
            db.refresh(signal)
        db.refresh(conversation)

        if assessment.risk_level.value in ("high", "critical"):
            _alert_assigned_worker(
                db,
                conversation,
                title=f"⚠️ {assessment.risk_level.value.title()} risk detected",
                body=f"Risk score: {assessment.risk_score}/100\nSignals: {', '.join(s.type.replace('_', ' ') for s in assessment.signals[:3]) or 'none'}",
                risk_level=assessment.risk_level.value,
            )

    signal_items = (
        [serialize_signal(signal) for signal in created_signals]
        if created_signals
        else [serialize_rule_signal(signal) for signal in assessment.signals]
    )
    return RiskAnalysisResponse(
        conversationId=conversation.id if conversation else None,
        riskLevel=assessment.risk_level.value,
        riskScore=assessment.risk_score,
        safetyStatus=assessment.safety_status,
        handoffRecommended=assessment.handoff_recommended,
        aiMode=assessment.ai_mode,
        signals=signal_items,
    )


@router.post("/generate-handoff", response_model=GenerateHandoffResponse)
def generate_handoff_endpoint(
    payload: GenerateHandoffRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GenerateHandoffResponse:
    conversation = require_conversation(db, payload.conversationId)
    if not conversation.consent_to_handoff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Youth consent is required before creating a handoff brief.",
        )
    youth = db.get(YouthProfile, conversation.youth_id)
    if current_user.role == UserRole.youth and (youth is None or youth.user_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This conversation belongs to another youth.")
    if current_user.role == UserRole.worker and (youth is None or youth.assigned_worker_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This conversation is assigned to another worker.")
    messages = get_conversation_messages(db, conversation.id)
    if not messages:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Conversation has no messages to summarise.",
        )

    assessment = analyse_risk([message.content for message in messages], messages)
    apply_risk_to_conversation(conversation, assessment)
    persist_signals(db, conversation, assessment)
    handoff, ai_mode = build_handoff_brief_with_ai(db, conversation, messages, assessment)
    db.add(handoff)
    db.flush()

    write_audit_log(
        db,
        actor_user_id=current_user.id,
        event_type="ai_handoff_brief_created",
        entity_type="handoff_brief",
        entity_id=handoff.id,
        details={
            "conversationId": conversation.id,
            "youthId": conversation.youth_id,
            "riskLevel": assessment.risk_level.value,
            "riskScore": assessment.risk_score,
            "aiMode": ai_mode,
        },
    )
    db.commit()
    db.refresh(handoff)

    _alert_assigned_worker(
        db,
        conversation,
        title="📋 Handoff brief ready",
        body=f"A handoff brief has been generated for {get_youth_name(db, conversation.youth_id)}.\nRisk: {assessment.risk_level.value} ({assessment.risk_score}/100)\nMain concern: {handoff.main_concern or 'See brief'}",
        risk_level=assessment.risk_level.value,
    )

    return GenerateHandoffResponse(
        handoffBrief=serialize_handoff(db, handoff),
        aiMode=ai_mode,
    )


@router.post("/suggest-reply", response_model=SuggestReplyResponse)
def suggest_reply_endpoint(
    payload: SuggestReplyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SuggestReplyResponse:
    conversation = require_conversation(db, payload.conversationId) if payload.conversationId else None
    messages: list[str] = []
    stored_messages: list[Message] = []
    if conversation:
        stored_messages = get_conversation_messages(db, conversation.id)
        messages.extend(message.content for message in stored_messages)
    if payload.content:
        messages.append(payload.content)
    if not messages:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide content or a conversationId with messages.",
        )

    assessment = analyse_risk(messages, stored_messages)
    if payload.riskScore is not None and payload.riskScore > assessment.risk_score:
        override_level = risk_level_from_score(payload.riskScore)
        assessment = replace(
            assessment,
            risk_score=payload.riskScore,
            risk_level=override_level,
            safety_status="requires_immediate_human_review"
            if override_level == RiskLevel.critical
            else assessment.safety_status,
            handoff_recommended=payload.riskScore >= 40,
        )

    reply = suggest_worker_reply(assessment)
    write_audit_log(
        db,
        actor_user_id=current_user.id,
        event_type="ai_reply_suggested",
        entity_type="conversation" if conversation else "ai_request",
        entity_id=conversation.id if conversation else current_user.id,
        details={
            "conversationId": conversation.id if conversation else None,
            "riskLevel": assessment.risk_level.value,
            "riskScore": assessment.risk_score,
            "aiMode": assessment.ai_mode,
        },
    )
    db.commit()

    return SuggestReplyResponse(
        conversationId=conversation.id if conversation else None,
        suggestedReply=reply,
        riskLevel=assessment.risk_level.value,
        riskScore=assessment.risk_score,
        safetyStatus=assessment.safety_status,
        aiMode=assessment.ai_mode,
    )


@router.post("/safety-check", response_model=SafetyCheckResponse)
def safety_check_endpoint(
    payload: SafetyCheckRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SafetyCheckResponse:
    assessment = safety_check(payload.content)
    blocked = assessment.risk_level == RiskLevel.critical
    write_audit_log(
        db,
        actor_user_id=current_user.id,
        event_type="ai_safety_check_completed",
        entity_type="ai_request",
        entity_id=current_user.id,
        details={
            "blocked": blocked,
            "riskLevel": assessment.risk_level.value,
            "riskScore": assessment.risk_score,
            "signalTypes": [signal.type for signal in assessment.signals],
            "aiMode": assessment.ai_mode,
        },
    )
    db.commit()

    return SafetyCheckResponse(
        safetyStatus=assessment.safety_status,
        blocked=blocked,
        riskLevel=assessment.risk_level.value,
        riskScore=assessment.risk_score,
        aiMode=assessment.ai_mode,
        reasons=[signal.reason for signal in assessment.signals],
        signals=[serialize_rule_signal(signal) for signal in assessment.signals],
    )

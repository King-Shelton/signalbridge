from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.case import Case
from app.models.case_note import CaseNote
from app.models.conversation import Conversation
from app.models.handoff_brief import HandoffBrief, ReviewStatus
from app.models.message import Message
from app.models.signal import Signal
from app.models.user import User
from app.models.youth_profile import YouthProfile
from app.schemas.worker import (
    CaseNoteCreate,
    CaseNoteCreateResponse,
    CaseStatusUpdate,
    CaseStatusUpdateResponse,
    CockpitItemPublic,
    SignalEvidencePublic,
    SignalRadarItemPublic,
    SignalRadarResponse,
    WorkerCaseNotePublic,
    WorkerCasePublic,
    WorkerCockpitResponse,
    WorkerCockpitStats,
    WorkerConversationPublic,
    WorkerConversationResponse,
    WorkerHandoffPublic,
    WorkerHandoffResponse,
    WorkerMessagePublic,
    WorkerSignalPublic,
    WorkerYouthPublic,
    WorkerYouthDetailResponse,
    YouthSignalsResponse,
)
from app.services.auth_service import get_current_user
from app.services.case_service import (
    follow_up_status,
    get_case_for_youth,
    get_visible_case,
    get_visible_conversation,
    get_visible_handoff,
    handoffs_for_conversation,
    latest_conversation_for_youth,
    latest_handoff_for_youth,
    query_visible_cases,
    reasons_for_case,
    require_worker_scope,
    signals_for_conversation,
    suggested_action,
    validate_case_status,
    write_audit_log,
)

router = APIRouter()
signals_router = APIRouter()


def youth_name(db: Session, youth: YouthProfile | None) -> str:
    if youth is None:
        return "Unknown youth"
    user = db.get(User, youth.user_id)
    return user.name if user is not None else "Unknown youth"


def serialize_youth(db: Session, youth: YouthProfile) -> WorkerYouthPublic:
    return WorkerYouthPublic(
        id=youth.id,
        name=youth_name(db, youth),
        assignedWorkerId=youth.assigned_worker_id,
        preferredChannel=youth.preferred_channel,
        supportStyle=youth.support_style,
        stressors=youth.stressors,
    )


def serialize_message(message: Message) -> WorkerMessagePublic:
    return WorkerMessagePublic(
        id=message.id,
        conversationId=message.conversation_id,
        senderType=message.sender_type.value,
        content=message.content,
        safetyStatus=message.safety_status,
        createdAt=message.created_at,
    )


def serialize_signal(signal: Signal) -> WorkerSignalPublic:
    return WorkerSignalPublic(
        id=signal.id,
        type=signal.type,
        severity=signal.severity,
        reason=signal.reason,
        source=signal.source,
        createdAt=signal.created_at,
    )


def serialize_signal_evidence(signal: Signal) -> SignalEvidencePublic:
    return SignalEvidencePublic(
        label=signal.type.replace("_", " ").title(),
        detail=signal.reason,
        severity=signal.severity,
        source=signal.source,
        createdAt=signal.created_at,
    )


def serialize_conversation(db: Session, conversation: Conversation, include_messages: bool = False) -> WorkerConversationPublic:
    youth = db.get(YouthProfile, conversation.youth_id)
    messages = []
    if include_messages:
        messages = db.scalars(
            select(Message)
            .where(Message.conversation_id == conversation.id)
            .order_by(Message.created_at.asc())
        ).all()
    signals = signals_for_conversation(db, conversation.id)

    return WorkerConversationPublic(
        id=conversation.id,
        youthId=conversation.youth_id,
        youthName=youth_name(db, youth),
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


def serialize_handoff(db: Session, handoff: HandoffBrief) -> WorkerHandoffPublic:
    return WorkerHandoffPublic(
        id=handoff.id,
        conversationId=handoff.conversation_id,
        youthId=handoff.youth_id,
        youthName=youth_name(db, db.get(YouthProfile, handoff.youth_id)),
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


def serialize_case_note(db: Session, note: CaseNote) -> WorkerCaseNotePublic:
    author = db.get(User, note.author_user_id)
    return WorkerCaseNotePublic(
        id=note.id,
        caseId=note.case_id,
        authorUserId=note.author_user_id,
        authorName=author.name if author is not None else "Unknown worker",
        content=note.content,
        followUpAction=note.follow_up_action,
        createdAt=note.created_at,
    )


def serialize_case(db: Session, case: Case, include_notes: bool = False) -> WorkerCasePublic:
    notes: list[CaseNote] = []
    if include_notes:
        notes = db.scalars(
            select(CaseNote)
            .where(CaseNote.case_id == case.id)
            .order_by(CaseNote.created_at.desc())
        ).all()
    return WorkerCasePublic(
        id=case.id,
        youthId=case.youth_id,
        assignedWorkerId=case.assigned_worker_id,
        status=case.status.value,
        priority=case.priority,
        summary=case.summary,
        nextFollowUpAt=case.next_follow_up_at,
        createdAt=case.created_at,
        updatedAt=case.updated_at,
        notes=[serialize_case_note(db, note) for note in notes],
    )


def build_cockpit_item(db: Session, case: Case) -> CockpitItemPublic:
    youth = db.get(YouthProfile, case.youth_id)
    if youth is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Case youth profile missing.")
    conversation = latest_conversation_for_youth(db, case.youth_id)
    handoff = latest_handoff_for_youth(db, case.youth_id)
    signals = signals_for_conversation(db, conversation.id) if conversation else []

    return CockpitItemPublic(
        case=serialize_case(db, case),
        youth=serialize_youth(db, youth),
        conversation=serialize_conversation(db, conversation) if conversation else None,
        handoffBrief=serialize_handoff(db, handoff) if handoff else None,
        reasons=reasons_for_case(case, conversation, signals),
        suggestedAction=suggested_action(case, conversation, handoff),
        followUpStatus=follow_up_status(case),
    )


def conversations_for_youth(db: Session, youth_id: str) -> list[Conversation]:
    return db.scalars(
        select(Conversation)
        .where(Conversation.youth_id == youth_id)
        .order_by(Conversation.last_message_at.desc().nullslast(), Conversation.created_at.desc())
    ).all()


def handoffs_for_youth(db: Session, youth_id: str) -> list[HandoffBrief]:
    return db.scalars(
        select(HandoffBrief)
        .where(HandoffBrief.youth_id == youth_id)
        .order_by(HandoffBrief.created_at.desc())
    ).all()


def signals_for_youth(db: Session, youth_id: str) -> list[Signal]:
    return db.scalars(
        select(Signal)
        .where(Signal.youth_id == youth_id)
        .order_by(Signal.created_at.desc())
    ).all()


def visible_youth_cases(db: Session, current_user: User) -> list[Case]:
    return query_visible_cases(db, current_user)


def get_visible_youth_context(db: Session, current_user: User, youth_id: str) -> tuple[YouthProfile, Case | None]:
    require_worker_scope(current_user)
    youth = db.get(YouthProfile, youth_id)
    if youth is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Youth profile not found.")
    case = get_case_for_youth(db, current_user, youth_id)
    if case is None and current_user.role.value not in {"supervisor", "admin"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Youth profile not found.")
    return youth, case


def historical_context_for_youth(youth: YouthProfile, case: Case | None, handoffs: list[HandoffBrief]) -> list[str]:
    context: list[str] = []
    if youth.support_style:
        context.append(f"Support style: {youth.support_style}")
    if youth.stressors:
        context.append(f"Known stressors: {youth.stressors}")
    if case and case.summary:
        context.append(f"Current case summary: {case.summary}")
    for handoff in handoffs[:3]:
        context.append(
            f"Previous handoff: {handoff.main_concern} | worker guidance: {handoff.recommended_next_step or 'Review with youth at their pace.'}"
        )
    return context or ["No historical context has been recorded yet."]


def build_radar_item(db: Session, case: Case) -> SignalRadarItemPublic:
    youth = db.get(YouthProfile, case.youth_id)
    if youth is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Case youth profile missing.")
    conversation = latest_conversation_for_youth(db, case.youth_id)
    handoff = latest_handoff_for_youth(db, case.youth_id)
    signals = signals_for_conversation(db, conversation.id) if conversation else []
    risk_score = conversation.risk_score if conversation else 0
    risk_level = conversation.risk_level.value if conversation else "low"
    unresolved_handoff = bool(conversation and conversation.unresolved_handoff)
    reasons = reasons_for_case(case, conversation, signals)
    explanation = [
        f"Risk score is {risk_score}, read from the latest visible conversation rather than inferred silently.",
        "Unresolved handoff is prioritised ahead of routine follow-up." if unresolved_handoff else "No unresolved handoff is currently attached to the latest conversation.",
    ]
    if signals:
        explanation.append(
            "Top signal evidence: "
            + "; ".join(f"{signal.type.replace('_', ' ')} ({signal.severity}) - {signal.reason}" for signal in signals[:3])
        )
    else:
        explanation.append("No signal rows are attached to the latest conversation.")

    return SignalRadarItemPublic(
        youthId=youth.id,
        youthName=youth_name(db, youth),
        conversationId=conversation.id if conversation else None,
        caseId=case.id,
        riskLevel=risk_level,
        riskScore=risk_score,
        unresolvedHandoff=unresolved_handoff,
        lastActivityAt=conversation.last_message_at if conversation else case.updated_at,
        reasons=reasons,
        suggestedAction=suggested_action(case, conversation, handoff),
        explanation=explanation,
        evidence=[serialize_signal_evidence(signal) for signal in signals],
    )


def sort_radar_items(items: list[SignalRadarItemPublic]) -> list[SignalRadarItemPublic]:
    return sorted(
        items,
        key=lambda item: (
            not item.unresolvedHandoff,
            -item.riskScore,
            -(item.lastActivityAt.timestamp() if item.lastActivityAt else 0),
        ),
    )


def build_youth_detail(
    db: Session,
    youth: YouthProfile,
    case: Case | None,
    radar_item: SignalRadarItemPublic | None,
) -> WorkerYouthDetailResponse:
    conversations = conversations_for_youth(db, youth.id)
    handoffs = handoffs_for_youth(db, youth.id)
    signals = signals_for_youth(db, youth.id)
    return WorkerYouthDetailResponse(
        youth=serialize_youth(db, youth),
        case=serialize_case(db, case, include_notes=True) if case else None,
        conversations=[serialize_conversation(db, conversation, include_messages=True) for conversation in conversations],
        signals=[serialize_signal(signal) for signal in signals],
        previousHandoffs=[serialize_handoff(db, handoff) for handoff in handoffs],
        historicalContext=historical_context_for_youth(youth, case, handoffs),
        radarItem=radar_item,
    )


@router.get("/cockpit", response_model=WorkerCockpitResponse)
def get_worker_cockpit(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WorkerCockpitResponse:
    scope = require_worker_scope(current_user)
    cases = query_visible_cases(db, current_user)
    items = [build_cockpit_item(db, case) for case in cases]
    items.sort(
        key=lambda item: (
            not bool(item.conversation and item.conversation.unresolvedHandoff),
            -(item.conversation.riskScore if item.conversation else 0),
            -(item.conversation.lastMessageAt.timestamp() if item.conversation and item.conversation.lastMessageAt else 0),
        )
    )
    stats = WorkerCockpitStats(
        activeCases=sum(1 for case in cases if case.status.value != "closed"),
        highRiskCases=sum(1 for item in items if item.conversation and item.conversation.riskScore >= 70),
        unresolvedHandoffs=sum(1 for item in items if item.conversation and item.conversation.unresolvedHandoff),
        needsFollowUp=sum(1 for case in cases if case.status.value == "needs_follow_up"),
    )
    return WorkerCockpitResponse(workerId=current_user.id, scope=scope, stats=stats, cases=items)


@router.get("/youths/{youth_id}", response_model=WorkerYouthDetailResponse)
def get_worker_youth(
    youth_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WorkerYouthDetailResponse:
    youth, case = get_visible_youth_context(db, current_user, youth_id)
    radar_item = build_radar_item(db, case) if case else None
    return build_youth_detail(db, youth, case, radar_item)


@signals_router.get("/radar", response_model=SignalRadarResponse)
def get_signal_radar(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SignalRadarResponse:
    require_worker_scope(current_user)
    items = [build_radar_item(db, case) for case in visible_youth_cases(db, current_user)]
    return SignalRadarResponse(items=sort_radar_items(items))


@signals_router.get("/youth/{youth_id}", response_model=YouthSignalsResponse)
def get_youth_signals(
    youth_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> YouthSignalsResponse:
    youth, case = get_visible_youth_context(db, current_user, youth_id)
    radar_item = build_radar_item(db, case) if case else None
    detail = build_youth_detail(db, youth, case, radar_item)
    return YouthSignalsResponse(
        youth=detail.youth,
        radarItem=detail.radarItem,
        signals=detail.signals,
        conversations=detail.conversations,
        previousHandoffs=detail.previousHandoffs,
        explanation=radar_item.explanation if radar_item else detail.historicalContext,
    )


@router.get("/conversations/{conversation_id}", response_model=WorkerConversationResponse)
def get_worker_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WorkerConversationResponse:
    conversation = get_visible_conversation(db, current_user, conversation_id)
    youth = db.get(YouthProfile, conversation.youth_id)
    if youth is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Youth profile not found.")
    case = get_case_for_youth(db, current_user, conversation.youth_id)
    handoffs = handoffs_for_conversation(db, conversation.id)

    write_audit_log(
        db,
        actor_user_id=current_user.id,
        event_type="worker_conversation_reviewed",
        entity_type="conversation",
        entity_id=conversation.id,
        details={"conversationId": conversation.id, "caseId": case.id if case else None, "youthId": conversation.youth_id},
    )
    db.commit()

    return WorkerConversationResponse(
        conversation=serialize_conversation(db, conversation, include_messages=True),
        youth=serialize_youth(db, youth),
        case=serialize_case(db, case, include_notes=True) if case else None,
        handoffBriefs=[serialize_handoff(db, handoff) for handoff in handoffs],
    )


@router.get("/handoffs/{handoff_id}", response_model=WorkerHandoffResponse)
def get_worker_handoff(
    handoff_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WorkerHandoffResponse:
    handoff = get_visible_handoff(db, current_user, handoff_id)
    conversation = db.get(Conversation, handoff.conversation_id)
    youth = db.get(YouthProfile, handoff.youth_id)
    if conversation is None or youth is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handoff context not found.")
    case = get_case_for_youth(db, current_user, handoff.youth_id)

    previous_status = handoff.review_status.value
    if handoff.review_status == ReviewStatus.pending:
        handoff.review_status = ReviewStatus.reviewed
    write_audit_log(
        db,
        actor_user_id=current_user.id,
        event_type="worker_handoff_reviewed",
        entity_type="handoff_brief",
        entity_id=handoff.id,
        details={
            "handoffId": handoff.id,
            "conversationId": handoff.conversation_id,
            "caseId": case.id if case else None,
            "previousReviewStatus": previous_status,
            "reviewStatus": handoff.review_status.value,
        },
    )
    db.commit()
    db.refresh(handoff)

    return WorkerHandoffResponse(
        handoffBrief=serialize_handoff(db, handoff),
        conversation=serialize_conversation(db, conversation, include_messages=True),
        youth=serialize_youth(db, youth),
        case=serialize_case(db, case, include_notes=True) if case else None,
    )


@router.post("/cases/{case_id}/notes", response_model=CaseNoteCreateResponse, status_code=status.HTTP_201_CREATED)
def create_case_note(
    case_id: str,
    payload: CaseNoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CaseNoteCreateResponse:
    case = get_visible_case(db, current_user, case_id)
    note = CaseNote(
        case_id=case.id,
        author_user_id=current_user.id,
        content=payload.content.strip(),
        follow_up_action=payload.followUpAction.strip() if payload.followUpAction else None,
    )
    if not note.content:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Note content cannot be blank.")
    case.updated_at = datetime.utcnow()
    db.add(note)
    db.flush()
    write_audit_log(
        db,
        actor_user_id=current_user.id,
        event_type="case_note_added",
        entity_type="case",
        entity_id=case.id,
        details={"caseId": case.id, "noteId": note.id, "followUpAction": note.follow_up_action},
    )
    db.commit()
    db.refresh(case)
    db.refresh(note)
    return CaseNoteCreateResponse(case=serialize_case(db, case, include_notes=True), note=serialize_case_note(db, note))


@router.patch("/cases/{case_id}/status", response_model=CaseStatusUpdateResponse)
def update_case_status(
    case_id: str,
    payload: CaseStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CaseStatusUpdateResponse:
    case = get_visible_case(db, current_user, case_id)
    previous = {"status": case.status.value, "priority": case.priority, "nextFollowUpAt": case.next_follow_up_at.isoformat() if case.next_follow_up_at else None}
    case.status = validate_case_status(payload.status)
    if payload.priority is not None:
        case.priority = payload.priority
    case.next_follow_up_at = payload.nextFollowUpAt
    case.updated_at = datetime.utcnow()
    write_audit_log(
        db,
        actor_user_id=current_user.id,
        event_type="case_status_updated",
        entity_type="case",
        entity_id=case.id,
        details={
            "caseId": case.id,
            "previous": previous,
            "current": {
                "status": case.status.value,
                "priority": case.priority,
                "nextFollowUpAt": case.next_follow_up_at.isoformat() if case.next_follow_up_at else None,
            },
        },
    )
    db.commit()
    db.refresh(case)
    return CaseStatusUpdateResponse(case=serialize_case(db, case, include_notes=True))

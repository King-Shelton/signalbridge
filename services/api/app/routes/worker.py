import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.case import Case, CaseStatus as DbCaseStatus
from app.models.conversation import Conversation, RiskLevel
from app.models.handoff_brief import HandoffBrief, ReviewStatus
from app.models.user import User, UserRole
from app.models.youth_profile import YouthProfile
from app.schemas.ai import HandoffBriefPublic
from app.schemas.worker import (
    WorkerCasePublic,
    WorkerCaseStatusUpdateRequest,
    WorkerCasesResponse,
    WorkerHandoffResponse,
    WorkerNoteCreateRequest,
)
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/worker", tags=["worker"])

CASE_STATUS_TO_DB = {
    "New": DbCaseStatus.open,
    "Needs Review": DbCaseStatus.needs_follow_up,
    "In Progress": DbCaseStatus.open,
    "Followed Up": DbCaseStatus.open,
    "Escalated": DbCaseStatus.escalated,
    "Closed": DbCaseStatus.closed,
}

CASE_STATUS_FALLBACK = {
    DbCaseStatus.open: "New",
    DbCaseStatus.needs_follow_up: "Needs Review",
    DbCaseStatus.escalated: "Escalated",
    DbCaseStatus.closed: "Closed",
}


def require_worker(current_user: User) -> User:
    if current_user.role not in {UserRole.worker, UserRole.supervisor, UserRole.admin}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Worker dashboard access is restricted to worker roles.",
        )
    return current_user


def load_user_name(db: Session, youth_id: str) -> str:
    youth = db.get(YouthProfile, youth_id)
    if youth is None:
        return "Unknown youth"
    user = db.get(User, youth.user_id)
    return user.name if user is not None else "Unknown youth"


def parse_details(details: str | None) -> dict[str, object]:
    if not details:
        return {}
    try:
        parsed = json.loads(details)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        return {}


def latest_audit_details(db: Session, entity_type: str, entity_id: str, event_types: set[str]) -> tuple[AuditLog | None, dict[str, object]]:
    audit = db.scalar(
        select(AuditLog)
        .where(AuditLog.entity_type == entity_type, AuditLog.entity_id == entity_id, AuditLog.event_type.in_(event_types))
        .order_by(AuditLog.created_at.desc())
    )
    if audit is None:
        return None, {}
    return audit, parse_details(audit.details)


def latest_note(db: Session, case_id: str, handoff_id: str) -> tuple[str | None, datetime | None]:
    audit = db.scalar(
        select(AuditLog)
        .where(
            AuditLog.entity_type == "worker_note",
            AuditLog.entity_id.in_([case_id, handoff_id]),
        )
        .order_by(AuditLog.created_at.desc())
    )
    if audit is None:
        return None, None

    details = parse_details(audit.details)
    note = details.get("note")
    return (note if isinstance(note, str) else None, audit.created_at)


def current_case_status(db: Session, case: Case, handoff: HandoffBrief | None) -> tuple[str, datetime | None]:
    audit, details = latest_audit_details(db, "case", case.id, {"worker_case_status_updated", "worker_case_status_seed"})
    if audit is not None:
        status_label = details.get("caseStatus")
        if isinstance(status_label, str) and status_label:
            return status_label, audit.created_at

    fallback = CASE_STATUS_FALLBACK.get(case.status, "New")
    if case.status == DbCaseStatus.open and handoff is not None:
        if handoff.review_status == ReviewStatus.pending:
            fallback = "Needs Review" if case.priority == "high" else "In Progress"
        elif handoff.review_status == ReviewStatus.reviewed:
            fallback = "Followed Up"
        elif handoff.review_status == ReviewStatus.escalated:
            fallback = "Escalated"
    return fallback, case.updated_at


def serialize_case(db: Session, case: Case) -> WorkerCasePublic:
    youth_name = load_user_name(db, case.youth_id)
    youth = db.get(YouthProfile, case.youth_id)
    conversation = db.scalar(
        select(Conversation).where(Conversation.youth_id == case.youth_id).order_by(Conversation.created_at.desc())
    )
    handoff = db.scalar(
        select(HandoffBrief).where(HandoffBrief.youth_id == case.youth_id).order_by(HandoffBrief.created_at.desc())
    )
    case_status, status_updated_at = current_case_status(db, case, handoff)
    note, note_updated_at = latest_note(db, case.id, handoff.id if handoff is not None else case.id)

    suggested_action = (
        handoff.recommended_next_step
        if handoff is not None and handoff.recommended_next_step
        else case.summary
        or "Review the case and decide the next support step."
    )

    return WorkerCasePublic(
        caseId=case.id,
        youthId=case.youth_id,
        youthName=youth_name,
        handoffId=handoff.id if handoff is not None else case.id,
        channel=conversation.channel if conversation is not None else (youth.preferred_channel if youth else "Web Chat"),
        riskLevel=conversation.risk_level.value if conversation is not None else "low",
        riskScore=conversation.risk_score if conversation is not None else 0,
        lastActive=conversation.last_message_at if conversation is not None else None,
        suggestedAction=suggested_action,
        caseStatus=case_status,
        reviewStatus=handoff.review_status.value if handoff is not None else ReviewStatus.pending.value,
        latestNote=note,
        latestNoteAt=note_updated_at,
    )


def serialize_handoff(db: Session, handoff: HandoffBrief) -> WorkerHandoffResponse:
    case = db.scalar(select(Case).where(Case.youth_id == handoff.youth_id))
    if case is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found for handoff brief.")

    case_status, _ = current_case_status(db, case, handoff)
    note, note_updated_at = latest_note(db, case.id, handoff.id)

    return WorkerHandoffResponse(
        handoffId=handoff.id,
        caseId=case.id,
        youthId=handoff.youth_id,
        youthName=load_user_name(db, handoff.youth_id),
        channel=db.scalar(select(Conversation.channel).where(Conversation.youth_id == handoff.youth_id))
        or "Web Chat",
        caseStatus=case_status,
        latestNote=note,
        latestNoteAt=note_updated_at,
        suggestedAction=handoff.recommended_next_step or case.summary or "Review the handoff and decide the next step.",
        handoffBrief=HandoffBriefPublic(
            id=handoff.id,
            conversationId=handoff.conversation_id,
            youthId=handoff.youth_id,
            youthName=load_user_name(db, handoff.youth_id),
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
        ).model_dump(mode="json"),
    )


@router.get("/cases", response_model=WorkerCasesResponse)
def list_worker_cases(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WorkerCasesResponse:
    require_worker(current_user)
    cases = db.scalars(select(Case).order_by(Case.updated_at.desc(), Case.created_at.desc())).all()
    return WorkerCasesResponse(cases=[serialize_case(db, case) for case in cases])


@router.get("/handoffs/{handoff_id}", response_model=WorkerHandoffResponse)
def get_worker_handoff(
    handoff_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WorkerHandoffResponse:
    require_worker(current_user)
    handoff = db.get(HandoffBrief, handoff_id)
    if handoff is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handoff brief not found.")
    return serialize_handoff(db, handoff)


@router.patch("/cases/{case_id}", response_model=WorkerCasePublic)
def update_worker_case_status(
    case_id: str,
    payload: WorkerCaseStatusUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WorkerCasePublic:
    require_worker(current_user)
    case = db.get(Case, case_id)
    if case is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")

    db_status = CASE_STATUS_TO_DB.get(payload.caseStatus)
    if db_status is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unsupported case status.",
        )

    case.status = db_status
    db.add(
        AuditLog(
            actor_user_id=current_user.id,
            event_type="worker_case_status_updated",
            entity_type="case",
            entity_id=case.id,
            details=json.dumps({"caseStatus": payload.caseStatus}),
        )
    )
    db.commit()
    db.refresh(case)
    return serialize_case(db, case)


@router.post("/handoffs/{handoff_id}/notes", response_model=WorkerHandoffResponse)
def add_worker_note(
    handoff_id: str,
    payload: WorkerNoteCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WorkerHandoffResponse:
    require_worker(current_user)
    handoff = db.get(HandoffBrief, handoff_id)
    if handoff is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handoff brief not found.")

    case = db.scalar(select(Case).where(Case.youth_id == handoff.youth_id))
    if case is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found for handoff brief.")

    db.add(
        AuditLog(
            actor_user_id=current_user.id,
            event_type="worker_note_added",
            entity_type="worker_note",
            entity_id=handoff.id,
            details=json.dumps({"note": payload.note}),
        )
    )
    db.commit()

    return serialize_handoff(db, handoff)

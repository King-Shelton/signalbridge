import json
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.case import Case, CaseStatus
from app.models.conversation import Conversation, RiskLevel
from app.models.handoff_brief import HandoffBrief
from app.models.signal import Signal
from app.models.user import User, UserRole
from app.models.youth_profile import YouthProfile
from app.timeutil import naive_utcnow


SUPERVISOR_ROLES = {UserRole.supervisor, UserRole.admin}
WORKER_ROLES = {UserRole.worker, *SUPERVISOR_ROLES}


def require_worker_scope(user: User) -> str:
    if user.role not in WORKER_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only worker or supervisor users can access worker case endpoints.",
        )
    return "supervisor" if user.role in SUPERVISOR_ROLES else "assigned_worker"


def query_visible_cases(db: Session, user: User) -> list[Case]:
    require_worker_scope(user)
    statement = select(Case).order_by(Case.updated_at.desc(), Case.created_at.desc())
    if user.role not in SUPERVISOR_ROLES:
        statement = statement.where(Case.assigned_worker_id == user.id)
    return db.scalars(statement).all()


def get_visible_case(db: Session, user: User, case_id: str) -> Case:
    case = db.get(Case, case_id)
    if case is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")
    require_case_access(user, case)
    return case


def require_case_access(user: User, case: Case) -> None:
    require_worker_scope(user)
    if user.role in SUPERVISOR_ROLES:
        return
    if case.assigned_worker_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found.",
        )


def get_case_for_youth(db: Session, user: User, youth_id: str) -> Case | None:
    statement = select(Case).where(Case.youth_id == youth_id).order_by(Case.updated_at.desc())
    if user.role not in SUPERVISOR_ROLES:
        statement = statement.where(Case.assigned_worker_id == user.id)
    return db.scalars(statement).first()


def get_visible_conversation(db: Session, user: User, conversation_id: str) -> Conversation:
    conversation = db.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
    case = get_case_for_youth(db, user, conversation.youth_id)
    if case is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
    return conversation


def get_visible_handoff(db: Session, user: User, handoff_id: str) -> HandoffBrief:
    handoff = db.get(HandoffBrief, handoff_id)
    if handoff is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handoff brief not found.")
    case = get_case_for_youth(db, user, handoff.youth_id)
    if case is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handoff brief not found.")
    return handoff


def latest_conversation_for_youth(db: Session, youth_id: str) -> Conversation | None:
    return db.scalars(
        select(Conversation)
        .where(Conversation.youth_id == youth_id)
        .order_by(Conversation.last_message_at.desc().nullslast(), Conversation.created_at.desc())
    ).first()


def latest_handoff_for_youth(db: Session, youth_id: str) -> HandoffBrief | None:
    return db.scalars(
        select(HandoffBrief)
        .where(HandoffBrief.youth_id == youth_id)
        .order_by(HandoffBrief.created_at.desc())
    ).first()


def handoffs_for_conversation(db: Session, conversation_id: str) -> list[HandoffBrief]:
    return db.scalars(
        select(HandoffBrief)
        .where(HandoffBrief.conversation_id == conversation_id)
        .order_by(HandoffBrief.created_at.desc())
    ).all()


def signals_for_conversation(db: Session, conversation_id: str) -> list[Signal]:
    return db.scalars(
        select(Signal)
        .where(Signal.conversation_id == conversation_id)
        .order_by(Signal.created_at.desc())
    ).all()


def suggested_action(case: Case, conversation: Conversation | None, handoff: HandoffBrief | None) -> str:
    if conversation and conversation.risk_level == RiskLevel.critical:
        return "Escalate for immediate human safety review"
    if handoff and handoff.review_status.value == "pending":
        return "Review youth-approved handoff brief"
    if conversation and conversation.unresolved_handoff:
        return "Resolve unresolved handoff"
    if case.status == CaseStatus.needs_review:
        return "Follow up with youth"
    if case.status == CaseStatus.escalated:
        return "Coordinate escalation follow-up"
    if case.status == CaseStatus.closed:
        return "No active action"
    return "Monitor conversation"


def follow_up_status(case: Case) -> str:
    if case.status == CaseStatus.closed:
        return "closed"
    if case.next_follow_up_at is None:
        return "not_scheduled"
    return "overdue" if case.next_follow_up_at < naive_utcnow() else "scheduled"


def reasons_for_case(case: Case, conversation: Conversation | None, signals: list[Signal]) -> list[str]:
    reasons: list[str] = []
    if conversation:
        if conversation.unresolved_handoff:
            reasons.append("Unresolved handoff")
        if conversation.risk_score >= 70:
            reasons.append("High risk score")
        elif conversation.risk_score >= 40:
            reasons.append("Medium risk score")
    for signal in signals[:4]:
        label = signal.type.replace("_", " ").title()
        if label not in reasons:
            reasons.append(label)
    if case.status == CaseStatus.needs_review:
        reasons.append("Needs follow-up")
    if case.status == CaseStatus.escalated:
        reasons.append("Escalated case")
    return reasons or ["Assigned case"]


def validate_case_status(value: str) -> CaseStatus:
    try:
        return CaseStatus(value)
    except ValueError as exc:
        valid = ", ".join(status.value for status in CaseStatus)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid case status. Expected one of: {valid}.",
        ) from exc


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

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.user import User, UserRole
from app.schemas.audit import AuditLogPublic, AuditLogResponse
from app.services.auth_service import get_current_user

router = APIRouter()


def require_audit_scope(user: User) -> None:
    if user.role not in {UserRole.supervisor, UserRole.admin}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only supervisor or admin users can view safety audit logs.",
        )


def serialize_audit_log(db: Session, log: AuditLog) -> AuditLogPublic:
    actor = db.get(User, log.actor_user_id) if log.actor_user_id else None
    return AuditLogPublic(
        id=log.id,
        actorUserId=log.actor_user_id,
        actorName=actor.name if actor else None,
        eventType=log.event_type,
        entityType=log.entity_type,
        entityId=log.entity_id,
        details=log.details,
        createdAt=log.created_at,
    )


@router.get("/logs", response_model=AuditLogResponse)
def list_audit_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AuditLogResponse:
    require_audit_scope(current_user)
    logs = db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(50)).all()
    return AuditLogResponse(logs=[serialize_audit_log(db, log) for log in logs])

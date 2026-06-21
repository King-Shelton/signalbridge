from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Conversation, Signal, User, YouthProfile
from app.models.user import UserRole
from app.routes.operations import conversation_payload
from app.services.auth_service import require_roles

router = APIRouter(prefix="/signals", tags=["signals"])
worker_required = require_roles(UserRole.worker, UserRole.supervisor, UserRole.admin)


@router.get("/radar")
def radar(current_user: User = Depends(worker_required), db: Session = Depends(get_db)) -> dict:
    query = db.query(Conversation).join(YouthProfile, YouthProfile.id == Conversation.youth_id)
    if current_user.role == UserRole.worker:
        query = query.filter(YouthProfile.assigned_worker_id == current_user.id)
    items = query.all()
    items.sort(key=lambda item: (item.risk_score, item.unresolved_handoff, item.last_message_at or item.created_at), reverse=True)
    return {"items": [conversation_payload(db, item) for item in items]}


@router.get("/youth/{youth_id}")
def youth_signals(youth_id: str, current_user: User = Depends(worker_required), db: Session = Depends(get_db)) -> dict:
    youth = db.get(YouthProfile, youth_id)
    if current_user.role == UserRole.worker and (not youth or youth.assigned_worker_id != current_user.id):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Youth is assigned to another worker")
    rows = db.query(Signal).filter(Signal.youth_id == youth_id).order_by(Signal.created_at.desc()).all()
    return {"signals": [{"id": s.id, "conversationId": s.conversation_id, "type": s.type, "severity": s.severity, "reason": s.reason, "source": s.source, "createdAt": s.created_at.isoformat()} for s in rows]}

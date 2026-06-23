from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Case, Conversation, Message, Notification, User, YouthProfile
from app.models.case import CaseStatus
from app.models.conversation import ConversationStatus, RiskLevel
from app.models.message import SenderType
from app.models.user import UserRole
from app.services.ai_service import analyse_risk, apply_risk_to_conversation, persist_signals
from app.services.auth_service import require_roles
from app.timeutil import naive_utcnow

router = APIRouter(prefix="/simulator", tags=["simulator"])
supervisor_required = require_roles(UserRole.supervisor, UserRole.admin)


class IntakeRequest(BaseModel):
    youthId: str
    channel: str = Field(pattern="^(Web Chat|WhatsApp Simulator|Instagram Simulator|Discord Simulator|GatherTown Simulator)$")
    message: str = Field(min_length=2, max_length=4000)


@router.post("/intake", status_code=status.HTTP_201_CREATED)
def simulate_intake(payload: IntakeRequest, _: User = Depends(supervisor_required), db: Session = Depends(get_db)) -> dict:
    youth = db.get(YouthProfile, payload.youthId)
    if youth is None:
        raise HTTPException(status_code=404, detail="Youth not found")
    conversation = Conversation(youth_id=youth.id, channel=payload.channel, status=ConversationStatus.needs_review, last_message_at=naive_utcnow())
    db.add(conversation); db.flush()
    message = Message(conversation_id=conversation.id, sender_type=SenderType.youth, content=payload.message)
    db.add(message); db.flush()
    assessment = analyse_risk([payload.message], [message])
    apply_risk_to_conversation(conversation, assessment)
    persist_signals(db, conversation, assessment, source="simulated_channel")
    case = Case(youth_id=youth.id, assigned_worker_id=youth.assigned_worker_id, status=CaseStatus.needs_review, priority=assessment.risk_level.value, summary=f"Simulated {payload.channel} intake")
    db.add(case)
    if youth.assigned_worker_id:
        db.add(Notification(recipient_user_id=youth.assigned_worker_id, title="New simulated channel signal", message=f"A {assessment.risk_level.value}-risk message arrived via {payload.channel}.", severity=assessment.risk_level.value))
    db.commit()
    return {"conversationId": conversation.id, "caseId": case.id, "riskLevel": assessment.risk_level.value, "riskScore": assessment.risk_score, "mode": assessment.ai_mode}

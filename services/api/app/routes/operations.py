import io
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen.canvas import Canvas
from sqlalchemy import case as sql_case, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AiRun, AuditLog, Case, CaseNote, Conversation, HandoffBrief, Message, Notification, Signal, User, YouthProfile
from app.models.case import CaseStatus
from app.models.handoff_brief import ReviewStatus
from app.models.user import UserRole
from app.services.auth_service import require_roles
from app.timeutil import naive_utcnow, to_sgt

router = APIRouter(tags=["operations"])
worker_required = require_roles(UserRole.worker, UserRole.supervisor, UserRole.admin)
supervisor_required = require_roles(UserRole.supervisor, UserRole.admin)


class StatusUpdate(BaseModel):
    status: CaseStatus


class NoteCreate(BaseModel):
    content: str = Field(min_length=2, max_length=4000)


class ReviewUpdate(BaseModel):
    status: ReviewStatus


class AssignmentUpdate(BaseModel):
    workerId: str


LOAD_CASE_WEIGHT = 10
LOAD_HIGH_RISK_WEIGHT = 18
LOAD_UNRESOLVED_HANDOFF_WEIGHT = 12
LOAD_OVERDUE_FOLLOW_UP_WEIGHT = 8


def audit(db: Session, actor: str, event: str, entity_type: str, entity_id: str, details: dict) -> None:
    db.add(AuditLog(actor_user_id=actor, event_type=event, entity_type=entity_type, entity_id=entity_id, details=json.dumps(details)))


def require_case_access(db: Session, case_id: str, user: User) -> Case:
    item = db.get(Case, case_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Case not found")
    if user.role == UserRole.worker and item.assigned_worker_id != user.id:
        raise HTTPException(status_code=403, detail="Case is assigned to another worker")
    return item


def conversation_payload(db: Session, conversation: Conversation) -> dict:
    youth = db.get(YouthProfile, conversation.youth_id)
    user = db.get(User, youth.user_id) if youth else None
    case_item = db.query(Case).filter(Case.youth_id == conversation.youth_id).order_by(Case.updated_at.desc()).first()
    handoff = db.query(HandoffBrief).filter(HandoffBrief.conversation_id == conversation.id).order_by(HandoffBrief.created_at.desc()).first()
    messages = db.query(Message).filter(Message.conversation_id == conversation.id).order_by(Message.created_at).all()
    signals = db.query(Signal).filter(Signal.conversation_id == conversation.id).order_by(Signal.created_at.desc()).all()
    return {
        "id": conversation.id,
        "youthId": conversation.youth_id,
        "youthName": user.name if user else "Unknown youth",
        "channel": conversation.channel,
        "status": conversation.status.value,
        "riskLevel": conversation.risk_level.value,
        "riskScore": conversation.risk_score,
        "consentToHandoff": conversation.consent_to_handoff,
        "unresolvedHandoff": conversation.unresolved_handoff,
        "lastMessageAt": (conversation.last_message_at or conversation.created_at).isoformat() + "Z",
        "suggestedAction": handoff.recommended_next_step if handoff else "Review recent conversation",
        "case": ({"id": case_item.id, "status": case_item.status.value, "priority": case_item.priority, "summary": case_item.summary} if case_item else None),
        "handoffId": handoff.id if handoff else None,
        "messages": [{"id": m.id, "senderType": m.sender_type.value, "content": m.content, "safetyStatus": m.safety_status, "createdAt": m.created_at.isoformat() + "Z"} for m in messages],
        "signals": [{"id": s.id, "type": s.type, "severity": s.severity, "reason": s.reason, "source": s.source, "createdAt": s.created_at.isoformat() + "Z"} for s in signals],
    }


def handoff_payload(db: Session, handoff: HandoffBrief) -> dict:
    youth = db.get(YouthProfile, handoff.youth_id)
    user = db.get(User, youth.user_id) if youth else None
    return {
        "id": handoff.id, "conversationId": handoff.conversation_id, "youthId": handoff.youth_id,
        "youthName": user.name if user else "Unknown youth", "mainConcern": handoff.main_concern,
        "emotionalState": handoff.emotional_state, "riskLevel": handoff.risk_level.value,
        "riskScore": handoff.risk_score, "keyQuote": handoff.key_quote, "whatAiDid": handoff.what_ai_did,
        "whatNotToRepeat": handoff.what_not_to_repeat, "suggestedWorkerResponse": handoff.suggested_worker_response,
        "recommendedNextStep": handoff.recommended_next_step, "reviewStatus": handoff.review_status.value,
        "createdAt": handoff.created_at.isoformat() + "Z",
    }


def latest_conversation_for_youth(db: Session, youth_id: str) -> Conversation | None:
    return db.query(Conversation).filter(Conversation.youth_id == youth_id).order_by(
        Conversation.last_message_at.desc().nullslast(),
        Conversation.created_at.desc(),
    ).first()


def active_cases_for_worker(db: Session, worker_id: str) -> list[Case]:
    return db.query(Case).filter(Case.assigned_worker_id == worker_id, Case.status != CaseStatus.closed).all()


def worker_load_payload(db: Session, worker: User) -> dict:
    cases = active_cases_for_worker(db, worker.id)
    latest_conversations = [conversation for case_item in cases if (conversation := latest_conversation_for_youth(db, case_item.youth_id))]
    high_risk_cases = sum(conversation.risk_level.value in {"high", "critical"} for conversation in latest_conversations)
    unresolved_handoffs = sum(conversation.unresolved_handoff for conversation in latest_conversations)
    overdue_follow_ups = sum(bool(case_item.next_follow_up_at and case_item.next_follow_up_at < naive_utcnow()) for case_item in cases)
    score = (
        len(cases) * LOAD_CASE_WEIGHT
        + high_risk_cases * LOAD_HIGH_RISK_WEIGHT
        + unresolved_handoffs * LOAD_UNRESOLVED_HANDOFF_WEIGHT
        + overdue_follow_ups * LOAD_OVERDUE_FOLLOW_UP_WEIGHT
    )
    if score >= 70:
        pressure = "high"
        recommendation = "Redistribute one active case to protect worker response time."
    elif score >= 35:
        pressure = "moderate"
        recommendation = "Monitor closely before assigning additional high-risk cases."
    else:
        pressure = "steady"
        recommendation = "Capacity is healthy for routine assignment."
    return {
        "workerId": worker.id,
        "workerName": worker.name,
        "activeCases": len(cases),
        "highRiskCases": high_risk_cases,
        "unresolvedHandoffs": unresolved_handoffs,
        "overdueFollowUps": overdue_follow_ups,
        "loadScore": score,
        "pressure": pressure,
        "recommendation": recommendation,
    }


@router.get("/worker/cockpit")
def worker_cockpit(current_user: User = Depends(worker_required), db: Session = Depends(get_db)) -> dict:
    query = db.query(Conversation).join(YouthProfile, YouthProfile.id == Conversation.youth_id)
    if current_user.role == UserRole.worker:
        query = query.filter(YouthProfile.assigned_worker_id == current_user.id)
    conversations = query.order_by(
        sql_case((Conversation.risk_level == "critical", 4), (Conversation.risk_level == "high", 3), (Conversation.risk_level == "medium", 2), else_=1).desc(),
        Conversation.unresolved_handoff.desc(), Conversation.last_message_at.desc(),
    ).all()
    return {"conversations": [conversation_payload(db, item) for item in conversations]}


@router.get("/worker/conversations/{conversation_id}")
def worker_conversation(conversation_id: str, current_user: User = Depends(worker_required), db: Session = Depends(get_db)) -> dict:
    item = db.get(Conversation, conversation_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    youth = db.get(YouthProfile, item.youth_id)
    if current_user.role == UserRole.worker and (not youth or youth.assigned_worker_id != current_user.id):
        raise HTTPException(status_code=403, detail="Conversation is assigned to another worker")
    return conversation_payload(db, item)


@router.get("/worker/handoffs/{handoff_id}")
def worker_handoff(handoff_id: str, current_user: User = Depends(worker_required), db: Session = Depends(get_db)) -> dict:
    item = db.get(HandoffBrief, handoff_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Handoff not found")
    conversation = db.get(Conversation, item.conversation_id)
    youth = db.get(YouthProfile, item.youth_id)
    if not conversation or not conversation.consent_to_handoff:
        raise HTTPException(status_code=403, detail="Youth consent is required before worker review")
    if current_user.role == UserRole.worker and (not youth or youth.assigned_worker_id != current_user.id):
        raise HTTPException(status_code=403, detail="Handoff is assigned to another worker")
    return handoff_payload(db, item)


@router.patch("/worker/handoffs/{handoff_id}/review")
def review_handoff(handoff_id: str, payload: ReviewUpdate, current_user: User = Depends(worker_required), db: Session = Depends(get_db)) -> dict:
    worker_handoff(handoff_id, current_user, db)
    item = db.get(HandoffBrief, handoff_id)
    item.review_status = payload.status
    conversation = db.get(Conversation, item.conversation_id)
    conversation.unresolved_handoff = payload.status == ReviewStatus.pending
    audit(db, current_user.id, "worker_handoff_reviewed", "handoff_brief", item.id, {"reviewStatus": payload.status.value})
    db.commit()
    return handoff_payload(db, item)


@router.get("/worker/youths/{youth_id}")
def worker_youth(youth_id: str, current_user: User = Depends(worker_required), db: Session = Depends(get_db)) -> dict:
    youth = db.get(YouthProfile, youth_id)
    if youth is None:
        raise HTTPException(status_code=404, detail="Youth not found")
    if current_user.role == UserRole.worker and youth.assigned_worker_id != current_user.id:
        raise HTTPException(status_code=403, detail="Youth is assigned to another worker")
    user = db.get(User, youth.user_id)
    worker = db.get(User, youth.assigned_worker_id) if youth.assigned_worker_id else None
    cases = db.query(Case).filter(Case.youth_id == youth.id).order_by(Case.updated_at.desc()).all()
    handoffs = db.query(HandoffBrief).filter(HandoffBrief.youth_id == youth.id).order_by(HandoffBrief.created_at.desc()).all()
    notes = db.query(CaseNote).join(Case, Case.id == CaseNote.case_id).filter(Case.youth_id == youth.id).order_by(CaseNote.created_at.desc()).all()
    return {"id": youth.id, "name": user.name, "preferredChannel": youth.preferred_channel, "assignedWorker": worker.name if worker else None,
            "supportStyle": youth.support_style, "stressors": youth.stressors,
            "cases": [{"id": c.id, "status": c.status.value, "priority": c.priority, "summary": c.summary, "updatedAt": c.updated_at.isoformat() + "Z"} for c in cases],
            "handoffs": [handoff_payload(db, h) for h in handoffs if (conv := db.get(Conversation, h.conversation_id)) and conv.consent_to_handoff],
            "notes": [{"id": n.id, "content": n.content, "authorUserId": n.author_user_id, "createdAt": n.created_at.isoformat() + "Z"} for n in notes]}


@router.patch("/worker/cases/{case_id}/status")
def update_case_status(case_id: str, payload: StatusUpdate, current_user: User = Depends(worker_required), db: Session = Depends(get_db)) -> dict:
    item = require_case_access(db, case_id, current_user)
    item.status = payload.status
    item.updated_at = naive_utcnow()
    audit(db, current_user.id, "case_status_updated", "case", item.id, {"status": payload.status.value})
    db.commit()
    return {"id": item.id, "status": item.status.value, "updatedAt": item.updated_at.isoformat() + "Z"}


@router.post("/worker/cases/{case_id}/notes", status_code=status.HTTP_201_CREATED)
def create_case_note(case_id: str, payload: NoteCreate, current_user: User = Depends(worker_required), db: Session = Depends(get_db)) -> dict:
    item = require_case_access(db, case_id, current_user)
    note = CaseNote(case_id=item.id, author_user_id=current_user.id, content=payload.content.strip())
    db.add(note)
    audit(db, current_user.id, "case_note_added", "case", item.id, {"noteId": note.id})
    db.commit()
    db.refresh(note)
    return {"id": note.id, "content": note.content, "authorUserId": note.author_user_id, "createdAt": note.created_at.isoformat() + "Z"}


@router.get("/worker/handoffs/{handoff_id}/pdf")
def handoff_pdf(handoff_id: str, current_user: User = Depends(worker_required), db: Session = Depends(get_db)) -> Response:
    data = worker_handoff(handoff_id, current_user, db)
    stream = io.BytesIO()
    canvas = Canvas(stream, pagesize=A4)
    width, height = A4
    y = height - 50
    canvas.setTitle(f"SignalBridge handoff - {data['youthName']}")
    canvas.setFont("Helvetica-Bold", 18)
    canvas.drawString(45, y, "SignalBridge Handoff Brief")
    y -= 30
    for label, key in [("Youth", "youthName"), ("Risk", "riskLevel"), ("Main concern", "mainConcern"), ("Emotional state", "emotionalState"), ("Key quote", "keyQuote"), ("What not to repeat", "whatNotToRepeat"), ("Suggested response", "suggestedWorkerResponse"), ("Next step", "recommendedNextStep")]:
        canvas.setFont("Helvetica-Bold", 10)
        canvas.drawString(45, y, label)
        y -= 14
        canvas.setFont("Helvetica", 10)
        words = str(data.get(key) or "").split()
        line = ""
        for word in words:
            if canvas.stringWidth(f"{line} {word}", "Helvetica", 10) > width - 90:
                canvas.drawString(45, y, line)
                y -= 13
                line = word
            else:
                line = f"{line} {word}".strip()
        canvas.drawString(45, y, line)
        y -= 22
        if y < 70:
            canvas.showPage(); y = height - 50
    canvas.save()
    return Response(stream.getvalue(), media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="signalbridge-{handoff_id}.pdf"'})


@router.get("/supervisor/workers")
def supervisor_workers(_: User = Depends(supervisor_required), db: Session = Depends(get_db)) -> dict:
    workers = db.query(User).filter(User.role == UserRole.worker).order_by(User.name).all()
    return {
        "workers": [
            {
                "id": worker.id,
                "name": worker.name,
                "email": worker.email,
                "activeCases": len(active_cases_for_worker(db, worker.id)),
            }
            for worker in workers
        ]
    }


@router.get("/supervisor/load")
def supervisor_load(_: User = Depends(supervisor_required), db: Session = Depends(get_db)) -> dict:
    workers = db.query(User).filter(User.role == UserRole.worker).order_by(User.name).all()
    rows = [worker_load_payload(db, worker) for worker in workers]
    return {"workers": sorted(rows, key=lambda row: row["loadScore"], reverse=True)}


@router.patch("/supervisor/cases/{case_id}/assign")
def assign_case(case_id: str, payload: AssignmentUpdate, current_user: User = Depends(supervisor_required), db: Session = Depends(get_db)) -> dict:
    item = db.get(Case, case_id)
    worker = db.get(User, payload.workerId)
    if item is None:
        raise HTTPException(status_code=404, detail="Case not found")
    if worker is None or worker.role != UserRole.worker:
        raise HTTPException(status_code=422, detail="A valid worker is required")
    previous_worker = db.get(User, item.assigned_worker_id) if item.assigned_worker_id else None
    previous = item.assigned_worker_id
    item.assigned_worker_id = worker.id
    item.updated_at = naive_utcnow()
    youth = db.get(YouthProfile, item.youth_id)
    if youth:
        youth.assigned_worker_id = worker.id
    audit(
        db,
        current_user.id,
        "case_reassigned",
        "case",
        item.id,
        {
            "caseId": item.id,
            "youthId": item.youth_id,
            "fromWorkerId": previous,
            "fromWorkerName": previous_worker.name if previous_worker else None,
            "toWorkerId": worker.id,
            "toWorkerName": worker.name,
        },
    )
    db.add(Notification(recipient_user_id=worker.id, title="Case assigned", message=f"{item.summary or 'A youth case'} was assigned to you.", severity="info"))
    db.commit()
    return {
        "caseId": item.id,
        "youthId": item.youth_id,
        "assignedWorkerId": worker.id,
        "assignedWorkerName": worker.name,
        "previousWorkerId": previous,
    }


@router.get("/audit/logs")
def audit_logs(_: User = Depends(supervisor_required), db: Session = Depends(get_db), limit: int = 100) -> dict:
    rows = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(min(max(limit, 1), 250)).all()
    logs = [{"id": row.id, "actorUserId": row.actor_user_id, "eventType": row.event_type, "entityType": row.entity_type,
             "entityId": row.entity_id, "details": row.details, "createdAt": row.created_at.isoformat() + "Z"} for row in rows]
    ai_runs = db.query(AiRun).order_by(AiRun.created_at.desc()).limit(min(max(limit, 1), 250)).all()
    logs.extend({"id": run.id, "actorUserId": None, "eventType": f"ai_{run.action}_{run.mode}", "entityType": "ai_run",
                 "entityId": run.conversation_id or run.id,
                 "details": json.dumps({"promptVersion": run.prompt_version, "model": run.model_name, "safetyStatus": run.safety_status, "fallbackReason": run.error}),
                 "createdAt": run.created_at.isoformat() + "Z"} for run in ai_runs)
    logs.sort(key=lambda item: item["createdAt"], reverse=True)
    return {"logs": logs[:limit]}


@router.get("/analytics/summary")
def analytics(_: User = Depends(supervisor_required), db: Session = Depends(get_db)) -> dict:
    conversations = db.query(Conversation).all()
    open_cases = db.query(Case).filter(Case.status != CaseStatus.closed).count()
    return {"totalConversations": len(conversations), "openCases": open_cases,
            "unresolvedHandoffs": sum(item.unresolved_handoff for item in conversations),
            "highRiskConversations": sum(item.risk_level.value in {"high", "critical"} for item in conversations),
            "afterHoursVolume": sum((to_sgt(item.created_at).hour >= 18 or to_sgt(item.created_at).hour < 7) for item in conversations),
            "riskBreakdown": {level: sum(item.risk_level.value == level for item in conversations) for level in ("low", "medium", "high", "critical")}}


@router.get("/notifications")
def notifications(current_user: User = Depends(worker_required), db: Session = Depends(get_db)) -> dict:
    rows = db.query(Notification).filter(Notification.recipient_user_id == current_user.id).order_by(Notification.created_at.desc()).limit(50).all()
    return {"notifications": [{"id": n.id, "title": n.title, "message": n.message, "severity": n.severity, "read": n.read, "createdAt": n.created_at.isoformat() + "Z"} for n in rows]}

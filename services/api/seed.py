from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine
from app.models.audit_log import AuditLog
from app.models.case import Case, CaseStatus
from app.models.case_note import CaseNote
from app.models.conversation import Conversation, ConversationStatus, RiskLevel
from app.models.handoff_brief import HandoffBrief, ReviewStatus
from app.models.message import Message, SenderType
from app.models.signal import Signal
from app.models.user import User, UserRole
from app.models.youth_profile import YouthProfile
from app.services.auth_service import hash_password


def upsert_user(db: Session, user_id: str, name: str, email: str, role: UserRole) -> User:
    user = db.get(User, user_id)
    if user is None:
        user = User(
            id=user_id,
            name=name,
            email=email,
            role=role,
            password_hash=hash_password("password"),
        )
        db.add(user)
    return user


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        mira = upsert_user(db, "user_mira", "Mira Tan", "mira@signalbridge.test", UserRole.youth)
        worker = upsert_user(db, "user_worker_1", "Aisha Rahman", "worker1@signalbridge.test", UserRole.worker)
        upsert_user(db, "user_supervisor", "Daniel Lim", "supervisor@signalbridge.test", UserRole.supervisor)

        youth = db.get(YouthProfile, "youth_mira")
        if youth is None:
            youth = YouthProfile(
                id="youth_mira",
                user_id=mira.id,
                assigned_worker_id=worker.id,
                preferred_channel="Web Chat",
                support_style="Prefers gentle check-ins and not having to repeat painful details.",
                stressors="Cyberbullying, school avoidance, peer group pressure.",
            )
            db.add(youth)

        conversation = db.get(Conversation, "conv_mira_after_hours")
        if conversation is None:
            conversation = Conversation(
                id="conv_mira_after_hours",
                youth_id="youth_mira",
                channel="Web Chat",
                status=ConversationStatus.needs_review,
                risk_level=RiskLevel.high,
                risk_score=78,
                consent_to_handoff=True,
                unresolved_handoff=True,
            )
            db.add(conversation)

        if db.get(Message, "msg_mira_001") is None:
            db.add(
                Message(
                    id="msg_mira_001",
                    conversation_id="conv_mira_after_hours",
                    sender_type=SenderType.youth,
                    content="People in my class group chat keep editing my photos. I don't want to go school tomorrow. I'm so tired of explaining this.",
                )
            )
            db.add(
                Message(
                    id="msg_ai_001",
                    conversation_id="conv_mira_after_hours",
                    sender_type=SenderType.ai,
                    content="I'm sorry this is happening. I can stay with you for a bit and help prepare a short note for your worker so you do not have to repeat everything tomorrow.",
                    safety_status="passed",
                )
            )

        for signal_id, type_, severity, reason in [
            ("signal_mira_cyberbullying", "cyberbullying", "high", "Edited photos in class group chat"),
            ("signal_mira_school_avoidance", "school_avoidance", "medium", "Does not want to go to school tomorrow"),
        ]:
            if db.get(Signal, signal_id) is None:
                db.add(
                    Signal(
                        id=signal_id,
                        conversation_id="conv_mira_after_hours",
                        youth_id="youth_mira",
                        type=type_,
                        severity=severity,
                        reason=reason,
                    )
                )

        if db.get(HandoffBrief, "handoff_mira_001") is None:
            db.add(
                HandoffBrief(
                    id="handoff_mira_001",
                    conversation_id="conv_mira_after_hours",
                    youth_id="youth_mira",
                    main_concern="Cyberbullying involving edited photos in a class group chat",
                    emotional_state="Tired, embarrassed, and reluctant to repeat the story",
                    risk_level=RiskLevel.high,
                    risk_score=78,
                    key_quote="I'm so tired of explaining this.",
                    what_ai_did="Acknowledged distress, avoided diagnosis, offered handoff preparation, and asked for consent.",
                    what_not_to_repeat="Do not ask Mira to retell the full incident immediately unless she chooses to.",
                    suggested_worker_response="Hi Mira, I read the note you allowed SignalBridge to prepare. You don't have to repeat everything unless you want to. I'm here now. Can I first check whether you feel safe going to school today?",
                    recommended_next_step="Worker to check immediate school safety and agree on follow-up plan.",
                    review_status=ReviewStatus.pending,
                )
            )

        if db.get(Case, "case_mira_001") is None:
            db.add(
                Case(
                    id="case_mira_001",
                    youth_id="youth_mira",
                    assigned_worker_id=worker.id,
                    status=CaseStatus.needs_follow_up,
                    priority="high",
                    summary="After-hours cyberbullying handoff for Mira.",
                )
            )

        if db.get(CaseNote, "note_mira_seed_001") is None:
            db.add(
                CaseNote(
                    id="note_mira_seed_001",
                    case_id="case_mira_001",
                    author_user_id=worker.id,
                    content="Initial worker queue note: review Mira's handoff first thing in the morning.",
                    follow_up_action="Check immediate school safety and agree on next support step.",
                )
            )

        if db.get(AuditLog, "audit_seed_001") is None:
            db.add(
                AuditLog(
                    id="audit_seed_001",
                    actor_user_id=None,
                    event_type="seed_data_created",
                    entity_type="conversation",
                    entity_id="conv_mira_after_hours",
                    details="Day 1 fictional Mira journey seed data loaded.",
                )
            )

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
    print("Seeded SignalBridge fictional demo data.")

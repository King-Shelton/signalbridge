from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine
from app.models.audit_log import AuditLog
from app.models.ai_run import AiRun
from app.models.case import Case, CaseStatus
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
        worker_two = upsert_user(db, "user_worker_2", "Marcus Lee", "worker2@signalbridge.test", UserRole.worker)
        upsert_user(db, "user_supervisor", "Daniel Lim", "supervisor@signalbridge.test", UserRole.supervisor)
        db.flush()

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
            db.flush()

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
            db.flush()

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
                    status=CaseStatus.needs_review,
                    priority="high",
                    summary="After-hours cyberbullying handoff for Mira.",
                )
            )

        fictional_youths = [
            ("jay", "Jayden Koh", "jay@signalbridge.test", worker.id, "WhatsApp Simulator", "Family tension and sleep disruption", RiskLevel.medium, 67, CaseStatus.in_progress),
            ("dan", "Danial Aziz", "dan@signalbridge.test", worker.id, "Discord Simulator", "Exam stress and repeated late-night messages", RiskLevel.medium, 58, CaseStatus.needs_review),
            ("afiq", "Afiq Rahman", "afiq@signalbridge.test", worker.id, "GatherTown Simulator", "Routine check-in", RiskLevel.low, 24, CaseStatus.followed_up),
            ("leanne", "Leanne Goh", "leanne@signalbridge.test", worker_two.id, "Instagram Simulator", "Peer friendship changes", RiskLevel.low, 18, CaseStatus.new),
        ]
        for slug, name, email, assigned_worker, channel, stressors, risk_level, risk_score, case_status in fictional_youths:
            user = upsert_user(db, f"user_{slug}", name, email, UserRole.youth)
            db.flush()
            profile_id = f"youth_{slug}"
            if db.get(YouthProfile, profile_id) is None:
                db.add(YouthProfile(id=profile_id, user_id=user.id, assigned_worker_id=assigned_worker,
                                    preferred_channel=channel, support_style="Prefers short, respectful check-ins.", stressors=stressors))
                db.flush()
            conversation_id = f"conv_{slug}_seed"
            if db.get(Conversation, conversation_id) is None:
                db.add(Conversation(id=conversation_id, youth_id=profile_id, channel=channel,
                                    status=ConversationStatus.needs_review if risk_score >= 40 else ConversationStatus.active,
                                    risk_level=risk_level, risk_score=risk_score,
                                    consent_to_handoff=risk_score >= 40, unresolved_handoff=risk_score >= 40))
                db.flush()
                db.add(Message(id=f"msg_{slug}_seed", conversation_id=conversation_id, sender_type=SenderType.youth,
                               content=f"I wanted to check in about {stressors.lower()}."))
                db.add(Signal(id=f"signal_{slug}_seed", conversation_id=conversation_id, youth_id=profile_id,
                              type="seeded_context", severity=risk_level.value, reason=stressors, source="fictional_seed"))
            if db.get(Case, f"case_{slug}_seed") is None:
                db.add(Case(id=f"case_{slug}_seed", youth_id=profile_id, assigned_worker_id=assigned_worker,
                            status=case_status, priority=risk_level.value, summary=f"Follow-up for {name}: {stressors}."))

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
        if db.get(AiRun, "airun_seed_001") is None:
            db.add(AiRun(id="airun_seed_001", conversation_id="conv_mira_after_hours", action="generate_handoff",
                         mode="fallback_rule_based", model_name=None, prompt_version="handoff-v1",
                         safety_status="fallback_passed", error="Fictional seed demonstrates deterministic fallback traceability"))

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
    print("Seeded SignalBridge fictional demo data.")

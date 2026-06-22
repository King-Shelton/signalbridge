from datetime import datetime, timedelta

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
    else:
        user.name = name
        user.email = email
        user.role = role
    return user


def upsert_youth(
    db: Session,
    youth_id: str,
    user: User,
    worker: User,
    preferred_channel: str,
    support_style: str,
    stressors: str,
) -> YouthProfile:
    youth = db.get(YouthProfile, youth_id)
    if youth is None:
        youth = YouthProfile(id=youth_id, user_id=user.id)
        db.add(youth)
    youth.assigned_worker_id = worker.id
    youth.preferred_channel = preferred_channel
    youth.support_style = support_style
    youth.stressors = stressors
    return youth


def upsert_conversation(
    db: Session,
    conversation_id: str,
    youth_id: str,
    channel: str,
    status: ConversationStatus,
    risk_level: RiskLevel,
    risk_score: int,
    consent_to_handoff: bool,
    unresolved_handoff: bool,
    last_message_at: datetime,
    created_at: datetime,
) -> Conversation:
    conversation = db.get(Conversation, conversation_id)
    if conversation is None:
        conversation = Conversation(id=conversation_id, youth_id=youth_id)
        db.add(conversation)
    conversation.channel = channel
    conversation.status = status
    conversation.risk_level = risk_level
    conversation.risk_score = risk_score
    conversation.consent_to_handoff = consent_to_handoff
    conversation.unresolved_handoff = unresolved_handoff
    conversation.last_message_at = last_message_at
    conversation.created_at = created_at
    return conversation


def add_message(
    db: Session,
    message_id: str,
    conversation_id: str,
    sender_type: SenderType,
    content: str,
    created_at: datetime,
    safety_status: str | None = None,
) -> None:
    message = db.get(Message, message_id)
    if message is None:
        message = Message(id=message_id, conversation_id=conversation_id, sender_type=sender_type, content=content)
        db.add(message)
    message.content = content
    message.sender_type = sender_type
    message.safety_status = safety_status
    message.created_at = created_at


def add_signal(
    db: Session,
    signal_id: str,
    conversation_id: str,
    youth_id: str,
    type_: str,
    severity: str,
    reason: str,
    source: str,
    created_at: datetime,
) -> None:
    signal = db.get(Signal, signal_id)
    if signal is None:
        signal = Signal(id=signal_id, conversation_id=conversation_id, youth_id=youth_id, type=type_, severity=severity, reason=reason)
        db.add(signal)
    signal.type = type_
    signal.severity = severity
    signal.reason = reason
    signal.source = source
    signal.created_at = created_at


def add_handoff(
    db: Session,
    handoff_id: str,
    conversation_id: str,
    youth_id: str,
    main_concern: str,
    emotional_state: str,
    risk_level: RiskLevel,
    risk_score: int,
    key_quote: str,
    what_ai_did: str,
    what_not_to_repeat: str,
    suggested_worker_response: str,
    recommended_next_step: str,
    review_status: ReviewStatus,
    created_at: datetime,
) -> None:
    handoff = db.get(HandoffBrief, handoff_id)
    if handoff is None:
        handoff = HandoffBrief(id=handoff_id, conversation_id=conversation_id, youth_id=youth_id)
        db.add(handoff)
    handoff.main_concern = main_concern
    handoff.emotional_state = emotional_state
    handoff.risk_level = risk_level
    handoff.risk_score = risk_score
    handoff.key_quote = key_quote
    handoff.what_ai_did = what_ai_did
    handoff.what_not_to_repeat = what_not_to_repeat
    handoff.suggested_worker_response = suggested_worker_response
    handoff.recommended_next_step = recommended_next_step
    handoff.review_status = review_status
    handoff.created_at = created_at


def upsert_case(
    db: Session,
    case_id: str,
    youth_id: str,
    worker: User,
    status: CaseStatus,
    priority: str,
    summary: str,
    updated_at: datetime,
    next_follow_up_at: datetime | None = None,
) -> Case:
    case = db.get(Case, case_id)
    if case is None:
        case = Case(id=case_id, youth_id=youth_id, assigned_worker_id=worker.id)
        db.add(case)
    case.status = status
    case.priority = priority
    case.summary = summary
    case.next_follow_up_at = next_follow_up_at
    case.updated_at = updated_at
    return case


def add_case_note(
    db: Session,
    note_id: str,
    case_id: str,
    worker: User,
    content: str,
    follow_up_action: str,
    created_at: datetime,
) -> None:
    note = db.get(CaseNote, note_id)
    if note is None:
        note = CaseNote(id=note_id, case_id=case_id, author_user_id=worker.id)
        db.add(note)
    note.content = content
    note.follow_up_action = follow_up_action
    note.created_at = created_at


def upsert_audit_log(
    db: Session,
    audit_id: str,
    actor_user_id: str | None,
    event_type: str,
    entity_type: str,
    entity_id: str,
    details: str,
    created_at: datetime,
) -> None:
    audit_log = db.get(AuditLog, audit_id)
    if audit_log is None:
        audit_log = AuditLog(id=audit_id)
        db.add(audit_log)
    audit_log.actor_user_id = actor_user_id
    audit_log.event_type = event_type
    audit_log.entity_type = entity_type
    audit_log.entity_id = entity_id
    audit_log.details = details
    audit_log.created_at = created_at


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    now = datetime.utcnow().replace(microsecond=0)

    try:
        worker = upsert_user(db, "user_worker_1", "Aisha Rahman", "worker1@signalbridge.test", UserRole.worker)
        upsert_user(db, "user_supervisor", "Daniel Lim", "supervisor@signalbridge.test", UserRole.supervisor)
        youth_users = {
            "mira": upsert_user(db, "user_mira", "Mira Tan", "mira@signalbridge.test", UserRole.youth),
            "jay": upsert_user(db, "user_jay", "Jay Lim", "jay@signalbridge.test", UserRole.youth),
            "dan": upsert_user(db, "user_dan", "Dan Ng", "dan@signalbridge.test", UserRole.youth),
            "afiq": upsert_user(db, "user_afiq", "Afiq Rahman", "afiq@signalbridge.test", UserRole.youth),
            "leanne": upsert_user(db, "user_leanne", "Leanne Tan", "leanne@signalbridge.test", UserRole.youth),
        }

        upsert_youth(
            db,
            "youth_mira",
            youth_users["mira"],
            worker,
            "Web Chat",
            "Prefers gentle check-ins, clear choices, and not having to repeat painful details.",
            "Cyberbullying, school avoidance, peer group pressure.",
        )
        upsert_youth(
            db,
            "youth_jay",
            youth_users["jay"],
            worker,
            "WhatsApp",
            "Responds best to calm, practical options and a clear next contact window.",
            "Peer pressure, repeated late-night messages, conflict avoidance.",
        )
        upsert_youth(
            db,
            "youth_dan",
            youth_users["dan"],
            worker,
            "Instagram",
            "Needs short morning check-ins and concrete next steps before school.",
            "Poor sleep, online teasing, anxiety before class.",
        )
        upsert_youth(
            db,
            "youth_afiq",
            youth_users["afiq"],
            worker,
            "GatherTown",
            "Prefers light-touch monitoring unless he asks for more support.",
            "Academic load, quiet withdrawal when stressed.",
        )
        upsert_youth(
            db,
            "youth_leanne",
            youth_users["leanne"],
            worker,
            "Discord",
            "Likes tidy follow-through and agreed check-in times.",
            "Post-session follow-up, occasional social anxiety.",
        )

        rows = [
            {
                "slug": "mira",
                "youth_id": "youth_mira",
                "conversation_id": "conv_mira_after_hours",
                "channel": "Web Chat",
                "status": ConversationStatus.needs_review,
                "risk_level": RiskLevel.high,
                "risk_score": 92,
                "unresolved": True,
                "last": now - timedelta(hours=9),
                "messages": [
                    ("youth", "People in my class group chat keep editing my photos. I don't want to go school tomorrow. I'm so tired of explaining this."),
                    ("ai", "I am sorry this is happening. I can help prepare a short note for your worker so you do not have to repeat everything tomorrow."),
                ],
                "signals": [
                    ("cyberbullying", "high", "Youth described edited photos being shared in a class group chat.", "safenight_rule:explicit_peer_harm"),
                    ("school_avoidance", "medium", "Youth said they do not want to attend school tomorrow.", "safenight_rule:school_next_day"),
                    ("handoff_requested", "high", "Youth consented to share a short handoff note with the assigned worker.", "consent_event:youth_approved"),
                ],
                "concern": "Cyberbullying involving edited photos in a class group chat.",
                "quote": "I'm so tired of explaining this.",
                "state": "Tired, embarrassed, and reluctant to repeat the story.",
                "next": "Check immediate school safety, then agree on one same-day support step.",
            },
            {
                "slug": "jay",
                "youth_id": "youth_jay",
                "conversation_id": "conv_jay_peer_pressure",
                "channel": "WhatsApp",
                "status": ConversationStatus.needs_review,
                "risk_level": RiskLevel.medium,
                "risk_score": 67,
                "unresolved": True,
                "last": now - timedelta(hours=12),
                "messages": [
                    ("youth", "They keep messaging me to pick a side. I don't know if I should reply anymore."),
                    ("ai", "You do not have to decide alone tonight. I can hold the key points for Aisha and help you choose one safe next step."),
                ],
                "signals": [
                    ("peer_pressure", "medium", "Youth described repeated pressure to respond to a peer conflict.", "safenight_rule:coercive_peer_contact"),
                    ("late_night_contact", "medium", "Messages arrived after the usual support window and may affect sleep.", "timestamp_context:after_hours"),
                ],
                "concern": "Peer conflict and stress from repeated late-night messages.",
                "quote": "I don't know if I should reply anymore.",
                "state": "Uneasy, guarded, and unsure what to do next.",
                "next": "Confirm the safest contact window and decide whether to pause, reply, or ask an adult to mediate.",
            },
            {
                "slug": "dan",
                "youth_id": "youth_dan",
                "conversation_id": "conv_dan_morning_sleep",
                "channel": "Instagram",
                "status": ConversationStatus.needs_review,
                "risk_level": RiskLevel.medium,
                "risk_score": 58,
                "unresolved": False,
                "last": now - timedelta(hours=2),
                "messages": [
                    ("youth", "I barely slept and now I can't focus. I keep thinking about what they posted."),
                    ("ai", "Let's keep this simple this morning. Are you safe to get ready for school, and would a short worker check-in help?"),
                ],
                "signals": [
                    ("sleep_disruption", "medium", "Youth reported poor sleep after online teasing.", "safenight_rule:sleep_disruption"),
                    ("morning_escalation", "medium", "Message came before school and may need a same-morning check-in.", "timestamp_context:before_school"),
                ],
                "concern": "Sleep disruption and rising anxiety after online teasing.",
                "quote": "I barely slept and now I can't focus.",
                "state": "Tense, tired, and mentally overloaded.",
                "next": "Check school readiness and offer one grounding step before class.",
            },
            {
                "slug": "afiq",
                "youth_id": "youth_afiq",
                "conversation_id": "conv_afiq_routine_checkin",
                "channel": "GatherTown",
                "status": ConversationStatus.active,
                "risk_level": RiskLevel.low,
                "risk_score": 24,
                "unresolved": False,
                "last": now - timedelta(hours=1),
                "messages": [
                    ("youth", "I'm okay, just busy with school stuff."),
                    ("ai", "Thanks for the update. I will keep this light unless anything changes."),
                ],
                "signals": [
                    ("routine_check_in", "low", "Youth gave a stable update with no escalation language.", "worker_observation:scheduled_checkin"),
                ],
                "concern": "Routine check-in after a quiet evening.",
                "quote": "I'm okay, just busy with school stuff.",
                "state": "Settled and responsive.",
                "next": "Send a warm check-in and continue light-touch monitoring.",
            },
            {
                "slug": "leanne",
                "youth_id": "youth_leanne",
                "conversation_id": "conv_leanne_followup",
                "channel": "Discord",
                "status": ConversationStatus.closed,
                "risk_level": RiskLevel.low,
                "risk_score": 18,
                "unresolved": False,
                "last": now - timedelta(days=1, hours=3),
                "messages": [
                    ("youth", "Thanks for checking in. Things are steady today."),
                    ("ai", "I will note that things are steady and keep the next follow-up as agreed."),
                ],
                "signals": [
                    ("stable_follow_up", "low", "Youth confirmed the current support plan is steady.", "worker_observation:followup_closed"),
                ],
                "concern": "Quiet check-in after a support session.",
                "quote": "Things are steady today.",
                "state": "Calm and settled.",
                "next": "Close the loop and keep the next agreed follow-up time.",
            },
        ]

        for row in rows:
            created_at = row["last"] - timedelta(minutes=3)
            upsert_conversation(
                db,
                row["conversation_id"],
                row["youth_id"],
                row["channel"],
                row["status"],
                row["risk_level"],
                row["risk_score"],
                True,
                row["unresolved"],
                row["last"],
                created_at,
            )
            for index, (sender, content) in enumerate(row["messages"], start=1):
                add_message(
                    db,
                    f"msg_{row['slug']}_{index:03d}",
                    row["conversation_id"],
                    SenderType(sender),
                    content,
                    created_at + timedelta(minutes=index),
                    "passed" if sender == "ai" else None,
                )
            for index, (type_, severity, reason, source) in enumerate(row["signals"], start=1):
                add_signal(
                    db,
                    f"signal_{row['slug']}_{index:03d}",
                    row["conversation_id"],
                    row["youth_id"],
                    type_,
                    severity,
                    reason,
                    source,
                    created_at + timedelta(minutes=index + 1),
                )
            add_handoff(
                db,
                f"handoff_{row['slug']}_current",
                row["conversation_id"],
                row["youth_id"],
                row["concern"],
                row["state"],
                row["risk_level"],
                row["risk_score"],
                row["quote"],
                "Captured named signals, preserved the youth's wording, and made the handoff reasons visible for worker review.",
                "Do not ask the youth to repeat the full story before acknowledging the approved summary.",
                "I read the note you chose to share. We can start from there, and you can decide what to add.",
                row["next"],
                ReviewStatus.pending if row["unresolved"] else ReviewStatus.reviewed,
                row["last"],
            )

        previous = now - timedelta(days=18)
        upsert_conversation(
            db,
            "conv_mira_previous_checkin",
            "youth_mira",
            "Web Chat",
            ConversationStatus.closed,
            RiskLevel.medium,
            45,
            True,
            False,
            previous,
            previous - timedelta(minutes=4),
        )
        add_message(db, "msg_mira_prev_001", "conv_mira_previous_checkin", SenderType.youth, "Can we just make a small plan for Monday?", previous - timedelta(minutes=2))
        add_signal(db, "signal_mira_prev_001", "conv_mira_previous_checkin", "youth_mira", "planning_support", "medium", "Youth asked for a small concrete plan after earlier peer stress.", "worker_observation:historical_context", previous - timedelta(minutes=1))
        add_handoff(
            db,
            "handoff_mira_previous",
            "conv_mira_previous_checkin",
            "youth_mira",
            "Earlier peer stress and request for a small Monday plan.",
            "Worried but willing to plan.",
            RiskLevel.medium,
            45,
            "Can we just make a small plan for Monday?",
            "Kept the handoff concise and focused on Mira's preferred planning style.",
            "Do not turn the check-in into a long review of every peer incident.",
            "Let's make one small plan first, then decide whether anything else needs attention.",
            "Use brief planning language and offer choices.",
            ReviewStatus.reviewed,
            previous,
        )

        case_rows = [
            ("case_mira_001", "youth_mira", CaseStatus.needs_follow_up, "high", "After-hours cyberbullying handoff for Mira.", now - timedelta(hours=8), now - timedelta(hours=1)),
            ("case_jay_001", "youth_jay", CaseStatus.needs_follow_up, "medium", "Peer pressure handoff with repeated late-night messaging.", now - timedelta(hours=11), now + timedelta(hours=3)),
            ("case_dan_001", "youth_dan", CaseStatus.open, "medium", "Morning sleep disruption and school readiness check.", now - timedelta(hours=2), now + timedelta(hours=1)),
            ("case_afiq_001", "youth_afiq", CaseStatus.open, "low", "Routine low-risk check-in.", now - timedelta(hours=1), now + timedelta(days=2)),
            ("case_leanne_001", "youth_leanne", CaseStatus.closed, "low", "Stable post-session follow-up closed.", now - timedelta(days=1), None),
        ]
        for case_id, youth_id, status, priority, summary, updated_at, follow_up in case_rows:
            upsert_case(db, case_id, youth_id, worker, status, priority, summary, updated_at, follow_up)
            add_case_note(
                db,
                f"note_{case_id}_seed",
                case_id,
                worker,
                f"Seed context: {summary}",
                "Review the latest handoff first." if priority in {"high", "medium"} else "Continue agreed monitoring.",
                updated_at,
            )

        day7_audit_rows = [
            (
                "audit_day7_001",
                None,
                "ai_response_generated",
                "conversation",
                "conv_mira_after_hours",
                "SafeNight generated a safety-bounded first response for Mira's after-hours cyberbullying message.",
                now - timedelta(hours=9, minutes=3),
            ),
            (
                "audit_day7_002",
                "user_mira",
                "handoff_consent_received",
                "conversation",
                "conv_mira_after_hours",
                "Mira approved sharing a short handoff note with her assigned worker.",
                now - timedelta(hours=9, minutes=2),
            ),
            (
                "audit_day7_003",
                None,
                "risk_signal_extracted",
                "signal",
                "signal_mira_001",
                "Cyberbullying and school avoidance signals were extracted from the approved conversation context.",
                now - timedelta(hours=9, minutes=1),
            ),
            (
                "audit_day7_004",
                None,
                "handoff_created",
                "handoff_brief",
                "handoff_mira_current",
                "AI handoff brief created with the youth quote, risk score, and guidance on what not to repeat.",
                now - timedelta(hours=9),
            ),
            (
                "audit_day7_005",
                "user_worker_1",
                "worker_reviewed",
                "handoff_brief",
                "handoff_mira_current",
                "Aisha reviewed the pending handoff before opening the morning worker response.",
                now - timedelta(hours=1, minutes=20),
            ),
            (
                "audit_day7_006",
                "user_supervisor",
                "case_reassigned",
                "case",
                "case_jay_001",
                "Supervisor reassigned one medium-risk case to reduce morning worker load pressure.",
                now - timedelta(minutes=35),
            ),
        ]

        for audit_row in day7_audit_rows:
            upsert_audit_log(db, *audit_row)

        upsert_audit_log(
            db,
            "audit_seed_001",
            None,
            "seed_data_created",
            "conversation",
            "conv_mira_after_hours",
            "Day 6 fictional worker radar seed data loaded with explainable signals and previous handoffs.",
            now - timedelta(days=1),
        )

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
    print("Seeded SignalBridge fictional Day 6 radar data.")

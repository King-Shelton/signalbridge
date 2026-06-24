import argparse
import json
import os
from datetime import datetime, timedelta, timezone
from enum import Enum
from pathlib import Path

from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine
from app.timeutil import SGT, naive_utcnow
from app.models.audit_log import AuditLog
from app.models.ai_run import AiRun
from app.models.case import Case, CaseStatus
from app.models.case_note import CaseNote
from app.models.conversation import Conversation, ConversationStatus, RiskLevel
from app.models.handoff_brief import HandoffBrief, ReviewStatus
from app.models.message import Message, SenderType
from app.models.signal import Signal
from app.models.user import User, UserRole
from app.models.worker_notification_settings import WorkerNotificationSettings
from app.models.youth_profile import YouthProfile
from app.services.auth_service import hash_password


def reset_database() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


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


def _upsert_worker_notifications(
    db: Session,
    user_id: str,
    telegram_chat_id: str | None = None,
    discord_webhook_url: str | None = None,
) -> WorkerNotificationSettings:
    row = db.query(WorkerNotificationSettings).filter_by(user_id=user_id).first()
    if row is None:
        row = WorkerNotificationSettings(user_id=user_id)
        db.add(row)
    row.telegram_chat_id = telegram_chat_id
    row.discord_webhook_url = discord_webhook_url
    return row


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


def seed(reset: bool = False) -> None:
    if reset:
        reset_database()
        print("SignalBridge database reset.")
    else:
        Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    now = naive_utcnow().replace(microsecond=0)

    # Mira's after-hours message is the hero of the demo, so it must always read as
    # a real late-night message ("11:42 PM, last night") regardless of when the
    # database is seeded. Anchoring it to a fixed Singapore wall-clock keeps the
    # timestamp, the "After hours" badge, and the worker's "morning review" story
    # consistent even if the team reseeds in the afternoon. Other conversations stay
    # relative to now so the cockpit still feels live.
    sgt_now = now.replace(tzinfo=timezone.utc).astimezone(SGT)
    last_night_2342 = sgt_now.replace(hour=23, minute=40, second=0, microsecond=0)
    if last_night_2342 >= sgt_now:
        last_night_2342 -= timedelta(days=1)
    mira_after_hours = last_night_2342.astimezone(timezone.utc).replace(tzinfo=None)

    try:
        worker = upsert_user(db, "user_worker_1", "Aisha Rahman", "worker1@signalbridge.test", UserRole.worker)
        worker_two = upsert_user(db, "user_worker_2", "Marcus Lee", "worker2@signalbridge.test", UserRole.worker)
        upsert_user(db, "user_supervisor", "Daniel Lim", "supervisor@signalbridge.test", UserRole.supervisor)
        db.flush()

        youth_users = {
            "mira": upsert_user(db, "user_mira", "Mira Tan", "mira@signalbridge.test", UserRole.youth),
            "jay": upsert_user(db, "user_jay", "Jay Lim", "jay@signalbridge.test", UserRole.youth),
            "dan": upsert_user(db, "user_dan", "Dan Ng", "dan@signalbridge.test", UserRole.youth),
            "afiq": upsert_user(db, "user_afiq", "Afiq Rahman", "afiq@signalbridge.test", UserRole.youth),
            "leanne": upsert_user(db, "user_leanne", "Leanne Tan", "leanne@signalbridge.test", UserRole.youth),
        }
        db.flush()

        upsert_youth(db, "youth_mira", youth_users["mira"], worker, "Web Chat",
                     "Prefers gentle check-ins, clear choices, and not having to repeat painful details.",
                     "Cyberbullying, school avoidance, and peer group pressure.")
        upsert_youth(db, "youth_jay", youth_users["jay"], worker, "WhatsApp",
                     "Responds best to calm, practical options and a clear next contact window.",
                     "Peer pressure, repeated late-night messages, and conflict avoidance.")
        upsert_youth(db, "youth_dan", youth_users["dan"], worker, "Instagram",
                     "Needs short morning check-ins and concrete next steps before school.",
                     "Poor sleep, online teasing, and anxiety before class.")
        upsert_youth(db, "youth_afiq", youth_users["afiq"], worker, "GatherTown",
                     "Prefers light-touch monitoring unless he asks for more support.",
                     "Academic load and quiet withdrawal when stressed.")
        upsert_youth(db, "youth_leanne", youth_users["leanne"], worker_two, "Discord",
                     "Likes tidy follow-through and agreed check-in times.",
                     "Post-session follow-up and occasional social anxiety.")
        db.flush()

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
                "last": mira_after_hours + timedelta(minutes=4),
                "messages": [
                    ("youth", "People in my class group chat keep editing my photos. I don't want to go school tomorrow."),
                    ("ai", "I am sorry this is happening. I can help prepare a short note for your worker so you do not have to repeat everything tomorrow."),
                ],
                "signals": [
                    ("cyberbullying", "high", "Youth described edited photos being shared in a class group chat.", "safenight_rule:explicit_peer_harm"),
                    ("school_avoidance", "medium", "Youth said they do not want to attend school tomorrow.", "safenight_rule:school_next_day"),
                    ("handoff_requested", "high", "Youth consented to share a short handoff note with the assigned worker.", "consent_event:youth_approved"),
                ],
                "concern": "Cyberbullying involving edited photos in a class group chat.",
                "quote": "I don't want to go school tomorrow.",
                "state": "Embarrassed, worried about school, and reluctant to repeat the story.",
                "worker_response": "Hi Mira, I read the note you allowed SignalBridge to prepare. You do not have to repeat everything unless you want to. Can I first check whether you feel safe going to school today?",
                "what_ai_did": "Validated distress, identified cyberbullying and school avoidance as the core signals, and prepared the handoff only after consent.",
                "what_not_to_repeat": "Do not make Mira retell the edited-photo incident unless she chooses to add more detail.",
                "next": "Review the handoff first thing, open with a safety check, and plan a same-day follow-up.",
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
                    ("ai", "You do not have to decide alone tonight. I can hold the key points for your worker and help you choose one safe next step."),
                ],
                "signals": [
                    ("peer_pressure", "medium", "Youth described repeated pressure to respond to a peer conflict.", "safenight_rule:coercive_peer_contact"),
                    ("late_night_contact", "medium", "Messages arrived after the usual support window and may affect sleep.", "timestamp_context:after_hours"),
                ],
                "concern": "Peer conflict and stress from repeated late-night messages.",
                "quote": "I don't know if I should reply anymore.",
                "state": "Uneasy, guarded, and unsure what to do next.",
                "worker_response": "Thanks for letting SignalBridge hold this for you. Let's work out the safest next step together when you're ready.",
                "what_ai_did": "Captured the stress from repeated late-night messages, kept the tone calm, and queued a worker follow-up instead of escalating early.",
                "what_not_to_repeat": "Do not push Jay for an immediate reply decision or force a long explanation twice.",
                "next": "Confirm the best contact window and decide whether the concern is conflict, pressure, or overwhelm.",
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
                "worker_response": "I saw the note you agreed to share. We can keep this simple and focus on what you need this morning.",
                "what_ai_did": "Noted the sleep disruption and anxiety, flagged the morning timing, and kept the handoff short so the worker can act quickly.",
                "what_not_to_repeat": "Do not turn the morning check-in into a long questionnaire.",
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
                "worker_response": "Thanks for the update, Afiq. I will keep this light unless anything changes, and you can tell me if you want more support.",
                "what_ai_did": "Tagged the conversation as stable, captured the low-risk tone, and preserved a light-touch follow-up path.",
                "what_not_to_repeat": "Do not over-interpret a routine check-in as an escalation.",
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
                "worker_response": "I got your update, Leanne. I am noting that things are steady for now and I will check back in as agreed.",
                "what_ai_did": "Logged the routine follow-up, captured the calm tone, and kept the follow-up path tidy.",
                "what_not_to_repeat": "Do not reopen the session with unnecessary detail once things are stable.",
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
                    SenderType(sender) if sender in ("youth", "ai", "worker") else SenderType.ai,
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
                row["what_ai_did"],
                row["what_not_to_repeat"],
                row["worker_response"],
                row["next"],
                ReviewStatus.pending if row["unresolved"] else ReviewStatus.reviewed,
                row["last"],
            )

        previous = now - timedelta(days=18)
        upsert_conversation(
            db, "conv_mira_previous_checkin", "youth_mira", "Web Chat",
            ConversationStatus.closed, RiskLevel.medium, 45, True, False,
            previous, previous - timedelta(minutes=4),
        )
        add_message(db, "msg_mira_prev_001", "conv_mira_previous_checkin", SenderType.youth,
                    "Can we just make a small plan for Monday?", previous - timedelta(minutes=2))
        add_signal(db, "signal_mira_prev_001", "conv_mira_previous_checkin", "youth_mira",
                   "planning_support", "medium",
                   "Youth asked for a small concrete plan after earlier peer stress.",
                   "worker_observation:historical_context", previous - timedelta(minutes=1))
        add_handoff(
            db, "handoff_mira_previous", "conv_mira_previous_checkin", "youth_mira",
            "Earlier peer stress and request for a small Monday plan.",
            "Worried but willing to plan.", RiskLevel.medium, 45,
            "Can we just make a small plan for Monday?",
            "Kept the handoff concise and focused on Mira's preferred planning style.",
            "Do not turn the check-in into a long review of every peer incident.",
            "Let's make one small plan first, then decide whether anything else needs attention.",
            "Use brief planning language and offer choices.", ReviewStatus.reviewed, previous,
        )

        case_rows = [
            ("case_mira_001", "youth_mira", CaseStatus.needs_review, "high",
             "After-hours cyberbullying handoff for Mira.", now - timedelta(hours=8), now - timedelta(hours=1)),
            ("case_jay_001", "youth_jay", CaseStatus.needs_review, "medium",
             "Peer pressure handoff with repeated late-night messaging.", now - timedelta(hours=11), now + timedelta(hours=3)),
            ("case_dan_001", "youth_dan", CaseStatus.in_progress, "medium",
             "Morning sleep disruption and school readiness check.", now - timedelta(hours=2), now + timedelta(hours=1)),
            ("case_afiq_001", "youth_afiq", CaseStatus.new, "low",
             "Routine low-risk check-in.", now - timedelta(hours=1), now + timedelta(days=2)),
            ("case_leanne_001", "youth_leanne", CaseStatus.closed, "low",
             "Stable post-session follow-up closed.", now - timedelta(days=1), None),
        ]
        for case_id, youth_id, status, priority, summary, updated_at, follow_up in case_rows:
            upsert_case(db, case_id, youth_id, worker, status, priority, summary, updated_at, follow_up)
            add_case_note(
                db, f"note_{case_id}_seed", case_id, worker,
                f"Demo context: {summary}",
                "Start with the latest handoff and keep the first message short." if priority in {"high", "medium"} else "Continue agreed monitoring.",
                updated_at,
            )

        if db.get(AuditLog, "audit_seed_consent_mira") is None:
            db.add(AuditLog(id="audit_seed_consent_mira", actor_user_id="user_mira",
                            event_type="handoff_consent_received", entity_type="conversation",
                            entity_id="conv_mira_after_hours",
                            details=json.dumps({"consentGiven": True, "youthId": "youth_mira"}),
                            created_at=mira_after_hours + timedelta(minutes=3)))

        if db.get(AuditLog, "audit_seed_handoff_mira") is None:
            db.add(AuditLog(id="audit_seed_handoff_mira", actor_user_id=None,
                            event_type="ai_handoff_brief_created", entity_type="handoff_brief",
                            entity_id="handoff_mira_current",
                            details=json.dumps({"riskLevel": "high", "riskScore": 92, "aiMode": "fallback_rule_based"}),
                            created_at=mira_after_hours + timedelta(minutes=3)))

        if db.get(AuditLog, "audit_seed_response_mira") is None:
            db.add(AuditLog(id="audit_seed_response_mira", actor_user_id=None,
                            event_type="ai_response_generated", entity_type="conversation",
                            entity_id="conv_mira_after_hours",
                            details=json.dumps({"aiMode": "safenight_fallback", "safetyStatus": "fallback_passed"}),
                            created_at=mira_after_hours + timedelta(minutes=3)))

        if db.get(AuditLog, "audit_seed_signal_jay") is None:
            db.add(AuditLog(id="audit_seed_signal_jay", actor_user_id=None,
                            event_type="ai_risk_analysis_completed", entity_type="conversation",
                            entity_id="conv_jay_peer_pressure",
                            details=json.dumps({"riskLevel": "medium", "riskScore": 67, "aiMode": "fallback_rule_based"}),
                            created_at=now - timedelta(hours=12)))

        if db.get(AuditLog, "audit_case_mira_status") is None:
            db.add(AuditLog(id="audit_case_mira_status", actor_user_id=worker.id,
                            event_type="case_status_updated", entity_type="case",
                            entity_id="case_mira_001",
                            details=json.dumps({"previous": {"status": "open"}, "current": {"status": "needs_follow_up"}}),
                            created_at=now - timedelta(hours=8)))

        db.flush()
        if db.get(AiRun, "airun_seed_001") is None:
            db.add(AiRun(id="airun_seed_001", conversation_id="conv_mira_after_hours",
                         action="generate_handoff", mode="fallback_rule_based", model_name=None,
                         prompt_version="handoff-v1", safety_status="fallback_passed",
                         error="Deterministic fallback - no OpenAI key required for seed demo"))

        # Optional demo notification channels. Keep real chat IDs/webhooks in
        # local env only; the seed remains safe to export and share.
        _upsert_worker_notifications(
            db,
            user_id="user_worker_1",
            telegram_chat_id=os.getenv("SIGNALBRIDGE_DEMO_TELEGRAM_CHAT_ID"),
            discord_webhook_url=os.getenv("SIGNALBRIDGE_DEMO_DISCORD_WEBHOOK_URL"),
        )

        db.commit()
        print("SignalBridge seed data loaded.")
    except Exception as exc:
        db.rollback()
        raise exc
    finally:
        db.close()


EXPORT_MODELS = (
    User,
    YouthProfile,
    WorkerNotificationSettings,
    Conversation,
    Message,
    Signal,
    HandoffBrief,
    Case,
    CaseNote,
    AuditLog,
    AiRun,
)


def _export_value(value):
    if isinstance(value, datetime):
        return value.replace(microsecond=0).isoformat() + "Z"
    if isinstance(value, Enum):
        return value.value
    return value


def _export_row(row) -> dict:
    payload = {
        column.key: _export_value(getattr(row, column.key))
        for column in row.__mapper__.columns
    }
    if row.__tablename__ == "worker_notification_settings":
        if payload.get("telegram_chat_id"):
            payload["telegram_chat_id"] = "<set SIGNALBRIDGE_DEMO_TELEGRAM_CHAT_ID>"
        if payload.get("discord_webhook_url"):
            payload["discord_webhook_url"] = "<set SIGNALBRIDGE_DEMO_DISCORD_WEBHOOK_URL>"
    return payload


def export_seed_json(path: Path) -> None:
    db = SessionLocal()
    try:
        data = {
            model.__tablename__: [
                _export_row(row)
                for row in db.query(model).order_by(model.id).all()
            ]
            for model in EXPORT_MODELS
        }
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed SignalBridge fictional demo data.")
    parser.add_argument("--reset", action="store_true", help="Drop all application tables before reseeding.")
    parser.add_argument("--export-json", type=Path, help="Write the seeded demo database rows to a JSON file.")
    args = parser.parse_args()

    seed(reset=args.reset)
    if args.export_json:
        export_seed_json(args.export_json)
        print(f"Exported SignalBridge seed data to {args.export_json}.")
    print("Seeded SignalBridge demo data successfully.")

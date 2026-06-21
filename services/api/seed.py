import json
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine
from app.models.audit_log import AuditLog
from app.models.ai_run import AiRun
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


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    now = datetime.utcnow().replace(microsecond=0)

    try:
        worker = upsert_user(db, "user_worker_1", "Aisha Rahman", "worker1@signalbridge.test", UserRole.worker)
        worker_two = upsert_user(db, "user_worker_2", "Marcus Lee", "worker2@signalbridge.test", UserRole.worker)
        upsert_user(db, "user_supervisor", "Daniel Lim", "supervisor@signalbridge.test", UserRole.supervisor)
<<<<<<< HEAD
        db.flush()
=======
        youth_users = {
            "mira": upsert_user(db, "user_mira", "Mira Tan", "mira@signalbridge.test", UserRole.youth),
            "jay": upsert_user(db, "user_jay", "Jay Lim", "jay@signalbridge.test", UserRole.youth),
            "dan": upsert_user(db, "user_dan", "Dan Ng", "dan@signalbridge.test", UserRole.youth),
            "afiq": upsert_user(db, "user_afiq", "Afiq Rahman", "afiq@signalbridge.test", UserRole.youth),
            "leanne": upsert_user(db, "user_leanne", "Leanne Tan", "leanne@signalbridge.test", UserRole.youth),
        }
>>>>>>> origin/codex/davier-day-5-worker-api

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
<<<<<<< HEAD
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
=======
            for index, (sender, content) in enumerate(row["messages"], start=1):
                add_message(
                    db,
                    f"msg_{row['slug']}_{index:03d}",
                    row["conversation_id"],
                    SenderType(sender),
                    content,
                    created_at + timedelta(minutes=index),
                    "passed" if sender == "ai" else None,
>>>>>>> origin/codex/davier-day-5-worker-api
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

<<<<<<< HEAD
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
=======
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
>>>>>>> origin/codex/davier-day-5-worker-api
            )
        if conversation.last_message_at is None:
            conversation.last_message_at = datetime.utcnow()

        jay = upsert_user(db, "user_jay", "Jay Lim", "jay@signalbridge.test", UserRole.youth)
        dan = upsert_user(db, "user_dan", "Dan Ng", "dan@signalbridge.test", UserRole.youth)
        afiq = upsert_user(db, "user_afiq", "Afiq Rahman", "afiq@signalbridge.test", UserRole.youth)
        leanne = upsert_user(db, "user_leanne", "Leanne Tan", "leanne@signalbridge.test", UserRole.youth)

        for youth_id, user, channel, support_style, stressors, assigned_case_id in [
            (
                "youth_jay",
                jay,
                "WhatsApp",
                "Prefers calm, practical check-ins and short follow-ups.",
                "Peer pressure, repeated messages, and conflict escalation.",
                "case_jay_001",
            ),
            (
                "youth_dan",
                dan,
                "Instagram",
                "Short check-ins and concrete next steps.",
                "Sleep disruption, school pressure, and anxiety.",
                "case_dan_001",
            ),
            (
                "youth_afiq",
                afiq,
                "GatherTown",
                "Light-touch updates with room to opt in when needed.",
                "Routine check-ins and monitoring for change.",
                "case_afiq_001",
            ),
            (
                "youth_leanne",
                leanne,
                "Discord",
                "Tidy follow-through and low-pressure support.",
                "Routine follow-up after a stable support session.",
                "case_leanne_001",
            ),
        ]:
            youth_profile = db.get(YouthProfile, youth_id)
            if youth_profile is None:
                youth_profile = YouthProfile(
                    id=youth_id,
                    user_id=user.id,
                    assigned_worker_id=worker.id,
                    preferred_channel=channel,
                    support_style=support_style,
                    stressors=stressors,
                )
                db.add(youth_profile)

            if youth_id == "youth_jay":
                conversation_id = "conv_jay_follow_up"
                handoff_id = "handoff-jay-001"
                risk_level = RiskLevel.medium
                risk_score = 67
                status = ConversationStatus.needs_review
                main_concern = "Peer conflict and stress from repeated late-night messages"
                emotional_state = "Uneasy, guarded, and unsure what to do next"
                key_quote = "I don't know if I should reply anymore."
                worker_response = "Thanks for letting SignalBridge hold this for you. Let's work out the safest next step together when you're ready."
                what_ai_did = "Captured the stress from repeated late-night messages, kept the tone calm, and queued a worker follow-up instead of escalating early."
                what_not_to_repeat = "Do not push Jay for an immediate reply decision or force a long explanation twice."
                next_step = "Confirm the best contact window and decide whether the concern is conflict, pressure, or overwhelm."
                concern = "Peer conflict and stress from repeated late-night messages"
                messages = [
                    ("msg_jay_001", SenderType.youth, "I don't know if I should reply anymore.", None),
                    ("msg_jay_002", SenderType.worker, "Thanks for sending that through. We can look at the safest next step together when you're ready.", None),
                    ("msg_jay_003", SenderType.system, "Conversation tagged for worker follow-up during the next contact window.", None),
                ]
                signals = [
                    ("signal_jay_repeated_messages", "repeated_messages", "medium", "Repeated late-night messages are creating pressure"),
                    ("signal_jay_peer_pressure", "peer_pressure", "medium", "Jay is worried about replying and making things worse"),
                ]
                review_status = ReviewStatus.pending
                case_status = CaseStatus.needs_follow_up
                summary = "Peer conflict follow-up for Jay."
            elif youth_id == "youth_dan":
                conversation_id = "conv_dan_morning"
                handoff_id = "handoff-dan-001"
                risk_level = RiskLevel.medium
                risk_score = 58
                status = ConversationStatus.active
                main_concern = "Sleep disruption and rising anxiety after online teasing"
                emotional_state = "Tense, tired, and mentally overloaded"
                key_quote = "I barely slept and now I can't focus."
                worker_response = "I saw the note you agreed to share. We can keep this simple and focus on what you need this morning."
                what_ai_did = "Noted the sleep disruption and anxiety, flagged the morning timing, and kept the handoff short so the worker can act quickly."
                what_not_to_repeat = "Do not turn the morning check-in into a long questionnaire."
                next_step = "Check on school readiness, offer a brief grounding step, and document whether support is needed before class."
                concern = "Sleep disruption and rising anxiety after online teasing"
                messages = [
                    ("msg_dan_001", SenderType.youth, "I barely slept and now I can't focus.", None),
                    ("msg_dan_002", SenderType.worker, "Let's keep this simple this morning. Are you safe to get ready for school?", None),
                    ("msg_dan_003", SenderType.system, "Instagram conversation surfaced as a morning follow-up case.", None),
                ]
                signals = [
                    ("signal_dan_morning_escalation", "morning_escalation", "medium", "Morning timing suggests the concern is now affecting school readiness"),
                    ("signal_dan_poor_sleep", "poor_sleep", "medium", "Dan reported he barely slept"),
                    ("signal_dan_anxiety", "anxiety", "medium", "Dan is struggling to focus"),
                ]
                review_status = ReviewStatus.pending
                case_status = CaseStatus.needs_follow_up
                summary = "Morning check-in for Dan."
            elif youth_id == "youth_afiq":
                conversation_id = "conv_afiq_steady"
                handoff_id = "handoff-afiq-001"
                risk_level = RiskLevel.low
                risk_score = 24
                status = ConversationStatus.active
                main_concern = "Routine check-in after a quiet evening"
                emotional_state = "Settled and responsive"
                key_quote = "I'm okay, just busy with school stuff."
                worker_response = "Thanks for the update, Afiq. I'll keep this light unless anything changes, and you can tell me if you want more support."
                what_ai_did = "Tagged the conversation as stable, captured the low-risk tone, and preserved a light-touch follow-up path."
                what_not_to_repeat = "Do not over-interpret a routine check-in as an escalation."
                next_step = "Send a warm check-in and keep monitoring for changes."
                concern = "Routine check-in after a quiet evening"
                messages = [
                    ("msg_afiq_001", SenderType.system, "GatherTown check-in captured from the approved support space.", None),
                    ("msg_afiq_002", SenderType.youth, "I'm okay, just busy with school stuff.", None),
                    ("msg_afiq_003", SenderType.worker, "Sounds steady. I will keep the follow-up light unless you need more support.", None),
                ]
                signals = [
                    ("signal_afiq_low_urgency", "low_urgency", "low", "No immediate escalation detected"),
                    ("signal_afiq_consistent_activity", "consistent_activity", "low", "Afiq is still checking in regularly"),
                ]
                review_status = ReviewStatus.reviewed
                case_status = CaseStatus.open
                summary = "Light-touch check-in for Afiq."
            else:
                conversation_id = "conv_leanne_follow_up"
                handoff_id = "handoff-leanne-001"
                risk_level = RiskLevel.low
                risk_score = 18
                status = ConversationStatus.closed
                main_concern = "Quiet check-in after a support session"
                emotional_state = "Calm and settled"
                key_quote = "Thanks for checking in."
                worker_response = "I got your update, Leanne. I am noting that things are steady for now and I will check back in as agreed."
                what_ai_did = "Logged the routine follow-up, captured the calm tone, and kept the path ready for an API-backed sync."
                what_not_to_repeat = "Do not reopen the session with unnecessary detail once things are stable."
                next_step = "Close the loop, confirm the next follow-up time, and keep the note concise."
                concern = "Quiet check-in after a support session"
                messages = [
                    ("msg_leanne_001", SenderType.system, "Discord thread is tagged as API-ready for Day 5 live conversation sync.", None),
                    ("msg_leanne_002", SenderType.youth, "Thanks for checking in.", None),
                    ("msg_leanne_003", SenderType.worker, "Noted. I will log that things are steady and follow up as agreed.", None),
                ]
                signals = [
                    ("signal_leanne_low_risk", "low_risk", "low", "Routine follow-up only"),
                ]
                review_status = ReviewStatus.reviewed
                case_status = CaseStatus.closed
                summary = "Routine follow-up for Leanne."

            conversation = db.get(Conversation, conversation_id)
            if conversation is None:
                conversation = Conversation(
                    id=conversation_id,
                    youth_id=youth_id,
                    channel=channel,
                    status=status,
                    risk_level=risk_level,
                    risk_score=risk_score,
                    consent_to_handoff=True,
                    unresolved_handoff=True,
                )
                db.add(conversation)

            for message_id, sender_type, content, safety_status in messages:
                if db.get(Message, message_id) is None:
                    db.add(
                        Message(
                            id=message_id,
                            conversation_id=conversation_id,
                            sender_type=sender_type,
                            content=content,
                            safety_status=safety_status,
                        )
                    )

            if conversation.last_message_at is None:
                conversation.last_message_at = datetime.utcnow()

            for signal_id, type_, severity, reason in signals:
                if db.get(Signal, signal_id) is None:
                    db.add(
                        Signal(
                            id=signal_id,
                            conversation_id=conversation_id,
                            youth_id=youth_id,
                            type=type_,
                            severity=severity,
                            reason=reason,
                        )
                    )

            handoff = db.get(HandoffBrief, handoff_id)
            if handoff is None:
                db.add(
                    HandoffBrief(
                        id=handoff_id,
                        conversation_id=conversation_id,
                        youth_id=youth_id,
                        main_concern=main_concern,
                        emotional_state=emotional_state,
                        risk_level=risk_level,
                        risk_score=risk_score,
                        key_quote=key_quote,
                        what_ai_did=what_ai_did,
                        what_not_to_repeat=what_not_to_repeat,
                        suggested_worker_response=worker_response,
                        recommended_next_step=next_step,
                        review_status=review_status,
                    )
                )

            case = db.get(Case, assigned_case_id)
            if case is None:
                db.add(
                    Case(
                        id=assigned_case_id,
                        youth_id=youth_id,
                        assigned_worker_id=worker.id,
                        status=case_status,
                        priority="high" if risk_level == RiskLevel.high else "medium",
                        summary=summary,
                    )
                )

        if db.get(AuditLog, "audit_case_mira_status_seed") is None:
            db.add(
                AuditLog(
                    id="audit_case_mira_status_seed",
                    actor_user_id=worker.id,
                    event_type="worker_case_status_seed",
                    entity_type="case",
                    entity_id="case_mira_001",
                    details=json.dumps({"caseStatus": "Needs Review"}),
                )
            )

        if db.get(AuditLog, "audit_case_jay_status_seed") is None:
            db.add(
                AuditLog(
                    id="audit_case_jay_status_seed",
                    actor_user_id=worker.id,
                    event_type="worker_case_status_seed",
                    entity_type="case",
                    entity_id="case_jay_001",
                    details=json.dumps({"caseStatus": "In Progress"}),
                )
            )

        if db.get(AuditLog, "audit_case_dan_status_seed") is None:
            db.add(
                AuditLog(
                    id="audit_case_dan_status_seed",
                    actor_user_id=worker.id,
                    event_type="worker_case_status_seed",
                    entity_type="case",
                    entity_id="case_dan_001",
                    details=json.dumps({"caseStatus": "New"}),
                )
            )

        if db.get(AuditLog, "audit_case_afiq_status_seed") is None:
            db.add(
                AuditLog(
                    id="audit_case_afiq_status_seed",
                    actor_user_id=worker.id,
                    event_type="worker_case_status_seed",
                    entity_type="case",
                    entity_id="case_afiq_001",
                    details=json.dumps({"caseStatus": "Followed Up"}),
                )
            )

        if db.get(AuditLog, "audit_case_leanne_status_seed") is None:
            db.add(
                AuditLog(
                    id="audit_case_leanne_status_seed",
                    actor_user_id=worker.id,
                    event_type="worker_case_status_seed",
                    entity_type="case",
                    entity_id="case_leanne_001",
                    details=json.dumps({"caseStatus": "Closed"}),
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
                    details="Day 6 fictional worker radar seed data loaded with explainable signals and previous handoffs.",
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
    print("Seeded SignalBridge fictional Day 6 radar data.")

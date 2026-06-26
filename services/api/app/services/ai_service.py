import json
import logging
import re
from pydantic import BaseModel, Field
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.timeutil import to_sgt
from app.models.ai_run import AiRun
from app.models.audit_log import AuditLog
from app.models.conversation import Conversation, ConversationStatus, RiskLevel
from app.models.handoff_brief import HandoffBrief
from app.models.message import Message, SenderType
from app.models.signal import Signal
from app.models.user import User
from app.models.youth_profile import YouthProfile


AI_MODE = "fallback_rule_based"
logger = logging.getLogger("signalbridge.ai")

# Short affirmatives the youth might say in reply to a consent ask
_CONSENT_PHRASES: tuple[str, ...] = (
    "sure", "yes", "yeah", "yep", "ok", "okay", "alright", "fine",
    "go ahead", "sounds good", "please do", "do it", "why not",
    "of course", "you can", "u can", "go for it", "please",
    "yah", "ya", "yes please", "yeah sure", "yeah ok", "yeah okay",
    "ok sure", "ok yeah", "sure thing", "thats fine", "that's fine",
)

# Markers that indicate the AI message asked about sharing a note
_CONSENT_ASK_MARKERS: tuple[str, ...] = (
    "note for your worker",
    "note for your",
    "share with your worker",
    "prepare a",
    "okay if i prepared",
    "would it be okay",
    "want me to prepare",
    "you'd get to see it",
    "before they do",
    "worker to read",
    "worker know",
)


def _ai_asked_about_consent(last_ai_message: str) -> bool:
    text = last_ai_message.lower()
    return any(marker in text for marker in _CONSENT_ASK_MARKERS)


def detect_verbal_consent(youth_message: str, last_ai_message: str | None) -> bool:
    """Return True when the youth appears to be verbally consenting to a worker handoff.

    Only fires when (a) the last AI turn actually asked about sharing a note, and
    (b) the youth's reply is a short, clearly affirmative message.
    """
    if not last_ai_message or not _ai_asked_about_consent(last_ai_message):
        text = youth_message.strip().lower().rstrip("!.?")
        return any(
            phrase in text
            for phrase in (
                "share a note",
                "share the note",
                "send a note",
                "tell my worker",
                "share with my worker",
                "please share",
            )
        )
    text = youth_message.strip().lower().rstrip("!.?")
    if len(text) > 60:
        return False
    return text in _CONSENT_PHRASES or any(text.startswith(p + " ") for p in _CONSENT_PHRASES)


def build_consent_confirmation_reply() -> str:
    """The AI reply sent immediately after it detects verbal consent and triggers the handoff."""
    return (
        "I've prepared a short note for your worker — you can see exactly what they'll read before they do. "
        "Nothing is locked in; you're still in control of this."
    )


def _should_ask_consent(
    assessment: "RiskAssessment",
    history: "list[Message]",
    consent_to_handoff: bool,
) -> bool:
    """Return True when SafeNight should embed a consent ask in its next reply."""
    if consent_to_handoff:
        return False
    if assessment.risk_score < 40:
        return False
    youth_count = sum(1 for m in history if m.sender_type == SenderType.youth)
    if youth_count < 2:
        return False
    ai_messages = [m for m in history if m.sender_type == SenderType.ai]
    if ai_messages and _ai_asked_about_consent(ai_messages[-1].content):
        return False
    return True


class HandoffDraft(BaseModel):
    main_concern: str = Field(max_length=800)
    emotional_state: str = Field(max_length=500)
    what_ai_did: str = Field(max_length=800)
    what_not_to_repeat: str = Field(max_length=800)
    suggested_worker_response: str = Field(max_length=1200)
    recommended_next_step: str = Field(max_length=800)

@dataclass(frozen=True)
class RuleSignal:
    type: str
    severity: str
    reason: str
    matched_terms: list[str]


@dataclass(frozen=True)
class RiskAssessment:
    risk_level: RiskLevel
    risk_score: int
    signals: list[RuleSignal]
    safety_status: str
    handoff_recommended: bool
    ai_mode: str = AI_MODE


RULES: dict[str, dict[str, object]] = {
    "cyberbullying": {
        "severity": "high",
        "score": 30,
        "terms": [
            "group chat",
            "edited my photo",
            "editing my photos",
            "edited photos",
            "posting my photo",
            "posting photos",
            "shared my photo",
            "sharing my photo",
            "sent my photo",
            "screenshot",
            "screenshots",
            "screenshotting",
            "cyberbully",
            "cyberbullying",
            "bully",
            "bullying",
            "mean comments",
            "nasty comments",
            "making fun of me",
            "talking behind my back",
            "spreading rumours",
            "spreading rumors",
            "send it to everyone",
            "sent it around",
            "shared it around",
            "group chat about me",
            "online harassment",
            "people are saying",
            "they keep sending",
        ],
        "reason": "Message mentions online peer harm, edited photos, group chat harassment, or bullying.",
    },
    "school_avoidance": {
        "severity": "medium",
        "score": 18,
        "terms": [
            "don't want to go school",
            "do not want to go school",
            "don't want to go to school",
            "do not want to go to school",
            "skip school",
            "school tomorrow",
            "avoid school",
            "not going to school",
            "hate school",
            "afraid to go to school",
            "scared to go to school",
            "can't face school",
            "cannot face school",
            "don't want to face",
            "skip tomorrow",
            "not attending",
            "refuse to go",
        ],
        "reason": "Message suggests avoiding school or feeling unable to attend after the incident.",
    },
    "negative_emotional_language": {
        "severity": "medium",
        "score": 15,
        "terms": [
            "tired",
            "exhausted",
            "hopeless",
            "worthless",
            "ashamed",
            "embarrassed",
            "scared",
            "anxious",
            "can't anymore",
            "cannot anymore",
            "so done",
            "hate myself",
            "hate myself so much",
            "feel so bad",
            "feeling so bad",
            "feel terrible",
            "feel awful",
            "feel empty",
            "feel numb",
            "feel alone",
            "no one cares",
            "nobody cares",
            "nobody understands",
            "no one understands",
            "i can't cope",
            "i cant cope",
            "can't handle",
            "cannot handle",
            "don't know what to do",
            "don't know who to tell",
            "feel like crying",
            "been crying",
            "cried all night",
            "really upset",
            "so upset",
            "feel humiliated",
            "so embarrassing",
            "feel helpless",
            "feel trapped",
            "feel stuck",
        ],
        "reason": "Message uses strong negative emotional language or overwhelm cues.",
    },
    "harm_ideation": {
        "severity": "high",
        "score": 45,
        "terms": [
            "want to hurt",
            "want to harm",
            "going to hurt",
            "going to harm",
            "make them pay",
            "get back at",
            "hurt someone",
            "hurt them",
            "want to fight",
            "want to punch",
            "feel like hitting",
            "feel like hurting",
            "feel like killing",
            "could kill",
            "i could kill",
            "make them suffer",
        ],
        "reason": "Message expresses anger or thoughts of harming others.",
    },
    "crisis_phrases": {
        "severity": "critical",
        "score": 95,
        "terms": [
            "hurt myself",
            "harm myself",
            "kill myself",
            "end it all",
            "end my life",
            "suicide",
            "want to die",
            "can't stay alive",
            "cannot stay alive",
            "jump off",
            "jump from",
            "jump down",
            "throw myself",
            "overdose",
            "take all my pills",
            "not worth living",
            "no reason to live",
            "better off dead",
            "better off without me",
            "want to disappear forever",
            "don't want to be here anymore",
            "do not want to be here anymore",
            "cant go on",
            "can't go on",
            "give up on life",
            "ending my life",
            "take my life",
            "no point living",
            "no point in living",
            "wish i was dead",
            "wish i weren't alive",
            "rather be dead",
            "cut myself",
            "starve myself",
            "stop breathing",
            "don't want to live",
            "do not want to live",
            "can't live like this",
            "cannot live like this",
            "want everything to stop",
            "make it all stop",
            "disappear forever",
            "never wake up",
        ],
        "reason": "Message contains possible self-harm or immediate crisis language.",
    },
}


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


def get_conversation_messages(db: Session, conversation_id: str) -> list[Message]:
    return db.scalars(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    ).all()


def message_text(messages: list[str]) -> str:
    return "\n".join(message.strip() for message in messages if message.strip())


def _matched_terms(text: str, terms: list[str]) -> list[str]:
    return [term for term in terms if term in text]


def _is_late_night(created_at: datetime) -> bool:
    # Stored timestamps are naive UTC; "late night" is judged in Singapore time.
    hour = to_sgt(created_at).hour
    return hour >= 22 or hour < 6


def _risk_level(score: int) -> RiskLevel:
    if score >= 90:
        return RiskLevel.critical
    if score >= 70:
        return RiskLevel.high
    if score >= 40:
        return RiskLevel.medium
    return RiskLevel.low


def analyse_risk(messages: list[str], conversation_messages: list[Message] | None = None) -> RiskAssessment:
    text = message_text(messages).lower()
    signals: list[RuleSignal] = []
    score = 20

    for signal_type, rule in RULES.items():
        terms = list(rule["terms"])
        matches = _matched_terms(text, terms)
        if not matches:
            continue

        severity = str(rule["severity"])
        rule_score = int(rule["score"])
        if signal_type == "crisis_phrases":
            score = max(score, rule_score)
        else:
            score += rule_score

        signals.append(
            RuleSignal(
                type=signal_type,
                severity=severity,
                reason=str(rule["reason"]),
                matched_terms=matches,
            )
        )

    late_night_count = 0
    if conversation_messages:
        late_night_count = sum(
            1
            for message in conversation_messages
            if message.sender_type == SenderType.youth and _is_late_night(message.created_at)
        )
    if late_night_count >= 2:
        signals.append(
            RuleSignal(
                type="repeated_late_night_messages",
                severity="medium",
                reason="Youth has sent repeated messages between 10pm and 6am.",
                matched_terms=[str(late_night_count)],
            )
        )
        score += 16

    if not signals:
        signals.append(
            RuleSignal(
                type="after_hours_support",
                severity="low",
                reason="No high-risk phrase was detected, but the conversation may still need continuity.",
                matched_terms=[],
            )
        )

    score = min(score, 100)
    risk_level = _risk_level(score)
    safety_status = "requires_immediate_human_review" if risk_level == RiskLevel.critical else "fallback_passed"
    return RiskAssessment(
        risk_level=risk_level,
        risk_score=score,
        signals=signals,
        safety_status=safety_status,
        handoff_recommended=score >= 40,
    )


def persist_signals(
    db: Session,
    conversation: Conversation,
    assessment: RiskAssessment,
    source: str = AI_MODE,
) -> list[Signal]:
    created: list[Signal] = []
    for detected in assessment.signals:
        signal = Signal(
            conversation_id=conversation.id,
            youth_id=conversation.youth_id,
            type=detected.type,
            severity=detected.severity,
            reason=detected.reason,
            source=source,
        )
        db.add(signal)
        created.append(signal)
    return created


def apply_risk_to_conversation(conversation: Conversation, assessment: RiskAssessment) -> None:
    rank = {RiskLevel.low: 1, RiskLevel.medium: 2, RiskLevel.high: 3, RiskLevel.critical: 4}
    if rank[assessment.risk_level] >= rank[conversation.risk_level]:
        conversation.risk_level = assessment.risk_level
    conversation.risk_score = max(conversation.risk_score, assessment.risk_score)
    if assessment.handoff_recommended:
        conversation.status = ConversationStatus.needs_review
        conversation.unresolved_handoff = True


def extract_key_quote(messages: list[Message]) -> str | None:
    youth_messages = [message.content for message in messages if message.sender_type == SenderType.youth]
    if not youth_messages:
        return None
    crisis_or_emotional = [
        content
        for content in youth_messages
        if re.search(r"\b(tired|scared|ashamed|embarrassed|hurt myself|kill myself|school)\b", content, re.I)
    ]
    return (crisis_or_emotional or youth_messages)[-1][:500]


def build_handoff_brief(conversation: Conversation, messages: list[Message], assessment: RiskAssessment) -> HandoffBrief:
    signal_types = {signal.type for signal in assessment.signals}
    youth_messages = [m for m in messages if m.sender_type == SenderType.youth]
    ai_messages = [m for m in messages if m.sender_type == SenderType.ai]
    worker_messages = [m for m in messages if m.sender_type == SenderType.worker]

    # --- Main concern: ground in actual youth words where possible
    first_youth_excerpt = (youth_messages[0].content[:200] + "…") if youth_messages and len(youth_messages[0].content) > 200 else (youth_messages[0].content if youth_messages else "")
    if "crisis_phrases" in signal_types:
        main_concern = "Possible immediate safety concern: the youth used language that may indicate self-harm or a crisis situation. Prioritise a direct safety check before anything else."
    elif "cyberbullying" in signal_types and first_youth_excerpt:
        main_concern = f"Cyberbullying or online peer harm. Opening message: \"{first_youth_excerpt}\""
    elif "cyberbullying" in signal_types:
        main_concern = "Cyberbullying or online peer harm affecting school safety and emotional wellbeing."
    elif "school_avoidance" in signal_types:
        main_concern = "School avoidance: the youth expressed reluctance or inability to face school, likely connected to stress or a peer situation."
    elif "harm_ideation" in signal_types:
        main_concern = "The youth expressed anger and thoughts of harming others. The situation needs careful de-escalation and a safety check."
    elif first_youth_excerpt:
        main_concern = f"Youth reached out after hours. Opening message: \"{first_youth_excerpt}\""
    else:
        main_concern = "Youth reached out after-hours and may need worker continuity."

    # --- Emotional state
    if "crisis_phrases" in signal_types:
        emotional_state = "Possibly in acute distress — youth used language that suggests self-harm ideation. Prioritise immediate safety."
    elif "negative_emotional_language" in signal_types and "cyberbullying" in signal_types:
        emotional_state = "Distressed and overwhelmed. Carrying emotional weight from a peer situation and may feel humiliated or helpless."
    elif "negative_emotional_language" in signal_types:
        emotional_state = "Emotionally low — tired, overwhelmed, or ashamed based on the words they used."
    elif "cyberbullying" in signal_types:
        emotional_state = "Hurt and unsettled. The peer situation is affecting their sense of safety and dignity."
    elif "harm_ideation" in signal_types:
        emotional_state = "Angry and possibly feeling cornered or powerless. Approach calmly without escalating."
    elif "school_avoidance" in signal_types:
        emotional_state = "Anxious about returning to a difficult environment. Avoidance may be a protective response."
    else:
        emotional_state = "Emotional state not fully clear from this session. Approach gently — they may still be processing what they want to share."

    # --- What AI did
    msg_count = len(ai_messages)
    did_consent_ask = any(
        "note for your worker" in m.content.lower() or "share with your worker" in m.content.lower() or "prepare a" in m.content.lower()
        for m in ai_messages
    )
    what_ai_did_parts = [
        f"Engaged the youth across {msg_count} AI exchange{'s' if msg_count != 1 else ''}",
        "reflected their feelings back without diagnosing or labelling",
        "did not offer clinical advice or promise confidentiality it cannot keep",
    ]
    if did_consent_ask:
        what_ai_did_parts.append("asked for consent before preparing this brief, and the youth agreed")
    if "cyberbullying" in signal_types:
        what_ai_did_parts.append("acknowledged the peer harm without minimising it")
    if "crisis_phrases" in signal_types:
        what_ai_did_parts.append("directed the youth to emergency services (995) and Samaritans of Singapore (1767)")
    what_ai_did = "; ".join(what_ai_did_parts).capitalize() + "."

    # --- What not to repeat
    repetition_parts = ["Do not ask the youth to retell the full story from the start — begin from this note"]
    if "cyberbullying" in signal_types:
        repetition_parts.append("avoid dwelling on incident details immediately; let them lead")
    if "school_avoidance" in signal_types:
        repetition_parts.append("do not pressure them about school attendance before checking in emotionally first")
    if worker_messages:
        repetition_parts.append("build on what the worker had already established before handoff")
    what_not_to_repeat = "; ".join(repetition_parts) + "."

    # --- Recommended next step
    if assessment.risk_level == RiskLevel.critical:
        next_step = "Escalate to the approved crisis protocol immediately and conduct a direct human safety check."
    elif "cyberbullying" in signal_types and "school_avoidance" in signal_types:
        next_step = "Check how the youth is feeling about school today. Help identify one safe person to tell (teacher or parent) and one concrete step (e.g. saving evidence, requesting a school meeting)."
    elif "cyberbullying" in signal_types:
        next_step = "Gently ask how they are feeling right now. Acknowledge the harm, then together identify one trusted adult and one safe action (e.g. blocking, documenting)."
    elif "school_avoidance" in signal_types:
        next_step = "Explore what feels hardest about returning. If there is a safety concern, loop in the school. If emotional, focus on one manageable next step."
    elif "harm_ideation" in signal_types:
        next_step = "Check in on the youth's current state calmly. Help redirect anger into a safe outlet and assess whether there is an immediate safety risk to anyone."
    else:
        next_step = "Check in gently on how the youth is feeling today and agree on one supportive next step."

    suggested_reply = suggest_worker_reply(assessment)

    return HandoffBrief(
        conversation_id=conversation.id,
        youth_id=conversation.youth_id,
        main_concern=main_concern,
        emotional_state=emotional_state,
        risk_level=assessment.risk_level,
        risk_score=assessment.risk_score,
        key_quote=extract_key_quote(messages),
        what_ai_did=what_ai_did,
        what_not_to_repeat=what_not_to_repeat,
        suggested_worker_response=suggested_reply,
        recommended_next_step=next_step,
    )


def build_handoff_brief_with_ai(
    db: Session,
    conversation: Conversation,
    messages: list[Message],
    assessment: RiskAssessment,
    youth_id: str | None = None,
) -> tuple[HandoffBrief, str]:
    """Use structured model output when configured, with a deterministic safe fallback."""
    settings = get_settings()
    fallback = build_handoff_brief(conversation, messages, assessment)

    # Attach memory card snapshot to the brief regardless of AI availability.
    if youth_id:
        from app.services.memory_card_service import snapshot_memory_card
        snap = snapshot_memory_card(youth_id, db)
        if snap:
            fallback.memory_card_snapshot = json.dumps(snap)

    if not settings.openai_api_key:
        db.add(AiRun(conversation_id=conversation.id, action="generate_handoff", mode=AI_MODE,
                     model_name=None, prompt_version=settings.ai_prompt_version,
                     safety_status=assessment.safety_status, error="OpenAI key not configured"))
        return fallback, AI_MODE
    try:
        from openai import OpenAI

        client = OpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url or None,
            timeout=settings.openai_timeout_seconds,
        )
        transcript = "\n".join(f"{message.sender_type.value}: {message.content}" for message in messages)[-5000:]
        schema = HandoffDraft.model_json_schema()

        # Include memory card snapshot in the prompt so the AI can reference history.
        memory_context = ""
        if youth_id:
            from app.services.memory_card_service import snapshot_memory_card
            snap = snapshot_memory_card(youth_id, db)
            if snap:
                memory_context = f"\nYouth memory card (longitudinal context): {json.dumps(snap)}"

        response = client.chat.completions.create(
            model=settings.openai_model,
            max_tokens=1000,
            messages=[
                {"role": "system", "content": (
                    "You are SafeNight's handoff writer for a trained youth-support worker in Singapore. "
                    "Your job: give the worker everything they need to pick up this case cold — no asking the youth to repeat themselves.\n\n"
                    "Rules:\n"
                    "- Write only from what is in the transcript. Never invent facts, speculate on diagnosis, or use clinical labels.\n"
                    "- mainConcern: one plain sentence. What did the youth actually come about? Use their words where possible.\n"
                    "- emotionalState: describe affect and tone you observed, not a clinical label.\n"
                    "- keyQuote: the most revealing thing the youth said, verbatim (max 30 words). Pick the line that gives the worker the sharpest read on how the youth is feeling.\n"
                    "- whatAiDid: bullet points. What did SafeNight acknowledge, normalise, or offer?\n"
                    "- whatNotToRepeat: anything the youth reacted badly to, said they're tired of hearing, or asked not to be asked again.\n"
                    "- suggestedWorkerResponse: a first message the worker can send. Warm, concrete, no generic openers. Reference something specific the youth said.\n"
                    "- recommendedNextStep: one clear action — schedule a call, share a resource, escalate, or close case. Be specific.\n\n"
                    "Preserve youth agency. Never promise confidentiality the platform cannot keep. "
                    f"Respond ONLY with JSON matching: {schema}"
                )},
                {"role": "user", "content": (
                    f"Risk level: {assessment.risk_level.value}. Risk score: {assessment.risk_score}.\n"
                    f"{memory_context}\n"
                    f"Full conversation transcript:\n{transcript}"
                )},
            ],
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content or ""
        draft = HandoffDraft.model_validate_json(raw)
        if not draft.main_concern:
            raise ValueError("Model returned no structured handoff")
        combined = " ".join([draft.main_concern, draft.emotional_state, draft.suggested_worker_response]).lower()
        prohibited = ("diagnosed", "you have depression", "you have anxiety", "keep this secret", "professional advice")
        if any(term in combined for term in prohibited):
            raise ValueError("Structured output failed safety wording validation")
        fallback.main_concern = draft.main_concern
        fallback.emotional_state = draft.emotional_state
        fallback.what_ai_did = draft.what_ai_did
        fallback.what_not_to_repeat = draft.what_not_to_repeat
        fallback.suggested_worker_response = draft.suggested_worker_response
        fallback.recommended_next_step = draft.recommended_next_step
        if assessment.risk_level == RiskLevel.critical:
            fallback.recommended_next_step = "Escalate to the approved crisis protocol and conduct an immediate human safety check."
            fallback.suggested_worker_response = suggest_worker_reply(assessment)
        db.add(AiRun(conversation_id=conversation.id, action="generate_handoff", mode="openai_structured",
                     model_name=settings.openai_model, prompt_version=settings.ai_prompt_version,
                     safety_status=assessment.safety_status, error=None))
        return fallback, "openai_structured"
    except Exception as exc:
        db.add(AiRun(conversation_id=conversation.id, action="generate_handoff", mode=AI_MODE,
                     model_name=settings.openai_model, prompt_version=settings.ai_prompt_version,
                     safety_status=assessment.safety_status, error=str(exc)[:1000]))
        return fallback, AI_MODE


def copy_handoff_fields(target: HandoffBrief, source: HandoffBrief) -> HandoffBrief:
    """Refresh the worker-visible brief while preserving id, review status, and timestamps."""
    target.main_concern = source.main_concern
    target.emotional_state = source.emotional_state
    target.risk_level = source.risk_level
    target.risk_score = source.risk_score
    target.key_quote = source.key_quote
    target.what_ai_did = source.what_ai_did
    target.what_not_to_repeat = source.what_not_to_repeat
    target.suggested_worker_response = source.suggested_worker_response
    target.recommended_next_step = source.recommended_next_step
    # Propagate platform metadata and memory snapshot on refresh.
    if source.platform:
        target.platform = source.platform
    if source.pre_handoff_context:
        target.pre_handoff_context = source.pre_handoff_context
    if source.memory_card_snapshot:
        target.memory_card_snapshot = source.memory_card_snapshot
    return target


def upsert_handoff_brief_with_ai(
    db: Session,
    conversation: Conversation,
    messages: list[Message],
    assessment: RiskAssessment,
    youth_id: str | None = None,
) -> tuple[HandoffBrief, str]:
    """Create or refresh the consent-approved handoff for a conversation."""
    draft, mode = build_handoff_brief_with_ai(db, conversation, messages, assessment, youth_id=youth_id)
    existing = db.scalar(select(HandoffBrief).where(HandoffBrief.conversation_id == conversation.id))
    if existing is None:
        return draft, mode
    return copy_handoff_fields(existing, draft), mode


SAFENIGHT_FALLBACK_REPLY = (
    "I am sorry this is happening. I am not a counsellor, but I can stay with you "
    "for this moment, help you slow things down, and prepare a short note for your "
    "worker so you do not have to repeat everything tomorrow. If you feel in "
    "immediate danger, please contact emergency services or a trusted adult now."
)

CRITICAL_FALLBACK_REPLY = (
    "Thank you for telling me. I cannot provide emergency support, so a trained human needs to review this now. "
    "If you may act on these thoughts or are in immediate danger, contact Singapore emergency services at 995, "
    "Samaritans of Singapore at 1767, or a trusted adult who can stay with you. Are you somewhere physically safe right now?"
)


def _has_cyberbullying_context(text: str) -> bool:
    return any(
        term in text
        for term in (
            "group chat",
            "edited my photo",
            "editing my photos",
            "edited photos",
            "posting my photo",
            "cyberbully",
            "cyberbullying",
            "bully",
            "bullied",
            "bullying",
            "mean comments",
            "screenshots",
        )
    )


def _asks_for_bullying_help(text: str) -> bool:
    return _has_cyberbullying_context(text) and any(
        phrase in text
        for phrase in (
            "what should i do",
            "what shld i do",
            "what do i do",
            "how do i stop",
            "how to stop",
            "need help",
            "help me",
        )
    )


def _is_off_topic_or_insult_prompt(text: str) -> bool:
    return any(
        phrase in text
        for phrase in (
            "explain how",
            "make fun of",
            "roast",
            "joke about",
        )
    )


def _is_short_greeting(text: str) -> bool:
    words = text.split()
    if len(words) > 4:
        return False

    first_word = words[0].strip("?!.,") if words else ""
    return first_word in {"hi", "hello", "hey"} or bool(re.fullmatch(r"h+e+l+o+", first_word))


def _asks_about_safenight_identity(text: str) -> bool:
    compact = re.sub(r"[^a-z0-9]+", " ", text).strip()
    return any(
        phrase in compact
        for phrase in (
            "are you gay",
            "are u gay",
            "r u gay",
            "are you a bot",
            "are u a bot",
            "are you real",
            "are u real",
            "who are you",
            "what are you",
        )
    )


def _shares_sexual_identity(text: str) -> bool:
    compact = re.sub(r"[^a-z0-9]+", " ", text).strip()
    identity_terms = ("gay", "bi", "bisexual", "lesbian", "queer", "trans")
    first_person_markers = (
        "i am",
        "im",
        "i m",
        "i think i am",
        "i think im",
        "i might be",
        "i feel like im",
        "i feel like i am",
        "kinda",
        "kind of",
    )
    if not any(term in compact.split() for term in identity_terms):
        return False
    return any(marker in compact for marker in first_person_markers)


def _criticises_bot_reply(text: str) -> bool:
    compact = re.sub(r"[^a-z0-9]+", " ", text).strip()
    return any(
        phrase in compact
        for phrase in (
            "what wrong with u",
            "whats wrong with u",
            "what is wrong with u",
            "what wrong with you",
            "whats wrong with you",
            "what is wrong with you",
            "you are not listening",
            "ur not listening",
            "you keep saying",
            "why you keep saying",
            "that was weird",
            "you are weird",
            "ur weird",
        )
    )


_CONSENT_ASK_SUFFIX = (
    " Would it be okay if I prepared a short note for your worker? "
    "You'd get to see it before they do — nothing goes to them without you knowing."
)


def build_safenight_fallback_reply(
    new_message: str,
    assessment: RiskAssessment,
    history: list[Message] | None = None,
    consent_to_handoff: bool = False,
) -> str:
    """Return a varied, safety-bounded reply when the model path is unavailable."""
    text = new_message.strip().lower()
    history_text = "\n".join(message.content.lower() for message in (history or []))
    signal_types = {signal.type for signal in assessment.signals}
    current_has_cyberbullying = "cyberbullying" in signal_types or _has_cyberbullying_context(text)
    prior_has_cyberbullying = _has_cyberbullying_context(history_text)

    ask_consent = _should_ask_consent(assessment, history or [], consent_to_handoff)

    if _is_short_greeting(text):
        return (
            "Hey, I'm here. You do not need to explain everything at once. "
            "Start with whatever feels easiest to say."
        )

    if _asks_about_safenight_identity(text):
        return (
            "I am SafeNight, an AI after-hours companion, so I do not have a sexuality or personal life. "
            "I am here to focus on what is making tonight hard for you, and a real worker can follow up on anything you choose to share."
        )

    if _shares_sexual_identity(text):
        return (
            "Thanks for trusting me with that. There is nothing wrong with being gay, bi, queer, or still figuring things out. "
            "If it feels heavy tonight, we can talk about what is making it feel hard."
        )

    if _criticises_bot_reply(text):
        return (
            "You're right to call that out. My last reply may have missed what you meant, and I do not want to make this feel scripted. "
            "Tell me what you wanted me to understand, or just say what is happening tonight."
        )

    if _is_off_topic_or_insult_prompt(text):
        return (
            "I cannot help make comments about another person's body, identity, or appearance. "
            "I can stay focused on what is happening to you and help keep a clear note for your worker."
        )

    if "dark" in text:
        reply = (
            "Being scared can feel bigger at night. Try to stay somewhere you feel a little safer if you can, and tell me "
            "what is making the dark feel hard right now."
        )
        return reply + (_CONSENT_ASK_SUFFIX if ask_consent else " Tell me one small thing that would make right now feel a bit safer.")

    if _asks_for_bullying_help(text):
        return (
            "If you are being bullied, try not to answer them alone tonight. Save screenshots if it is safe, block or mute the chat "
            "for now, and tell a trusted adult or school staff member as soon as you can."
            + (_CONSENT_ASK_SUFFIX if ask_consent else " We can slow it down and work out the next small step.")
        )

    if current_has_cyberbullying or (
        prior_has_cyberbullying and any(term in text for term in ("scared", "afraid", "fear", "him", "her", "them"))
    ):
        reply = (
            "That sounds humiliating and exhausting to carry alone. I am not a counsellor, but I can help you slow this down."
        )
        return reply + (_CONSENT_ASK_SUFFIX if ask_consent else
                        " You do not have to decide what to do about it all at once tonight.")

    if "school_avoidance" in signal_types:
        reply = "It makes sense that school feels hard to face right now. For tonight, we can focus on one small next step."
        return reply + (_CONSENT_ASK_SUFFIX if ask_consent else
                        " What part of tomorrow feels the hardest to face?")

    if "negative_emotional_language" in signal_types or "negative_emotion_spike" in signal_types:
        reply = "I hear that you are feeling overwhelmed. You do not need to explain everything at once."
        return reply + (_CONSENT_ASK_SUFFIX if ask_consent else
                        " We can keep this to one small piece at a time.")

    if any(term in text for term in ("scared", "afraid", "fear")):
        reply = (
            "That fear sounds real, and you do not have to carry it by yourself tonight. "
            "If you can, stay near a trusted adult or a safer place."
        )
        return reply + (_CONSENT_ASK_SUFFIX if ask_consent else
                        " Tell me one small thing that would help you feel less alone right now.")

    reply = "I am here with you. You do not have to make the whole thing clear tonight; one small piece is enough."
    return reply + (_CONSENT_ASK_SUFFIX if ask_consent else " What is the main thing you want me to understand?")


SAFENIGHT_SYSTEM_PROMPT = (
    "You are SafeNight, a warm after-hours companion for a young person in Singapore who has "
    "reached out late at night. You respond the way a real, caring friend would text — not a "
    "chatbot, not a counsellor, but someone who actually listens and responds to what was just said.\n\n"
    "Tone and style:\n"
    "- Sound genuinely human. Use natural phrasing, mild contractions, and the kind of warmth "
    "you'd use with a younger sibling going through something hard.\n"
    "- Match the energy of what they said. If they're venting, sit with them. If they're scared, "
    "be steady. If they're testing you, be honest.\n"
    "- Use their actual words and feelings — reflect them specifically, not generically.\n"
    "- Vary how you open each reply. Never start two replies the same way.\n"
    "- 3 to 6 sentences is the sweet spot. Go longer if the situation calls for it; don't cut off "
    "when something important needs to be said.\n"
    "- No bullet points, lists, or headings. Just text, like a message.\n"
    "- Ask at most one question per reply, and only when it genuinely opens something up.\n"
    "- Use the youth's name naturally if you know it — not at the start of every sentence, but "
    "where it feels warm and personal.\n\n"
    "About the worker note:\n"
    "- Do not mention a worker note unless a separate system message explicitly tells you to ask.\n"
    "- When told to ask, frame it as completely the youth's choice, tell them they see it first, "
    "and embed it naturally in the reply — not as a trailing line.\n"
    "- If they say yes to sharing a note, acknowledge that warmly. The system handles the rest.\n"
    "- Do not bring up the note if something urgent is happening.\n\n"
    "Boundaries (never break these):\n"
    "- You are not a counsellor. Do not diagnose, label, or give clinical or medical advice.\n"
    "- Never promise secrecy or confidentiality.\n"
    "- Never mock, judge, or comment on anyone's body, identity, or appearance.\n"
    "- If they mention self-harm, suicide, jumping off something, or being in danger: "
    "stay warm but be direct — tell them a real person needs to step in right now. "
    "Give them Singapore emergency services (995) and Samaritans of Singapore (1767). "
    "Do not try to talk them through it yourself."
)


def generate_safenight_reply(
    new_message: str,
    history: list[Message],
    assessment: RiskAssessment,
    consent_to_handoff: bool = False,
    db: Session | None = None,
    conversation_id: str | None = None,
    youth_id: str | None = None,
) -> str:
    """Generate SafeNight's reply.

    The conversation is handled by the model so it feels genuine. Safety stays
    deterministic around it: crisis-level messages always get the scripted crisis
    response (the model never handles those), the model's output is screened for
    prohibited wording, and any missing key / error / empty reply falls back to the
    deterministic, context-aware reply.
    """
    def record_run(mode: str, error: str | None = None) -> None:
        if db is None:
            return
        settings = get_settings()
        db.add(AiRun(
            conversation_id=conversation_id,
            action="safenight_reply",
            mode=mode,
            model_name=settings.openai_model if settings.openai_api_key else None,
            prompt_version=settings.ai_prompt_version,
            safety_status=assessment.safety_status,
            error=error[:1000] if error else None,
        ))

    if assessment.risk_level == RiskLevel.critical:
        record_run("deterministic_critical")
        return CRITICAL_FALLBACK_REPLY

    direct_reply = build_safenight_fallback_reply(new_message, assessment, history, consent_to_handoff)
    direct_text = new_message.strip().lower()
    if (
        _shares_sexual_identity(direct_text)
        or _criticises_bot_reply(direct_text)
        or _asks_about_safenight_identity(direct_text)
        or _is_off_topic_or_insult_prompt(direct_text)
    ):
        record_run("deterministic_direct")
        return direct_reply

    settings = get_settings()
    if not settings.openai_api_key:
        record_run(AI_MODE, "OpenAI key not configured")
        logger.warning("SafeNight reply using fallback: OpenAI key not configured")
        return direct_reply

    try:
        from openai import OpenAI

        client = OpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url or None,
            timeout=settings.openai_timeout_seconds,
        )

        conversation: list[dict[str, str]] = [{"role": "system", "content": SAFENIGHT_SYSTEM_PROMPT}]
        for message in history[-10:]:
            role = "assistant" if message.sender_type in (SenderType.ai, SenderType.worker) else "user"
            conversation.append({"role": role, "content": message.content})
        conversation.append({"role": "user", "content": new_message})

        # Inject memory card context so the AI remembers prior sessions.
        if youth_id and db is not None:
            from app.services.memory_card_service import get_or_create_memory_card, get_memory_card_context
            card = get_or_create_memory_card(youth_id, db)
            memory_context = get_memory_card_context(card)
            if memory_context:
                conversation.insert(1, {"role": "system", "content": memory_context})

        # Give the model the deterministic signals as quiet context, not as script.
        signal_summary = ", ".join(sorted({signal.type.replace("_", " ") for signal in assessment.signals}))
        if signal_summary:
            conversation.insert(1, {
                "role": "system",
                "content": f"Context only (do not read this back to them): possible signals noticed so far — {signal_summary}.",
            })

        # Tell the model whether to ask for consent in this reply
        if _should_ask_consent(assessment, history, consent_to_handoff):
            conversation.insert(1, {
                "role": "system",
                "content": (
                    "The youth has not yet agreed to a worker note. If it fits naturally in this reply, "
                    "gently ask if they'd like you to prepare one — remind them they can see it first. "
                    "Phrase it as part of your response, not as a trailing sentence."
                ),
            })
        elif consent_to_handoff:
            conversation.insert(1, {
                "role": "system",
                "content": "The youth has already agreed to share a note with their worker. Do not mention the note again.",
            })

        response = client.chat.completions.create(
            model=settings.openai_model,
            temperature=0.75,
            max_tokens=380,
            messages=conversation,
        )
        reply = (response.choices[0].message.content or "").strip()
        if not reply or len(reply) < 10:
            record_run(AI_MODE, "OpenAI returned an empty or too-short reply")
            logger.warning("SafeNight reply using fallback: empty model response")
            return direct_reply

        prohibited = ("you have depression", "you have anxiety", "keep this secret", "i promise", "clinically")
        if any(term in reply.lower() for term in prohibited):
            record_run(AI_MODE, "OpenAI reply failed safety wording validation")
            logger.warning("SafeNight reply using fallback: model reply failed safety validation")
            return direct_reply

        record_run("openai_chat")
        return reply
    except Exception as exc:
        record_run(AI_MODE, str(exc))
        logger.warning("SafeNight reply using fallback: %s", exc)
        return direct_reply


def suggest_worker_reply(assessment: RiskAssessment) -> str:
    if assessment.risk_level == RiskLevel.critical:
        return (
            "I read the note you allowed SignalBridge to prepare. I am here now, "
            "and I want to first check your immediate safety. Are you somewhere safe, "
            "and is there a trusted adult near you?"
        )
    return (
        "Hi, I read the note you allowed SignalBridge to prepare. You do not have "
        "to repeat everything unless you want to. I am here now. Can I first check "
        "what would help you feel safer for the next part of today?"
    )


def safety_check(content: str) -> RiskAssessment:
    return analyse_risk([content])


def get_youth_name(db: Session, youth_id: str) -> str:
    youth = db.get(YouthProfile, youth_id)
    if youth is None:
        return "Unknown youth"
    user = db.get(User, youth.user_id)
    return user.name if user is not None else "Unknown youth"

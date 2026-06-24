import json
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
        return False
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
            "cyberbully",
            "cyberbullying",
            "bully",
            "mean comments",
            "screenshots",
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
        ],
        "reason": "Message uses strong negative emotional language or overwhelm cues.",
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
    if "cyberbullying" in signal_types:
        main_concern = "Cyberbullying or online peer harm affecting school safety and emotional wellbeing."
    elif "crisis_phrases" in signal_types:
        main_concern = "Possible immediate safety concern requiring urgent human review."
    else:
        main_concern = "Youth reached out after-hours and may need worker continuity."

    emotional_state = "Overwhelmed and needing a calm, non-repetitive follow-up."
    if "negative_emotional_language" in signal_types:
        emotional_state = "Tired, distressed, or overwhelmed based on the youth's wording."
    if "crisis_phrases" in signal_types:
        emotional_state = "Possibly in acute distress; prioritise immediate safety check."

    suggested_reply = suggest_worker_reply(assessment)
    next_step = "Review the handoff, check immediate safety, and agree on one next support step with the youth."
    if assessment.risk_level == RiskLevel.critical:
        next_step = "Escalate to the approved crisis protocol and conduct an immediate human safety check."

    return HandoffBrief(
        conversation_id=conversation.id,
        youth_id=conversation.youth_id,
        main_concern=main_concern,
        emotional_state=emotional_state,
        risk_level=assessment.risk_level,
        risk_score=assessment.risk_score,
        key_quote=extract_key_quote(messages),
        what_ai_did="Stayed with the youth, reflected back what they shared without judging or diagnosing, noted the key support signals, and only prepared this brief after they gave consent.",
        what_not_to_repeat="Do not ask the youth to retell the full story immediately; begin from the approved handoff and let them choose what to add.",
        suggested_worker_response=suggested_reply,
        recommended_next_step=next_step,
    )


def build_handoff_brief_with_ai(
    db: Session,
    conversation: Conversation,
    messages: list[Message],
    assessment: RiskAssessment,
) -> tuple[HandoffBrief, str]:
    """Use structured model output when configured, with a deterministic safe fallback."""
    settings = get_settings()
    fallback = build_handoff_brief(conversation, messages, assessment)
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
        response = client.chat.completions.create(
            model=settings.openai_model,
            max_tokens=700,
            messages=[
                {"role": "system", "content": (
                    "Write a concise youth-support handoff for a trained worker. "
                    "No diagnosis, no clinical labels, no invented facts, no promises of confidentiality. "
                    "Preserve youth agency. The worker must not need the youth to repeat themselves. "
                    f"Respond ONLY with JSON matching this schema: {schema}"
                )},
                {"role": "user", "content": f"Risk level (fixed by safety rules): {assessment.risk_level.value}.\nTranscript:\n{transcript}"},
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
            "Hi, I am here with you. You can start with one sentence, or just tell me what feels heaviest tonight. "
            "If you want, I can help prepare a short note for your worker so you do not have to explain everything again."
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
        return reply + (_CONSENT_ASK_SUFFIX if ask_consent else " A real worker can follow up on anything you choose to share.")

    if _asks_for_bullying_help(text):
        return (
            "If you are being bullied, try not to answer them alone tonight. Save screenshots if it is safe, block or mute the chat "
            "for now, and tell a trusted adult or school staff member as soon as you can."
            + (_CONSENT_ASK_SUFFIX if ask_consent else " I can help prepare a short note for your worker.")
        )

    if current_has_cyberbullying or (
        prior_has_cyberbullying and any(term in text for term in ("scared", "afraid", "fear", "him", "her", "them"))
    ):
        reply = (
            "That sounds humiliating and exhausting to carry alone. I am not a counsellor, but I can help you slow this down."
        )
        return reply + (_CONSENT_ASK_SUFFIX if ask_consent else
                        " I can keep a clear note for your worker about the bullying, so you do not have to retell the whole thing tomorrow.")

    if "school_avoidance" in signal_types:
        reply = "It makes sense that school feels hard to face right now. For tonight, we can focus on one small next step."
        return reply + (_CONSENT_ASK_SUFFIX if ask_consent else
                        " I can prepare a note for your worker about what is making tomorrow feel unsafe.")

    if "negative_emotional_language" in signal_types or "negative_emotion_spike" in signal_types:
        reply = "I hear that you are feeling overwhelmed. You do not need to explain everything at once."
        return reply + (_CONSENT_ASK_SUFFIX if ask_consent else
                        " We can keep this simple and save the important parts for your worker to read with your permission.")

    if any(term in text for term in ("scared", "afraid", "fear")):
        reply = (
            "That fear sounds real, and you do not have to carry it by yourself tonight. "
            "If you can, stay near a trusted adult or a safer place."
        )
        return reply + (_CONSENT_ASK_SUFFIX if ask_consent else
                        " Tell me one small thing that would help you feel less alone right now.")

    reply = "I am here with you. You do not have to make the whole thing clear tonight; one small piece is enough."
    return reply + (_CONSENT_ASK_SUFFIX if ask_consent else " If you want, I can help keep a short note ready for your worker.")


SAFENIGHT_SYSTEM_PROMPT = (
    "You are SafeNight, a warm after-hours companion for a young person in Singapore who has "
    "messaged you late at night. Reply the way a calm, caring human would text back — natural, "
    "present, and specific to what they just said.\n\n"
    "Style:\n"
    "- 2 to 4 short sentences. No bullet points, no lists, no headings.\n"
    "- Reflect their actual words and feelings before anything else. Vary how you open each reply; "
    "do not start every message the same way.\n"
    "- Ask at most one gentle question, and only when it helps.\n\n"
    "About the worker note:\n"
    "- When it fits naturally and you have not asked recently, gently ask if the youth would like you "
    "to prepare a short note for their worker — frame it as their choice and tell them they can see "
    "it before the worker does. Embed the ask in your reply, not as a separate sentence at the end.\n"
    "- If the youth says 'sure', 'yes', 'okay', or any clear affirmative in reply to your ask, "
    "acknowledge that warmly — the system will handle the note automatically.\n"
    "- Do not mention the note more than once per reply, and do not bring it up if it would "
    "interrupt something urgent.\n\n"
    "Boundaries (never break these):\n"
    "- You are not a counsellor. Do not diagnose, label, or give clinical or medical advice.\n"
    "- Never promise secrecy or confidentiality.\n"
    "- Never mock, judge, or comment on anyone's body, identity, or appearance.\n"
    "- If they mention self-harm, suicide, or being in danger, do not try to handle it yourself: tell "
    "them a trained person needs to help right now and point them to 995 or Samaritans of Singapore on 1767."
)


def generate_safenight_reply(
    new_message: str,
    history: list[Message],
    assessment: RiskAssessment,
    consent_to_handoff: bool = False,
) -> str:
    """Generate SafeNight's reply.

    The conversation is handled by the model so it feels genuine. Safety stays
    deterministic around it: crisis-level messages always get the scripted crisis
    response (the model never handles those), the model's output is screened for
    prohibited wording, and any missing key / error / empty reply falls back to the
    deterministic, context-aware reply.
    """
    if assessment.risk_level == RiskLevel.critical:
        return CRITICAL_FALLBACK_REPLY

    direct_reply = build_safenight_fallback_reply(new_message, assessment, history, consent_to_handoff)
    direct_text = new_message.strip().lower()
    if (
        _shares_sexual_identity(direct_text)
        or _criticises_bot_reply(direct_text)
        or _asks_about_safenight_identity(direct_text)
        or _is_off_topic_or_insult_prompt(direct_text)
    ):
        return direct_reply

    settings = get_settings()
    if not settings.openai_api_key:
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
            temperature=0.7,
            max_tokens=220,
            messages=conversation,
        )
        reply = (response.choices[0].message.content or "").strip()
        if not reply or len(reply) < 10:
            return direct_reply

        prohibited = ("you have depression", "you have anxiety", "keep this secret", "i promise", "clinically")
        if any(term in reply.lower() for term in prohibited):
            return direct_reply

        return reply
    except Exception:
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

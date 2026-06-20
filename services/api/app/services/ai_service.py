import json
import re
from pydantic import BaseModel, Field
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.ai_run import AiRun
from app.models.audit_log import AuditLog
from app.models.conversation import Conversation, ConversationStatus, RiskLevel
from app.models.handoff_brief import HandoffBrief
from app.models.message import Message, SenderType
from app.models.signal import Signal
from app.models.user import User
from app.models.youth_profile import YouthProfile


AI_MODE = "fallback_rule_based"


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
    return created_at.hour >= 22 or created_at.hour < 6


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
        what_ai_did="Used deterministic fallback rules to identify support signals, avoid diagnosis, and prepare a human-review handoff.",
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

        client = OpenAI(api_key=settings.openai_api_key, timeout=settings.openai_timeout_seconds)
        transcript = "\n".join(f"{message.sender_type.value}: {message.content}" for message in messages)[-12000:]
        response = client.responses.parse(
            model=settings.openai_model,
            input=[
                {"role": "system", "content": (
                    "Prepare a concise youth-support handoff for a trained human worker. Do not diagnose, counsel, "
                    "promise confidentiality, or invent facts. Preserve youth agency, avoid clinical labels, and make "
                    "the first response begin from the approved context without requiring repetition."
                )},
                {"role": "user", "content": f"Risk level fixed by safety rules: {assessment.risk_level.value}.\nTranscript:\n{transcript}"},
            ],
            text_format=HandoffDraft,
        )
        draft = response.output_parsed
        if draft is None:
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

from dataclasses import dataclass

from app.models.conversation import RiskLevel


SAFE_NIGHT_FALLBACK = (
    "I am sorry this is happening. I am not a counsellor, but I can stay with you "
    "for this moment, help you slow things down, and prepare a short note for your "
    "worker so you do not have to repeat everything tomorrow. If you feel in "
    "immediate danger, please contact emergency services or a trusted adult now."
)


@dataclass(frozen=True)
class DetectedSignal:
    type: str
    severity: str
    reason: str


@dataclass(frozen=True)
class SafeNightAssessment:
    reply: str
    safety_status: str
    signals: list[DetectedSignal]
    risk_level: RiskLevel
    risk_score: int
    handoff_recommended: bool


def assess_safe_night_message(content: str) -> SafeNightAssessment:
    text = content.lower()
    signals: list[DetectedSignal] = []
    score = 20

    if any(term in text for term in ["edit", "photo", "group chat", "bully", "bullying"]):
        signals.append(
            DetectedSignal(
                type="cyberbullying",
                severity="high",
                reason="Message mentions peer harm or edited photos in a group chat.",
            )
        )
        score += 30

    if any(term in text for term in ["don't want to go school", "do not want to go school", "school tomorrow"]):
        signals.append(
            DetectedSignal(
                type="school_avoidance",
                severity="medium",
                reason="Message suggests avoiding school after the incident.",
            )
        )
        score += 18

    if any(term in text for term in ["tired", "exhausted", "can't anymore", "cannot anymore"]):
        signals.append(
            DetectedSignal(
                type="negative_emotion_spike",
                severity="medium",
                reason="Message uses fatigue or overwhelm language.",
            )
        )
        score += 15

    if any(term in text for term in ["hurt myself", "end it", "suicide", "kill myself"]):
        signals.append(
            DetectedSignal(
                type="crisis_language",
                severity="critical",
                reason="Message contains possible self-harm or crisis language.",
            )
        )
        score = max(score, 95)

    if not signals:
        signals.append(
            DetectedSignal(
                type="after_hours_support",
                severity="low",
                reason="Youth reached out through SafeNight and may need next-day worker continuity.",
            )
        )

    score = min(score, 100)
    if score >= 90:
        risk_level = RiskLevel.critical
    elif score >= 70:
        risk_level = RiskLevel.high
    elif score >= 40:
        risk_level = RiskLevel.medium
    else:
        risk_level = RiskLevel.low

    return SafeNightAssessment(
        reply=SAFE_NIGHT_FALLBACK,
        safety_status="fallback_passed",
        signals=signals,
        risk_level=risk_level,
        risk_score=score,
        handoff_recommended=score >= 40,
    )

from dataclasses import dataclass

from app.models.conversation import RiskLevel


SAFE_NIGHT_FALLBACK = (
    "I am sorry this is happening. I am not a counsellor, but I can stay with you "
    "for this moment, help you slow things down, and prepare a short note for your "
    "worker so you do not have to repeat everything tomorrow. If you feel in "
    "immediate danger, please contact emergency services or a trusted adult now."
)

CRITICAL_FALLBACK = (
    "Thank you for telling me. I cannot provide emergency support, so a trained human needs to review this now. "
    "If you may act on these thoughts or are in immediate danger, contact Singapore emergency services at 995, "
    "Samaritans of Singapore at 1767, or a trusted adult who can stay with you. Are you somewhere physically safe right now?"
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
    """Assess a single youth message.

    Delegates to the one shared deterministic rule engine (``analyse_risk``) so the
    risk level, score, and signals a youth triggers on send match exactly what the
    worker later sees in the cockpit and handoff brief. This module only adds the
    youth-facing reply copy on top.
    """
    # Imported lazily to avoid a circular import at module load time.
    from app.services.ai_service import analyse_risk

    assessment = analyse_risk([content])
    is_critical = assessment.risk_level == RiskLevel.critical
    return SafeNightAssessment(
        reply=CRITICAL_FALLBACK if is_critical else SAFE_NIGHT_FALLBACK,
        safety_status=assessment.safety_status,
        signals=[
            DetectedSignal(type=signal.type, severity=signal.severity, reason=signal.reason)
            for signal in assessment.signals
        ],
        risk_level=assessment.risk_level,
        risk_score=assessment.risk_score,
        handoff_recommended=assessment.handoff_recommended,
    )

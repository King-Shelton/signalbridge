"""Youth Memory Card — persistent cross-session context for SafeNight.

Each youth has one card that accumulates across sessions. It feeds the
SafeNight system prompt so the AI doesn't re-introduce itself or ask the
youth to repeat things they already shared, and it's snapshotted into
handoff briefs so workers see the full longitudinal picture.
"""

import json
import logging
from datetime import timedelta

from sqlalchemy.orm import Session

from app.models.conversation import RiskLevel
from app.models.youth_memory_card import YouthMemoryCard
from app.timeutil import naive_utcnow

logger = logging.getLogger("signalbridge.memory_card")

# A session is considered new if > 4 hours have passed since last activity.
_NEW_SESSION_THRESHOLD_HOURS = 4


def get_or_create_memory_card(youth_id: str, db: Session) -> YouthMemoryCard:
    card = db.query(YouthMemoryCard).filter_by(youth_id=youth_id).first()
    if card is None:
        import uuid
        card = YouthMemoryCard(
            id=f"ymc_{uuid.uuid4().hex}",
            youth_id=youth_id,
            session_count=0,
            cumulative_risk_score=0.0,
        )
        db.add(card)
        db.flush()
    return card


def _load_list(raw: str | None) -> list[str]:
    if not raw:
        return []
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        return []


def _save_list(items: list[str]) -> str:
    return json.dumps(items)


def _merge_item(card: YouthMemoryCard, field: str, value: str | None) -> None:
    """Append value to the JSON list in card.field, deduplicating by substring match."""
    if not value or not value.strip():
        return
    value = value.strip()
    current = _load_list(getattr(card, field))
    value_lower = value.lower()
    # Skip if a similar entry already exists (substring either way).
    if any(value_lower in ex.lower() or ex.lower() in value_lower for ex in current):
        return
    current.append(value)
    # Keep at most 10 items; rotate oldest out.
    if len(current) > 10:
        current = current[-10:]
    setattr(card, field, _save_list(current))


def _extract_fragment(message_text: str, risk_level: RiskLevel, signal_types: set[str]) -> dict[str, str | None]:
    """Rule-based extraction of one fragment per memory category from a single message.

    Returns a dict with keys: concern, trigger, coping, support_person.
    Values are None when nothing relevant was detected.
    """
    text = message_text.lower()
    fragment: dict[str, str | None] = {
        "concern": None,
        "trigger": None,
        "coping": None,
        "support_person": None,
    }

    # ── Key concern from risk signals ────────────────────────────────────────
    if "crisis_phrases" in signal_types:
        fragment["concern"] = "self-harm or crisis ideation"
    elif "cyberbullying" in signal_types:
        fragment["concern"] = "cyberbullying or online peer harm"
    elif "school_avoidance" in signal_types:
        fragment["concern"] = "school avoidance"
    elif "negative_emotional_language" in signal_types:
        fragment["concern"] = "emotional overwhelm or distress"
    elif "repeated_late_night_messages" in signal_types:
        fragment["concern"] = "repeated late-night distress"

    # ── Trigger from message keywords ────────────────────────────────────────
    if any(w in text for w in ("exam", "test", "homework", "assignment", "teacher", "principal")):
        fragment["trigger"] = "academic / school pressure"
    elif any(w in text for w in ("parent", "mum", "mom", "dad", "father", "mother", "home", "family")):
        fragment["trigger"] = "family tension"
    elif any(w in text for w in ("friend", "group chat", "classmate", "peer", "bully", "bullied")):
        fragment["trigger"] = "peer relationship conflict"
    elif any(w in text for w in ("night", "dark", "alone", "lonely", "sleep", "can't sleep")):
        fragment["trigger"] = "nighttime isolation"
    elif any(w in text for w in ("social media", "instagram", "tiktok", "post", "photo")):
        fragment["trigger"] = "social media stress"

    # ── Coping strategies mentioned ──────────────────────────────────────────
    if any(w in text for w in ("music", "playlist", "song", "listen to")):
        fragment["coping"] = "listening to music"
    elif any(w in text for w in ("walk", "run", "exercise", "gym")):
        fragment["coping"] = "physical activity"
    elif any(w in text for w in ("sleep", "rest", "nap")):
        fragment["coping"] = "rest / sleep"
    elif any(w in text for w in ("talk to", "tell", "told my", "call my")):
        fragment["coping"] = "reaching out to someone"
    elif any(w in text for w in ("draw", "art", "write", "journal")):
        fragment["coping"] = "creative expression"

    # ── Support network mentioned ────────────────────────────────────────────
    if any(w in text for w in ("mum", "mom", "mother")):
        fragment["support_person"] = "mother"
    elif any(w in text for w in ("dad", "father")):
        fragment["support_person"] = "father"
    elif any(w in text for w in ("sibling", "brother", "sister")):
        fragment["support_person"] = "sibling"
    elif any(w in text for w in ("best friend", "bestie", "close friend")):
        fragment["support_person"] = "close friend"
    elif any(w in text for w in ("teacher", "counsellor", "school counselor")):
        fragment["support_person"] = "school staff"

    return fragment


def update_memory_card(
    youth_id: str,
    signal_types: set[str],
    risk_level: RiskLevel,
    risk_score: int,
    message_text: str,
    db: Session,
) -> None:
    """Update the youth's memory card after a SafeNight message exchange."""
    card = get_or_create_memory_card(youth_id, db)
    now = naive_utcnow()

    # Count as a new session if this is the first activity or > 4 h since last.
    is_new_session = (
        card.last_updated is None
        or (now - card.last_updated).total_seconds() > _NEW_SESSION_THRESHOLD_HOURS * 3600
    )
    if is_new_session:
        card.session_count += 1

    card.last_risk_level = risk_level
    # Exponential moving average — recent sessions weighted more.
    card.cumulative_risk_score = card.cumulative_risk_score * 0.8 + risk_score * 0.2
    card.last_updated = now

    fragment = _extract_fragment(message_text, risk_level, signal_types)
    _merge_item(card, "key_concerns", fragment["concern"])
    _merge_item(card, "triggers", fragment["trigger"])
    _merge_item(card, "coping_strategies", fragment["coping"])
    _merge_item(card, "support_network", fragment["support_person"])

    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to update memory card for youth %s", youth_id)


def get_memory_card_context(card: YouthMemoryCard) -> str:
    """Format the memory card as a system-prompt injection for SafeNight.

    Returns an empty string if there's nothing worth injecting (first session
    with no extracted data).
    """
    lines: list[str] = []

    if card.session_count > 1:
        lines.append(f"You have spoken with this youth {card.session_count} times before — do NOT re-introduce yourself or treat this as a first conversation.")

    concerns = _load_list(card.key_concerns)
    if concerns:
        lines.append(f"Recurring concerns: {', '.join(concerns[:4])}.")

    triggers = _load_list(card.triggers)
    if triggers:
        lines.append(f"Known triggers: {', '.join(triggers[:4])}.")

    coping = _load_list(card.coping_strategies)
    if coping:
        lines.append(f"Things that have helped them before: {', '.join(coping[:4])}.")

    network = _load_list(card.support_network)
    if network:
        lines.append(f"Support network they've mentioned: {', '.join(network[:4])}.")

    if card.last_risk_level:
        lines.append(f"Last session risk level: {card.last_risk_level.value}.")

    if not lines:
        return ""

    return (
        "## What you already know about this youth (reference naturally, don't read it back):\n"
        + "\n".join(f"- {line}" for line in lines)
    )


def snapshot_memory_card(youth_id: str, db: Session) -> dict:
    """Return a JSON-serialisable dict of the current card — embedded in handoff briefs."""
    card = db.query(YouthMemoryCard).filter_by(youth_id=youth_id).first()
    if card is None:
        return {}
    return {
        "session_count": card.session_count,
        "last_risk_level": card.last_risk_level.value if card.last_risk_level else None,
        "cumulative_risk_score": round(card.cumulative_risk_score, 1),
        "key_concerns": _load_list(card.key_concerns),
        "triggers": _load_list(card.triggers),
        "coping_strategies": _load_list(card.coping_strategies),
        "support_network": _load_list(card.support_network),
    }

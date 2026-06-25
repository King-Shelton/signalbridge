import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.conversation import RiskLevel
from app.timeutil import naive_utcnow


class YouthMemoryCard(Base):
    """Persistent cross-session memory for a youth.

    Updated after every SafeNight interaction so the AI can reference prior
    context without re-reading the full message history. Fields are JSON-encoded
    lists stored as Text so they can grow incrementally without a schema change.
    """

    __tablename__ = "youth_memory_cards"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"ymc_{uuid.uuid4().hex}")
    youth_id: Mapped[str] = mapped_column(ForeignKey("youth_profiles.id"), unique=True, nullable=False, index=True)

    # JSON-encoded list[str] — accumulated across sessions, deduped on write.
    key_concerns: Mapped[str | None] = mapped_column(Text, nullable=True)       # recurring themes
    triggers: Mapped[str | None] = mapped_column(Text, nullable=True)            # what sets off distress
    coping_strategies: Mapped[str | None] = mapped_column(Text, nullable=True)  # what has helped before
    support_network: Mapped[str | None] = mapped_column(Text, nullable=True)    # people/resources mentioned

    session_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_risk_level: Mapped[RiskLevel | None] = mapped_column(Enum(RiskLevel), nullable=True)
    cumulative_risk_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    last_updated: Mapped[datetime | None] = mapped_column(DateTime, default=naive_utcnow, nullable=True)

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.constants import RiskLevel
from app.database import Base


class ReviewStatus(str, enum.Enum):
    pending = "pending"
    reviewed = "reviewed"
    escalated = "escalated"


class HandoffBrief(Base):
    __tablename__ = "handoff_briefs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"handoff_{uuid.uuid4().hex}")
    conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id"), nullable=False)
    youth_id: Mapped[str] = mapped_column(ForeignKey("youth_profiles.id"), nullable=False)
    main_concern: Mapped[str] = mapped_column(Text, nullable=False)
    emotional_state: Mapped[str] = mapped_column(Text, nullable=False)
    risk_level: Mapped[RiskLevel] = mapped_column(Enum(RiskLevel), nullable=False)
    risk_score: Mapped[int] = mapped_column(default=0, nullable=False)
    key_quote: Mapped[str | None] = mapped_column(Text, nullable=True)
    what_ai_did: Mapped[str | None] = mapped_column(Text, nullable=True)
    what_not_to_repeat: Mapped[str | None] = mapped_column(Text, nullable=True)
    suggested_worker_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommended_next_step: Mapped[str | None] = mapped_column(Text, nullable=True)
    review_status: Mapped[ReviewStatus] = mapped_column(Enum(ReviewStatus), default=ReviewStatus.pending)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ConversationStatus(str, enum.Enum):
    active = "active"
    needs_review = "needs_review"
    closed = "closed"


class RiskLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"conv_{uuid.uuid4().hex}")
    youth_id: Mapped[str] = mapped_column(ForeignKey("youth_profiles.id"), nullable=False)
    channel: Mapped[str] = mapped_column(String(80), default="Web Chat", nullable=False)
    status: Mapped[ConversationStatus] = mapped_column(Enum(ConversationStatus), default=ConversationStatus.active)
    risk_level: Mapped[RiskLevel] = mapped_column(Enum(RiskLevel), default=RiskLevel.low)
    risk_score: Mapped[int] = mapped_column(default=0, nullable=False)
    consent_to_handoff: Mapped[bool] = mapped_column(default=False, nullable=False)
    unresolved_handoff: Mapped[bool] = mapped_column(default=False, nullable=False)
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    messages: Mapped[list["Message"]] = relationship(back_populates="conversation")

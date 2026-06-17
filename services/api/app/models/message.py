import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SenderType(str, enum.Enum):
    youth = "youth"
    worker = "worker"
    ai = "ai"
    system = "system"


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"msg_{uuid.uuid4().hex}")
    conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id"), nullable=False)
    sender_type: Mapped[SenderType] = mapped_column(Enum(SenderType), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    safety_status: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")

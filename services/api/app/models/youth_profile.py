import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class YouthProfile(Base):
    __tablename__ = "youth_profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"youth_{uuid.uuid4().hex}")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    assigned_worker_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    discord_user_id: Mapped[str | None] = mapped_column(String(80), unique=True, nullable=True)
    preferred_channel: Mapped[str] = mapped_column(String(80), default="Web Chat", nullable=False)
    support_style: Mapped[str | None] = mapped_column(Text, nullable=True)
    stressors: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship(
        back_populates="youth_profile",
        foreign_keys=[user_id],
    )

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.constants import ChannelType
from app.database import Base


class YouthProfile(Base):
    __tablename__ = "youth_profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"youth_{uuid.uuid4().hex}")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    assigned_worker_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    preferred_channel: Mapped[ChannelType] = mapped_column(Enum(ChannelType), default=ChannelType.web_chat, nullable=False)
    support_style: Mapped[str | None] = mapped_column(Text, nullable=True)
    stressors: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship(
        back_populates="youth_profile",
        foreign_keys=[user_id],
    )

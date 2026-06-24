import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class WorkerNotificationSettings(Base):
    __tablename__ = "worker_notification_settings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"wns_{uuid.uuid4().hex}")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False, index=True)
    telegram_chat_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    discord_webhook_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

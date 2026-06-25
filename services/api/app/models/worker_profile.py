import uuid

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class WorkerProfile(Base):
    __tablename__ = "worker_profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"wkp_{uuid.uuid4().hex}")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False, index=True)

    # Telegram Business — set when worker connects their Business account to the bot.
    # business_connection_id comes from Telegram's `business_connection` update.
    telegram_business_connection_id: Mapped[str | None] = mapped_column(String(128), nullable=True, unique=True)
    # worker's personal Telegram user_id (numeric string) — used to identify which
    # side of a business_message is the worker vs the youth.
    telegram_user_id: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True)

    # Discord — worker's snowflake ID in the SignalBridge server.
    discord_user_id: Mapped[str | None] = mapped_column(String(80), nullable=True, unique=True)

    # Configurable work hours (SGT, 0-23). After-hours gate uses these.
    work_hours_start: Mapped[int] = mapped_column(Integer, default=9, nullable=False)
    work_hours_end: Mapped[int] = mapped_column(Integer, default=18, nullable=False)

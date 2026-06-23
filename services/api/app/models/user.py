import enum
import uuid
from datetime import datetime

from app.timeutil import naive_utcnow

from sqlalchemy import DateTime, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRole(str, enum.Enum):
    youth = "youth"
    worker = "worker"
    supervisor = "supervisor"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"user_{uuid.uuid4().hex}")
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=naive_utcnow, nullable=False)

    youth_profile: Mapped["YouthProfile | None"] = relationship(
        back_populates="user",
        foreign_keys="YouthProfile.user_id",
    )

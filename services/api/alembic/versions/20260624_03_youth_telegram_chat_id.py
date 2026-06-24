"""Add telegram_chat_id to youth_profiles for Telegram bot integration."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision = "20260624_03"
down_revision = "20260624_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {c["name"] for c in inspector.get_columns("youth_profiles")}
    indexes = {index["name"] for index in inspector.get_indexes("youth_profiles")}
    if "telegram_chat_id" not in columns:
        op.add_column("youth_profiles", sa.Column("telegram_chat_id", sa.String(64), nullable=True))
    if "ix_youth_profiles_telegram_chat_id" not in indexes:
        op.create_index("ix_youth_profiles_telegram_chat_id", "youth_profiles", ["telegram_chat_id"], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {c["name"] for c in inspector.get_columns("youth_profiles")}
    indexes = {index["name"] for index in inspector.get_indexes("youth_profiles")}
    if "ix_youth_profiles_telegram_chat_id" in indexes:
        op.drop_index("ix_youth_profiles_telegram_chat_id", table_name="youth_profiles")
    if "telegram_chat_id" in columns:
        op.drop_column("youth_profiles", "telegram_chat_id")

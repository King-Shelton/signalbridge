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
    columns = {c["name"] for c in inspect(bind).get_columns("youth_profiles")}
    if "telegram_chat_id" not in columns:
        op.add_column("youth_profiles", sa.Column("telegram_chat_id", sa.String(64), nullable=True))
        op.create_unique_constraint("uq_youth_profiles_telegram_chat_id", "youth_profiles", ["telegram_chat_id"])


def downgrade() -> None:
    op.drop_constraint("uq_youth_profiles_telegram_chat_id", "youth_profiles", type_="unique")
    op.drop_column("youth_profiles", "telegram_chat_id")

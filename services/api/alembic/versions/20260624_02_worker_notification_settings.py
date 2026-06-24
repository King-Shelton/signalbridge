"""Add worker_notification_settings table for Telegram and Discord alerts."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision = "20260624_02"
down_revision = "20260620_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    existing = set(inspect(bind).get_table_names())
    if "worker_notification_settings" not in existing:
        op.create_table(
            "worker_notification_settings",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("telegram_chat_id", sa.String(64), nullable=True),
            sa.Column("discord_webhook_url", sa.String(512), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id"),
        )
        op.create_index("ix_worker_notification_settings_user_id", "worker_notification_settings", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_worker_notification_settings_user_id", table_name="worker_notification_settings")
    op.drop_table("worker_notification_settings")

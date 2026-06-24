"""Recover Discord thread support columns after older local migration chains."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision = "20260624_06"
down_revision = "20260624_05"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())

    if "worker_notification_settings" not in tables:
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

    youth_columns = {c["name"] for c in inspector.get_columns("youth_profiles")}
    youth_indexes = {index["name"] for index in inspector.get_indexes("youth_profiles")}
    if "telegram_chat_id" not in youth_columns:
        op.add_column("youth_profiles", sa.Column("telegram_chat_id", sa.String(64), nullable=True))
    if "ix_youth_profiles_telegram_chat_id" not in youth_indexes:
        op.create_index("ix_youth_profiles_telegram_chat_id", "youth_profiles", ["telegram_chat_id"], unique=True)

    conversation_columns = {c["name"] for c in inspector.get_columns("conversations")}
    conversation_indexes = {index["name"] for index in inspector.get_indexes("conversations")}
    if "discord_thread_id" not in conversation_columns:
        op.add_column("conversations", sa.Column("discord_thread_id", sa.String(80), nullable=True))
    if "ix_conversations_discord_thread_id" not in conversation_indexes:
        op.create_index("ix_conversations_discord_thread_id", "conversations", ["discord_thread_id"], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    conversation_columns = {c["name"] for c in inspector.get_columns("conversations")}
    conversation_indexes = {index["name"] for index in inspector.get_indexes("conversations")}
    if "ix_conversations_discord_thread_id" in conversation_indexes:
        op.drop_index("ix_conversations_discord_thread_id", table_name="conversations")
    if "discord_thread_id" in conversation_columns:
        op.drop_column("conversations", "discord_thread_id")

    youth_columns = {c["name"] for c in inspector.get_columns("youth_profiles")}
    youth_indexes = {index["name"] for index in inspector.get_indexes("youth_profiles")}
    if "ix_youth_profiles_telegram_chat_id" in youth_indexes:
        op.drop_index("ix_youth_profiles_telegram_chat_id", table_name="youth_profiles")
    if "telegram_chat_id" in youth_columns:
        op.drop_column("youth_profiles", "telegram_chat_id")

    tables = set(inspector.get_table_names())
    if "worker_notification_settings" in tables:
        op.drop_index("ix_worker_notification_settings_user_id", table_name="worker_notification_settings")
        op.drop_table("worker_notification_settings")

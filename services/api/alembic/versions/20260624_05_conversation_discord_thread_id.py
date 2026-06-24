"""Add discord_thread_id to conversations for Discord thread routing."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision = "20260624_05"
down_revision = "20260624_04"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {c["name"] for c in inspector.get_columns("conversations")}
    indexes = {index["name"] for index in inspector.get_indexes("conversations")}
    if "discord_thread_id" not in columns:
        op.add_column("conversations", sa.Column("discord_thread_id", sa.String(80), nullable=True))
    if "ix_conversations_discord_thread_id" not in indexes:
        op.create_index("ix_conversations_discord_thread_id", "conversations", ["discord_thread_id"], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {c["name"] for c in inspector.get_columns("conversations")}
    indexes = {index["name"] for index in inspector.get_indexes("conversations")}
    if "ix_conversations_discord_thread_id" in indexes:
        op.drop_index("ix_conversations_discord_thread_id", table_name="conversations")
    if "discord_thread_id" in columns:
        op.drop_column("conversations", "discord_thread_id")

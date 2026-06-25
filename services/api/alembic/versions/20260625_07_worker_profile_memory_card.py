"""Add worker_profiles, youth_memory_cards; extend conversations + handoff_briefs."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision = "20260625_07"
down_revision = "20260624_06"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())

    # ── worker_profiles ──────────────────────────────────────────────────────
    if "worker_profiles" not in tables:
        op.create_table(
            "worker_profiles",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("telegram_business_connection_id", sa.String(128), nullable=True),
            sa.Column("telegram_user_id", sa.String(64), nullable=True),
            sa.Column("discord_user_id", sa.String(80), nullable=True),
            sa.Column("work_hours_start", sa.Integer(), nullable=False, server_default="9"),
            sa.Column("work_hours_end", sa.Integer(), nullable=False, server_default="18"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id"),
            sa.UniqueConstraint("telegram_business_connection_id"),
            sa.UniqueConstraint("telegram_user_id"),
            sa.UniqueConstraint("discord_user_id"),
        )
        op.create_index("ix_worker_profiles_user_id", "worker_profiles", ["user_id"])

    # ── youth_memory_cards ───────────────────────────────────────────────────
    if "youth_memory_cards" not in tables:
        op.create_table(
            "youth_memory_cards",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("youth_id", sa.String(), sa.ForeignKey("youth_profiles.id"), nullable=False),
            sa.Column("key_concerns", sa.Text(), nullable=True),
            sa.Column("triggers", sa.Text(), nullable=True),
            sa.Column("coping_strategies", sa.Text(), nullable=True),
            sa.Column("support_network", sa.Text(), nullable=True),
            sa.Column("session_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("last_risk_level", sa.String(20), nullable=True),
            sa.Column("cumulative_risk_score", sa.Float(), nullable=False, server_default="0.0"),
            sa.Column("last_updated", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("youth_id"),
        )
        op.create_index("ix_youth_memory_cards_youth_id", "youth_memory_cards", ["youth_id"])

    # ── conversations: discord_channel_id + channel_type ────────────────────
    conv_columns = {c["name"] for c in inspector.get_columns("conversations")}
    conv_indexes = {idx["name"] for idx in inspector.get_indexes("conversations")}

    if "discord_channel_id" not in conv_columns:
        op.add_column("conversations", sa.Column("discord_channel_id", sa.String(80), nullable=True))
    if "ix_conversations_discord_channel_id" not in conv_indexes:
        op.create_index(
            "ix_conversations_discord_channel_id",
            "conversations",
            ["discord_channel_id"],
            unique=True,
        )
    if "channel_type" not in conv_columns:
        op.add_column(
            "conversations",
            sa.Column("channel_type", sa.String(80), nullable=False, server_default="web_chat"),
        )

    # ── handoff_briefs: platform + pre_handoff_context + memory_card_snapshot
    hb_columns = {c["name"] for c in inspector.get_columns("handoff_briefs")}

    if "platform" not in hb_columns:
        op.add_column("handoff_briefs", sa.Column("platform", sa.String(80), nullable=True))
    if "pre_handoff_context" not in hb_columns:
        op.add_column("handoff_briefs", sa.Column("pre_handoff_context", sa.Text(), nullable=True))
    if "memory_card_snapshot" not in hb_columns:
        op.add_column("handoff_briefs", sa.Column("memory_card_snapshot", sa.Text(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())

    # handoff_briefs
    hb_columns = {c["name"] for c in inspector.get_columns("handoff_briefs")}
    for col in ("memory_card_snapshot", "pre_handoff_context", "platform"):
        if col in hb_columns:
            op.drop_column("handoff_briefs", col)

    # conversations
    conv_columns = {c["name"] for c in inspector.get_columns("conversations")}
    conv_indexes = {idx["name"] for idx in inspector.get_indexes("conversations")}
    if "channel_type" in conv_columns:
        op.drop_column("conversations", "channel_type")
    if "ix_conversations_discord_channel_id" in conv_indexes:
        op.drop_index("ix_conversations_discord_channel_id", table_name="conversations")
    if "discord_channel_id" in conv_columns:
        op.drop_column("conversations", "discord_channel_id")

    # youth_memory_cards
    if "youth_memory_cards" in tables:
        op.drop_index("ix_youth_memory_cards_youth_id", table_name="youth_memory_cards")
        op.drop_table("youth_memory_cards")

    # worker_profiles
    if "worker_profiles" in tables:
        op.drop_index("ix_worker_profiles_user_id", table_name="worker_profiles")
        op.drop_table("worker_profiles")

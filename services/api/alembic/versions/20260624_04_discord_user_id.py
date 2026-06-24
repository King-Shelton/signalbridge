"""add discord user id to youth profiles

Revision ID: 20260624_04
Revises: 20260620_01
Create Date: 2026-06-24
"""

from alembic import op
import sqlalchemy as sa


revision = "20260624_04"
down_revision = "20260620_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("youth_profiles")}
    indexes = {index["name"] for index in inspector.get_indexes("youth_profiles")}

    if "discord_user_id" not in columns:
        op.add_column("youth_profiles", sa.Column("discord_user_id", sa.String(length=80), nullable=True))
    if "ix_youth_profiles_discord_user_id" not in indexes:
        op.create_index("ix_youth_profiles_discord_user_id", "youth_profiles", ["discord_user_id"], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("youth_profiles")}
    indexes = {index["name"] for index in inspector.get_indexes("youth_profiles")}

    if "ix_youth_profiles_discord_user_id" in indexes:
        op.drop_index("ix_youth_profiles_discord_user_id", table_name="youth_profiles")
    if "discord_user_id" in columns:
        op.drop_column("youth_profiles", "discord_user_id")

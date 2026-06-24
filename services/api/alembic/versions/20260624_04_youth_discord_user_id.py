"""Add discord_user_id to youth_profiles for Discord bot integration."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision = "20260624_04"
down_revision = "20260624_03"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {c["name"] for c in inspect(bind).get_columns("youth_profiles")}
    if "discord_user_id" not in columns:
        op.add_column("youth_profiles", sa.Column("discord_user_id", sa.String(32), nullable=True))
        op.create_unique_constraint("uq_youth_profiles_discord_user_id", "youth_profiles", ["discord_user_id"])


def downgrade() -> None:
    op.drop_constraint("uq_youth_profiles_discord_user_id", "youth_profiles", type_="unique")
    op.drop_column("youth_profiles", "discord_user_id")

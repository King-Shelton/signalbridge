"""Production alpha baseline and operational records."""
from alembic import op
from sqlalchemy import inspect, text

from app.database import Base
from app import models  # noqa: F401

revision = "20260620_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    existing = set(inspect(bind).get_table_names())
    if bind.dialect.name == "postgresql" and "cases" in existing:
        for value in ("new", "needs_review", "in_progress", "followed_up"):
            bind.execute(text(f"ALTER TYPE casestatus ADD VALUE IF NOT EXISTS '{value}'"))
        bind.execute(text("UPDATE cases SET status='needs_review' WHERE status='needs_follow_up'"))
        bind.execute(text("UPDATE cases SET status='new' WHERE status='open'"))
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    for table_name in ("notifications", "ai_runs", "case_notes"):
        if table_name in inspect(bind).get_table_names():
            Base.metadata.tables[table_name].drop(bind=bind)

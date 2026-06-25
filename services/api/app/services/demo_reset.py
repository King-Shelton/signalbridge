from sqlalchemy.orm import Session

from app.models import (
    AiRun,
    AuditLog,
    Case,
    CaseNote,
    Conversation,
    HandoffBrief,
    Message,
    Notification,
    Signal,
    YouthMemoryCard,
    YouthProfile,
)


RESET_MODELS = [
    AiRun,
    AuditLog,
    Notification,
    Signal,
    Message,
    HandoffBrief,
    CaseNote,
    Case,
    Conversation,
    YouthMemoryCard,
    YouthProfile,
]


def clear_demo_content(db: Session) -> dict[str, int]:
    """Delete case and conversation data while preserving account records."""
    deleted: dict[str, int] = {}
    for model in RESET_MODELS:
        table_name = model.__tablename__
        deleted[table_name] = db.query(model).delete(synchronize_session=False)
    db.commit()
    return deleted

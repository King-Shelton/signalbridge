"""After-hours detection for worker-linked conversations.

Both Telegram Business and Discord private-channel handlers call these
functions to decide whether the AI should take over replying.
"""

from sqlalchemy.orm import Session

from app.models.worker_profile import WorkerProfile
from app.timeutil import naive_utcnow, to_sgt


def is_after_hours(worker_id: str, db: Session) -> bool:
    """Return True when the current SGT time is outside the worker's configured hours.

    Falls back to 09:00–18:00 SGT if the worker has no WorkerProfile yet.
    """
    profile = db.query(WorkerProfile).filter_by(user_id=worker_id).first()
    start = profile.work_hours_start if profile else 9
    end = profile.work_hours_end if profile else 18

    now_sgt = to_sgt(naive_utcnow())
    hour = now_sgt.hour
    return not (start <= hour < end)


def get_worker_id_from_business_connection(connection_id: str, db: Session) -> str | None:
    """Reverse-lookup: Telegram business_connection_id → worker user_id.

    Returns None if no worker has registered this connection yet.
    """
    profile = (
        db.query(WorkerProfile)
        .filter_by(telegram_business_connection_id=connection_id)
        .first()
    )
    return profile.user_id if profile else None


def get_worker_id_from_telegram_user(telegram_user_id: str, db: Session) -> str | None:
    """Lookup worker by their personal Telegram user_id (numeric string).

    Used when a business_message arrives from the worker's own account.
    """
    profile = (
        db.query(WorkerProfile)
        .filter_by(telegram_user_id=telegram_user_id)
        .first()
    )
    return profile.user_id if profile else None


def get_worker_id_from_discord_user(discord_user_id: str, db: Session) -> str | None:
    """Lookup worker by their Discord snowflake ID."""
    profile = (
        db.query(WorkerProfile)
        .filter_by(discord_user_id=discord_user_id)
        .first()
    )
    return profile.user_id if profile else None


def ensure_worker_profile(worker_id: str, db: Session) -> WorkerProfile:
    """Get or create a WorkerProfile for this worker with default hours."""
    profile = db.query(WorkerProfile).filter_by(user_id=worker_id).first()
    if not profile:
        import uuid
        profile = WorkerProfile(
            id=f"wkp_{uuid.uuid4().hex}",
            user_id=worker_id,
        )
        db.add(profile)
        db.flush()
    return profile

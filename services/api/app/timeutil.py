"""Time helpers.

The database stores naive UTC timestamps. Two things broke because of that:

1. Serialising a naive datetime to ISO produces no offset (``2026-06-23T06:10:17``),
   which browsers parse as *local* time, so every timestamp rendered 8 hours off
   in Singapore. ``iso_utc`` always emits an explicit ``Z`` so the client converts
   correctly.
2. "After-hours" / "late-night" detection compared UTC wall-clock hours, so a 11pm
   SGT message looked like 3pm. ``to_sgt`` converts to Singapore time first.
"""

from datetime import datetime, timedelta, timezone
from typing import Annotated

from pydantic import PlainSerializer

SGT = timezone(timedelta(hours=8))


def naive_utcnow() -> datetime:
    """Timezone-naive UTC now (matches how timestamps are stored), without the
    deprecated ``datetime.utcnow()``."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def as_utc(dt: datetime) -> datetime:
    """Treat a naive datetime as UTC; leave aware datetimes untouched."""
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def iso_utc(dt: datetime | None) -> str | None:
    """ISO-8601 string with an explicit ``Z`` so clients parse it as UTC."""
    if dt is None:
        return None
    return as_utc(dt).isoformat().replace("+00:00", "Z")


def to_sgt(dt: datetime) -> datetime:
    """Convert a (naive-UTC or aware) datetime to Singapore time."""
    return as_utc(dt).astimezone(SGT)


# Pydantic field type: serialises datetimes to UTC ISO with a ``Z`` suffix.
UtcDateTime = Annotated[datetime, PlainSerializer(iso_utc, return_type=str)]

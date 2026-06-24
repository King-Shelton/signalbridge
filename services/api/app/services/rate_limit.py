"""Tiny in-memory sliding-window rate limiter.

Used to protect the public Telegram/Discord intake endpoints, which auto-create
a User + YouthProfile + Case on first contact and are otherwise trivially
spammable. Process-local and dependency-free — good enough for a single-instance
deployment; swap for Redis if the API is ever horizontally scaled.
"""

import threading
import time
from collections import defaultdict, deque

_buckets: dict[str, deque[float]] = defaultdict(deque)
_lock = threading.Lock()


def allow(key: str, max_events: int, window_seconds: float) -> bool:
    """Return True if `key` is under its limit, recording this event if so.

    A False result means the caller is over the limit and should be dropped.
    """
    now = time.monotonic()
    cutoff = now - window_seconds
    with _lock:
        bucket = _buckets[key]
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        if len(bucket) >= max_events:
            return False
        bucket.append(now)
        return True


def reset() -> None:
    """Clear all buckets — used by tests."""
    with _lock:
        _buckets.clear()

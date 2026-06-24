"""Housekeeping for throwaway guest accounts.

Every "Continue as guest" creates a real User + YouthProfile + Conversation that
otherwise lives forever. This sweep removes guests (and their conversation data)
once they're older than a cutoff, so the database doesn't accumulate one-off
sessions. It only ever touches rows whose email ends in the guest domain, so
seeded demo accounts and registered youth are never affected.
"""

from __future__ import annotations

import logging
from datetime import timedelta

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.case import Case
from app.models.case_note import CaseNote
from app.models.conversation import Conversation
from app.models.handoff_brief import HandoffBrief
from app.models.message import Message
from app.models.signal import Signal
from app.models.user import User
from app.models.youth_profile import YouthProfile
from app.timeutil import naive_utcnow

logger = logging.getLogger("signalbridge.maintenance")

GUEST_EMAIL_SUFFIX = "@signalbridge.local"


def purge_stale_guests(db: Session, older_than_hours: int = 48) -> int:
    """Delete guest accounts older than ``older_than_hours``. Returns the count removed."""
    cutoff = naive_utcnow() - timedelta(hours=older_than_hours)

    guest_user_ids = list(
        db.scalars(
            select(User.id).where(
                User.email.like(f"%{GUEST_EMAIL_SUFFIX}"),
                User.created_at < cutoff,
            )
        ).all()
    )
    if not guest_user_ids:
        return 0

    youth_ids = list(
        db.scalars(select(YouthProfile.id).where(YouthProfile.user_id.in_(guest_user_ids))).all()
    )
    conversation_ids = (
        list(db.scalars(select(Conversation.id).where(Conversation.youth_id.in_(youth_ids))).all())
        if youth_ids
        else []
    )
    case_ids = (
        list(db.scalars(select(Case.id).where(Case.youth_id.in_(youth_ids))).all())
        if youth_ids
        else []
    )

    # Delete children before parents to respect foreign keys.
    if conversation_ids:
        db.execute(delete(Message).where(Message.conversation_id.in_(conversation_ids)))
        db.execute(delete(Signal).where(Signal.conversation_id.in_(conversation_ids)))
        db.execute(delete(HandoffBrief).where(HandoffBrief.conversation_id.in_(conversation_ids)))
    if case_ids:
        db.execute(delete(CaseNote).where(CaseNote.case_id.in_(case_ids)))
        db.execute(delete(Case).where(Case.id.in_(case_ids)))
    if youth_ids:
        db.execute(delete(Conversation).where(Conversation.youth_id.in_(youth_ids)))
        db.execute(delete(YouthProfile).where(YouthProfile.id.in_(youth_ids)))
    db.execute(delete(AuditLog).where(AuditLog.actor_user_id.in_(guest_user_ids)))
    db.execute(delete(User).where(User.id.in_(guest_user_ids)))

    db.commit()
    logger.info("Purged %d stale guest account(s).", len(guest_user_ids))
    return len(guest_user_ids)

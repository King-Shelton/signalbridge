from datetime import datetime

from pydantic import BaseModel


class AuditLogPublic(BaseModel):
    id: str
    actorUserId: str | None
    actorName: str | None
    eventType: str
    entityType: str
    entityId: str
    details: str | None
    createdAt: datetime


class AuditLogResponse(BaseModel):
    logs: list[AuditLogPublic]

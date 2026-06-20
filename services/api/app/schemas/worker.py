from datetime import datetime

from pydantic import BaseModel, Field


class WorkerCasePublic(BaseModel):
    caseId: str
    youthId: str
    youthName: str
    handoffId: str
    channel: str
    riskLevel: str
    riskScore: int
    lastActive: datetime | None
    suggestedAction: str
    caseStatus: str
    reviewStatus: str
    latestNote: str | None = None
    latestNoteAt: datetime | None = None


class WorkerCasesResponse(BaseModel):
    cases: list[WorkerCasePublic]


class WorkerHandoffResponse(BaseModel):
    handoffId: str
    caseId: str
    youthId: str
    youthName: str
    channel: str
    caseStatus: str
    latestNote: str | None = None
    latestNoteAt: datetime | None = None
    suggestedAction: str
    handoffBrief: dict[str, object]


class WorkerCaseStatusUpdateRequest(BaseModel):
    caseStatus: str = Field(min_length=2, max_length=40)


class WorkerNoteCreateRequest(BaseModel):
    note: str = Field(min_length=1, max_length=4000)

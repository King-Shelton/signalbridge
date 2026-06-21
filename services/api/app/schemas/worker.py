from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class WorkerYouthPublic(BaseModel):
    id: str
    name: str
    assignedWorkerId: str | None
    preferredChannel: str
    supportStyle: str | None
    stressors: str | None


class WorkerMessagePublic(BaseModel):
    id: str
    conversationId: str
    senderType: str
    content: str
    safetyStatus: str | None
    createdAt: datetime


class WorkerSignalPublic(BaseModel):
    id: str
    type: str
    severity: str
    reason: str
    source: str
    createdAt: datetime


class SignalEvidencePublic(BaseModel):
    label: str
    detail: str
    severity: str
    source: str
    createdAt: datetime


class WorkerConversationPublic(BaseModel):
    id: str
    youthId: str
    youthName: str
    channel: str
    status: str
    riskLevel: str
    riskScore: int
    consentToHandoff: bool
    unresolvedHandoff: bool
    lastMessageAt: datetime | None
    createdAt: datetime
    messages: list[WorkerMessagePublic] = Field(default_factory=list)
    signals: list[WorkerSignalPublic] = Field(default_factory=list)


class WorkerHandoffPublic(BaseModel):
    id: str
    conversationId: str
    youthId: str
    youthName: str
    mainConcern: str
    emotionalState: str
    riskLevel: str
    riskScore: int
    keyQuote: str | None
    whatAiDid: str | None
    whatNotToRepeat: str | None
    suggestedWorkerResponse: str | None
    recommendedNextStep: str | None
    reviewStatus: str
    createdAt: datetime


class WorkerCaseNotePublic(BaseModel):
    id: str
    caseId: str
    authorUserId: str
    authorName: str
    content: str
    followUpAction: str | None
    createdAt: datetime


class WorkerCasePublic(BaseModel):
    id: str
    youthId: str
    assignedWorkerId: str | None
    status: str
    priority: str
    summary: str | None
    nextFollowUpAt: datetime | None
    createdAt: datetime
    updatedAt: datetime
    notes: list[WorkerCaseNotePublic] = Field(default_factory=list)


class CockpitItemPublic(BaseModel):
    case: WorkerCasePublic
    youth: WorkerYouthPublic
    conversation: WorkerConversationPublic | None
    handoffBrief: WorkerHandoffPublic | None
    reasons: list[str]
    suggestedAction: str
    followUpStatus: str


class SignalRadarItemPublic(BaseModel):
    youthId: str
    youthName: str
    conversationId: str | None
    caseId: str | None
    riskLevel: str
    riskScore: int
    unresolvedHandoff: bool
    lastActivityAt: datetime | None
    reasons: list[str]
    suggestedAction: str
    explanation: list[str]
    evidence: list[SignalEvidencePublic]


class SignalRadarResponse(BaseModel):
    items: list[SignalRadarItemPublic]


class WorkerCockpitStats(BaseModel):
    activeCases: int
    highRiskCases: int
    unresolvedHandoffs: int
    needsFollowUp: int


class WorkerCockpitResponse(BaseModel):
    workerId: str
    scope: str
    stats: WorkerCockpitStats
    cases: list[CockpitItemPublic]


class WorkerConversationResponse(BaseModel):
    conversation: WorkerConversationPublic
    youth: WorkerYouthPublic
    case: WorkerCasePublic | None
    handoffBriefs: list[WorkerHandoffPublic]


class WorkerHandoffResponse(BaseModel):
    handoffBrief: WorkerHandoffPublic
    conversation: WorkerConversationPublic
    youth: WorkerYouthPublic
    case: WorkerCasePublic | None


class WorkerYouthDetailResponse(BaseModel):
    youth: WorkerYouthPublic
    case: WorkerCasePublic | None
    conversations: list[WorkerConversationPublic]
    signals: list[WorkerSignalPublic]
    previousHandoffs: list[WorkerHandoffPublic]
    historicalContext: list[str]
    radarItem: SignalRadarItemPublic | None


class YouthSignalsResponse(BaseModel):
    youth: WorkerYouthPublic
    radarItem: SignalRadarItemPublic | None
    signals: list[WorkerSignalPublic]
    conversations: list[WorkerConversationPublic]
    previousHandoffs: list[WorkerHandoffPublic]
    explanation: list[str]


class CaseNoteCreate(BaseModel):
    content: str = Field(min_length=1, max_length=4000)
    followUpAction: str | None = Field(default=None, max_length=2000)


class CaseNoteCreateResponse(BaseModel):
    case: WorkerCasePublic
    note: WorkerCaseNotePublic


class CaseStatusUpdate(BaseModel):
    status: str
    priority: str | None = Field(default=None, max_length=40)
    nextFollowUpAt: datetime | None = None


class CaseStatusUpdateResponse(BaseModel):
    case: WorkerCasePublic

    model_config = ConfigDict(populate_by_name=True)

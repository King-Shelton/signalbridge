from pydantic import BaseModel, ConfigDict, Field

from app.timeutil import UtcDateTime


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
    createdAt: UtcDateTime


class WorkerSignalPublic(BaseModel):
    id: str
    type: str
    severity: str
    reason: str
    source: str
    createdAt: UtcDateTime


class SignalEvidencePublic(BaseModel):
    label: str
    detail: str
    severity: str
    source: str
    createdAt: UtcDateTime


class WorkerConversationPublic(BaseModel):
    id: str
    youthId: str
    youthName: str
    channel: str
    channelType: str
    status: str
    riskLevel: str
    riskScore: int
    consentToHandoff: bool
    unresolvedHandoff: bool
    lastMessageAt: UtcDateTime | None
    createdAt: UtcDateTime
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
    createdAt: UtcDateTime
    platform: str | None = None
    preHandoffContext: list[str] | None = None
    memoryCardSnapshot: dict | None = None


class WorkerCaseNotePublic(BaseModel):
    id: str
    caseId: str
    authorUserId: str
    authorName: str
    content: str
    followUpAction: str | None
    createdAt: UtcDateTime


class WorkerCasePublic(BaseModel):
    id: str
    youthId: str
    assignedWorkerId: str | None
    status: str
    priority: str
    summary: str | None
    nextFollowUpAt: UtcDateTime | None
    createdAt: UtcDateTime
    updatedAt: UtcDateTime
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
    lastActivityAt: UtcDateTime | None
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


class WorkerChannelSettingsPublic(BaseModel):
    telegramBusinessConnected: bool
    discordConnected: bool
    workHoursStart: int
    workHoursEnd: int


class WorkerChannelSettingsUpdate(BaseModel):
    workHoursStart: int | None = None
    workHoursEnd: int | None = None


class WorkerMessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=4000)


class WorkerMessageSentResponse(BaseModel):
    message: WorkerMessagePublic
    deliveryChannel: str


class CaseNoteCreate(BaseModel):
    content: str = Field(min_length=1, max_length=4000)
    followUpAction: str | None = Field(default=None, max_length=2000)


class CaseNoteCreateResponse(BaseModel):
    case: WorkerCasePublic
    note: WorkerCaseNotePublic


class CaseStatusUpdate(BaseModel):
    status: str
    priority: str | None = Field(default=None, max_length=40)
    nextFollowUpAt: UtcDateTime | None = None


class CaseStatusUpdateResponse(BaseModel):
    case: WorkerCasePublic

    model_config = ConfigDict(populate_by_name=True)

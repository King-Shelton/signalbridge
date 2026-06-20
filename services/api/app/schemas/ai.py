from datetime import datetime

from pydantic import BaseModel, Field


class SignalAnalysisRequest(BaseModel):
    conversationId: str | None = None
    content: str | None = Field(default=None, min_length=1, max_length=8000)
    messages: list[str] = Field(default_factory=list, max_length=50)
    persist: bool = True


class GenerateHandoffRequest(BaseModel):
    conversationId: str


class SuggestReplyRequest(BaseModel):
    conversationId: str | None = None
    content: str | None = Field(default=None, min_length=1, max_length=8000)
    riskScore: int | None = Field(default=None, ge=0, le=100)


class SafetyCheckRequest(BaseModel):
    content: str = Field(min_length=1, max_length=8000)


class SignalAnalysisItem(BaseModel):
    id: str | None = None
    type: str
    severity: str
    reason: str
    matchedTerms: list[str] = Field(default_factory=list)
    source: str
    createdAt: datetime | None = None


class RiskAnalysisResponse(BaseModel):
    conversationId: str | None
    riskLevel: str
    riskScore: int
    safetyStatus: str
    handoffRecommended: bool
    aiMode: str
    signals: list[SignalAnalysisItem]


class HandoffBriefPublic(BaseModel):
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


class GenerateHandoffResponse(BaseModel):
    handoffBrief: HandoffBriefPublic
    aiMode: str


class SuggestReplyResponse(BaseModel):
    conversationId: str | None
    suggestedReply: str
    riskLevel: str
    riskScore: int
    safetyStatus: str
    aiMode: str


class SafetyCheckResponse(BaseModel):
    safetyStatus: str
    blocked: bool
    riskLevel: str
    riskScore: int
    aiMode: str
    reasons: list[str]
    signals: list[SignalAnalysisItem]

from datetime import datetime

from pydantic import BaseModel, Field


class YouthMessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=4000)


class HandoffConsentRequest(BaseModel):
    consentGiven: bool = True


class MessagePublic(BaseModel):
    id: str
    conversationId: str
    senderType: str
    content: str
    safetyStatus: str | None
    createdAt: datetime


class SignalPublic(BaseModel):
    id: str
    type: str
    severity: str
    reason: str
    source: str
    createdAt: datetime


class YouthConversationPublic(BaseModel):
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
    messages: list[MessagePublic]
    signals: list[SignalPublic]


class YouthConversationsResponse(BaseModel):
    conversations: list[YouthConversationPublic]


class YouthMessageCreateResponse(BaseModel):
    conversation: YouthConversationPublic
    message: MessagePublic
    aiReply: MessagePublic
    signals: list[SignalPublic]
    handoffRecommended: bool
    handoffPrompt: str


class HandoffConsentResponse(BaseModel):
    conversation: YouthConversationPublic
    conversationId: str
    consentToHandoff: bool
    unresolvedHandoff: bool
    nextAction: str

from pydantic import BaseModel, Field

from app.timeutil import UtcDateTime


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
    createdAt: UtcDateTime


class SignalPublic(BaseModel):
    id: str
    type: str
    severity: str
    reason: str
    source: str
    createdAt: UtcDateTime


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
    lastMessageAt: UtcDateTime | None
    createdAt: UtcDateTime
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
    aiTriggeredConsent: bool = False


class HandoffConsentResponse(BaseModel):
    conversation: YouthConversationPublic
    conversationId: str
    consentToHandoff: bool
    unresolvedHandoff: bool
    nextAction: str

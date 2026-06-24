from pydantic import BaseModel, ConfigDict, Field

from app.timeutil import UtcDateTime


class MessagePublic(BaseModel):
    id: str
    sender_type: str = Field(alias="senderType")
    content: str
    safety_status: str | None = Field(default=None, alias="safetyStatus")
    created_at: UtcDateTime = Field(alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)


class SignalPublic(BaseModel):
    type: str
    severity: str
    reason: str


class ConversationPublic(BaseModel):
    id: str
    youth_id: str = Field(alias="youthId")
    youth_name: str = Field(alias="youthName")
    channel: str
    status: str
    risk_level: str = Field(alias="riskLevel")
    risk_score: int = Field(alias="riskScore")
    consent_to_handoff: bool = Field(alias="consentToHandoff")
    unresolved_handoff: bool = Field(alias="unresolvedHandoff")
    last_message_at: UtcDateTime | None = Field(default=None, alias="lastMessageAt")
    messages: list[MessagePublic]
    signals: list[SignalPublic]

    model_config = ConfigDict(populate_by_name=True)


class ConversationResponse(BaseModel):
    conversation: ConversationPublic


class SendMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


class SendMessageResponse(BaseModel):
    message: MessagePublic
    ai_reply: MessagePublic = Field(alias="aiReply")
    signals: list[SignalPublic]
    handoff_recommended: bool = Field(alias="handoffRecommended")

    model_config = ConfigDict(populate_by_name=True)


class HandoffConsentRequest(BaseModel):
    conversation_id: str = Field(alias="conversationId")
    consent_given: bool = Field(alias="consentGiven")

    model_config = ConfigDict(populate_by_name=True)


class HandoffConsentResponse(BaseModel):
    conversation_id: str = Field(alias="conversationId")
    consent_to_handoff: bool = Field(alias="consentToHandoff")
    next_action: str = Field(alias="nextAction")

    model_config = ConfigDict(populate_by_name=True)

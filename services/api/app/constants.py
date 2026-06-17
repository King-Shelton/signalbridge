from enum import Enum


class Role(str, Enum):
    youth = "youth"
    worker = "worker"
    supervisor = "supervisor"
    admin = "admin"


class CaseStatus(str, Enum):
    open = "open"
    needs_follow_up = "needs_follow_up"
    escalated = "escalated"
    closed = "closed"


class RiskLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class ChannelType(str, Enum):
    web_chat = "web_chat"
    whatsapp = "whatsapp"
    instagram_dm = "instagram_dm"
    telegram = "telegram"
    sms = "sms"


SHARED_CONSTANTS = {
    "roles": [role.value for role in Role],
    "caseStatuses": [status.value for status in CaseStatus],
    "riskLevels": [level.value for level in RiskLevel],
    "channelTypes": [channel.value for channel in ChannelType],
}

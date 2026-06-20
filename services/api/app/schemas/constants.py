from pydantic import BaseModel


class ConstantsResponse(BaseModel):
    roles: list[str]
    caseStatuses: list[str]
    riskLevels: list[str]
    channelTypes: list[str]

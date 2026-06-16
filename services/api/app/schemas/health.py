from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str
    database: str


class VersionResponse(BaseModel):
    name: str
    version: str
    environment: str

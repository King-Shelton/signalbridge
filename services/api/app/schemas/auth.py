from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: str
    password: str = Field(min_length=6, max_length=100)


class GuestRequest(BaseModel):
    name: str | None = Field(default=None, max_length=80)


class UserPublic(BaseModel):
    id: str
    name: str
    email: str
    role: str


class LoginResponse(BaseModel):
    accessToken: str
    user: UserPublic

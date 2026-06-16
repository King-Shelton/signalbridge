from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class UserPublic(BaseModel):
    id: str
    name: str
    email: str
    role: str


class LoginResponse(BaseModel):
    accessToken: str
    user: UserPublic

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, UserPublic
from app.services.auth_service import authenticate_user, create_access_token, get_current_user

router = APIRouter()


def to_public_user(user: User) -> UserPublic:
    return UserPublic(id=user.id, name=user.name, email=user.email, role=user.role.value)


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    user = authenticate_user(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return LoginResponse(
        accessToken=create_access_token(user),
        user=to_public_user(user),
    )


@router.get("/me", response_model=UserPublic)
def me(current_user: User = Depends(get_current_user)) -> UserPublic:
    return to_public_user(current_user)

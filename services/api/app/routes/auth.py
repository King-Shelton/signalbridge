from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.auth import LoginRequest, LoginResponse, RegisterRequest, UserPublic
from app.models.user import User, UserRole
from app.models.youth_profile import YouthProfile
from app.services.auth_service import authenticate_user, create_access_token, get_current_user
from app.services.auth_service import hash_password

router = APIRouter()


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
        user=UserPublic(id=user.id, name=user.name, email=user.email, role=user.role.value),
    )


@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> LoginResponse:
    existing = db.scalar(select(User).where(User.email == payload.email.lower().strip()))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with that email already exists.")

    user = User(
        name=payload.name.strip(),
        email=payload.email.lower().strip(),
        password_hash=hash_password(payload.password),
        role=UserRole.youth,
    )
    db.add(user)
    db.flush()

    default_worker = db.scalar(select(User).where(User.role == UserRole.worker).order_by(User.created_at.asc()))
    profile = YouthProfile(
        user_id=user.id,
        assigned_worker_id=default_worker.id if default_worker else None,
        preferred_channel="Web Chat",
    )
    db.add(profile)
    db.commit()
    db.refresh(user)

    return LoginResponse(
        accessToken=create_access_token(user),
        user=UserPublic(id=user.id, name=user.name, email=user.email, role=user.role.value),
    )


@router.get("/me", response_model=UserPublic)
def me(current_user: User = Depends(get_current_user)) -> UserPublic:
    return UserPublic(id=current_user.id, name=current_user.name, email=current_user.email, role=current_user.role.value)

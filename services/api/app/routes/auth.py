import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.auth import GuestRequest, LoginRequest, LoginResponse, RegisterRequest, UserPublic
from app.models.user import User, UserRole
from app.models.youth_profile import YouthProfile
from app.services.auth_service import (
    authenticate_user,
    clear_session_cookie,
    create_access_token,
    get_current_user,
    hash_password,
    set_session_cookie,
)

router = APIRouter()


def _default_worker_id(db: Session) -> str | None:
    worker = db.scalar(select(User).where(User.role == UserRole.worker).order_by(User.created_at.asc()))
    return worker.id if worker else None


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> LoginResponse:
    user = authenticate_user(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(user)
    set_session_cookie(response, token)
    return LoginResponse(
        accessToken=token,
        user=UserPublic(id=user.id, name=user.name, email=user.email, role=user.role.value),
    )


@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, response: Response, db: Session = Depends(get_db)) -> LoginResponse:
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

    token = create_access_token(user)
    set_session_cookie(response, token)
    return LoginResponse(
        accessToken=token,
        user=UserPublic(id=user.id, name=user.name, email=user.email, role=user.role.value),
    )


@router.post("/guest", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def guest(payload: GuestRequest, response: Response, db: Session = Depends(get_db)) -> LoginResponse:
    """Create a throwaway youth account so each guest gets their own private
    conversation, instead of everyone sharing the demo (Mira) account."""
    suffix = uuid.uuid4().hex[:12]
    display_name = (payload.name or "").strip()[:80] or "Guest"

    user = User(
        id=f"user_guest_{suffix}",
        name=display_name,
        email=f"guest-{suffix}@signalbridge.local",
        password_hash="guest-no-login",  # not a usable bcrypt hash → cannot log in
        role=UserRole.youth,
    )
    db.add(user)
    db.flush()

    profile = YouthProfile(
        id=f"youth_guest_{suffix}",
        user_id=user.id,
        assigned_worker_id=_default_worker_id(db),
        preferred_channel="Web Chat",
        support_style="Anonymous guest session. Confirm details gently before assuming context.",
    )
    db.add(profile)
    db.commit()
    db.refresh(user)

    token = create_access_token(user)
    set_session_cookie(response, token)
    return LoginResponse(
        accessToken=token,
        user=UserPublic(id=user.id, name=user.name, email=user.email, role=user.role.value),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    clear_session_cookie(response)


@router.get("/me", response_model=UserPublic)
def me(current_user: User = Depends(get_current_user)) -> UserPublic:
    return UserPublic(id=current_user.id, name=current_user.name, email=current_user.email, role=current_user.role.value)

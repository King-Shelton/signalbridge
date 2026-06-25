from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.user import User, UserRole

password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)

# Name of the httpOnly cookie that carries the JWT. Keeping the token out of
# JS-readable storage is the main XSS mitigation; the Authorization header is
# still accepted as a fallback (tests, scripts, non-browser clients).
SESSION_COOKIE = "sb_session"


def set_session_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        max_age=settings.access_token_minutes * 60,
        httponly=True,
        samesite="lax",
        secure=settings.environment != "local",
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(key=SESSION_COOKIE, path="/")


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_context.verify(password, password_hash)


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    normalized_email = email.strip().lower()
    user = db.query(User).filter(User.email == normalized_email).one_or_none()
    if user is None or not verify_password(password, user.password_hash):
        return None
    return user


def create_access_token(user: User) -> str:
    settings = get_settings()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_minutes)
    payload = {"sub": user.id, "email": user.email, "role": user.role.value, "exp": expires_at}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


_AUTH_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid or missing authentication token",
    headers={"WWW-Authenticate": "Bearer"},
)


def resolve_user_from_token(db: Session, token: str | None) -> User:
    """Decode and validate a JWT, returning the matching user or raising 401."""
    if not token:
        raise _AUTH_ERROR

    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        token_email = payload.get("email")
        token_role = payload.get("role")
    except JWTError as exc:
        raise _AUTH_ERROR from exc

    if not isinstance(user_id, str) or not isinstance(token_email, str) or not isinstance(token_role, str):
        raise _AUTH_ERROR

    user = db.get(User, user_id)
    if user is None:
        raise _AUTH_ERROR
    if user.email != token_email.strip().lower() or user.role.value != token_role:
        raise _AUTH_ERROR
    return user


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    # Prefer the httpOnly cookie; fall back to a bearer token.
    token: str | None = request.cookies.get(SESSION_COOKIE)
    if not token and credentials is not None and credentials.scheme.lower() == "bearer":
        token = credentials.credentials
    return resolve_user_from_token(db, token)


def require_roles(*roles: UserRole):
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This role cannot perform that action",
            )
        return current_user
    return dependency

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.worker_notification_settings import WorkerNotificationSettings
from app.services.auth_service import get_current_user
from app.services.notifications import send_discord, send_telegram

router = APIRouter(prefix="/worker/notification-settings", tags=["notifications"])


def _require_worker(current_user: User) -> User:
    if current_user.role not in (UserRole.worker, UserRole.supervisor, UserRole.admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Workers only.")
    return current_user


def _get_or_create(db: Session, user_id: str) -> WorkerNotificationSettings:
    row = db.query(WorkerNotificationSettings).filter_by(user_id=user_id).first()
    if row is None:
        row = WorkerNotificationSettings(user_id=user_id)
        db.add(row)
        db.flush()
    return row


class NotificationSettingsPublic(BaseModel):
    telegramChatId: str | None
    discordWebhookUrl: str | None


class NotificationSettingsUpdate(BaseModel):
    telegramChatId: str | None = None
    discordWebhookUrl: str | None = None


class TestRequest(BaseModel):
    channel: str  # "telegram" | "discord"


@router.get("", response_model=NotificationSettingsPublic)
def get_notification_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NotificationSettingsPublic:
    _require_worker(current_user)
    row = db.query(WorkerNotificationSettings).filter_by(user_id=current_user.id).first()
    return NotificationSettingsPublic(
        telegramChatId=row.telegram_chat_id if row else None,
        discordWebhookUrl=row.discord_webhook_url if row else None,
    )


@router.patch("", response_model=NotificationSettingsPublic)
def update_notification_settings(
    payload: NotificationSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NotificationSettingsPublic:
    _require_worker(current_user)
    row = _get_or_create(db, current_user.id)
    if payload.telegramChatId is not None:
        row.telegram_chat_id = payload.telegramChatId.strip() or None
    if payload.discordWebhookUrl is not None:
        row.discord_webhook_url = payload.discordWebhookUrl.strip() or None
    db.commit()
    db.refresh(row)
    return NotificationSettingsPublic(
        telegramChatId=row.telegram_chat_id,
        discordWebhookUrl=row.discord_webhook_url,
    )


@router.post("/test", status_code=status.HTTP_204_NO_CONTENT)
def test_notification(
    payload: TestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    _require_worker(current_user)
    row = db.query(WorkerNotificationSettings).filter_by(user_id=current_user.id).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Save your settings first.")

    test_msg = f"SignalBridge test - alerts are working for {current_user.name}."

    if payload.channel == "telegram":
        if not row.telegram_chat_id:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="No Telegram chat ID saved.")
        send_telegram(row.telegram_chat_id, f"*Test message*\n\n{test_msg}")
    elif payload.channel == "discord":
        if not row.discord_webhook_url:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="No Discord webhook saved.")
        send_discord(row.discord_webhook_url, "Test message", test_msg, "low")
    else:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="channel must be 'telegram' or 'discord'.")

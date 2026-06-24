"""Fire-and-forget Telegram and Discord alert delivery.

All public functions return silently on failure - a missed notification should
never crash an API response.
"""

import logging
import threading

import httpx

from app.config import get_settings

logger = logging.getLogger("signalbridge.notifications")

_RISK_COLORS = {
    "critical": 0xD95F48,
    "high": 0xD95F48,
    "medium": 0xE9C685,
    "low": 0x6FB8AA,
}


def _telegram_send(bot_token: str, chat_id: str, text: str) -> None:
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    try:
        with httpx.Client(timeout=8) as client:
            r = client.post(url, json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"})
        if not r.is_success:
            logger.warning("Telegram send failed: %s %s", r.status_code, r.text[:200])
    except Exception as exc:
        logger.warning("Telegram send error: %s", exc)


def _discord_send(webhook_url: str, title: str, description: str, color: int) -> None:
    payload = {
        "embeds": [
            {
                "title": title,
                "description": description,
                "color": color,
                "footer": {"text": "SignalBridge - SafeNight"},
            }
        ]
    }
    try:
        with httpx.Client(timeout=8) as client:
            r = client.post(webhook_url, json=payload)
        if not r.is_success:
            logger.warning("Discord send failed: %s %s", r.status_code, r.text[:200])
    except Exception as exc:
        logger.warning("Discord send error: %s", exc)


def _fire(fn, *args) -> None:
    """Run `fn(*args)` in a daemon thread so we never block the request."""
    t = threading.Thread(target=fn, args=args, daemon=True)
    t.start()


def send_telegram(chat_id: str, text: str) -> None:
    settings = get_settings()
    if not settings.telegram_bot_token:
        return
    _fire(_telegram_send, settings.telegram_bot_token, chat_id, text)


def send_discord(webhook_url: str, title: str, description: str, risk_level: str = "high") -> None:
    color = _RISK_COLORS.get(risk_level, _RISK_COLORS["high"])
    _fire(_discord_send, webhook_url, title, description, color)


def notify_worker(
    telegram_chat_id: str | None,
    discord_webhook_url: str | None,
    title: str,
    body: str,
    risk_level: str = "high",
) -> None:
    """Send to whichever channels the worker has configured."""
    if telegram_chat_id:
        risk_label = risk_level.upper()
        text = f"[{risk_label}] *{title}*\n\n{body}"
        send_telegram(telegram_chat_id, text)

    if discord_webhook_url:
        send_discord(discord_webhook_url, title, body, risk_level)

"""Register (or inspect) the Telegram webhook for the SafeNight bot.

Telegram only pushes updates to a webhook it has been explicitly told about.
The API also does this automatically on startup when SIGNALBRIDGE_PUBLIC_BASE_URL
is set, but this script is handy for one-off setup, debugging, or rotating the
public URL without redeploying.

Usage (from services/api, with the venv active):

    python scripts/set_telegram_webhook.py            # register from env config
    python scripts/set_telegram_webhook.py --info     # show current webhook status
    python scripts/set_telegram_webhook.py --delete   # remove the webhook

Required env (see .env.example):
    SIGNALBRIDGE_TELEGRAM_BOT_TOKEN
    SIGNALBRIDGE_PUBLIC_BASE_URL        e.g. https://signalbridge-api.onrender.com
    SIGNALBRIDGE_TELEGRAM_WEBHOOK_SECRET (optional but recommended)
"""

import sys

import httpx

from app.config import get_settings


def _bot_url(token: str, method: str) -> str:
    return f"https://api.telegram.org/bot{token}/{method}"


def main() -> int:
    settings = get_settings()
    token = settings.telegram_bot_token
    if not token:
        print("ERROR: SIGNALBRIDGE_TELEGRAM_BOT_TOKEN is not set.")
        return 1

    arg = sys.argv[1] if len(sys.argv) > 1 else ""

    if arg == "--info":
        r = httpx.get(_bot_url(token, "getWebhookInfo"), timeout=10)
        print(r.status_code, r.text)
        return 0 if r.is_success else 1

    if arg == "--delete":
        r = httpx.post(_bot_url(token, "deleteWebhook"), json={"drop_pending_updates": True}, timeout=10)
        print(r.status_code, r.text)
        return 0 if r.is_success else 1

    base = (settings.public_base_url or "").rstrip("/")
    if not base:
        print("ERROR: SIGNALBRIDGE_PUBLIC_BASE_URL is not set.")
        return 1

    webhook_url = f"{base}/telegram/webhook"
    payload: dict = {
        "url": webhook_url,
        "allowed_updates": ["message", "edited_message"],
        "drop_pending_updates": True,
    }
    if settings.telegram_webhook_secret:
        payload["secret_token"] = settings.telegram_webhook_secret

    r = httpx.post(_bot_url(token, "setWebhook"), json=payload, timeout=10)
    print(r.status_code, r.text)
    if r.is_success:
        print(f"\nWebhook registered: {webhook_url}")
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())

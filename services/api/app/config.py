from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "SignalBridge API"
    app_version: str = "0.1.0-alpha.1"
    environment: str = "local"
    database_url: str = "postgresql+psycopg://signalbridge:signalbridge@localhost:5432/signalbridge"
    jwt_secret: str = "change-me-for-production"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60 * 24  # 24h — keeps demo/judging sessions alive without surprise logouts
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    openai_api_key: str | None = None
    openai_base_url: str | None = None
    openai_model: str = "gpt-4.1"
    openai_timeout_seconds: float = 20.0
    ai_prompt_version: str = "handoff-v1"
    telegram_bot_token: str | None = None
    telegram_webhook_secret: str | None = None
    # Public HTTPS base URL of this API (e.g. https://signalbridge-api.onrender.com).
    # Used to auto-register the Telegram webhook on startup. Leave unset locally.
    public_base_url: str | None = None
    discord_webhook_url: str | None = None
    discord_bot_token: str | None = None
    discord_entry_channel_id: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_prefix="SIGNALBRIDGE_", extra="ignore")

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+psycopg://", 1)
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "SignalBridge API"
    app_version: str = "0.1.0-alpha.1"
    environment: str = "local"
    database_url: str = "postgresql+psycopg://signalbridge:signalbridge@localhost:5432/signalbridge"
    jwt_secret: str = "change-me-for-production"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    model_config = SettingsConfigDict(env_file=".env", env_prefix="SIGNALBRIDGE_")


@lru_cache
def get_settings() -> Settings:
    return Settings()

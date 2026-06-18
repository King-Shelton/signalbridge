from fastapi import FastAPI

from app.config import get_settings
from app.database import Base, engine
from app.models import AuditLog, Case, Conversation, HandoffBrief, Message, Signal, User, YouthProfile
from app.routes import auth, health, youth

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Human-in-the-loop youth support command centre backend.",
)


@app.on_event("startup")
def create_tables() -> None:
    Base.metadata.create_all(bind=engine)


app.include_router(health.router)
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(youth.router, prefix="/youth", tags=["youth"])

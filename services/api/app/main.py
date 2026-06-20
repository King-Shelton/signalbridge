from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.models import AiRun, AuditLog, Case, CaseNote, Conversation, HandoffBrief, Message, Notification, Signal, User, YouthProfile
from app.routes import ai, auth, constants, health, operations, signals, simulator, youth

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Human-in-the-loop youth support command centre backend.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(health.router)
app.include_router(constants.router, prefix="/constants", tags=["constants"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(youth.router, prefix="/youth", tags=["youth"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])
app.include_router(operations.router)
app.include_router(signals.router)
app.include_router(simulator.router)

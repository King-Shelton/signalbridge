from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, engine
from app.models import AuditLog, Case, Conversation, HandoffBrief, Message, Signal, User, YouthProfile
from app.routes import ai, auth, conversations, health, worker, youth

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Human-in-the-loop youth support command centre backend.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def create_tables() -> None:
    Base.metadata.create_all(bind=engine)


app.include_router(health.router)
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(youth.router, prefix="/youth", tags=["youth"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])
app.include_router(worker.router)
app.include_router(conversations.router, tags=["conversations"])

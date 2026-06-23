import logging
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import Request

from app.config import get_settings
from app.models import AiRun, AuditLog, Case, CaseNote, Conversation, HandoffBrief, Message, Notification, Signal, User, YouthProfile
from app.routes import ai, auth, conversations, constants, health, operations, signals, simulator, worker, youth

settings = get_settings()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("signalbridge.api")

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


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "request method=%s path=%s status=%s duration_ms=%.2f",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


app.include_router(health.router)
app.include_router(constants.router)
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(youth.router, prefix="/youth", tags=["youth"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])
app.include_router(operations.router)
app.include_router(worker.router, prefix="/worker", tags=["worker"])
app.include_router(signals.router)
app.include_router(simulator.router)
app.include_router(worker.signals_router, prefix="/signals", tags=["signals"])
app.include_router(conversations.router, tags=["conversations"])

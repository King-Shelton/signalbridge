import asyncio
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import Request

from app.config import get_settings
from app.models import AiRun, AuditLog, Case, CaseNote, Conversation, HandoffBrief, Message, Notification, Signal, User, WorkerNotificationSettings, YouthProfile
from app.routes import ai, auth, constants, health, notifications, operations, signals, simulator, telegram_bot, worker, youth
from app.routes.telegram_bot import register_webhook_if_configured
from app.services.discord_bot_service import build_discord_bot

settings = get_settings()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("signalbridge.api")


def _purge_stale_guests() -> None:
    """Remove throwaway guest accounts left over from previous sessions."""
    from app.database import SessionLocal
    from app.services.maintenance import purge_stale_guests

    db = SessionLocal()
    try:
        purge_stale_guests(db)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Sweep stale guest accounts on startup so one-off sessions don't pile up.
    try:
        await asyncio.to_thread(_purge_stale_guests)
    except Exception:
        logger.exception("Guest account cleanup failed.")

    # Register the Telegram webhook so Telegram knows where to deliver updates.
    # Runs off the event loop because it makes a blocking HTTP call.
    try:
        await asyncio.to_thread(register_webhook_if_configured)
    except Exception:
        logger.exception("Telegram webhook registration failed.")

    bot = build_discord_bot()
    bot_task = None
    if bot:
        bot_task = asyncio.create_task(bot.start(settings.discord_bot_token))
        logger.info("Discord bot task started.")
    yield
    if bot and bot_task:
        bot_task.cancel()
        try:
            await asyncio.wait_for(bot.close(), timeout=5)
        except Exception:
            pass
        logger.info("Discord bot stopped.")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Human-in-the-loop youth support command centre backend.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    # Auth is carried in the Authorization header (bearer tokens), not cookies, so
    # credentialed CORS is unnecessary — keeping it off tightens the policy.
    allow_credentials=False,
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
app.include_router(notifications.router)
app.include_router(telegram_bot.router)

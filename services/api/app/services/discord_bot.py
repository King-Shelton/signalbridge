import asyncio
import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.audit_log import AuditLog
from app.models.conversation import Conversation, ConversationStatus
from app.models.message import Message, SenderType
from app.models.signal import Signal
from app.models.youth_profile import YouthProfile
from app.services.safenight_service import assess_safe_night_message

logger = logging.getLogger("uvicorn.error")


class DiscordBotService:
    def __init__(self, token: str) -> None:
        self.token = token
        self._task: asyncio.Task[None] | None = None
        self._client = None

    def start(self) -> None:
        if self._task is None:
            self._task = asyncio.create_task(self._run())
            self._task.add_done_callback(self._log_task_result)

    async def stop(self) -> None:
        if self._client is not None:
            await self._client.close()
        if self._task is not None:
            self._task.cancel()

    async def _run(self) -> None:
        try:
            import discord
        except ImportError:
            logger.warning("Discord bot token is configured, but discord.py is not installed.")
            return

        intents = discord.Intents.default()
        intents.dm_messages = True

        client = discord.Client(intents=intents)
        self._client = client

        @client.event
        async def on_ready() -> None:
            logger.info("Discord bot connected as %s", client.user)

        @client.event
        async def on_message(message) -> None:
            if message.author.bot or message.guild is not None:
                return

            content = message.content.strip()
            discord_user_id = str(message.author.id)
            if content.lower().startswith("!link "):
                youth_id = content.split(maxsplit=1)[1].strip()
                reply = _link_youth(discord_user_id, youth_id)
                await message.channel.send(reply)
                return

            reply = _handle_youth_message(discord_user_id, content)
            await message.channel.send(reply)

        await client.start(self.token)

    @staticmethod
    def _log_task_result(task: asyncio.Task[None]) -> None:
        if task.cancelled():
            return
        try:
            task.result()
        except Exception:
            logger.exception("Discord bot stopped unexpectedly.")


def _link_youth(discord_user_id: str, youth_id: str) -> str:
    db = SessionLocal()
    try:
        youth = db.get(YouthProfile, youth_id)
        if youth is None:
            return f"I could not find `{youth_id}`. Check the youth ID and try again."

        existing = db.scalar(select(YouthProfile).where(YouthProfile.discord_user_id == discord_user_id))
        if existing is not None and existing.id != youth.id:
            existing.discord_user_id = None

        youth.discord_user_id = discord_user_id
        db.add(AuditLog(
            actor_user_id=youth.user_id,
            event_type="discord_youth_linked",
            entity_type="youth_profile",
            entity_id=youth.id,
            details='{"channel":"Discord"}',
        ))
        db.commit()
        return "Linked! You can now chat with SafeNight right here."
    finally:
        db.close()


def _handle_youth_message(discord_user_id: str, content: str) -> str:
    if not content:
        return "Send a message when you are ready, or use `!link youth_mira` first if this is your first time."

    db = SessionLocal()
    try:
        youth = db.scalar(select(YouthProfile).where(YouthProfile.discord_user_id == discord_user_id))
        if youth is None:
            return "I do not know which youth account this Discord user belongs to yet. DM `!link youth_mira` first."

        conversation = _get_or_create_discord_conversation(db, youth.id)
        now = datetime.utcnow()
        assessment = assess_safe_night_message(content)

        youth_message = Message(conversation_id=conversation.id, sender_type=SenderType.youth, content=content)
        db.add(youth_message)
        db.flush()

        ai_reply = Message(
            conversation_id=conversation.id,
            sender_type=SenderType.ai,
            content=assessment.reply,
            safety_status=assessment.safety_status,
        )
        db.add(ai_reply)

        for detected_signal in assessment.signals:
            db.add(Signal(
                conversation_id=conversation.id,
                youth_id=youth.id,
                type=detected_signal.type,
                severity=detected_signal.severity,
                reason=detected_signal.reason,
                source="discord_safenight",
            ))

        conversation.last_message_at = now
        risk_rank = {"low": 1, "medium": 2, "high": 3, "critical": 4}
        if risk_rank[assessment.risk_level.value] >= risk_rank[conversation.risk_level.value]:
            conversation.risk_level = assessment.risk_level
        conversation.risk_score = max(conversation.risk_score, assessment.risk_score)
        if assessment.handoff_recommended:
            conversation.status = ConversationStatus.needs_review
            conversation.unresolved_handoff = True

        db.add(AuditLog(
            actor_user_id=youth.user_id,
            event_type="discord_message_created",
            entity_type="conversation",
            entity_id=conversation.id,
            details='{"channel":"Discord"}',
        ))
        db.commit()
        return assessment.reply
    finally:
        db.close()


def _get_or_create_discord_conversation(db: Session, youth_id: str) -> Conversation:
    conversation = db.scalar(
        select(Conversation)
        .where(Conversation.youth_id == youth_id)
        .where(Conversation.channel == "Discord")
        .where(Conversation.status != ConversationStatus.closed)
        .order_by(Conversation.created_at.desc())
    )
    if conversation is not None:
        return conversation

    conversation = Conversation(youth_id=youth_id, channel="Discord")
    db.add(conversation)
    db.flush()
    return conversation

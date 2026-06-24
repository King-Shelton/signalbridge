import os
import sys
from pathlib import Path

DB_PATH = Path(__file__).with_name("signalbridge-test.db")
API_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(API_ROOT))

os.environ["SIGNALBRIDGE_DATABASE_URL"] = f"sqlite:///{DB_PATH.as_posix()}"
# Force the deterministic (no-model) path during tests. Popping the var is not
# enough because pydantic-settings still reads the key from the .env file; an
# explicit empty string overrides the .env value so no live model call is made.
os.environ["SIGNALBRIDGE_OPENAI_API_KEY"] = ""
os.environ["SIGNALBRIDGE_TELEGRAM_BOT_TOKEN"] = "test-token"
os.environ["SIGNALBRIDGE_TELEGRAM_WEBHOOK_SECRET"] = "test-secret"

from fastapi.testclient import TestClient
from jose import jwt

from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.main import app
from app.models.conversation import Conversation
from app.models.message import Message, SenderType
from app.models.youth_profile import YouthProfile
from app.routes import operations, telegram_bot
from app.services.ai_service import CRITICAL_FALLBACK_REPLY, generate_safenight_reply
from app.services.discord_bot_service import _ensure_thread_conversation, _handle_message
from app.services.safenight_service import assess_safe_night_message
from seed import seed


def setup_module() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed()


def teardown_module() -> None:
    engine.dispose()
    DB_PATH.unlink(missing_ok=True)


client = TestClient(app)


def token(email: str) -> str:
    response = client.post("/auth/login", json={"email": email, "password": "password"})
    assert response.status_code == 200, response.text
    return response.json()["accessToken"]


def auth(email: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token(email)}"}


def test_health_login_and_role_isolation() -> None:
    assert client.get("/health").status_code == 200
    assert client.post("/auth/login", json={"email": " WORKER1@SIGNALBRIDGE.TEST ", "password": "password"}).status_code == 200
    worker_headers = auth("worker1@signalbridge.test")
    assert client.get("/auth/me", headers=worker_headers).json()["role"] == "worker"
    assert client.get("/supervisor/load", headers=worker_headers).status_code == 403
    assert client.get("/worker/cockpit").status_code == 401


def test_auth_rejects_token_with_stale_role_claim() -> None:
    settings = get_settings()
    tampered_token = jwt.encode(
        {"sub": "user_worker_1", "email": "worker1@signalbridge.test", "role": "supervisor"},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {tampered_token}"})

    assert response.status_code == 401


def test_cockpit_handoff_pdf_case_note_and_status() -> None:
    headers = auth("worker1@signalbridge.test")
    cockpit = client.get("/worker/cockpit", headers=headers)
    assert cockpit.status_code == 200
    rows = cockpit.json()["conversations"]
    assert rows[0]["riskScore"] >= rows[-1]["riskScore"]
    mira = next(row for row in rows if row["youthId"] == "youth_mira")
    handoff = client.get(f"/worker/handoffs/{mira['handoffId']}", headers=headers)
    assert handoff.status_code == 200
    assert client.get(f"/worker/handoffs/{mira['handoffId']}/pdf", headers=headers).headers["content-type"] == "application/pdf"
    case_id = mira["case"]["id"]
    assert client.patch(f"/worker/cases/{case_id}/status", headers=headers, json={"status": "in_progress"}).status_code == 200
    assert client.post(f"/worker/cases/{case_id}/notes", headers=headers, json={"content": "Safety check scheduled for this morning."}).status_code == 201


def test_telegram_deep_link_and_worker_reply_round_trip(monkeypatch) -> None:
    outbound: list[tuple[str, str]] = []
    monkeypatch.setattr(telegram_bot, "_send_telegram_message", lambda _token, chat_id, text: outbound.append((str(chat_id), text)))
    monkeypatch.setattr(operations, "send_telegram", lambda chat_id, text: outbound.append((str(chat_id), text)))

    chat_id = "test_chat_afiq"
    headers = {"X-Telegram-Bot-Api-Secret-Token": "test-secret"}
    start_payload = {
        "message": {
            "chat": {"id": chat_id},
            "text": "/start youth_afiq",
        }
    }
    assert client.post("/telegram/webhook", headers=headers, json=start_payload).status_code == 200

    with SessionLocal() as db:
        youth = db.get(YouthProfile, "youth_afiq")
        assert youth.telegram_chat_id == chat_id

    for text in [
        "Someone keeps editing my photos in the class chat and I don't want to go to school tomorrow.",
        "yes please share a short note with my worker",
    ]:
        response = client.post("/telegram/webhook", headers=headers, json={"message": {"chat": {"id": chat_id}, "text": text}})
        assert response.status_code == 200

    worker_headers = auth("worker1@signalbridge.test")
    rows = client.get("/worker/cockpit", headers=worker_headers).json()["conversations"]
    telegram_row = next(row for row in rows if row["youthId"] == "youth_afiq" and row["channel"] == "Telegram")
    assert telegram_row["riskScore"] >= 40
    assert telegram_row["consentToHandoff"] is True
    assert telegram_row["handoffId"]

    reply = client.post(
        f"/worker/conversations/{telegram_row['id']}/messages",
        headers=worker_headers,
        json={"content": "I read the note you allowed SignalBridge to prepare. You do not have to repeat everything."},
    )

    assert reply.status_code == 201
    assert reply.json()["deliveryChannel"] == "telegram"
    assert outbound[-1] == (
        chat_id,
        "Aisha Rahman: I read the note you allowed SignalBridge to prepare. You do not have to repeat everything.",
    )

    with SessionLocal() as db:
        conversation = db.get(Conversation, telegram_row["id"])
        last_message = db.query(Message).filter_by(conversation_id=conversation.id).order_by(Message.created_at.desc()).first()
        assert last_message.sender_type == SenderType.worker
        assert conversation.last_message_at == last_message.created_at


def test_discord_thread_conversation_routes_to_safenight() -> None:
    discord_user_id = "discord_user_mira_thread_test"
    discord_thread_id = "discord_thread_mira_001"

    assert _ensure_thread_conversation(discord_user_id, "youth_mira", discord_thread_id) == "SafeNight is ready here. Keep typing in this thread."

    reply = _handle_message(
        discord_user_id,
        "Someone keeps editing my photos and I do not want to go to school tomorrow.",
        discord_thread_id,
    )

    assert reply
    with SessionLocal() as db:
        youth = db.get(YouthProfile, "youth_mira")
        conversation = db.query(Conversation).filter_by(discord_thread_id=discord_thread_id).one()
        messages = db.query(Message).filter_by(conversation_id=conversation.id).order_by(Message.created_at.asc()).all()

        assert youth.discord_user_id == discord_user_id
        assert conversation.channel == "Discord"
        assert conversation.risk_score >= 40
        assert messages[-2].sender_type == SenderType.youth
        assert messages[-1].sender_type == SenderType.ai


def test_public_telegram_intake_asks_name_then_syncs_to_worker_cockpit(monkeypatch) -> None:
    outbound: list[tuple[str, str]] = []
    monkeypatch.setattr(telegram_bot, "_send_telegram_message", lambda _token, chat_id, text: outbound.append((str(chat_id), text)))

    chat_id = "public_chat_001"
    headers = {"X-Telegram-Bot-Api-Secret-Token": "test-secret"}

    response = client.post("/telegram/webhook", headers=headers, json={"message": {"chat": {"id": chat_id}, "text": "I feel scared tonight"}})
    assert response.status_code == 200
    assert "what name or nickname" in outbound[-1][1].lower()

    response = client.post("/telegram/webhook", headers=headers, json={"message": {"chat": {"id": chat_id}, "text": "Sam"}})
    assert response.status_code == 200
    assert "thanks, sam" in outbound[-1][1].lower()

    response = client.post(
        "/telegram/webhook",
        headers=headers,
        json={"message": {"chat": {"id": chat_id}, "text": "Someone keeps editing my photos and I don't want to go school tomorrow."}},
    )
    assert response.status_code == 200

    worker_headers = auth("worker1@signalbridge.test")
    rows = client.get("/worker/cockpit", headers=worker_headers).json()["conversations"]
    public_row = next(row for row in rows if row["channel"] == "Telegram" and row["youthName"] == "Sam")
    assert public_row["riskScore"] >= 40
    assert public_row["case"]["summary"] == "Public Telegram intake for Sam."
    assert any(message["content"].startswith("Someone keeps editing") for message in public_row["messages"])


def test_consent_required_and_fallback_handoff_generation() -> None:
    youth_headers = auth("mira@signalbridge.test")
    conversations = client.get("/youth/conversations", headers=youth_headers).json()["conversations"]
    conversation_id = conversations[0]["id"]
    assert client.post(f"/youth/conversations/{conversation_id}/handoff-consent", headers=youth_headers, json={"consentGiven": False}).status_code == 200
    denied = client.post("/ai/generate-handoff", headers=youth_headers, json={"conversationId": conversation_id})
    assert denied.status_code == 403
    approved = client.post(f"/youth/conversations/{conversation_id}/handoff-consent", headers=youth_headers, json={"consentGiven": True})
    assert approved.status_code == 200
    assert client.get("/youth/handoffs", headers=youth_headers).json()["handoffs"]


def test_critical_language_cannot_be_downgraded() -> None:
    youth_headers = auth("mira@signalbridge.test")
    conversation_id = client.get("/youth/conversations", headers=youth_headers).json()["conversations"][0]["id"]
    response = client.post(f"/youth/conversations/{conversation_id}/messages", headers=youth_headers, json={"content": "I want to die and cannot stay alive."})
    assert response.status_code == 200
    assert response.json()["conversation"]["riskLevel"] == "critical"
    assert response.json()["aiReply"]["safetyStatus"] == "requires_immediate_human_review"
    follow_up = client.post(f"/youth/conversations/{conversation_id}/messages", headers=youth_headers, json={"content": "Thank you."})
    assert follow_up.json()["conversation"]["riskLevel"] == "critical"


def test_safenight_fallback_reply_is_contextual_without_ai_key() -> None:
    samples = [
        "hi",
        "hey i want to stop getting bullied by mruthulan",
        "hello im scared of the dark",
        "I am so tired and cannot anymore",
    ]
    replies = [
        generate_safenight_reply(message, [], assess_safe_night_message(message))
        for message in samples
    ]

    assert len(set(replies)) == len(samples)
    assert any("bullying" in reply.lower() for reply in replies)
    assert any("dark" in reply.lower() for reply in replies)
    assert CRITICAL_FALLBACK_REPLY == generate_safenight_reply(
        "I want to die",
        [],
        assess_safe_night_message("I want to die"),
    )


def test_safenight_keeps_bullying_context_when_youth_says_scared_of_person() -> None:
    history = [
        Message(
            conversation_id="test_conversation",
            sender_type=SenderType.youth,
            content="hey i want to stop getting bullied by mruthulan",
        )
    ]

    reply = generate_safenight_reply(
        "im so scared of mruthulan",
        history,
        assess_safe_night_message("im so scared of mruthulan"),
    )

    assert "bullying" in reply.lower()
    assert "dark" not in reply.lower()


def test_safenight_handles_identity_questions_and_typo_greetings() -> None:
    history = [
        Message(
            conversation_id="test_conversation",
            sender_type=SenderType.youth,
            content="hey i want to stop getting bullied by mruthulan",
        )
    ]

    identity_reply = generate_safenight_reply(
        "are u gay?",
        history,
        assess_safe_night_message("are u gay?"),
    )
    greeting_reply = generate_safenight_reply(
        "helllo",
        history,
        assess_safe_night_message("helllo"),
    )

    assert "ai after-hours companion" in identity_reply.lower()
    assert "sexuality" in identity_reply.lower()
    assert "dark" not in identity_reply.lower()
    assert "hi, i am here with you" in greeting_reply.lower()


def test_safenight_gives_practical_bullying_help() -> None:
    reply = generate_safenight_reply(
        "if im getting bullied what shld i do",
        [],
        assess_safe_night_message("if im getting bullied what shld i do"),
    )

    assert "screenshots" in reply.lower()
    assert "trusted adult" in reply.lower()
    assert "worker" in reply.lower()


def test_safenight_redirects_off_topic_insult_after_bullying_context() -> None:
    history = [
        Message(
            conversation_id="test_conversation",
            sender_type=SenderType.youth,
            content="hey i want to stop getting bullied by mruthulan",
        )
    ]

    reply = generate_safenight_reply(
        "explain how shelton has evolved from a mini chimpanzee to a big gorilla",
        history,
        assess_safe_night_message("explain how shelton has evolved from a mini chimpanzee to a big gorilla"),
    )

    assert "cannot help" in reply.lower()
    assert "appearance" in reply.lower()
    assert "bullying" not in reply.lower()


def test_safenight_uses_current_dark_context_over_prior_bullying() -> None:
    history = [
        Message(
            conversation_id="test_conversation",
            sender_type=SenderType.youth,
            content="hey i want to stop getting bullied by mruthulan",
        )
    ]

    reply = generate_safenight_reply(
        "hello im scared of the dark",
        history,
        assess_safe_night_message("hello im scared of the dark"),
    )

    assert "dark" in reply.lower()
    assert "bullying" not in reply.lower()


def test_supervisor_reassignment_analytics_audit_and_simulator() -> None:
    headers = auth("supervisor@signalbridge.test")
    worker_headers = auth("worker1@signalbridge.test")
    workers = client.get("/supervisor/workers", headers=headers).json()["workers"]
    cockpit = client.get("/worker/cockpit", headers=headers).json()["conversations"]
    case_id = next(row["case"]["id"] for row in cockpit if row["case"])
    target = next(worker for worker in workers if worker["id"] == "user_worker_2")
    assert client.patch(f"/supervisor/cases/{case_id}/assign", headers=worker_headers, json={"workerId": target["id"]}).status_code == 403
    assert client.patch(f"/supervisor/cases/{case_id}/assign", headers=headers, json={"workerId": target["id"]}).status_code == 200
    assert client.get("/analytics/summary", headers=headers).status_code == 200
    audit_rows = client.get("/audit/logs", headers=headers)
    assert audit_rows.status_code == 200
    assert any(row["eventType"] == "case_reassigned" and target["id"] in row["details"] for row in audit_rows.json()["logs"])
    assert any(row["entityType"] == "ai_run" and "promptVersion" in row["details"] for row in audit_rows.json()["logs"])
    simulated = client.post("/simulator/intake", headers=headers, json={"youthId": "youth_mira", "channel": "Discord Simulator", "message": "I do not want to go to school because they keep editing my photos."})
    assert simulated.status_code == 201
    assert simulated.json()["riskScore"] >= 40

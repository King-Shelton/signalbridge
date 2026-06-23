import os
import sys
from pathlib import Path

DB_PATH = Path(__file__).with_name("signalbridge-test.db")
API_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(API_ROOT))

os.environ["SIGNALBRIDGE_DATABASE_URL"] = f"sqlite:///{DB_PATH.as_posix()}"
os.environ.pop("SIGNALBRIDGE_OPENAI_API_KEY", None)

from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app
from app.services.ai_service import CRITICAL_FALLBACK_REPLY, generate_safenight_reply
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
    worker_headers = auth("worker1@signalbridge.test")
    assert client.get("/auth/me", headers=worker_headers).json()["role"] == "worker"
    assert client.get("/supervisor/load", headers=worker_headers).status_code == 403
    assert client.get("/worker/cockpit").status_code == 401


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

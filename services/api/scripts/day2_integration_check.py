from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path


API_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(API_ROOT))


def configure_database() -> tempfile.TemporaryDirectory[str]:
    temp_dir = tempfile.TemporaryDirectory(prefix="signalbridge-day2-")
    db_path = Path(temp_dir.name) / "integration.db"
    os.environ["SIGNALBRIDGE_DATABASE_URL"] = f"sqlite:///{db_path.as_posix()}"
    os.environ["SIGNALBRIDGE_JWT_SECRET"] = "integration-test-secret"
    os.environ["SIGNALBRIDGE_ENVIRONMENT"] = "integration"
    return temp_dir


def main() -> None:
    temp_dir = configure_database()
    try:
        from fastapi.testclient import TestClient

        from app.database import engine
        from app.main import app
        from seed import seed

        seed()

        with TestClient(app) as client:
            health = client.get("/health")
            health.raise_for_status()
            assert health.json() == {"status": "ok", "service": "api", "database": "ok"}

            constants = client.get("/constants")
            constants.raise_for_status()
            constants_body = constants.json()
            assert constants_body["roles"] == ["youth", "worker", "supervisor", "admin"]
            assert constants_body["caseStatuses"] == [
                "open",
                "needs_follow_up",
                "escalated",
                "closed",
            ]
            assert constants_body["riskLevels"] == ["low", "medium", "high", "critical"]
            assert constants_body["channelTypes"] == [
                "web_chat",
                "whatsapp",
                "instagram_dm",
                "telegram",
                "sms",
            ]

            accounts = {
                "mira@signalbridge.test": "youth",
                "worker1@signalbridge.test": "worker",
                "supervisor@signalbridge.test": "supervisor",
            }
            for email, expected_role in accounts.items():
                login = client.post(
                    "/auth/login",
                    json={"email": email, "password": "password"},
                )
                login.raise_for_status()
                body = login.json()
                assert body["user"]["role"] == expected_role
                assert body["accessToken"]

                me = client.get(
                    "/auth/me",
                    headers={"Authorization": f"Bearer {body['accessToken']}"},
                )
                me.raise_for_status()
                assert me.json()["email"] == email
                assert me.json()["role"] == expected_role

        print("Day 2 integration check passed.")
    finally:
        if "engine" in locals():
            engine.dispose()
        temp_dir.cleanup()


if __name__ == "__main__":
    main()

"""
Reset all case/conversation data while preserving user accounts and worker settings.

Run from the repo root via Render Shell (or locally):
    cd services/api
    python scripts/reset_data.py

Set environment variable RESET_CONFIRM=yes to skip the interactive prompt.
"""

import os
import sys

# Allow the script to be run from the repo root as well.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db import get_engine  # uses DATABASE_URL env var


TABLES_TO_TRUNCATE = [
    # Child tables first (FK ordering).
    "ai_runs",
    "signals",
    "messages",
    "handoff_briefs",
    "conversations",
    "cases",
    "memory_cards",
    "youth_profiles",
    # Users created automatically for Telegram / Discord youths only — keep worker accounts.
    # We delete youth users separately below rather than truncating the whole users table.
]


def main() -> None:
    confirm = os.environ.get("RESET_CONFIRM", "").strip().lower()
    if confirm != "yes":
        answer = input(
            "\n⚠️  This will DELETE all conversations, messages, handoff briefs, cases, and youth profiles.\n"
            "   Worker accounts and settings are preserved.\n"
            "   Type 'yes' to continue: "
        ).strip().lower()
        if answer != "yes":
            print("Aborted.")
            sys.exit(0)

    engine = get_engine()
    with engine.begin() as conn:
        # Disable FK checks for the duration of truncation (Postgres syntax).
        conn.execute(text("SET session_replication_role = replica;"))

        for table in TABLES_TO_TRUNCATE:
            try:
                conn.execute(text(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE;"))
                print(f"  ✓ truncated {table}")
            except Exception as exc:
                print(f"  ✗ {table}: {exc}")

        # Delete auto-created youth user accounts (email pattern used at creation time).
        result = conn.execute(
            text(
                "DELETE FROM users WHERE email LIKE '%@signalbridge.local' "
                "AND role = 'youth' RETURNING id;"
            )
        )
        deleted_users = result.rowcount
        print(f"  ✓ deleted {deleted_users} auto-created youth user(s)")

        conn.execute(text("SET session_replication_role = DEFAULT;"))

    print("\nDone. Database is clean — worker accounts and settings are intact.")


if __name__ == "__main__":
    main()

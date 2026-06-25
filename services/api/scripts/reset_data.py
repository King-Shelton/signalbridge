"""
Reset all case/conversation data while preserving user accounts and worker settings.

Run from the repo root via Render Shell (or locally):
    cd services/api
    python scripts/reset_data.py

Set environment variable RESET_CONFIRM=yes to skip the interactive prompt.
"""

import os
import sys
from pathlib import Path

# Allow the script to be run from the repo root or from `services/api`.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal  # uses SIGNALBRIDGE_DATABASE_URL / DATABASE_URL env var
from app.services.demo_reset import clear_demo_content
from seed import seed


def main() -> None:
    confirm = os.environ.get("RESET_CONFIRM", "").strip().lower()
    if confirm != "yes":
        answer = input(
            "\nThis will DELETE all conversations, messages, handoff briefs, cases, and youth profiles.\n"
            "User accounts, worker profiles, and worker settings are preserved.\n"
            "Type 'yes' to continue: "
        ).strip().lower()
        if answer != "yes":
            print("Aborted.")
            sys.exit(0)

    db = SessionLocal()
    try:
        deleted = clear_demo_content(db)
        for table, count in deleted.items():
            print(f"  deleted {count} from {table}")
    finally:
        db.close()

    seed(reset=False)
    print("\nDone. Database is demo-ready. User accounts, worker profiles, and worker settings are intact.")


if __name__ == "__main__":
    main()

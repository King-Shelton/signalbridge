# SignalBridge

SignalBridge is a cloud-native, human-in-the-loop youth support command centre for Singapore Children's Society youth workers.

It helps workers manage multiple digital conversations, safely bridge after-hours youth messages back to human care, generate youth-approved handoff briefs, prioritise consent-based support signals, and monitor worker load without replacing human youth workers.

## Product Direction

SignalBridge is not positioned as a chatbot. The youth-facing chat is one part of a wider command centre that supports continuity of care.

Core demo line:

> The youth does not have to repeat their pain twice, and the worker does not have to start from zero.

## Stack

- Frontend: Next.js App Router and Tailwind CSS
- Backend: FastAPI
- Database: PostgreSQL
- ORM: SQLAlchemy
- Auth: JWT-based role-based access
- AI: OpenAI structured handoffs with deterministic safety fallback
- DevOps: Docker and Docker Compose

## Monorepo Shape

```text
apps/
  web/                 # Next.js frontend
services/
  api/                 # FastAPI backend
  ai-worker/           # AI and safety worker, if separated
docs/
  api-contract.md
  demo-script.md
infra/
  docker-compose.yml
```

## Setup Instructions

The complete web, API, and PostgreSQL stack runs from Docker Compose. Startup applies Alembic migrations and loads idempotent fictional seed data.

Expected local flow:

```bash
docker compose up --build
```

Reset and reseed the fictional database:

```bash
docker compose run --rm api python seed.py --reset
```

To remove the local PostgreSQL volume completely, run `docker compose down -v` before starting again.

Local backend-only flow:

```bash
cd services/api
python -m venv .venv
.venv/Scripts/activate
pip install -r requirements.txt
alembic -c ../../alembic.ini upgrade head
python seed.py
uvicorn app.main:app --reload
```

Primary backend endpoints:

```text
GET  /health
GET  /version
POST /auth/login
GET  /worker/cockpit
GET  /signals/radar
PATCH /worker/cases/{id}/status
POST /worker/cases/{id}/notes
GET  /supervisor/load
PATCH /supervisor/cases/{id}/assign
GET  /audit/logs
GET  /analytics/summary
POST /simulator/intake
```

## Main Fictional Case

The alpha is built around one coherent journey: Mira, a youth experiencing cyberbullying, messages SignalBridge after-hours.

Mira's seed message:

```text
People in my class group chat keep editing my photos. I don't want to go school tomorrow. I'm so tired of explaining this.
```

The system should detect cyberbullying, school avoidance, shame or embarrassment, after-hours timing, and unresolved handoff risk.

## First Seed Users

| Email | Role | Purpose |
| --- | --- | --- |
| mira@signalbridge.test | youth | Youth demo account for the Mira after-hours cyberbullying journey |
| worker1@signalbridge.test | worker | Youth worker who reviews Mira's handoff brief |
| worker2@signalbridge.test | worker | Second worker for workload reassignment |
| supervisor@signalbridge.test | supervisor | Supervisor who reviews worker load and audit activity |

All fictional accounts use password `password`.

## AI Safety and Fallback

Deterministic rules establish risk before any model call. A model can improve handoff wording but cannot lower risk or replace critical escalation guidance. Missing credentials, timeout, refusal, malformed structured output, or prohibited clinical wording automatically uses the deterministic fallback. Configure `SIGNALBRIDGE_OPENAI_API_KEY` and optionally `SIGNALBRIDGE_OPENAI_MODEL`.

## Verification

```powershell
npm run lint
npm run build
$env:PYTHONPATH='services/api'; .\.venv\Scripts\python -m pytest services/api/tests -q
docker compose config
docker compose up --build
curl http://localhost:8000/health
curl http://localhost:8000/version
```

## Cloud Deployment

`render.yaml` provisions the web service, API, and managed PostgreSQL in Singapore. Apply the Blueprint after merging to `dev`, set `SIGNALBRIDGE_OPENAI_API_KEY` if model-assisted summaries are required, and verify `/login` plus the API `/health` endpoint. `infra/k8s/signalbridge.yaml` provides portable deployment, service, secret, and health-probe definitions for a Kubernetes target.

Dell platform deployment requires external project credentials that are not present in this repository. See `docs/deployment-fallback-plan.md` for the Dell access check, deployment method, and fallback demo order.

## Team Ownership

| Owner | Area | Branch |
| --- | --- | --- |
| Shelton | Product direction, integration, README, API contract, demo story, merge control | dev / main |
| Mru | Youth experience and SafeNight Companion | feature/youth-chat |
| Mike | Worker Cockpit, case management, Signal Radar UI | feature/worker-cockpit |
| Davier | Backend, AI, safety, database, Docker, DevOps | feature/ai-backend / feature/devops |

## Demo Flow

1. Mira logs in and opens SafeNight Companion.
2. Mira sends the after-hours cyberbullying message.
3. SafeNight responds safely and asks for handoff consent.
4. Mira consents to a handoff note.
5. SignalBridge generates a structured handoff brief.
6. The youth worker logs in the next morning.
7. Mira appears at the top of Signal Radar.
8. The worker opens the handoff brief and sees context, risk, key quote, what AI did, what not to repeat, and suggested first response.
9. The worker marks the case as Needs Follow-Up and adds a note.
10. The supervisor reviews worker load and safety audit logs.

## Branching Rules

- `main`: stable only
- `dev`: integration branch
- `feature/youth-chat`: Mru youth flow
- `feature/worker-cockpit`: Mike worker and case workflow
- `feature/ai-backend`: Davier API, AI, risk, seed data
- `feature/devops`: Davier Docker, environment, deployment

Merge feature branches into `dev` first. Test `dev` before promoting to `main`.

## Project Board

Day-by-day work is tracked in the GitHub Project board:

https://github.com/users/King-Shelton/projects/1

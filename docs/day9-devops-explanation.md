# Day 9 DevOps Explanation

## Deployment Shape

SignalBridge runs as three Docker services:

- `postgres`: Postgres 16 with a healthcheck on `pg_isready`.
- `api`: FastAPI backend. On startup it runs Alembic migrations, loads idempotent demo seed data, then starts Uvicorn on port `8000`.
- `web`: Next.js frontend. It waits for the API healthcheck before serving the demo UI on port `3000`.

The backend can also run without Docker against SQLite for tests and fallback demos. SQLite is configured with `check_same_thread=False`, and Postgres uses `pool_pre_ping` so stale database connections recover cleanly.

## AI Fallback

The demo does not require a live OpenAI key. If `SIGNALBRIDGE_OPENAI_API_KEY` is empty, unavailable, times out, or returns unsafe structured text, the backend uses deterministic SafeNight rules:

- crisis language always returns the scripted crisis-safe response;
- cyberbullying, school avoidance, negative emotion, and late-night context produce stable risk scores;
- handoff briefs fall back to a structured rule-based brief;
- every AI handoff run records an `ai_runs` row, including fallback reason and prompt version.

This means a missing model provider degrades quality gracefully but does not block the youth, worker, or supervisor flows.

## Auditability

Audit rows are written for the demo-critical actions:

- youth message received;
- SafeNight response created;
- handoff consent updated or detected verbally;
- handoff brief created;
- worker conversation or handoff reviewed;
- case note added;
- case status updated;
- case reassigned;
- AI run metadata exposed in `/audit/logs`.

The audit endpoint is supervisor/admin scoped and returns valid JSON details for traceability.

## Demo Endpoint Stability

The API test suite now covers the endpoints used by the demo:

- `GET /health`, `GET /health/db`, `GET /version`
- `POST /auth/login`, `GET /auth/me`
- `GET /youth/conversations`, `POST /youth/conversations/{id}/messages`, `POST /youth/conversations/{id}/handoff-consent`, `GET /youth/handoffs`
- `GET /worker/cockpit`, `GET /worker/conversations/{id}`, `GET /worker/youths/{id}`, `GET /worker/handoffs/{id}`, `PATCH /worker/handoffs/{id}/review`, `GET /worker/handoffs/{id}/pdf`
- `GET /signals/radar`, `GET /notifications`
- `GET /supervisor/load`, `GET /supervisor/workers`, `PATCH /supervisor/cases/{id}/assign`
- `GET /analytics/summary`, `GET /audit/logs`
- `POST /simulator/intake`

## Seed Export

The deterministic demo seed can be exported with:

```bash
python services/api/seed.py --reset --export-json docs/signalbridge-seed-export.json
```

The checked-in export is `docs/signalbridge-seed-export.json`. Demo notification channels are intentionally env-driven:

- `SIGNALBRIDGE_DEMO_TELEGRAM_CHAT_ID`
- `SIGNALBRIDGE_DEMO_DISCORD_WEBHOOK_URL`

Do not commit real chat IDs or webhook URLs.

## Verification Commands

Local API:

```bash
python -m pytest services/api/tests -q
```

Docker:

```bash
docker compose up --build -d
docker compose ps
curl http://localhost:8000/health
curl http://localhost:8000/health/db
curl http://localhost:8000/version
curl http://localhost:3000/login
docker compose down
```

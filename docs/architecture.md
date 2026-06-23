# SignalBridge Architecture

## System Overview

SignalBridge is a three-tier, cloud-native web application. A Next.js frontend talks to a FastAPI backend over HTTP. The backend persists all state in PostgreSQL and optionally calls OpenAI for handoff generation. Every component is containerised and deployable as a unit with Docker Compose or individually via Render Blueprint.

```
                         ┌─────────────────────────────────────────────┐
                         │               Browser Client                 │
                         │                                             │
                         │  ┌──────────┐  ┌─────────────┐  ┌───────┐  │
                         │  │SafeNight │  │   Worker    │  │ Super │  │
                         │  │Companion │  │   Cockpit   │  │-visor │  │
                         │  └────┬─────┘  └──────┬──────┘  └───┬───┘  │
                         └───────┼───────────────┼─────────────┼───────┘
                                 │               │             │
                                 ▼               ▼             ▼
                         ┌──────────────────────────────────────────────┐
                         │         Next.js 14  (apps/web)               │
                         │   App Router · Tailwind CSS · TypeScript     │
                         │                                              │
                         │   /youth/chat          → SafeNight UX        │
                         │   /worker/cockpit      → Signal Radar        │
                         │   /worker/handoffs/:id → Handoff Brief       │
                         │   /supervisor          → Load Monitor        │
                         └──────────────────┬───────────────────────────┘
                                            │  HTTP/JSON
                                            ▼
                         ┌──────────────────────────────────────────────┐
                         │         FastAPI  (services/api)              │
                         │   JWT auth · SQLAlchemy ORM · Pydantic       │
                         │                                              │
                         │   /auth/*        Role-based login            │
                         │   /youth/*       Conversation + consent      │
                         │   /ai/*          Handoff generation          │
                         │   /worker/*      Cockpit + case ops          │
                         │   /signals/*     Risk signal radar           │
                         │   /supervisor/*  Load + reassignment         │
                         │   /audit/*       Safety event log            │
                         │   /analytics/*   Aggregate metrics           │
                         │   /simulator/*   Fictional intake injection  │
                         │   /health, /version  Readiness probes        │
                         └──────────┬──────────────────┬────────────────┘
                                    │ SQLAlchemy        │ HTTPS
                                    ▼                   ▼
                         ┌──────────────────┐  ┌──────────────────────┐
                         │  PostgreSQL 16   │  │   OpenAI API         │
                         │  (managed DB)    │  │   gpt-4.1-mini       │
                         │                 │  │                      │
                         │  Users          │  │  Structured handoff  │
                         │  Conversations  │  │  generation (JSON    │
                         │  Messages       │  │  schema enforced)    │
                         │  Cases          │  │                      │
                         │  HandoffBriefs  │  │  Deterministic safety│
                         │  Signals        │  │  fallback if model   │
                         │  AuditLogs      │  │  call fails or is    │
                         │  Notifications  │  │  absent              │
                         └──────────────────┘  └──────────────────────┘
```

## Key Design Decisions

### Human-in-the-loop, not AI-first

SignalBridge never routes a youth to a response without a safety check. The deterministic safety layer runs before any OpenAI call. If OpenAI is unavailable, times out, returns malformed output, or uses prohibited clinical language, the system falls back to a deterministic handoff template. The AI improves wording quality — it cannot lower risk scores or bypass consent.

### Consent-first data flow

A youth's conversation is visible to a worker only after `consent_to_handoff = true` is recorded on the conversation. The handoff brief is generated (or regenerated) at the point of consent, not before. This is enforced at the API layer, not just the UI.

### Role-based access

Three JWT roles: `youth`, `worker`, `supervisor`. Route guards on both the Next.js layout (redirects) and the FastAPI routes (dependency injection) enforce separation. A youth cannot read worker data; a worker cannot access supervisor load stats.

### Audit trail

Every AI action, consent event, risk signal extraction, handoff creation, case status change, and worker reassignment writes a row to `audit_logs`. The supervisor Safety Audit tab renders this log in real time.

## Cloud-Native Deployment

### Local development

```bash
docker compose up --build
```

Applies Alembic migrations, seeds fictional test data, and starts all three services. Reset with `docker compose run --rm api python seed.py --reset`.

### Render (primary cloud target)

`render.yaml` defines a Blueprint with three resources:

| Resource | Type | Plan |
|---|---|---|
| `signalbridge-api` | Docker web service | Free (Singapore) |
| `signalbridge-web` | Docker web service | Free (Singapore) |
| `signalbridge-postgres` | Managed PostgreSQL 16 | Free (Singapore) |

The API service health-check hits `/health` before traffic is routed. Auto-deploy triggers on push to `main`.

### Kubernetes (portable target)

`infra/k8s/signalbridge.yaml` provides Deployment, Service, Secret, and readiness probe definitions for any Kubernetes cluster. Swap the database connection string and JWT secret via the cluster Secret.

## Data Models

```
User            id, email, hashed_password, role, name
Conversation    id, youth_id, worker_id, risk_level, risk_score, consent_to_handoff
Message         id, conversation_id, sender_type, content, safety_status
Signal          id, conversation_id, type, severity, reason, source
HandoffBrief    id, conversation_id, summary, emotional_state, risk_score,
                key_quote, ai_actions, what_not_to_repeat, suggested_response,
                generated_by (ai|deterministic)
Case            id, conversation_id, worker_id, status, summary, priority
CaseNote        id, case_id, worker_id, content
AuditLog        id, event_type, entity_type, entity_id, actor_id, details
Notification    id, worker_id, message, case_id, read
AiRun           id, conversation_id, model, prompt_tokens, completion_tokens,
                success, fallback_used, error_message
```

## Safety Fallback Chain

```
Youth message received
        │
        ▼
Deterministic risk scoring (always runs)
  - Keyword detection: cyberbullying, school avoidance, self-harm keywords
  - Time-of-day: after-hours flag if 20:00–07:00
  - History: prior unresolved signals increase score
        │
        ▼
Risk score set (cannot be lowered by AI step)
        │
        ▼
OpenAI call (if API key present and not in fallback state)
  - Structured JSON output enforced via response_format
  - Clinical wording blocklist checked on output
  - 10-second timeout
        │
   ┌────┴────┐
 success   failure / timeout / prohibited wording / missing key
   │              │
   ▼              ▼
AI handoff    Deterministic handoff template
brief         (pre-written, always safe)
        │
        ▼
AiRun record written (fallback_used flag set if applicable)
AuditLog entry written
```

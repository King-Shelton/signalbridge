# SignalBridge

SignalBridge is a cloud-native, human-in-the-loop youth support command centre for Singapore Children's Society youth workers.

It helps workers manage multiple digital conversations, safely bridge after-hours youth messages back to human care, generate youth-approved handoff briefs, prioritise consent-based support signals, and monitor worker load without replacing human youth workers.

## Product Direction

SignalBridge is not positioned as a chatbot. The youth-facing chat is one part of a wider command centre that supports continuity of care.

Core demo line:

> The youth does not have to repeat their pain twice, and the worker does not have to start from zero.

## Stack

- Frontend: Next.js, Tailwind CSS, shadcn/ui
- Backend: FastAPI
- Database: PostgreSQL
- ORM: SQLAlchemy
- Auth: JWT-based role-based access
- AI: OpenAI, Ollama, or local mock fallback
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

Setup commands will be finalised after the Day 2 application scaffold is created.

Expected local flow:

```bash
docker compose up --build
```

Expected seed/reset flow:

```bash
# Placeholder until backend seed command exists
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
| supervisor@signalbridge.test | supervisor | Supervisor who reviews worker load and audit activity |

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

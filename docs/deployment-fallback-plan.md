# Day 8 Deployment and Demo Fallback Plan

## Dell Platform Access

No Dell platform credentials, project URL, CLI profile, or deployment token are stored in this repository. Without those credentials, the backend cannot be deployed directly from this checkout.

When credentials are available, deploy with one of these repo-supported paths:

- Render Blueprint: use `render.yaml`, then verify `GET /health` on the `signalbridge-api` service.
- Docker host: run `docker compose up --build -d`, then verify `http://<host>:8000/health`.
- Kubernetes: adapt `infra/k8s/signalbridge.yaml`, create the database and secrets, then verify the API readiness probe.

## Verification Commands

Clean local Docker demo:

```bash
cp .env.example .env
docker compose up --build
curl http://localhost:8000/health
curl http://localhost:8000/version
```

Reset the fictional demo database without manual database editing:

```bash
docker compose run --rm api python seed.py --reset
```

The API container also runs migrations and idempotent seed data on normal startup, so a fresh database should become demo-ready without opening Postgres manually.

## Demo Fallback Order

1. Dell live demo if platform credentials and target project access are available.
2. Local Docker demo from a clean clone using `docker compose up --build`.
3. Backup recording of the Mira youth-to-worker handoff journey.
4. Screenshots of `/login`, youth chat, Signal Radar, handoff detail, supervisor load, and audit logs.

# Contributing

## Branches

- `main`: stable only
- `dev`: integration branch
- `feature/youth-chat`: youth-facing SafeNight Companion
- `feature/worker-cockpit`: worker dashboard and case management
- `feature/ai-backend`: backend, AI, safety, database
- `feature/devops`: Docker, environment, deployment

## Working Rules

1. Pull latest before starting work.
2. Build against the Mira after-hours demo journey.
3. Merge feature branches into `dev` first.
4. Do not push directly to `main`.
5. Keep commits focused and explain what changed.
6. Update `docs/api-contract.md` when API response shapes change.
7. Use fictional seed data only.
8. Do not add real WhatsApp, Instagram, or private social media integrations during the alpha.

## Pull Request Checklist

- What changed?
- How was it tested?
- Does it support the Mira journey?
- Did any API contract change?
- Is seed data still fictional?

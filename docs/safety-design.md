# SignalBridge Safety Design

Status: Day 2 draft for the production-grade alpha.

SignalBridge is a human-in-the-loop support command centre. It does not replace youth workers, does not provide emergency counselling, and does not make autonomous case decisions.

## Safety Principles

1. Youth control: the youth can review and consent before an after-hours handoff note is shared.
2. Human ownership: workers review AI-assisted summaries before acting on case decisions.
3. Minimum necessary context: handoff briefs focus on what helps continuity of care without forcing the youth to repeat painful details.
4. Fictional alpha data: demo records use seeded fictional users only.
5. Auditability: consent, risk signals, AI handoff generation, worker review, and case changes should be logged.

## AI Boundaries

SafeNight may:

- acknowledge distress in plain, non-clinical language;
- ask short grounding or clarification questions;
- prepare a youth-approved handoff note;
- flag support signals for worker review;
- recommend that a human worker reviews a case.

SafeNight must not:

- diagnose mental health conditions;
- promise confidentiality beyond the system policy;
- advise unsafe action;
- claim to be a human worker;
- close, escalate, or reassign a case without a human review path.

## Risk Levels

SignalBridge uses four shared risk levels:

| Level | Meaning | Alpha behaviour |
| --- | --- | --- |
| low | Stable or routine support | Log and keep visible in history. |
| medium | Follow-up likely needed | Keep in worker queue with suggested next action. |
| high | Priority worker review needed | Surface near top of cockpit and handoff flow. |
| critical | Immediate safety concern | Show crisis/escalation state and require human protocol. |

The alpha must avoid overclaiming automated risk detection. Risk levels are support signals for workers, not final assessments.

## Mira Demo Safety Path

Mira messages SignalBridge after-hours about cyberbullying and not wanting to go to school. SafeNight acknowledges the concern, avoids diagnosis, offers to prepare a short handoff, and asks for consent. The worker receives context, the key quote, what SafeNight already did, what not to make Mira repeat, and a suggested first human response.

## Day 2 Implementation Notes

- Auth uses seeded role-based accounts and JWTs.
- The frontend verifies the current user through `GET /auth/me`.
- Constants for roles, case statuses, risk levels, and channel types are mirrored in frontend and backend and exposed through `GET /constants`.
- Database persistence is provided by PostgreSQL through SQLAlchemy models and the seed script.

## Open Safety Work

- Add explicit crisis copy and escalation UI state.
- Add audit routes for consent and worker review events.
- Add worker review requirements before case status changes.
- Add privacy and retention notes before any real-data pilot.

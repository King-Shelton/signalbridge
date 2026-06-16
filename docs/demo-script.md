# SignalBridge Demo Story v1

## Locked Fictional Case

Mira is a fictional youth who messages SignalBridge at 11:42pm after experiencing cyberbullying in a class group chat.

Mira's message:

```text
People in my class group chat keep editing my photos. I don't want to go school tomorrow. I'm so tired of explaining this.
```

The story must stay focused on this journey. New features should support this scenario or be cut.

## Demo Promise

SignalBridge proves one thing clearly:

> The youth does not have to repeat their pain twice, and the worker does not have to start from zero.

## Flow 1: Youth After-Hours Support

Actor: Mira, using `mira@signalbridge.test`

1. Mira logs in.
2. Mira opens SafeNight Companion.
3. Mira sends the locked cyberbullying message.
4. SafeNight gives a safe first response.
5. SignalBridge detects:
   - Cyberbullying
   - School avoidance
   - Shame or embarrassment
   - After-hours support need
   - Medium/high risk
6. SafeNight asks permission to prepare a handoff note.
7. Mira consents.
8. SignalBridge generates a handoff brief.
9. Mira sees confirmation that a worker can review the note.

Important wording:

- SafeNight must not claim to be a counsellor.
- SafeNight must not diagnose Mira.
- SafeNight should explain that a human worker will review the note.

## Flow 2: Worker Morning Review

Actor: Youth worker, using `worker1@signalbridge.test`

1. Worker logs in.
2. Worker opens Worker Cockpit.
3. Mira appears at the top of Signal Radar.
4. Reasons shown:
   - After-hours message
   - Cyberbullying
   - School avoidance
   - Negative emotion spike
   - Unresolved handoff
5. Worker opens Mira's handoff brief.
6. Worker sees:
   - Main concern
   - Emotional state
   - Risk score
   - Key quote
   - What AI did
   - What not to repeat
   - Suggested first response
7. Worker marks the case as Needs Follow-Up.
8. Worker adds a case note.

Suggested worker opening:

```text
Hi Mira, I read the note you allowed SignalBridge to prepare. You don't have to repeat everything unless you want to. I'm here now. Can I first check whether you feel safe going to school today?
```

## Flow 3: Supervisor Workload

Actor: Supervisor, using `supervisor@signalbridge.test`

1. Supervisor logs in.
2. Supervisor opens Worker Load Monitor.
3. Supervisor sees Worker A has high load:
   - 7 active cases
   - 3 high-risk cases
   - 5 unresolved handoffs
4. SignalBridge recommends redistributing one medium-risk case.
5. Supervisor reassigns the case to Worker B.
6. Audit log records reassignment.

Positioning:

Worker load monitoring is for wellbeing and service continuity. It should not be presented as surveillance.

## Flow 4: Safety Audit

Actor: Supervisor or demo presenter

1. Open Safety Audit Log.
2. Show:
   - AI response generated
   - Safety check passed
   - Handoff consent received
   - Risk signal extracted
   - Handoff created
   - Worker reviewed
   - Case status updated
   - Case reassigned
3. Explain that every AI-assisted action is traceable.

## Team Ownership For Day 1

| Owner | Area | Branch |
| --- | --- | --- |
| Shelton | Product direction, API contract, demo story, repo integration, final pitch | dev / main |
| Mru | Youth SafeNight Companion and handoff consent UX | feature/youth-chat |
| Mike | Worker Cockpit, Signal Radar UI, Handoff Brief, Youth Memory Card | feature/worker-cockpit |
| Davier | FastAPI backend, AI handoff generation, risk scoring, safety, seed data, Docker | feature/ai-backend / feature/devops |

## Day 1 Done Means

- GitHub repo exists.
- README exists.
- API contract v1 exists.
- Demo story v1 exists.
- Mira case is locked.
- First seed users are agreed.
- Branch ownership is clear.
- Everyone knows which branch to work from.

# SignalBridge Q&A Preparation

Anticipated judge questions and how to answer them cleanly. Each answer is one paragraph max. Lead with the direct answer, then back it up.

---

## Product & Problem

**Q: Why does a youth worker need an AI tool? Can't they just read the message themselves?**

They can — and they do. SignalBridge does not replace the worker. The problem is the timing gap: the youth messages at 11:42pm, but the worker only starts their shift at 9am. By then, the youth has already slept, gone to school, and the moment has passed. SignalBridge holds the context overnight so the worker walks in knowing the emotional state, the risk signals, and what not to say — without having to read through a raw chat log and interpret it cold.

**Q: Why not just forward the WhatsApp message to the worker?**

Two reasons. First, raw messages don't surface structured risk signals — a worker reading "I'm so tired" needs training to identify school avoidance and shame spiral; SignalBridge surfaces that explicitly. Second, forwarding raw messages without consent violates the youth's trust. SignalBridge asks the youth's permission before preparing any note, and the worker only sees what the youth agreed to share.

**Q: How is this different from existing mental health chatbots?**

Most mental health chatbots try to be the end-point — the thing that resolves the problem. SignalBridge is explicitly not that. It is a bridge. It hands off to a human worker every time. It does not diagnose, does not treat, and does not position itself as a substitute for professional care. The AI's job is summarisation and risk flagging, not therapy.

**Q: Who is the user — the youth or the worker?**

Both, with different interfaces. The youth uses SafeNight Companion (a private, calm, after-hours chat). The worker uses the Worker Cockpit (a command centre with Signal Radar, case queue, and handoff briefs). The supervisor uses the Load Monitor. Each role sees only what they are authorised to see.

---

## AI & Safety

**Q: What happens if the AI gets it wrong?**

Two safeguards. First, the deterministic safety layer sets the risk score before any AI call. The AI can improve the wording of the handoff brief, but it cannot lower the risk score or remove a safety flag — those are hard-coded rules. Second, if the AI call fails, times out, returns malformed output, or uses prohibited clinical language, the system automatically falls back to a pre-written deterministic handoff template. The worker still gets a brief; it just won't have the AI's improved phrasing. Every AI run is recorded in `AiRun` with a `fallback_used` flag.

**Q: Can the AI ever say something harmful to the youth?**

The AI does not generate responses to the youth. SafeNight's responses to the youth are pre-scripted, deterministic messages. The AI's only output is the internal handoff brief that only the worker reads. The youth never sees AI-generated content.

**Q: How do you handle consent?**

Consent is a first-class data field. `consent_to_handoff` lives on the `Conversation` model. The handoff brief is generated only when consent is true. The consent button is visible in the chat with a clear, jargon-free explanation of what will be shared and who will read it. The youth can also revoke consent (set to false), which hides the brief from the worker queue.

**Q: Is the data stored securely?**

Yes. JWT authentication with role-based access control means each user can only access their own data. Workers cannot read other workers' cases. Youth conversation data is only visible to the assigned worker after consent. All environment credentials (JWT secret, OpenAI key, database URL) are injected at runtime via environment variables — none are in the repository.

---

## Cloud-Native Design

**Q: Why Docker? Why not just deploy the Python app directly?**

Docker gives us reproducibility and portability. The exact same container that runs locally with `docker compose up --build` is what gets deployed to Render or Kubernetes. There is no "works on my machine" problem. The Dockerfile also handles migrations and seed data on startup, so a clean deploy gives a demo-ready state without manual steps.

**Q: How does this scale?**

The API is stateless — no in-memory session state. Every request authenticates via JWT and reads from PostgreSQL. To handle more load, you increase the number of API container replicas behind a load balancer. The database is the only shared state, and PostgreSQL handles concurrent connections well. The `infra/k8s/signalbridge.yaml` manifest is the Kubernetes path for that horizontal scaling.

**Q: What is your CI/CD pipeline?**

GitHub Actions runs on every push to `main` and `dev`. The CI job runs frontend lint and build (catching TypeScript errors and ESLint violations) and the backend test suite (pytest against a SQLite test database). On passing CI, Render auto-deploys the Docker images from the `main` branch via the Blueprint defined in `render.yaml`.

**Q: What if Render is down during the demo?**

We have a four-level fallback: live Render demo → local Docker from a clean clone → backup screen recording of the full Mira journey → screenshots of each screen. The fallback plan is documented in `docs/deployment-fallback-plan.md`. We run the clean-clone test before presenting.

---

## Business & Impact

**Q: Why Singapore Children's Society specifically?**

SCS was the problem statement owner for this hackathon. But the architecture generalises to any youth social service organisation — the channel simulator supports WhatsApp, Instagram, Discord, and web chat. The consent model, role structure, and audit trail are jurisdiction-agnostic.

**Q: How would SCS actually adopt this?**

Phased. Phase 1: deploy SignalBridge alongside existing channels as a monitoring and handoff tool. Workers opt in, use it for after-hours cases, and build confidence in the handoff briefs. Phase 2: connect real messaging channels via approved platform APIs. Phase 3: expand to peer support workers and volunteers who need structured handoffs even more than full-time staff.

**Q: What is the risk of workers becoming over-reliant on the AI brief?**

Real risk, and we designed for it. The "What not to repeat" section is the most important part of the brief — it actively teaches the worker to avoid assumptions the AI made. The suggested first response is explicitly labelled as a suggestion, not a script. The audit log gives supervisors visibility into how often workers modify or override AI suggestions, which is a future dashboard metric.

**Q: Does this replace the need for after-hours crisis line workers?**

No, and we say so explicitly in the pitch. If SafeNight detects immediate crisis language (self-harm, crisis keywords), it surfaces a crisis line referral immediately — that path is deterministic and cannot be overridden by the AI. SignalBridge is not a crisis service; it handles the much larger volume of non-crisis after-hours support that currently falls through the gap.

---

## Team

**Q: How did you split the work?**

Shelton: product direction, API contract, demo story, integration, and final pitch. Mru: youth experience and SafeNight Companion UX. Mike: Worker Cockpit, Signal Radar, and handoff brief UI. Davier: FastAPI backend, AI handoff generation, safety layer, seed data, Docker, and DevOps. We worked on named feature branches and merged to `main` via pull requests — the commit history shows the separation clearly.

**Q: What would you build next if you had three more months?**

Real channel connectors (WhatsApp Business API, Instagram Graph API) replacing the simulator. A mobile-first youth interface. Supervisor analytics over time — not just current load but trend lines. Worker wellbeing check-ins built into the cockpit. And a proper consent management dashboard so youth can see and delete their data.

# SignalBridge — Presentation Script & Skit

**Total time: 8–10 minutes**
**Format: Live skit + live demo + slides**
**Team roles: Shelton (presenter/driver), Mru (Mira), Mike (Worker), Davier (Supervisor/Tech anchor)**

---

## SETUP (before judges enter)

- App is open on the intro page (Scene 0 — "SafeNight is listening")
- Clock on screen reads 11:42 PM
- Mru has phone in hand, seated or standing to one side
- Mike and Davier are seated, laptops visible but closed
- Shelton stands at the front, clicker in hand

---

## PART 1 — THE PROBLEM (1 min 30 sec)

**Shelton speaks:**

> "Before we show you SignalBridge, we want to show you what happens without it."

**[Mru looks at phone, anxious. Types slowly.]**

> "It's 11:42pm. A teenager — let's call her Mira — is sitting in her room. Her classmates have been editing her photos and sharing them in the group chat. She doesn't want to go to school tomorrow. She opens the SCS chat. She types. She sends."

**[Pause. Beat.]**

> "And then... she waits."

> "The worker's shift ended at 6pm. The duty phone is on silent. By the time anyone reads that message, it's 9am. Mira is already on the bus to school. The moment is gone."

> "This is the gap. Not a technology gap — a human capacity gap. Youth workers cannot be on call 24 hours a day. And we should not ask them to be."

> "SignalBridge doesn't try to fix that with a chatbot. It holds the gap — safely, with consent — until a human can step in."

---

## PART 2 — THE DEMO SKIT (4 min)

### Scene A: Mira's Night — SafeNight Companion

**Shelton advances to Scene 1 on the intro page (the message scene).**

**Shelton:**
> "Let's walk through Mira's journey. Mira, go ahead."

**[Mru, as Mira, steps forward and narrates while Shelton navigates to /youth/chat on screen:]**

**Mru (as Mira, casually):**
> "I'm using SafeNight — it's like a private chat that SCS made for after hours. It's not a hotline. It doesn't feel cold. I type what happened."

**[On screen: Mira's seed message is sent — "People in my class group chat keep editing my photos. I don't want to go school tomorrow. I'm so tired of explaining this."]**

**[SafeNight responds. AI typing dots appear, then the response loads.]**

**Mru:**
> "And SafeNight responds. Not with advice — just presence. It doesn't tell me what to do. It asks if I want to prepare a note for a worker."

**[Consent card appears on screen. Mru clicks "Yes, prepare a note."]**

**Mru:**
> "I click yes. And that's it. I go to sleep. I don't have to explain this again tomorrow."

**[Step back. Pause. Shelton narrates:]**

**Shelton:**
> "In the background — without waking anyone up — SignalBridge detects cyberbullying, school avoidance, after-hours risk, and an emotional spike. It scores the risk. And it prepares a structured handoff brief, only because Mira said yes."

---

### Scene B: The Worker's Morning — Worker Cockpit

**Shelton navigates to the login page, logs in as worker1@signalbridge.test. Opens the Worker Cockpit.**

**[Mike stands up, steps forward. Looks at the screen.]**

**Mike (as Worker Sarah):**
> "It's 9am. I log in. First thing I see — Mira is at the top of my Signal Radar. High risk. After-hours message. Unresolved handoff. Three signal tags."

**[Shelton scrolls to Mira's card. Clicks "Open Handoff".]**

**Mike:**
> "I open the handoff brief. And this is the part that changes everything."

**[Read from the screen — the handoff brief components:]**

> "Main concern: cyberbullying and photo editing in class group chat. Emotional state: shame, fatigue, school avoidance. Risk score: high. Key quote — in her own words — 'I'm so tired of explaining this.'"

> "What AI did: detected signals, flagged after-hours risk, prepared this brief."

> "And then — this section — 'What not to repeat.' Don't ask her to recount the incident from the start. Don't frame it as a conflict to resolve. Come in from her safety first."

> "Suggested first response: 'Hi Mira, I read the note you allowed SignalBridge to prepare. You don't have to repeat everything unless you want to. I'm here now. Can I first check whether you feel safe going to school today?'"

**Mike (stepping back):**
> "She didn't have to repeat her pain. And I didn't have to start from zero."

---

### Scene C: The Supervisor's View — Load Monitor

**Shelton logs in as supervisor@signalbridge.test. Opens the Supervisor page.**

**[Davier steps forward briefly:]**

**Davier (as Supervisor):**
> "From the supervisor side — I can see every worker's live load score. Worker A is at high pressure. Seven active cases, three high-risk. SignalBridge recommends redistributing. I open the reassignment modal — one click."

**[Shelton opens the reassignment modal, shows the two-worker comparison, clicks Confirm.]**

**Davier:**
> "The case moves. The audit log records it. Every AI action, every consent, every reassignment — traceable. This is how we keep oversight, not just efficiency."

**[Step back.]**

---

## PART 3 — ARCHITECTURE + CLOUD NATIVE (1 min 30 sec)

**Shelton (back at slides):**

> "Under the hood: Next.js frontend, FastAPI backend, PostgreSQL — all containerised with Docker. Deployed on Render in Singapore. Auto-deploys on push to main. CI runs on every pull request."

> "The AI safety layer is deterministic first. Risk is scored before any model call. The AI can improve the wording of the brief — it cannot lower a risk score or bypass consent. If OpenAI is unavailable, the system falls back to a pre-written safe template. The youth always gets a response. The worker always gets a brief."

> "We built for cloud-native design adoption: twelve-factor config, health checks on every container, a Kubernetes manifest for horizontal scaling, and an audit trail for every event."

---

## PART 4 — THE CLOSE (1 min)

**Shelton:**

> "We want to leave you with three things."

> "First — this is not a chatbot replacing a youth worker. It is a bridge that holds the gap between 11:42pm and 9am."

> "Second — consent is not a checkbox on a form. Consent is a data model. Nothing moves without it."

> "Third — AI should make human workers better at their jobs. The most important section of the handoff brief is 'What not to repeat.' That's AI teaching a worker to be more careful — not more efficient."

> "The youth does not have to repeat their pain twice. The worker does not have to start from zero."

> "That's SignalBridge."

**[Pause. Team stands together briefly.]**

---

## Q&A POSITIONING

See `docs/qna-prep.md` for full answers. For live Q&A, the one-line rule:

- Safety question → "Deterministic first. AI improves wording, never lowers risk."
- Consent question → "Consent is a database field, not a UI choice."
- Scale question → "Stateless API, PostgreSQL, Kubernetes manifest already written."
- "Why not just WhatsApp?" → "We built the channel simulator. Real connectors are Phase 2."
- "How is this different from a chatbot?" → "It's a bridge. It always hands off to a human."

---

## SKIT TIPS

**Timing:**
- Keep Mru's scene to 60–75 seconds. No longer.
- Keep Mike's handoff brief reading to 60 seconds. Pick 3 fields, not all of them.
- Davier's supervisor moment is 20 seconds — one modal, one click, step back.

**Props:**
- Mru: phone in hand (can be unlocked, doesn't matter)
- Mike and Davier: optional — a lanyard or badge to signal character

**If the live API is slow:**
- The intro page cinematic is always live (pure frontend, no API).
- If `/youth/chat` is loading slowly, narrate over the loading spinner — "This is the API waking up from sleep on the free tier."
- If the API is down, pivot to the cockpit (which has rich fallback data) and use the simulator on the supervisor page.

**The single most important line to land:**
> "The youth does not have to repeat their pain twice. The worker does not have to start from zero."

Say it slowly. It's the whole product in two sentences.

---

## SLIDE ORDER (if using slides alongside demo)

1. Problem statement — the 11:42pm gap (Mru's scene plays here)
2. What SignalBridge is not (not a chatbot, not a crisis line, not a replacement)
3. Live demo starts — intro page
4. [Demo runs through SafeNight, Cockpit, Supervisor]
5. Architecture diagram (from docs/architecture.md)
6. Cloud-native highlights: Docker, CI, Render, K8s manifest
7. Safety fallback chain diagram
8. Scoring alignment: how we hit each judging criterion
9. What's next: real channels, mobile UX, worker wellbeing metrics
10. Closing line + team photo

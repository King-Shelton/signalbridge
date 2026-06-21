# SignalBridge API Contract v1

Status: Day 1 working contract. Endpoint names and response shapes should guide implementation and be updated only when frontend and backend owners agree.

Base URL:

```text
/api
```

## Roles

- `youth`
- `worker`
- `supervisor`
- `admin`

## Seed Users

| Email | Role |
| --- | --- |
| mira@signalbridge.test | youth |
| worker1@signalbridge.test | worker |
| supervisor@signalbridge.test | supervisor |

## Auth

### POST /auth/login

Request:

```json
{
  "email": "mira@signalbridge.test",
  "password": "password"
}
```

Response:

```json
{
  "accessToken": "jwt-token",
  "user": {
    "id": "user_mira",
    "name": "Mira Tan",
    "email": "mira@signalbridge.test",
    "role": "youth"
  }
}
```

### GET /auth/me

Returns the authenticated user and role.

## Youth Conversation

### GET /youth/me

Returns the youth profile, assigned worker, preferred channel, and latest case state.

### GET /youth/conversations

Returns the authenticated youth's own conversations with message history and detected signals for frontend display.

Response:

```json
{
  "conversations": [
    {
      "id": "conv_mira_after_hours",
      "youthId": "youth_mira",
      "youthName": "Mira Tan",
      "channel": "Web Chat",
      "status": "needs_review",
      "lastMessageAt": "2026-06-16T23:42:00+08:00",
      "riskLevel": "high",
      "riskScore": 78,
      "consentToHandoff": true,
      "unresolvedHandoff": true,
      "messages": [
        {
          "id": "msg_mira_001",
          "conversationId": "conv_mira_after_hours",
          "senderType": "youth",
          "content": "People in my class group chat keep editing my photos. I don't want to go school tomorrow. I'm so tired of explaining this.",
          "safetyStatus": null,
          "createdAt": "2026-06-16T23:42:00"
        }
      ],
      "signals": [
        {
          "id": "signal_mira_cyberbullying",
          "type": "cyberbullying",
          "severity": "high",
          "reason": "Edited photos in class group chat",
          "source": "simulated_web_chat",
          "createdAt": "2026-06-16T23:42:00"
        }
      ]
    }
  ]
}
```

### POST /youth/conversations/{conversationId}/messages

Request:

```json
{
  "content": "People in my class group chat keep editing my photos. I don't want to go school tomorrow. I'm so tired of explaining this."
}
```

Response:

```json
{
  "message": {
    "id": "msg_001",
    "senderType": "youth",
    "content": "People in my class group chat keep editing my photos. I don't want to go school tomorrow. I'm so tired of explaining this.",
    "createdAt": "2026-06-16T23:42:00+08:00"
  },
  "aiReply": {
    "id": "msg_ai_001",
    "senderType": "ai",
    "content": "I'm sorry this is happening. I can stay with you for a bit and help prepare a short note for your worker so you do not have to repeat everything tomorrow.",
    "safetyStatus": "fallback_passed"
  },
  "signals": [
    {
      "type": "cyberbullying",
      "severity": "high",
      "reason": "Edited photos in class group chat"
    },
    {
      "type": "school_avoidance",
      "severity": "medium",
      "reason": "Does not want to go to school tomorrow"
    }
  ],
  "handoffRecommended": true,
  "handoffPrompt": "Would you like SignalBridge to prepare a short handoff note for your worker?"
}
```

The endpoint saves the youth message and SafeNight fallback reply to PostgreSQL, updates conversation risk state, records detected signals, and writes audit events for message creation and fallback response creation.

### POST /youth/conversations/{conversationId}/handoff-consent

Request:

```json
{
  "consentGiven": true
}
```

Response:

```json
{
  "conversationId": "conv_mira_after_hours",
  "consentToHandoff": true,
  "unresolvedHandoff": true,
  "nextAction": "generate_handoff"
}
```

## Handoff Briefs

### POST /handoffs

Creates a handoff brief from a consented conversation.

Request:

```json
{
  "conversationId": "conv_mira_after_hours"
}
```

Response:

```json
{
  "handoffBrief": {
    "id": "handoff_mira_001",
    "conversationId": "conv_mira_after_hours",
    "youthId": "youth_mira",
    "mainConcern": "Cyberbullying involving edited photos in a class group chat",
    "emotionalState": "Tired, embarrassed, and reluctant to repeat the story",
    "riskLevel": "high",
    "riskScore": 78,
    "keyQuote": "I'm so tired of explaining this.",
    "whatAiDid": "Acknowledged distress, avoided diagnosis, offered handoff preparation, and asked for consent.",
    "whatNotToRepeat": "Do not ask Mira to retell the full incident immediately unless she chooses to.",
    "suggestedWorkerResponse": "Hi Mira, I read the note you allowed SignalBridge to prepare. You don't have to repeat everything unless you want to. I'm here now. Can I first check whether you feel safe going to school today?",
    "recommendedNextStep": "Worker to check immediate school safety and agree on follow-up plan.",
    "reviewStatus": "pending"
  }
}
```

### GET /handoffs/{handoffId}

Returns one handoff brief.

### PATCH /handoffs/{handoffId}/review

Marks a handoff as reviewed or escalated.

## Worker Cockpit

### GET /worker/cockpit

Returns assigned youth conversations, priority state, suggested action, and follow-up status.
Workers receive only cases assigned to them. Supervisors and admins receive the full worker review queue.

### GET /worker/conversations/{conversationId}

Returns one visible conversation with messages, signals, youth memory context, related case state, and related handoff briefs. Writes a `worker_conversation_reviewed` audit event.

### GET /worker/handoffs/{handoffId}

Returns one visible handoff brief with conversation, youth, and case context. Marks a pending handoff as reviewed and writes a `worker_handoff_reviewed` audit event.

### GET /signals/radar

Returns prioritised signals for the current worker scope. Items are sorted with unresolved handoffs first, then by descending risk score, then by latest activity. Each item includes explanation text and signal evidence so the score is auditable rather than a black box.

Response:

```json
{
  "items": [
    {
      "youthId": "youth_mira",
      "youthName": "Mira Tan",
      "conversationId": "conv_mira_after_hours",
      "caseId": "case_mira_001",
      "riskLevel": "high",
      "riskScore": 92,
      "unresolvedHandoff": true,
      "lastActivityAt": "2026-06-21T01:42:00",
      "reasons": [
        "Cyberbullying",
        "School avoidance",
        "Unresolved handoff"
      ],
      "suggestedAction": "Review youth-approved handoff brief",
      "explanation": [
        "Risk score is 92, read from the latest visible conversation rather than inferred silently.",
        "Unresolved handoff is prioritised ahead of routine follow-up.",
        "Top signal evidence: cyberbullying (high) - Youth described edited photos being shared in a class group chat."
      ],
      "evidence": [
        {
          "label": "Cyberbullying",
          "detail": "Youth described edited photos being shared in a class group chat.",
          "severity": "high",
          "source": "safenight_rule:explicit_peer_harm",
          "createdAt": "2026-06-21T01:41:00"
        }
      ]
    }
  ]
}
```

### GET /signals/youth/{youthId}

Returns the signal history for one visible youth, including conversations, previous handoffs, and the same explainable radar summary used by `/signals/radar`.

### GET /worker/youths/{youthId}

Returns one visible youth profile with past context, stressors, preferred support style, case notes, conversations, signal history, and previous handoffs.

### POST /worker/cases/{caseId}/notes

Adds a worker note to a visible case and writes a `case_note_added` audit event.

### PATCH /worker/cases/{caseId}/status

Updates case status, priority, or next follow-up time and writes a `case_status_updated` audit event.

Worker users can update only assigned cases; supervisors and admins can update any case.

## Supervisor

### GET /supervisor/load

Returns worker load scores and recommendations.

### GET /supervisor/workers

Returns worker list and active case counts.

### PATCH /supervisor/cases/{caseId}/assign

Reassigns a case and writes an audit log entry.

## AI

All AI endpoints require `Authorization: Bearer <accessToken>`. The Day 4 alpha
uses `fallback_rule_based` mode so demos remain stable without a live AI provider.
The fallback still returns structured JSON, persists important outputs, and writes
audit events.

### POST /ai/analyse-risk

Analyses text or a stored conversation for risk signals. When `conversationId` is
provided and `persist` is true, detected signals are saved to the database and the
conversation risk state is updated.

Request:

```json
{
  "conversationId": "conv_mira_after_hours",
  "content": "People in my class group chat keep editing my photos. I don't want to go school tomorrow.",
  "persist": true
}
```

Response:

```json
{
  "conversationId": "conv_mira_after_hours",
  "riskLevel": "high",
  "riskScore": 83,
  "safetyStatus": "fallback_passed",
  "handoffRecommended": true,
  "aiMode": "fallback_rule_based",
  "signals": [
    {
      "type": "cyberbullying",
      "severity": "high",
      "reason": "Message mentions online peer harm, edited photos, group chat harassment, or bullying.",
      "source": "fallback_rule_based"
    }
  ]
}
```

### POST /ai/generate-handoff

Creates and saves a structured handoff brief from a conversation, persists fresh
risk signals, updates conversation risk, and writes an audit log.

Request:

```json
{
  "conversationId": "conv_mira_after_hours"
}
```

Response:

```json
{
  "handoffBrief": {
    "id": "handoff_generated_id",
    "conversationId": "conv_mira_after_hours",
    "youthId": "youth_mira",
    "youthName": "Mira Tan",
    "mainConcern": "Cyberbullying or online peer harm affecting school safety and emotional wellbeing.",
    "emotionalState": "Tired, distressed, or overwhelmed based on the youth's wording.",
    "riskLevel": "high",
    "riskScore": 83,
    "suggestedWorkerResponse": "Hi, I read the note you allowed SignalBridge to prepare..."
  },
  "aiMode": "fallback_rule_based"
}
```

### POST /ai/suggest-reply

Returns a worker-safe suggested first response and writes an audit log.

### POST /ai/safety-check

Checks a draft response or youth message for critical phrases. Critical results set
`blocked` to true and return `requires_immediate_human_review`.

## Safety And Audit

### GET /audit/logs

Returns AI, consent, risk, worker review, and reassignment audit events.

Example events:

- AI response generated
- Safety check passed
- Handoff consent received
- Risk signal extracted
- Handoff created
- Worker reviewed
- Case status updated
- Case reassigned

## Health

### GET /health

Returns service health.

### GET /version

Returns app version and build metadata.

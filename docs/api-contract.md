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

All seeded demo accounts use the password `password`.

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

Header:

```text
Authorization: Bearer <accessToken>
```

Response:

```json
{
  "id": "user_mira",
  "name": "Mira Tan",
  "email": "mira@signalbridge.test",
  "role": "youth"
}
```

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

### GET /worker/signal-radar

Returns prioritised signals.

Response:

```json
{
  "items": [
    {
      "youthId": "youth_mira",
      "youthName": "Mira Tan",
      "riskLevel": "high",
      "riskScore": 78,
      "reasons": [
        "After-hours message",
        "Cyberbullying",
        "School avoidance",
        "Unresolved handoff"
      ],
      "suggestedAction": "Review handoff brief"
    }
  ]
}
```

### GET /worker/youth/{youthId}/memory-card

Returns past context, stressors, preferred support style, helpful approaches, and previous handoffs.

### PATCH /cases/{caseId}

Updates case status, priority, or next follow-up time.

### POST /cases/{caseId}/notes

Adds a worker note.

## Supervisor

### GET /supervisor/load

Returns worker load scores and recommendations.

### GET /supervisor/workers

Returns worker list and active case counts.

### PATCH /supervisor/cases/{caseId}/assign

Reassigns a case and writes an audit log entry.

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

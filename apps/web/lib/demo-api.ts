import { workerYouthCases, type WorkerYouthCase } from "@/lib/worker-data";
import { type ConversationItem, type Handoff, label } from "@/lib/operations";

type DemoWorker = { id: string; name: string; email: string };
type DemoLoad = {
  workerId: string;
  workerName: string;
  activeCases: number;
  highRiskCases: number;
  unresolvedHandoffs: number;
  loadScore: number;
  pressure: string;
  recommendation: string;
};
type DemoAuditLog = {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string | null;
  actorUserId: string | null;
  details: string;
  createdAt: string;
};

type DemoConversation = ConversationItem & {
  assignedWorkerId: string;
  reviewStatus: string;
  workerNote?: string;
  workerNoteUpdatedAt?: string;
};

const workers: DemoWorker[] = [
  { id: "worker-aisha", name: "Aisha Rahman", email: "aisha.rahman@signalbridge.test" },
  { id: "worker-daniel", name: "Daniel Lim", email: "daniel.lim@signalbridge.test" },
  { id: "worker-mei", name: "Mei Chen", email: "mei.chen@signalbridge.test" },
  { id: "worker-nabil", name: "Nabil Khan", email: "nabil.khan@signalbridge.test" }
];

const workerNames = new Map(workers.map((worker) => [worker.id, worker.name]));
const assignments = new Map<string, string>([
  ["case_mira_001", "worker-aisha"],
  ["case_jay_001", "worker-mei"],
  ["case_dan_001", "worker-daniel"],
  ["case_afiq_001", "worker-aisha"],
  ["case_leanne_001", "worker-nabil"]
]);

function isoMinutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function isoHoursAgo(hours: number) {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

function apiStatusFromLabel(status: string) {
  if (status === "Needs Review") return "needs_review";
  if (status === "In Progress") return "in_progress";
  if (status === "Followed Up") return "followed_up";
  if (status === "Escalated") return "escalated";
  if (status === "Closed") return "closed";
  return "new";
}

function labelFromApiStatus(status: string) {
  if (status === "needs_review") return "Needs Review";
  if (status === "in_progress") return "In Progress";
  if (status === "followed_up") return "Followed Up";
  if (status === "escalated") return "Escalated";
  if (status === "closed") return "Closed";
  return "New";
}

function seedConversation(item: WorkerYouthCase, index: number): DemoConversation {
  const caseStatus = apiStatusFromLabel(item.status);
  const assignedWorkerId = assignments.get(item.caseId) ?? "worker-aisha";
  return {
    id: item.caseId,
    youthId: item.id,
    youthName: item.youthName,
    channel: item.channel,
    status: caseStatus,
    riskLevel: item.riskLevel,
    riskScore: item.riskScore,
    consentToHandoff: item.status !== "Closed",
    unresolvedHandoff: item.status !== "Closed" && item.status !== "Followed Up",
    lastMessageAt: isoHoursAgo(index * 5 + 1),
    suggestedAction: item.recommendedNextStep,
    case: {
      id: item.caseId,
      status: caseStatus,
      priority: item.riskLevel,
      summary: item.concern
    },
    handoffId: item.handoffId,
    signals: item.signalNotes.map((note, signalIndex) => ({
      id: `${item.caseId}-signal-${signalIndex}`,
      type: note.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      severity: item.riskLevel,
      reason: note,
      source: item.channel,
      createdAt: isoMinutesAgo(index * 12 + signalIndex * 3)
    })),
    messages: item.conversationPreview.map((turn, turnIndex) => ({
      id: `${item.caseId}-message-${turnIndex}`,
      senderType: turn.sender,
      content: turn.message,
      createdAt: isoMinutesAgo(index * 10 + (item.conversationPreview.length - turnIndex) * 2)
    })),
    assignedWorkerId,
    reviewStatus: item.status === "Closed" ? "Reviewed" : "Pending Review"
  };
}

const state = {
  conversations: workerYouthCases.map(seedConversation),
  auditLogs: [
    {
      id: "audit-001",
      eventType: "consent_recorded",
      entityType: "handoff",
      entityId: "handoff-mira-001",
      actorUserId: "demo-youth-001",
      details: JSON.stringify({ youth: "Mira Tan", consent: true }),
      createdAt: isoHoursAgo(8)
    },
    {
      id: "audit-002",
      eventType: "ai_handoff_created",
      entityType: "handoff",
      entityId: "handoff-mira-001",
      actorUserId: null,
      details: JSON.stringify({ riskLevel: "high", riskScore: 92 }),
      createdAt: isoHoursAgo(7)
    },
    {
      id: "audit-003",
      eventType: "case_assigned",
      entityType: "case",
      entityId: "case_jay_001",
      actorUserId: "demo-supervisor-001",
      details: JSON.stringify({ workerId: "worker-mei", workerName: "Mei Chen" }),
      createdAt: isoHoursAgo(5)
    }
  ] as DemoAuditLog[]
};

function cloneConversation(conversation: DemoConversation): ConversationItem {
  return JSON.parse(JSON.stringify(conversation)) as ConversationItem;
}

function findConversation(identifier: string) {
  return state.conversations.find((item) => item.case?.id === identifier || item.youthId === identifier || item.handoffId === identifier);
}

function findByHandoffId(handoffId: string) {
  return state.conversations.find((item) => item.handoffId === handoffId);
}

function pushAudit(eventType: string, entityType: string, entityId: string | null, details: Record<string, unknown>) {
  state.auditLogs.unshift({
    id: `audit-${String(state.auditLogs.length + 1).padStart(3, "0")}`,
    eventType,
    entityType,
    entityId,
    actorUserId: "demo-supervisor-001",
    details: JSON.stringify(details),
    createdAt: new Date().toISOString()
  });
}

function buildHandoff(conversation: DemoConversation): Handoff {
  const source = workerYouthCases.find((item) => item.caseId === conversation.case?.id);
  return {
    id: conversation.handoffId ?? conversation.id,
    conversationId: conversation.id,
    youthId: conversation.youthId,
    youthName: conversation.youthName,
    mainConcern: source?.concern ?? conversation.case?.summary ?? "No concern recorded.",
    emotionalState: source?.emotionalState ?? "Stable",
    riskLevel: conversation.riskLevel,
    riskScore: conversation.riskScore,
    keyQuote: source?.keyQuote ?? "",
    whatAiDid: source?.whatAiDid ?? "SignalBridge prepared a concise handoff.",
    whatNotToRepeat: source?.whatNotToRepeat ?? "Do not repeat the full story unnecessarily.",
    suggestedWorkerResponse: source?.workerResponse ?? "Start with a calm check-in.",
    recommendedNextStep: source?.recommendedNextStep ?? conversation.suggestedAction ?? "Review the case.",
    reviewStatus: conversation.reviewStatus,
    createdAt: conversation.lastMessageAt
  };
}

function buildYouth(conversation: DemoConversation) {
  const source = workerYouthCases.find((item) => item.id === conversation.youthId);
  return {
    id: conversation.youthId,
    name: conversation.youthName,
    preferredChannel: conversation.channel,
    assignedWorker: workerNames.get(conversation.assignedWorkerId),
    supportStyle: source?.supportStyle,
    stressors: source?.signalNotes.join(", "),
    cases: conversation.case
      ? [
          {
            id: conversation.case.id,
            status: conversation.case.status,
            priority: conversation.case.priority,
            summary: conversation.case.summary ?? conversation.suggestedAction ?? "Case summary unavailable"
          }
        ]
      : [],
    handoffs: [buildHandoff(conversation)],
    notes: [
      {
        id: `${conversation.id}-note-1`,
        content: conversation.suggestedAction ?? "No worker note captured yet."
      }
    ]
  };
}

function buildLoad(workerId: string): DemoLoad {
  const assigned = state.conversations.filter((item) => item.assignedWorkerId === workerId);
  const activeCases = assigned.filter((item) => item.case?.status !== "closed").length;
  const highRiskCases = assigned.filter((item) => item.riskLevel === "high" || item.riskLevel === "critical").length;
  const unresolvedHandoffs = assigned.filter((item) => item.unresolvedHandoff).length;
  const loadScore = Math.min(100, activeCases * 15 + highRiskCases * 20 + unresolvedHandoffs * 12);
  return {
    workerId,
    workerName: workerNames.get(workerId) ?? workerId,
    activeCases,
    highRiskCases,
    unresolvedHandoffs,
    loadScore,
    pressure: loadScore > 70 ? "high" : loadScore > 40 ? "medium" : "low",
    recommendation:
      loadScore > 70
        ? "Rebalance a live case before the next escalation window."
        : loadScore > 40
          ? "Keep watch, but this worker can still take one more case."
          : "Capacity is healthy; keep the current balance."
  };
}

function buildAnalytics() {
  const conversations = state.conversations;
  return {
    totalConversations: conversations.length,
    openCases: conversations.filter((item) => item.case?.status !== "closed").length,
    unresolvedHandoffs: conversations.filter((item) => item.unresolvedHandoff).length,
    highRiskConversations: conversations.filter((item) => item.riskLevel === "high" || item.riskLevel === "critical").length,
    afterHoursVolume: conversations.filter((item) => {
      const hour = new Date(item.lastMessageAt).getHours();
      return hour >= 18 || hour < 8;
    }).length,
    riskBreakdown: {
      high: conversations.filter((item) => item.riskLevel === "high").length,
      medium: conversations.filter((item) => item.riskLevel === "medium").length,
      low: conversations.filter((item) => item.riskLevel === "low").length,
      critical: conversations.filter((item) => item.riskLevel === "critical").length
    }
  };
}

function buildAudit(limit = 100) {
  return { logs: state.auditLogs.slice(0, limit) };
}

function parseBody(init: RequestInit) {
  if (!init.body || typeof init.body !== "string") {
    return null;
  }

  try {
    return JSON.parse(init.body) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function updateCaseStatus(caseId: string, status: string) {
  const conversation = findConversation(caseId);
  if (!conversation || !conversation.case) {
    return null;
  }

  const nextStatus = apiStatusFromLabel(labelFromApiStatus(status));
  conversation.case.status = nextStatus;
  conversation.status = nextStatus;
  conversation.unresolvedHandoff = nextStatus !== "closed" && nextStatus !== "followed_up";
  if (nextStatus === "escalated") {
    conversation.suggestedAction = "Supervisor review requested immediately.";
  } else if (nextStatus === "closed") {
    conversation.suggestedAction = "Close the loop and keep the note tidy.";
  }
  conversation.workerNoteUpdatedAt = new Date().toISOString();
  pushAudit("case_status_updated", "case", caseId, { status: nextStatus });
  return cloneConversation(conversation);
}

function addCaseNote(caseId: string, content: string) {
  const conversation = findConversation(caseId);
  if (!conversation) {
    return null;
  }

  conversation.workerNote = content;
  conversation.workerNoteUpdatedAt = new Date().toISOString();
  pushAudit("worker_note_saved", "case", caseId, { note: content });
  return cloneConversation(conversation);
}

function reviewHandoff(handoffId: string, status: string) {
  const conversation = findByHandoffId(handoffId);
  if (!conversation) {
    return null;
  }

  conversation.reviewStatus = label(status);
  if (conversation.reviewStatus === "Escalated" && conversation.case) {
    conversation.case.status = "escalated";
    conversation.status = "escalated";
  }
  pushAudit("handoff_review_updated", "handoff", handoffId, { status: conversation.reviewStatus });
  return buildHandoff(conversation);
}

function saveHandoffNote(handoffId: string, note: string) {
  const conversation = findByHandoffId(handoffId);
  if (!conversation) {
    return null;
  }

  conversation.workerNote = note;
  conversation.workerNoteUpdatedAt = new Date().toISOString();
  pushAudit("handoff_note_saved", "handoff", handoffId, { note });
  return buildHandoff(conversation);
}

function reassignCase(caseId: string, workerId: string) {
  const conversation = findConversation(caseId);
  if (!conversation) {
    return null;
  }

  conversation.assignedWorkerId = workerId;
  pushAudit("case_assigned", "case", caseId, { workerId, workerName: workerNames.get(workerId) ?? workerId });
  return cloneConversation(conversation);
}

function simulateIntake(body: Record<string, unknown> | null) {
  const youthId = typeof body?.youthId === "string" ? body.youthId : "";
  const message = typeof body?.message === "string" ? body.message : "";
  const lower = message.toLowerCase();
  const riskLevel = lower.includes("school") || lower.includes("photo") || lower.includes("can't") || lower.includes("cannot") ? "high" : lower.includes("worried") || lower.includes("stress") ? "medium" : "low";
  const riskScore = riskLevel === "high" ? 89 : riskLevel === "medium" ? 62 : 27;
  const conversation = state.conversations.find((item) => item.youthId === youthId);
  if (conversation && conversation.case) {
    conversation.riskLevel = riskLevel as ConversationItem["riskLevel"];
    conversation.riskScore = riskScore;
    conversation.case.priority = riskLevel;
    conversation.case.summary = message || conversation.case.summary;
    conversation.suggestedAction = riskLevel === "high" ? "Open the handoff now and keep the first reply short." : riskLevel === "medium" ? "Check in and follow up during the next contact window." : "Send a warm check-in and keep monitoring.";
    conversation.unresolvedHandoff = riskLevel !== "low";
  }
  pushAudit("simulator_intake_created", "conversation", youthId || null, { riskLevel, riskScore });
  return { riskLevel, riskScore };
}

export async function tryDemoApiResponse<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  const pathname = path.split("?")[0];
  const method = (init.method ?? "GET").toUpperCase();
  const body = parseBody(init);

  if (pathname === "/worker/cockpit") {
    return { conversations: state.conversations.map(cloneConversation) } as T;
  }

  if (pathname === "/signals/radar") {
    const items = state.conversations
      .slice()
      .sort((a, b) => {
        const rank = (level: string) => (level === "critical" ? 3 : level === "high" ? 2 : level === "medium" ? 1 : 0);
        const riskDiff = rank(b.riskLevel) - rank(a.riskLevel);
        if (riskDiff !== 0) return riskDiff;
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      });
    return { items: items.map(cloneConversation) } as T;
  }

  if (pathname === "/audit/logs") {
    const query = new URL(`http://local${path}`).searchParams;
    const limit = Number(query.get("limit") ?? "100");
    return buildAudit(Number.isFinite(limit) ? limit : 100) as T;
  }

  if (pathname === "/supervisor/load") {
    return { workers: workers.map((worker) => buildLoad(worker.id)) } as T;
  }

  if (pathname === "/supervisor/workers") {
    return { workers: workers.map((worker) => ({ ...worker })) } as T;
  }

  if (pathname === "/analytics/summary") {
    return buildAnalytics() as T;
  }

  if (pathname === "/youth/conversations") {
    const mira = state.conversations.find((item) => item.youthId === "demo-youth-001") ?? state.conversations[0];
    const demoConv = {
      id: mira?.id ?? "conv-mira-demo",
      youthName: mira?.youthName ?? "Mira Tan",
      riskLevel: mira?.riskLevel ?? "high",
      riskScore: mira?.riskScore ?? 92,
      consentToHandoff: mira?.consentToHandoff ?? false,
      messages: (mira?.messages ?? []).map((m, i) => ({
        id: m.id ?? `msg-${i}`,
        conversationId: mira?.id ?? "conv-mira-demo",
        senderType: m.senderType,
        content: m.content,
        createdAt: m.createdAt ?? new Date().toISOString()
      })),
      signals: (mira?.signals ?? []).map((s) => ({
        id: s.id,
        type: s.type,
        severity: s.severity,
        reason: s.reason,
        source: s.source,
        createdAt: s.createdAt
      }))
    };
    return { conversations: [demoConv] } as T;
  }

  const youthConvMessageMatch = pathname.match(/^\/youth\/conversations\/([^/]+)\/messages$/);
  if (youthConvMessageMatch && method === "POST") {
    const content = typeof body?.content === "string" ? body.content : "";
    const convId = youthConvMessageMatch[1];
    const mira = state.conversations.find((item) => item.id === convId) ?? state.conversations[0];
    const reply = "Thank you for sharing that. You don't have to carry this alone tonight.";
    if (mira) {
      mira.messages.push(
        { id: `msg-${Date.now()}-youth`, senderType: "youth", content, createdAt: new Date().toISOString() },
        { id: `msg-${Date.now()}-ai`, senderType: "ai", content: reply, createdAt: new Date().toISOString() }
      );
    }
    return {
      userMessage: { id: `msg-${Date.now()}`, conversationId: convId, senderType: "youth", content, createdAt: new Date().toISOString() },
      aiMessage: { id: `msg-${Date.now() + 1}`, conversationId: convId, senderType: "ai", content: reply, createdAt: new Date().toISOString() }
    } as T;
  }

  const youthConsentMatch = pathname.match(/^\/youth\/conversations\/([^/]+)\/consent$/);
  if (youthConsentMatch && method === "PATCH") {
    const convId = youthConsentMatch[1];
    const mira = state.conversations.find((item) => item.id === convId);
    if (mira) mira.consentToHandoff = true;
    return { success: true } as T;
  }

  if (pathname === "/youth/handoffs") {
    return { handoffs: state.conversations.filter((item) => item.handoffId).map((item) => buildHandoff(item)) } as T;
  }

  if (pathname === "/simulator/intake" && method === "POST") {
    return simulateIntake(body) as T;
  }

  const caseStatusMatch = pathname.match(/^\/worker\/cases\/([^/]+)\/status$/);
  if (caseStatusMatch && method === "PATCH") {
    return updateCaseStatus(caseStatusMatch[1], String(body?.status ?? body?.caseStatus ?? "new")) as T;
  }

  const caseNoteMatch = pathname.match(/^\/worker\/cases\/([^/]+)\/notes$/);
  if (caseNoteMatch && method === "POST") {
    return addCaseNote(caseNoteMatch[1], String(body?.content ?? body?.note ?? "")) as T;
  }

  const handoffMatch = pathname.match(/^\/worker\/handoffs\/([^/]+)$/);
  if (handoffMatch && method === "GET") {
    const conversation = findByHandoffId(handoffMatch[1]);
    return (conversation ? buildHandoff(conversation) : null) as T;
  }

  const handoffReviewMatch = pathname.match(/^\/worker\/handoffs\/([^/]+)\/review$/);
  if (handoffReviewMatch && method === "PATCH") {
    return reviewHandoff(handoffReviewMatch[1], String(body?.status ?? "reviewed")) as T;
  }

  const handoffNoteMatch = pathname.match(/^\/worker\/handoffs\/([^/]+)\/notes$/);
  if (handoffNoteMatch && method === "POST") {
    return saveHandoffNote(handoffNoteMatch[1], String(body?.note ?? body?.content ?? "")) as T;
  }

  const assignMatch = pathname.match(/^\/supervisor\/cases\/([^/]+)\/assign$/);
  if (assignMatch && method === "PATCH") {
    return reassignCase(assignMatch[1], String(body?.workerId ?? "")) as T;
  }

  const youthMatch = pathname.match(/^\/worker\/youths\/([^/]+)$/);
  if (youthMatch && method === "GET") {
    const conversation = state.conversations.find((item) => item.youthId === youthMatch[1]);
    return (conversation
      ? {
          ...buildYouth(conversation),
          assignedWorker: workerNames.get(conversation.assignedWorkerId)
        }
      : null) as T;
  }

  return null;
}

export function getDemoDownloadText(path: string) {
  return [
    "SignalBridge demo export",
    `Path: ${path}`,
    `Generated: ${new Date().toLocaleString("en-SG")}`,
    "",
    "This is a local fallback download used while the API stack is offline."
  ].join("\n");
}

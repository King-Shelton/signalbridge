"use client";

import { readAuthSession } from "@/lib/auth-session";
import {
  caseStatusOptions,
  getWorkerCaseByHandoffId,
  type CaseStatusLabel,
  type ChannelLabel,
  type RiskLevel,
  type WorkerYouthCase,
  workerYouthCases
} from "@/lib/worker-data";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_SIGNALBRIDGE_API_URL ?? "http://localhost:8000";

type ApiWorkerCase = {
  caseId: string;
  youthId: string;
  youthName: string;
  handoffId: string;
  channel: string;
  riskLevel: string;
  riskScore: number;
  lastActive: string | null;
  suggestedAction: string;
  caseStatus: string;
  reviewStatus: string;
  latestNote: string | null;
  latestNoteAt: string | null;
};

type ApiWorkerCaseListResponse = {
  cases: ApiWorkerCase[];
};

type ApiWorkerHandoff = {
  handoffId: string;
  caseId: string;
  youthId: string;
  youthName: string;
  channel: string;
  caseStatus: string;
  latestNote: string | null;
  latestNoteAt: string | null;
  suggestedAction: string;
  handoffBrief: {
    id: string;
    conversationId: string;
    youthId: string;
    youthName: string;
    mainConcern: string;
    emotionalState: string;
    riskLevel: string;
    riskScore: number;
    keyQuote: string | null;
    whatAiDid: string | null;
    whatNotToRepeat: string | null;
    suggestedWorkerResponse: string | null;
    recommendedNextStep: string | null;
    reviewStatus: string;
    createdAt: string;
  };
};

function authHeaders() {
  const session = readAuthSession();
  if (!session?.accessToken) {
    return {};
  }

  return { Authorization: `Bearer ${session.accessToken}` };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as
    | T
    | { detail?: string }
    | null;

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "detail" in body && body.detail
        ? body.detail
        : "SignalBridge API request failed.";
    throw new Error(message);
  }

  return body as T;
}

function normalizeCaseStatus(value: string): CaseStatusLabel {
  if (caseStatusOptions.includes(value as CaseStatusLabel)) {
    return value as CaseStatusLabel;
  }

  return "New";
}

function formatLastActive(value: string | null): string {
  if (!value) {
    return "No recent activity";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-SG", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(parsed);
}

function normalizeWorkerCase(item: ApiWorkerCase, source: WorkerYouthCase["conversationSource"]): WorkerYouthCase {
  const fallback = workerYouthCases.find((caseItem) => caseItem.caseId === item.caseId);

  return {
    id: item.youthId,
    caseId: item.caseId,
    youthName: item.youthName,
    channel: (item.channel as ChannelLabel) ?? fallback?.channel ?? "Web Chat",
    riskLevel: (item.riskLevel as RiskLevel) ?? fallback?.riskLevel ?? "low",
    riskScore: item.riskScore,
    lastActive: formatLastActive(item.lastActive ?? fallback?.lastActive ?? null),
    suggestedAction: item.suggestedAction,
    status: normalizeCaseStatus(item.caseStatus),
    handoffId: item.handoffId,
    conversationSource: source,
    workerNote: item.latestNote ?? fallback?.workerNote,
    workerNoteUpdatedAt: item.latestNoteAt ?? fallback?.workerNoteUpdatedAt,
    concern: fallback?.concern ?? item.suggestedAction,
    keyQuote: fallback?.keyQuote ?? "",
    emotionalState: fallback?.emotionalState ?? "",
    workerResponse: fallback?.workerResponse ?? item.suggestedAction,
    whatAiDid: fallback?.whatAiDid ?? "",
    whatNotToRepeat: fallback?.whatNotToRepeat ?? "",
    recommendedNextStep: fallback?.recommendedNextStep ?? item.suggestedAction,
    background: fallback?.background ?? "",
    supportStyle: fallback?.supportStyle ?? "",
    helpfulApproaches: fallback?.helpfulApproaches ?? [],
    signalNotes: fallback?.signalNotes ?? [],
    conversationPreview: fallback?.conversationPreview ?? []
  };
}

function normalizeWorkerHandoff(item: ApiWorkerHandoff): WorkerYouthCase {
  const fallback = getWorkerCaseByHandoffId(item.handoffId);
  return {
    id: item.youthId,
    caseId: item.caseId,
    youthName: item.youthName,
    channel: item.channel as ChannelLabel,
    riskLevel: item.handoffBrief.riskLevel as RiskLevel,
    riskScore: item.handoffBrief.riskScore,
    lastActive: formatLastActive(fallback?.lastActive ?? null),
    suggestedAction: item.suggestedAction,
    status: normalizeCaseStatus(item.caseStatus),
    handoffId: item.handoffId,
    conversationSource: "api-ready",
    workerNote: item.latestNote ?? fallback?.workerNote,
    workerNoteUpdatedAt: item.latestNoteAt ?? fallback?.workerNoteUpdatedAt,
    concern: item.handoffBrief.mainConcern,
    keyQuote: item.handoffBrief.keyQuote ?? fallback?.keyQuote ?? "",
    emotionalState: item.handoffBrief.emotionalState,
    workerResponse: item.handoffBrief.suggestedWorkerResponse ?? fallback?.workerResponse ?? "",
    whatAiDid: item.handoffBrief.whatAiDid ?? fallback?.whatAiDid ?? "",
    whatNotToRepeat: item.handoffBrief.whatNotToRepeat ?? fallback?.whatNotToRepeat ?? "",
    recommendedNextStep:
      item.handoffBrief.recommendedNextStep ?? fallback?.recommendedNextStep ?? item.suggestedAction,
    background: fallback?.background ?? "",
    supportStyle: fallback?.supportStyle ?? "",
    helpfulApproaches: fallback?.helpfulApproaches ?? [],
    signalNotes: fallback?.signalNotes ?? [],
    conversationPreview: fallback?.conversationPreview ?? []
  };
}

export async function fetchWorkerCases(): Promise<WorkerYouthCase[]> {
  const headers = authHeaders();
  if (!headers.Authorization) {
    return workerYouthCases;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/worker/cases`, { headers });
    const data = await parseResponse<ApiWorkerCaseListResponse>(response);
    return data.cases.map((item) => normalizeWorkerCase(item, "api-ready"));
  } catch {
    return workerYouthCases;
  }
}

export async function fetchWorkerHandoff(handoffId: string): Promise<WorkerYouthCase> {
  const headers = authHeaders();
  if (!headers.Authorization) {
    const fallback = getWorkerCaseByHandoffId(handoffId);
    if (!fallback) {
      throw new Error("Handoff brief not found.");
    }
    return fallback;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/worker/handoffs/${handoffId}`, { headers });
    const data = await parseResponse<ApiWorkerHandoff>(response);
    return normalizeWorkerHandoff(data);
  } catch {
    const fallback = getWorkerCaseByHandoffId(handoffId);
    if (!fallback) {
      throw new Error("Handoff brief not found.");
    }
    return fallback;
  }
}

export async function updateWorkerCaseStatus(caseId: string, caseStatus: CaseStatusLabel): Promise<WorkerYouthCase> {
  const headers = authHeaders();
  if (!headers.Authorization) {
    const fallback = workerYouthCases.find((item) => item.caseId === caseId);
    if (!fallback) {
      throw new Error("Case not found.");
    }
    return { ...fallback, status: caseStatus };
  }

  const response = await fetch(`${API_BASE_URL}/worker/cases/${caseId}`, {
    method: "PATCH",
    headers: {
      ...headers,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ caseStatus })
  });

  const data = await parseResponse<ApiWorkerCase>(response);
  return normalizeWorkerCase(data, "api-ready");
}

export async function saveWorkerNote(handoffId: string, note: string): Promise<WorkerYouthCase> {
  const headers = authHeaders();
  if (!headers.Authorization) {
    const fallback = getWorkerCaseByHandoffId(handoffId);
    if (!fallback) {
      throw new Error("Handoff brief not found.");
    }
    return {
      ...fallback,
      workerNote: note,
      workerNoteUpdatedAt: new Date().toISOString()
    };
  }

  const response = await fetch(`${API_BASE_URL}/worker/handoffs/${handoffId}/notes`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ note })
  });

  const data = await parseResponse<ApiWorkerHandoff>(response);
  return normalizeWorkerHandoff(data);
}

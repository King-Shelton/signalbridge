import type { AuthSession, AuthUser } from "@/lib/auth-session";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_SIGNALBRIDGE_API_URL ?? "http://localhost:8000";

async function parseApiResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as T | { detail?: string } | null;

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "detail" in body && body.detail
        ? body.detail
        : "SignalBridge API request failed.";
    throw new Error(message);
  }

  return body as T;
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  return parseApiResponse<AuthSession>(response);
}

export async function fetchCurrentUser(accessToken: string): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  return parseApiResponse<AuthUser>(response);
}

export async function fetchHealth(): Promise<{ status: string; service: string; database: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  return parseApiResponse(response);
}

export type AuditLogItem = {
  id: string;
  actorUserId: string | null;
  actorName: string | null;
  eventType: string;
  entityType: string;
  entityId: string;
  details: string | null;
  createdAt: string;
};

export async function fetchAuditLogs(accessToken: string): Promise<{ logs: AuditLogItem[] }> {
  const response = await fetch(`${API_BASE_URL}/audit/logs`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  return parseApiResponse(response);
}

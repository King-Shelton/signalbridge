import type { AuthSession, AuthUser } from "@/lib/auth-session";
import { getDemoDownloadText, tryDemoApiResponse } from "@/lib/demo-api";
import { getDemoRoleFromToken, getDemoSessionForCredentials, getDemoUserForRole, isDemoAccessToken } from "@/lib/demo-auth";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_SIGNALBRIDGE_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "/api";

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

async function tryFetchDemoResponse<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  return await tryDemoApiResponse<T>(path, init);
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { readAuthSession } = await import("@/lib/auth-session");
  const token = readAuthSession()?.accessToken;
  const headers = new Headers(init.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (isDemoAccessToken(token)) {
    const demoResponse = await tryFetchDemoResponse<T>(path, { ...init, headers });
    if (demoResponse !== null) {
      return demoResponse;
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, cache: "no-store" });
    return parseApiResponse<T>(response);
  } catch {
    const demoResponse = await tryFetchDemoResponse<T>(path, { ...init, headers });
    if (demoResponse !== null) {
      return demoResponse;
    }
    throw new Error("SignalBridge API request failed.");
  }
}

export async function downloadAuthenticated(path: string, filename: string) {
  const { readAuthSession } = await import("@/lib/auth-session");
  const token = readAuthSession()?.accessToken;

  if (isDemoAccessToken(token)) {
    const blob = new Blob([getDemoDownloadText(path)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    return;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!response.ok) {
    const blob = new Blob([getDemoDownloadText(path)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    return;
  }
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const demoSession = getDemoSessionForCredentials(email, password);
  if (demoSession) {
    return demoSession;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    return parseApiResponse<AuthSession>(response);
  } catch {
    throw new Error("Could not connect to the SignalBridge API.");
  }
}

export async function fetchCurrentUser(accessToken: string): Promise<AuthUser> {
  const demoRole = getDemoRoleFromToken(accessToken);
  if (demoRole) {
    return getDemoUserForRole(demoRole);
  }

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  return parseApiResponse<AuthUser>(response);
}

export async function fetchHealth(): Promise<{ status: string; service: string; database: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  return parseApiResponse(response);
}

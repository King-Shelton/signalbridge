import type { AuthSession, AuthUser } from "@/lib/auth-session";

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

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { readAuthSession } = await import("@/lib/auth-session");
  const token = readAuthSession()?.accessToken;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, cache: "no-store" });
  return parseApiResponse<T>(response);
}

export async function downloadAuthenticated(path: string, filename: string) {
  const { readAuthSession } = await import("@/lib/auth-session");
  const token = readAuthSession()?.accessToken;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!response.ok) throw new Error("Download failed.");
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
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

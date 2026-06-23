import type { AuthSession, AuthUser } from "@/lib/auth-session";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_SIGNALBRIDGE_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "/api";

/**
 * Thrown when the API responds with an error status. Carries the HTTP status so
 * callers can distinguish auth failures (401/403) from genuine outages.
 */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as T | { detail?: string } | null;

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "detail" in body && body.detail
        ? String(body.detail)
        : "SignalBridge API request failed.";
    throw new ApiError(message, response.status);
  }

  return body as T;
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

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, cache: "no-store" });
  } catch {
    throw new ApiError("Can't reach the SignalBridge service. Check your connection and try again.", 0);
  }
  return parseApiResponse<T>(response);
}

export async function downloadAuthenticated(path: string, filename: string) {
  const { readAuthSession } = await import("@/lib/auth-session");
  const token = readAuthSession()?.accessToken;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store"
  });
  if (!response.ok) {
    throw new ApiError("Download failed.", response.status);
  }
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function login(email: string, password: string): Promise<AuthSession> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store"
    });
  } catch {
    throw new ApiError("Can't reach the SignalBridge service. Make sure the API is running.", 0);
  }

  return parseApiResponse<AuthSession>(response);
}

export async function fetchCurrentUser(accessToken: string): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store"
  });

  return parseApiResponse<AuthUser>(response);
}

export async function fetchHealth(): Promise<{ status: string; service: string; database: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  return parseApiResponse(response);
}

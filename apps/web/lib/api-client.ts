import { clearAuthSession, type AuthSession, type AuthUser } from "@/lib/auth-session";

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

/** Statuses that mean "the API is still waking up" rather than a real failure. */
const COLD_START_STATUSES = new Set([0, 502, 503, 504]);
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1500;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

  // Render's free tier sleeps after idle; the first request can 502 while the
  // service cold-starts. Retry idempotent reads transparently so a sleeping API
  // looks "slow" rather than "broken". Mutations are only retried on a hard
  // network failure (status 0), never on a 5xx that may have already applied.
  const method = (init.method ?? "GET").toUpperCase();
  const safeToRetry = method === "GET" || method === "HEAD";

  let lastError: ApiError | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    let response: Response;
    try {
      // credentials: "include" sends the httpOnly auth cookie (same-origin /api proxy).
      response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, cache: "no-store", credentials: "include" });
    } catch {
      lastError = new ApiError("Can't reach the SignalBridge service. Check your connection and try again.", 0);
      if (attempt < MAX_RETRIES) {
        await wait(RETRY_BASE_DELAY_MS * (attempt + 1));
        continue;
      }
      throw lastError;
    }

    if (safeToRetry && COLD_START_STATUSES.has(response.status) && attempt < MAX_RETRIES) {
      await wait(RETRY_BASE_DELAY_MS * (attempt + 1));
      continue;
    }

    try {
      return await parseApiResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAuthSession();
        throw new ApiError("Your session expired. Please sign in again.", 401);
      }
      throw error;
    }
  }

  throw lastError ?? new ApiError("SignalBridge API request failed.", 0);
}

export async function downloadAuthenticated(path: string, filename: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    credentials: "include"
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
  // Login is usually the first call after the free-tier API has gone to sleep,
  // so it absorbs the cold-start 502s. Retry transparently before surfacing an error.
  let lastError: ApiError | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        cache: "no-store",
        credentials: "include"
      });
    } catch {
      lastError = new ApiError("Can't reach the SignalBridge service. Make sure the API is running.", 0);
      if (attempt < MAX_RETRIES) {
        await wait(RETRY_BASE_DELAY_MS * (attempt + 1));
        continue;
      }
      throw lastError;
    }

    if (COLD_START_STATUSES.has(response.status) && attempt < MAX_RETRIES) {
      await wait(RETRY_BASE_DELAY_MS * (attempt + 1));
      continue;
    }

    return parseApiResponse<AuthSession>(response);
  }

  throw lastError ?? new ApiError("SignalBridge API request failed.", 0);
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    cache: "no-store",
    credentials: "include"
  });

  try {
    return await parseApiResponse<AuthUser>(response);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      clearAuthSession();
      throw new ApiError("Your session expired. Please sign in again.", 401);
    }
    throw error;
  }
}

/** Clear the httpOnly auth cookie server-side, then the local session. */
export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, { method: "POST", cache: "no-store", credentials: "include" });
  } catch {
    /* best-effort — clear local state regardless */
  }
  clearAuthSession();
}

export async function fetchHealth(): Promise<{ status: string; service: string; database: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  return parseApiResponse(response);
}

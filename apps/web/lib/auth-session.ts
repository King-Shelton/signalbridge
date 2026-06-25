"use client";

import { ROLE_HOME, type Role } from "@/lib/constants";

export const AUTH_SESSION_KEY = "signalbridge.authSession";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type AuthSession = {
  accessToken: string;
  user: AuthUser;
};

const VALID_ROLES = new Set<Role>(["youth", "worker", "supervisor", "admin"]);

export function readAuthSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawSession = window.localStorage.getItem(AUTH_SESSION_KEY);
  if (!rawSession) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawSession) as Partial<AuthSession>;
    if (
      typeof parsed.accessToken !== "string" ||
      !parsed.accessToken ||
      typeof parsed.user?.id !== "string" ||
      typeof parsed.user?.name !== "string" ||
      typeof parsed.user?.email !== "string" ||
      !VALID_ROLES.has(parsed.user?.role as Role)
    ) {
      clearAuthSession();
      return null;
    }

    return parsed as AuthSession;
  } catch {
    clearAuthSession();
    return null;
  }
}

// The real JWT now lives in an httpOnly cookie (set by the backend, relayed by
// the /api proxy) so it can't be read by JavaScript. We persist only the
// non-sensitive user profile plus a sentinel token, which keeps existing
// "is the user signed in?" checks (`session.accessToken`) working without ever
// putting the JWT in JS-readable storage.
export const COOKIE_SESSION_SENTINEL = "cookie";

export function saveAuthSession(session: AuthSession) {
  const safe: AuthSession = { accessToken: COOKIE_SESSION_SENTINEL, user: session.user };
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(safe));
}

export function clearAuthSession() {
  window.localStorage.removeItem(AUTH_SESSION_KEY);
}

export function getRoleHome(role: Role) {
  return ROLE_HOME[role] ?? "/login";
}

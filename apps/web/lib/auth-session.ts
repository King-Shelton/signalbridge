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

export function saveAuthSession(session: AuthSession) {
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function clearAuthSession() {
  window.localStorage.removeItem(AUTH_SESSION_KEY);
}

export function getRoleHome(role: Role) {
  return ROLE_HOME[role] ?? "/login";
}

import type { AuthSession, AuthUser } from "@/lib/auth-session";
import { DEMO_ACCOUNTS, type Role } from "@/lib/constants";

export const DEMO_TOKEN_PREFIX = "demo:";

const DEMO_USERS: Record<Role, AuthUser> = {
  youth: {
    id: "demo-youth-001",
    name: "Mira Tan",
    email: "mira@signalbridge.test",
    role: "youth"
  },
  worker: {
    id: "demo-worker-001",
    name: "Aisha Rahman",
    email: "worker1@signalbridge.test",
    role: "worker"
  },
  supervisor: {
    id: "demo-supervisor-001",
    name: "Daniel Lim",
    email: "supervisor@signalbridge.test",
    role: "supervisor"
  },
  admin: {
    id: "demo-admin-001",
    name: "Daniel Lim",
    email: "supervisor@signalbridge.test",
    role: "admin"
  }
};

export function isDemoAccessToken(token: string | null | undefined) {
  return Boolean(token && token.startsWith(DEMO_TOKEN_PREFIX));
}

export function getDemoRoleFromToken(token: string | null | undefined): Role | null {
  if (!token || !token.startsWith(DEMO_TOKEN_PREFIX)) {
    return null;
  }

  const value = token.slice(DEMO_TOKEN_PREFIX.length);
  if (value === "admin") {
    return "admin";
  }

  if (value === "youth" || value === "worker" || value === "supervisor") {
    return value;
  }

  return null;
}

export function getDemoUserForRole(role: Role): AuthUser {
  return DEMO_USERS[role] ?? DEMO_USERS.supervisor;
}

export function getDemoSessionForRole(role: Role): AuthSession {
  return {
    accessToken: `${DEMO_TOKEN_PREFIX}${role}`,
    user: getDemoUserForRole(role)
  };
}

export function getDemoSessionForCredentials(email: string, password: string): AuthSession | null {
  if (password !== "password") {
    return null;
  }

  const account = DEMO_ACCOUNTS.find((item) => item.email.toLowerCase() === email.toLowerCase());
  return account ? getDemoSessionForRole(account.role) : null;
}

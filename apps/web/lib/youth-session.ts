import { clearAuthSession, readAuthSession, saveAuthSession } from "@/lib/auth-session";

export const YOUTH_SESSION_KEY = "signalbridge.authSession";

export type YouthSession = {
  id: string;
  name: string;
  email: string;
  role: "youth";
  accessToken?: string;
};

export const demoYouthSession: YouthSession = {
  id: "mira",
  name: "Mira Tan",
  email: "mira@signalbridge.test",
  role: "youth"
};

export function readYouthSession(): YouthSession | null {
  const session = readAuthSession();
  if (!session || session.user.role !== "youth") {
    return null;
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: "youth",
    accessToken: session.accessToken
  };
}

export function saveYouthSession(session: YouthSession) {
  if (!session.accessToken) {
    throw new Error("An access token is required to save the youth session.");
  }

  saveAuthSession({
    accessToken: session.accessToken,
    user: {
      id: session.id,
      name: session.name,
      email: session.email,
      role: session.role
    }
  });
}

export function clearYouthSession() {
  clearAuthSession();
}

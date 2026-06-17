import { clearAuthSession, readAuthSession } from "@/lib/auth-session";

export const YOUTH_SESSION_KEY = "signalbridge.authSession";

export type YouthSession = {
  id: string;
  name: string;
  email: string;
  role: "youth";
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
    role: "youth"
  };
}

export function clearYouthSession() {
  clearAuthSession();
}

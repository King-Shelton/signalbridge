export const YOUTH_SESSION_KEY = "signalbridge.youthSession";

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
  if (typeof window === "undefined") {
    return null;
  }

  const rawSession = window.localStorage.getItem(YOUTH_SESSION_KEY);
  if (!rawSession) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawSession) as Partial<YouthSession>;
    if (parsed.role !== "youth" || !parsed.name || !parsed.email) {
      return null;
    }

    return {
      id: parsed.id ?? "youth",
      name: parsed.name,
      email: parsed.email,
      role: "youth",
      accessToken: parsed.accessToken
    };
  } catch {
    return null;
  }
}

export function saveYouthSession(session: YouthSession) {
  window.localStorage.setItem(YOUTH_SESSION_KEY, JSON.stringify(session));
}

export function clearYouthSession() {
  window.localStorage.removeItem(YOUTH_SESSION_KEY);
}

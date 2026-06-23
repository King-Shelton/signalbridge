"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchCurrentUser } from "@/lib/api-client";
import {
  clearAuthSession,
  readAuthSession,
  saveAuthSession,
  type AuthSession
} from "@/lib/auth-session";
import type { Role } from "@/lib/constants";
import { StatePanel } from "@/components/StatePanel";

type RoleGateProps = {
  allowedRoles: Role[];
  children: React.ReactNode;
};

export function RoleGate({ allowedRoles, children }: RoleGateProps) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "wrong-role">("loading");

  useEffect(() => {
    const storedSession = readAuthSession();
    if (!storedSession) {
      setStatus("missing");
      return;
    }

    fetchCurrentUser(storedSession.accessToken)
      .then((user) => {
        const verifiedSession = { ...storedSession, user };
        saveAuthSession(verifiedSession);
        setSession(verifiedSession);
        setStatus(allowedRoles.includes(user.role) ? "ready" : "wrong-role");
      })
      .catch(() => {
        if (allowedRoles.includes(storedSession.user.role)) {
          setSession(storedSession);
          setStatus("ready");
          return;
        }

        clearAuthSession();
        setStatus("missing");
      });
  }, [allowedRoles]);

  if (status === "loading") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-5 sm:px-6">
        <StatePanel
          title="Checking SignalBridge session"
          description="The app is confirming your role with the backend."
          variant="loading"
        />
      </main>
    );
  }

  if (status === "missing") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-5 sm:px-6">
        <StatePanel
          title="Login needed"
          description="Please sign in before opening this SignalBridge workspace."
          actionHref="/login"
          actionLabel="Go to login"
          variant="error"
        />
      </main>
    );
  }

  if (status === "wrong-role") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-5 sm:px-6">
        <StatePanel
          title="Different role required"
          description={`${session?.user.name ?? "This account"} cannot open this workspace.`}
          actionHref="/login"
          actionLabel="Switch account"
          variant="error"
        />
      </main>
    );
  }

  return <>{children}</>;
}

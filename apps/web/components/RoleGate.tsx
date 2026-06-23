"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchCurrentUser } from "@/lib/api-client";
import {
  clearAuthSession,
  getRoleHome,
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
        clearAuthSession();
        setStatus("missing");
      });
  }, [allowedRoles]);

  // Don't strand visitors on a dead-end panel: when there's no session (e.g. the
  // intro CTAs link straight here), send them to login; when they're signed in
  // with the wrong role, send them to their own workspace.
  useEffect(() => {
    if (status === "missing") {
      router.replace("/login");
    } else if (status === "wrong-role" && session) {
      router.replace(getRoleHome(session.user.role));
    }
  }, [status, session, router]);

  if (status === "ready") {
    return <>{children}</>;
  }

  const description =
    status === "wrong-role"
      ? `Taking ${session?.user.name ?? "you"} to the right workspace...`
      : status === "missing"
        ? "Taking you to sign in..."
        : "The app is confirming your role with the backend.";

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-5 sm:px-6">
      <StatePanel title="Checking SignalBridge session" description={description} variant="loading" />
    </main>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardList, FileText, LogOut, MessageCircle } from "lucide-react";
import { StatePanel } from "@/components/StatePanel";
import { cn } from "@/components/cn";
import { clearYouthSession, readYouthSession, type YouthSession } from "@/lib/youth-session";
import { useEffect, useState } from "react";

const youthNav = [
  { href: "/youth/chat", label: "Chat", icon: MessageCircle },
  { href: "/youth/handoff-preview", label: "Handoff Preview", icon: FileText },
  { href: "/youth/past-notes", label: "Past Notes", icon: ClipboardList }
];

export function YouthDashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<YouthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setSession(readYouthSession());
    setIsLoading(false);
  }, []);

  function handleSignOut() {
    clearYouthSession();
    router.push("/login");
  }

  if (isLoading) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-5 sm:px-6">
        <StatePanel
          title="Loading youth dashboard"
          description="SignalBridge is checking the current youth session."
          variant="loading"
        />
      </main>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-5 sm:px-6">
        <StatePanel
          title="Youth login needed"
          description="Please continue as Mira before opening SafeNight Companion."
          actionHref="/login"
          actionLabel="Go to login"
          variant="error"
        />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-pine">
            SignalBridge Youth
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">SafeNight Companion</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right shadow-sm">
            <p className="text-sm font-semibold text-ink">{session.name}</p>
            <p className="text-xs text-slate-500">{session.email}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-pine hover:text-pine"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="grid flex-1 gap-5 py-5 lg:grid-cols-[220px_1fr]">
        <nav className="h-fit rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
          {youthNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
                  isActive
                    ? "bg-pine text-white"
                    : "text-slate-600 hover:bg-mist hover:text-ink"
                )}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}

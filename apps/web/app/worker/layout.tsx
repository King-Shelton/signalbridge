"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearAuthSession, readAuthSession } from "@/lib/auth-session";

const NAV = [
  {
    href: "/worker/cockpit",
    label: "Cockpit",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>
      </svg>
    ),
  },
  {
    href: "/worker/signal-radar",
    label: "Signal Radar",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"/><path d="M4 6h.01"/><path d="M2.29 9.62A10 10 0 1 0 21.31 8.35"/><path d="M16.24 7.76A6 6 0 1 0 8.23 16.67"/><path d="M12 18h.01"/><path d="M17.99 11.66A6 6 0 0 1 15.77 16.67"/><circle cx="12" cy="12" r="2"/><path d="m13.41 10.59 5.66-5.66"/>
      </svg>
    ),
  },
  {
    href: "/worker/handoffs",
    label: "Handoffs",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>
      </svg>
    ),
  },
  {
    href: "/worker/cases",
    label: "Cases",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M9 14l2 2 4-4"/>
      </svg>
    ),
  },
  {
    href: "/worker/audit",
    label: "Audit Log",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
  },
];

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name?: string } | null>(null);

  useEffect(() => {
    const session = readAuthSession();
    if (session?.user) setUser({ name: session.user.name });
  }, []);

  function handleLogout() {
    clearAuthSession();
    router.push("/login");
  }

  return (
    <div className="fixed inset-0 flex bg-[#060d0c] font-sans overflow-hidden" style={{ WebkitFontSmoothing: "antialiased" }}>
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute" style={{ top: "-20%", left: "-10%", width: "50vw", height: "50vw", background: "radial-gradient(circle, rgba(31,111,100,0.14), transparent 62%)", filter: "blur(8px)", animation: "sb-drift1 24s ease-in-out infinite" }} />
        <div className="absolute" style={{ bottom: "-18%", right: "-8%", width: "44vw", height: "44vw", background: "radial-gradient(circle, rgba(217,95,72,0.07), transparent 62%)", filter: "blur(8px)", animation: "sb-drift2 28s ease-in-out infinite" }} />
        <div className="absolute inset-0" style={{ opacity: 0.3, backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "36px 36px" }} />
      </div>

      {/* Sidebar */}
      <aside className="relative z-10 flex flex-col w-[220px] flex-shrink-0 py-6 px-4" style={{ borderRight: "1px solid rgba(255,255,255,0.08)", background: "rgba(6,13,12,0.8)" }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(160deg, #2a8576, #164b44)", boxShadow: "0 6px 18px rgba(31,111,100,0.4)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#eaf6f2" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9"/><path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5"/><circle cx="12" cy="9" r="2"/>
              <path d="M16.2 4.8c2 2 2.26 5.11.8 7.47"/><path d="M19.1 1.9a9.96 9.96 0 0 1 0 14.1"/>
              <path d="M9.5 18h5"/><path d="m8 22 4-11 4 11"/>
            </svg>
          </div>
          <div>
            <div className="text-[14px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.01em" }}>SignalBridge</div>
            <div className="text-[10.5px] text-[rgba(214,235,230,0.4)]">Worker Cockpit</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/worker/cockpit" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[11px] text-[13.5px] font-medium transition-all duration-150"
                style={{
                  background: active ? "rgba(31,111,100,0.2)" : "transparent",
                  color: active ? "#6fb8aa" : "rgba(214,235,230,0.55)",
                  border: active ? "1px solid rgba(111,184,170,0.25)" : "1px solid transparent",
                }}
              >
                <span style={{ color: active ? "#6fb8aa" : "rgba(214,235,230,0.4)" }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="mt-auto pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="px-2 mb-3">
            <div className="text-[12px] text-[rgba(214,235,230,0.4)] font-mono">Signed in as</div>
            <div className="text-[13px] font-medium text-[rgba(214,235,230,0.75)] mt-0.5 truncate">{user?.name ?? "Worker"}</div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-[10px] text-[12.5px] text-[rgba(214,235,230,0.4)] hover:text-[rgba(214,235,230,0.75)] hover:bg-white/5 transition-all duration-150"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="relative z-10 flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

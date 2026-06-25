"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Radar,
  ClipboardList,
  UsersRound,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { RoleGate } from "@/components/RoleGate";
import { readAuthSession } from "@/lib/auth-session";
import { logout } from "@/lib/api-client";

const NAV = [
  { href: "/worker/cockpit", label: "Worker Cockpit", desc: "Today's queue", Icon: LayoutDashboard },
  { href: "/worker/signal-radar", label: "Signal Radar", desc: "Prioritised cases", Icon: Radar },
  { href: "/worker/handoffs", label: "Handoffs", desc: "Briefs to review", Icon: ClipboardList },
  { href: "/worker/cases", label: "Cases", desc: "Continuity notes", Icon: UsersRound },
  { href: "/worker/audit", label: "Audit Log", desc: "Safety trail", Icon: ScrollText },
  { href: "/worker/settings", label: "Settings", desc: "Channel connections", Icon: Settings },
];

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name?: string } | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const session = readAuthSession();
    if (session?.user) setUser({ name: session.user.name });
  }, []);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  const initials = (user?.name ?? "Worker")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <RoleGate allowedRoles={["worker", "supervisor", "admin"]}>
    <div className="fixed inset-0 flex bg-[#060d0c] font-sans overflow-hidden" style={{ WebkitFontSmoothing: "antialiased" }}>
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute" style={{ top: "-20%", left: "-10%", width: "50vw", height: "50vw", background: "radial-gradient(circle, rgba(31,111,100,0.14), transparent 62%)", filter: "blur(8px)", animation: "sb-drift1 24s ease-in-out infinite" }} />
        <div className="absolute" style={{ bottom: "-18%", right: "-8%", width: "44vw", height: "44vw", background: "radial-gradient(circle, rgba(217,95,72,0.07), transparent 62%)", filter: "blur(8px)", animation: "sb-drift2 28s ease-in-out infinite" }} />
        <div className="absolute inset-0" style={{ opacity: 0.3, backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "36px 36px" }} />
      </div>

      {/* Mobile drawer backdrop */}
      {mobileNavOpen && (
        <div
          className="lg:hidden absolute inset-0 z-20 bg-black/60"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — static on desktop, an off-canvas drawer on mobile */}
      <aside
        className={`absolute lg:relative inset-y-0 left-0 z-30 flex flex-col w-[244px] flex-shrink-0 py-6 px-4 transform transition-transform duration-200 lg:translate-x-0 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ borderRight: "1px solid rgba(255,255,255,0.08)", background: "rgba(6,13,12,0.94)", backdropFilter: "blur(8px)" }}
      >
        {/* Close button (mobile only) */}
        <button
          type="button"
          onClick={() => setMobileNavOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-1.5 rounded-[9px] text-[rgba(214,235,230,0.5)] hover:bg-white/5"
          aria-label="Close menu"
        >
          <X size={18} strokeWidth={1.75} />
        </button>
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 mb-7">
          <div className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(160deg, #2a8576, #164b44)", boxShadow: "0 6px 18px rgba(31,111,100,0.4)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#eaf6f2" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9"/><path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5"/><circle cx="12" cy="9" r="2"/>
              <path d="M16.2 4.8c2 2 2.26 5.11.8 7.47"/><path d="M19.1 1.9a9.96 9.96 0 0 1 0 14.1"/>
              <path d="M9.5 18h5"/><path d="m8 22 4-11 4 11"/>
            </svg>
          </div>
          <div>
            <div className="text-[15px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.02em" }}>
              <span className="text-[#6fb8aa]">Signal</span>Bridge
            </div>
            <div className="text-[10.5px] text-[rgba(214,235,230,0.4)]">Worker Cockpit</div>
          </div>
        </div>

        <p className="px-2 mb-2.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[rgba(214,235,230,0.32)]">Workspace</p>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-1.5">
          {NAV.map(({ href, label, desc, Icon }) => {
            const active = pathname === href || (href !== "/worker/cockpit" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-2.5 py-2.5 rounded-[12px] transition-all duration-150"
                style={{
                  background: active ? "rgba(31,111,100,0.22)" : "transparent",
                  border: active ? "1px solid rgba(111,184,170,0.3)" : "1px solid transparent",
                }}
              >
                <span
                  className="w-9 h-9 flex-shrink-0 rounded-[10px] flex items-center justify-center"
                  style={{
                    background: active ? "rgba(111,184,170,0.18)" : "rgba(255,255,255,0.05)",
                    color: active ? "#6fb8aa" : "rgba(214,235,230,0.5)",
                  }}
                >
                  <Icon size={17} strokeWidth={1.75} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold" style={{ color: active ? "#f1f6f4" : "rgba(214,235,230,0.72)" }}>{label}</span>
                  <span className="block text-[11px]" style={{ color: active ? "rgba(214,235,230,0.55)" : "rgba(214,235,230,0.38)" }}>{desc}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Safety reminder */}
        <div className="mt-4 rounded-[12px] px-3 py-3" style={{ background: "rgba(183,121,31,0.12)", border: "1px solid rgba(183,121,31,0.28)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#e9c685]">Safety reminder</p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-[rgba(214,235,230,0.6)]">
            SignalBridge supports your judgement. It never replaces a human youth worker.
          </p>
        </div>

        {/* User footer */}
        <div className="mt-4 pt-4 flex items-center gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <span className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center text-[12px] font-semibold" style={{ background: "rgba(31,111,100,0.2)", color: "#6fb8aa" }}>
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-semibold text-[rgba(214,235,230,0.8)] truncate">{user?.name ?? "Worker"}</div>
            <div className="text-[11px] text-[rgba(214,235,230,0.4)]">Youth worker</div>
          </div>
          <button onClick={handleLogout} title="Sign out" className="flex-shrink-0 p-2 rounded-[9px] text-[rgba(214,235,230,0.4)] hover:text-[rgba(214,235,230,0.8)] hover:bg-white/5 transition-all duration-150">
            <LogOut size={16} strokeWidth={1.75} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(6,13,12,0.8)", backdropFilter: "blur(8px)" }}>
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="p-2 rounded-[9px] text-[rgba(214,235,230,0.7)] hover:bg-white/5"
            aria-label="Open menu"
          >
            <Menu size={18} strokeWidth={1.75} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(160deg, #2a8576, #164b44)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#eaf6f2" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9"/><path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5"/><circle cx="12" cy="9" r="2"/>
                <path d="M16.2 4.8c2 2 2.26 5.11.8 7.47"/><path d="M19.1 1.9a9.96 9.96 0 0 1 0 14.1"/>
                <path d="M9.5 18h5"/><path d="m8 22 4-11 4 11"/>
              </svg>
            </div>
            <span className="text-[14px] font-semibold text-[#f1f6f4]"><span className="text-[#6fb8aa]">Signal</span>Bridge</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
    </RoleGate>
  );
}

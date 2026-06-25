"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { RoleGate } from "@/components/RoleGate";
import { readAuthSession } from "@/lib/auth-session";
import { logout } from "@/lib/api-client";

const NAV = [
  {
    href: "/supervisor",
    label: "Team Overview",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>
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

export default function SupervisorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name?: string } | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const session = readAuthSession();
    if (session?.user) setUser({ name: session.user.name });
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <RoleGate allowedRoles={["supervisor", "admin"]}>
    <div className="fixed inset-0 flex bg-[#060d0c] font-sans overflow-hidden" style={{ WebkitFontSmoothing: "antialiased" }}>
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute" style={{ top: "-20%", left: "-10%", width: "50vw", height: "50vw", background: "radial-gradient(circle, rgba(183,121,31,0.1), transparent 62%)", filter: "blur(8px)", animation: "sb-drift1 24s ease-in-out infinite" }} />
        <div className="absolute" style={{ bottom: "-18%", right: "-8%", width: "44vw", height: "44vw", background: "radial-gradient(circle, rgba(31,111,100,0.08), transparent 62%)", filter: "blur(8px)", animation: "sb-drift2 28s ease-in-out infinite" }} />
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
        className={`absolute lg:relative inset-y-0 left-0 z-30 flex flex-col w-[220px] flex-shrink-0 py-6 px-4 transform transition-transform duration-200 lg:translate-x-0 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
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
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(160deg, #9a6318, #5a3a0e)", boxShadow: "0 6px 18px rgba(183,121,31,0.35)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fde68a" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 21a8 8 0 0 0-16 0"/><circle cx="10" cy="8" r="5"/><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"/>
            </svg>
          </div>
          <div>
            <div className="text-[14px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.01em" }}>SignalBridge</div>
            <div className="text-[10.5px] text-[rgba(214,235,230,0.4)]">Supervisor</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/supervisor" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[11px] text-[13.5px] font-medium transition-all duration-150"
                style={{
                  background: active ? "rgba(183,121,31,0.18)" : "transparent",
                  color: active ? "#e9c685" : "rgba(214,235,230,0.55)",
                  border: active ? "1px solid rgba(183,121,31,0.3)" : "1px solid transparent",
                }}
              >
                <span style={{ color: active ? "#e9c685" : "rgba(214,235,230,0.4)" }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="mt-auto pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="px-2 mb-3">
            <div className="text-[12px] text-[rgba(214,235,230,0.4)] font-mono">Signed in as</div>
            <div className="text-[13px] font-medium text-[rgba(214,235,230,0.75)] mt-0.5 truncate">{user?.name ?? "Supervisor"}</div>
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
          <span className="text-[14px] font-semibold text-[#f1f6f4]">SignalBridge <span className="text-[rgba(214,235,230,0.4)] font-normal">· Supervisor</span></span>
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
    </RoleGate>
  );
}

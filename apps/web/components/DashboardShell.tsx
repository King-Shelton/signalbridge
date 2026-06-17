"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  MoveRight,
  Radar,
  ShieldCheck,
  UsersRound
} from "lucide-react";
import { cn } from "@/components/cn";

type ShellNavIcon =
  | "cockpit"
  | "radar"
  | "handoffs"
  | "profiles"
  | "cases"
  | "overview"
  | "load"
  | "audit"
  | "reassign"
  | "signal";

type ShellNavItem = {
  href: string;
  label: string;
  icon: ShellNavIcon;
  description?: string;
};

type DashboardShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  sidebarTitle: string;
  sidebarBody: string;
  navItems: ShellNavItem[];
  children: React.ReactNode;
};

const navIcons: Record<ShellNavIcon, typeof LayoutDashboard> = {
  cockpit: LayoutDashboard,
  radar: Radar,
  handoffs: ClipboardList,
  profiles: UsersRound,
  cases: FolderKanban,
  overview: LayoutDashboard,
  load: BarChart3,
  audit: ShieldCheck,
  reassign: MoveRight,
  signal: Activity
};

export function DashboardShell({
  eyebrow,
  title,
  description,
  sidebarTitle,
  sidebarBody,
  navItems,
  children
}: DashboardShellProps) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(31,111,100,0.14),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(217,95,72,0.1),_transparent_28%),linear-gradient(180deg,_#f6fbf9_0%,_#ffffff_56%,_#f5f8fb_100%)] px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <header className="overflow-hidden rounded-[32px] border border-slate-200 bg-white/90 shadow-panel backdrop-blur">
          <div className="border-b border-slate-200/80 px-5 py-5 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pine">
              {eyebrow}
            </p>
            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                  {title}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                  {description}
                </p>
              </div>
              <div className="rounded-2xl border border-pine/15 bg-pine/5 px-4 py-3 text-sm text-slate-600">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pine">
                  Workspace focus
                </p>
                <p className="mt-1 font-medium text-ink">{sidebarTitle}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-4 lg:grid-cols-[280px_1fr] lg:p-5">
            <aside className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(31,111,100,0.08),_rgba(255,255,255,1))] p-4 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Navigation
                </p>
                <h2 className="mt-2 text-lg font-semibold text-ink">{sidebarTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{sidebarBody}</p>
              </div>

              <nav className="mt-5 grid gap-2">
                {navItems.map((item) => {
                  const Icon = navIcons[item.icon];
                  const isActive =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group rounded-2xl border px-3 py-3 transition",
                        isActive
                          ? "border-pine bg-pine text-white shadow-sm"
                          : "border-slate-200 bg-white/90 text-slate-700 hover:border-pine/30 hover:bg-mist hover:text-ink"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "grid h-10 w-10 place-items-center rounded-2xl transition",
                            isActive ? "bg-white/10" : "bg-slate-100 text-pine group-hover:bg-white"
                          )}
                        >
                          <Icon aria-hidden="true" className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{item.label}</p>
                          {item.description ? (
                            <p
                              className={cn(
                                "mt-0.5 text-xs leading-5",
                                isActive ? "text-white/80" : "text-slate-500"
                              )}
                            >
                              {item.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  SignalBridge note
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Keep this workspace tied to the Mira after-hours handoff journey:
                  priority signals, worker follow-up, and clear continuity for the next shift.
                </p>
              </div>
            </aside>

            <section className="min-w-0">{children}</section>
          </div>
        </header>
      </div>
    </main>
  );
}

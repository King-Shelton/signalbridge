import Link from "next/link";
import { Activity, ArrowRight, ClipboardCheck, ShieldCheck, UsersRound } from "lucide-react";
import { RoleGate } from "@/components/RoleGate";

const tiles = [
  { label: "Worker load", value: "1 team active", icon: UsersRound },
  { label: "Open handoffs", value: "2 pending review", icon: ClipboardCheck },
  { label: "Safety audit", value: "Seed log ready", icon: ShieldCheck },
  { label: "API status", value: "Auth connected", icon: Activity }
];

export default function SupervisorPage() {
  return (
    <RoleGate allowedRoles={["supervisor", "admin"]}>
      <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <header className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">
              Supervisor workspace
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-ink">
              Morning oversight for after-hours handoffs.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              This Day 2 shell gives supervisors a role-protected landing point
              for worker load, audit activity, and escalation review.
            </p>
          </header>

          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {tiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <article key={tile.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <Icon aria-hidden="true" className="h-5 w-5 text-pine" />
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {tile.label}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-ink">{tile.value}</p>
                </article>
              );
            })}
          </section>

          <Link
            href="/worker/cockpit"
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
          >
            Review worker cockpit
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </main>
    </RoleGate>
  );
}

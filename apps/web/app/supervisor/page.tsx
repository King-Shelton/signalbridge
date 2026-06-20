import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  ClipboardCheck,
  GitCompareArrows,
  ShieldCheck,
  UsersRound
} from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";

const tiles = [
  {
    label: "Worker load",
    value: "1 team active",
    detail: "One worker is carrying the heaviest morning queue",
    icon: UsersRound,
    tone: "pine" as const
  },
  {
    label: "Open handoffs",
    value: "2 pending review",
    detail: "Two handoffs still need supervisor visibility",
    icon: ClipboardCheck,
    tone: "amber" as const
  },
  {
    label: "Safety audit",
    value: "Seed log ready",
    detail: "Every AI-assisted action is traceable",
    icon: ShieldCheck,
    tone: "slate" as const
  },
  {
    label: "Case reassignment",
    value: "1 recommended",
    detail: "One medium-risk case should be shifted off the busiest worker",
    icon: GitCompareArrows,
    tone: "coral" as const
  }
];

export default function SupervisorPage() {
  const workerLoads = [
    { name: "Worker A", cases: "7 active", pressure: "High", nextStep: "Redistribute one medium-risk case" },
    { name: "Worker B", cases: "4 active", pressure: "Moderate", nextStep: "Keep current queue and review later" }
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">
              Supervisor workspace
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Morning oversight for after-hours handoffs.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              This matching shell gives supervisors a clean landing point for
              worker load, audit activity, and escalation review while keeping
              the same visual language as the worker cockpit.
            </p>
          </div>
          <Link
            href="/worker/cockpit"
            className="inline-flex items-center gap-2 rounded-2xl border border-pine/20 bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
          >
            Review worker cockpit
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => (
          <DashboardCard key={tile.label} {...tile} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Worker load
              </p>
              <h3 className="mt-2 text-xl font-semibold text-ink">Supervisor view</h3>
            </div>
            <p className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-slate-600">
              Same case language, different role
            </p>
          </div>

          <div className="mt-4 grid gap-3">
            {workerLoads.map((worker) => (
              <article
                key={worker.name}
                className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(247,250,252,0.96))] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-semibold text-ink">{worker.name}</h4>
                    <p className="mt-1 text-sm text-slate-500">{worker.cases}</p>
                  </div>
                  <p
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      worker.pressure === "High"
                        ? "bg-coral/10 text-coral"
                        : "bg-amber/10 text-amber"
                    }`}
                  >
                    {worker.pressure}
                  </p>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-700">{worker.nextStep}</p>
              </article>
            ))}
          </div>
        </article>

        <aside className="grid gap-5">
          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-pine/10 p-3 text-pine">
                <BarChart3 aria-hidden="true" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Decision support
                </p>
                <h3 className="text-lg font-semibold text-ink">Recommended move</h3>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Shift one medium-risk case away from the busiest worker so the
              unresolved handoffs can be cleared before the afternoon shift.
            </p>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(183,121,31,0.08),_rgba(255,255,255,1))] p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Why this matters
            </p>
            <h3 className="mt-2 text-lg font-semibold text-ink">Worker wellbeing</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              The dashboard makes overload visible early, which helps prevent
              missed follow-ups and keeps the worker from starting the day at
              full tilt.
            </p>
          </article>
        </aside>
      </section>
    </div>
  );
}

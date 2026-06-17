import Link from "next/link";
import { ArrowRight, ClipboardCheck, RotateCcw, ShieldCheck } from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
import { workerYouthCases } from "@/lib/worker-data";

const cards = [
  {
    label: "Active cases",
    value: workerYouthCases.length.toString(),
    detail: "Tracked in the follow-up queue",
    icon: ClipboardCheck,
    tone: "pine" as const
  },
  {
    label: "Needs follow-up",
    value: workerYouthCases.filter((item) => item.status === "Needs follow-up").length.toString(),
    detail: "Cases that need the next worker touchpoint",
    icon: RotateCcw,
    tone: "amber" as const
  },
  {
    label: "Closed or stable",
    value: workerYouthCases.filter((item) => item.status === "Stable" || item.status === "Logged").length.toString(),
    detail: "Cases that are already settled or logged",
    icon: ShieldCheck,
    tone: "slate" as const
  }
];

export default function WorkerCasesPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">
              Cases
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Keep follow-up status visible after the handoff is opened.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              This tracker turns the worker follow-up into a simple status lane:
              open, needs follow-up, stable, or logged.
            </p>
          </div>
          <Link
            href="/worker/handoffs"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-pine hover:text-pine"
          >
            View handoffs
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <DashboardCard key={card.label} {...card} />
        ))}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Follow-up tracker
            </p>
            <h3 className="mt-2 text-xl font-semibold text-ink">Case status list</h3>
          </div>
          <p className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-slate-600">
            Changes are visible to the whole team
          </p>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {workerYouthCases.map((youth) => (
            <article
              key={youth.id}
              className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(247,250,252,0.96))] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-lg font-semibold text-ink">{youth.youthName}</h4>
                  <p className="mt-1 text-sm text-slate-500">{youth.handoffId}</p>
                </div>
                <p
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    youth.status === "Needs follow-up"
                      ? "bg-coral/10 text-coral"
                      : youth.status === "Awaiting worker reply"
                        ? "bg-amber/10 text-amber"
                        : "bg-pine/10 text-pine"
                  }`}
                >
                  {youth.status}
                </p>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-700">{youth.suggestedAction}</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-mist px-4 py-3 text-sm leading-6 text-slate-700">
                  <span className="font-semibold text-ink">Last active:</span> {youth.lastActive}
                </div>
                <div className="rounded-2xl bg-mist px-4 py-3 text-sm leading-6 text-slate-700">
                  <span className="font-semibold text-ink">Focus:</span> {youth.concern}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

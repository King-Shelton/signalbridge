import Link from "next/link";
import { ArrowRight, Clock3, Layers3, ShieldAlert, Users } from "lucide-react";
import { channelLabels, countByRisk, workerYouthCases } from "@/lib/worker-data";

const riskStyles: Record<
  "high" | "medium" | "low",
  { label: string; className: string }
> = {
  high: {
    label: "High",
    className: "bg-coral/10 text-coral ring-1 ring-coral/20"
  },
  medium: {
    label: "Medium",
    className: "bg-amber/10 text-amber ring-1 ring-amber/20"
  },
  low: {
    label: "Low",
    className: "bg-pine/10 text-pine ring-1 ring-pine/20"
  }
};

const summaryCards = [
  {
    label: "Open youth cases",
    value: workerYouthCases.length.toString(),
    icon: Users
  },
  {
    label: "High-risk priority",
    value: countByRisk("high").toString(),
    icon: ShieldAlert
  },
  {
    label: "Medium-risk follow-ups",
    value: countByRisk("medium").toString(),
    icon: Layers3
  },
  {
    label: "After-hours review",
    value: "2 pending",
    icon: Clock3
  }
];

export default function WorkerCockpitPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(31,111,100,0.14),_transparent_34%),linear-gradient(180deg,_#f6fbf9_0%,_#ffffff_55%,_#f5f8fb_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-panel backdrop-blur">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pine">
                Worker cockpit
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Triage the day without losing the youth story.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                This wireframe keeps Mira at the top of the queue while showing
                the lighter follow-ups beside her, so the worker can move from
                signal to action quickly.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {summaryCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article
                    key={card.label}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {card.label}
                      </p>
                      <Icon aria-hidden="true" className="h-4 w-4 text-pine" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-ink">{card.value}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-panel">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Youth queue
            </h2>
          </div>

          <div className="grid gap-4 p-4 sm:p-6">
            <div className="hidden grid-cols-[1.2fr_0.9fr_0.7fr_0.9fr_1.2fr_0.7fr] gap-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 lg:grid">
              <span>Youth name</span>
              <span>Channel</span>
              <span>Risk level</span>
              <span>Last active</span>
              <span>Suggested action</span>
              <span>Status</span>
            </div>

            {workerYouthCases.map((youth) => {
              const risk = riskStyles[youth.riskLevel];
              return (
                <article
                  key={youth.id}
                  className="grid gap-3 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))] p-4 transition hover:-translate-y-0.5 hover:shadow-lg lg:grid-cols-[1.2fr_0.9fr_0.7fr_0.9fr_1.2fr_0.7fr] lg:items-center lg:gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-ink">{youth.youthName}</h3>
                      <Link
                        href={`/worker/youths/${youth.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-pine hover:text-ink"
                      >
                        View youth
                        <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                    <p className="text-sm text-slate-500">Handoff: {youth.handoffId}</p>
                  </div>
                  <p className="text-sm font-medium text-slate-700">
                    {channelLabels[youth.channel]}
                  </p>
                  <div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${risk.className}`}
                    >
                      {risk.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{youth.lastActive}</p>
                  <div className="space-y-2">
                    <p className="text-sm leading-6 text-slate-700">{youth.suggestedAction}</p>
                    <Link
                      href={`/worker/handoffs/${youth.id}`}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-pine hover:text-ink"
                    >
                      Open handoff brief
                      <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <p className="text-sm font-semibold text-ink">{youth.status}</p>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Clock3,
  FolderKanban,
  Layers3,
  MessageSquareText,
  ShieldAlert,
  Users
} from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
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

const sortedCases = [...workerYouthCases].sort((a, b) => {
  const order: Record<"high" | "medium" | "low", number> = { high: 0, medium: 1, low: 2 };
  return order[a.riskLevel] - order[b.riskLevel];
});

const summaryCards = [
  {
    label: "Open youth cases",
    value: workerYouthCases.length.toString(),
    detail: "All active cases currently in the morning queue",
    icon: Users,
    tone: "pine" as const
  },
  {
    label: "High-risk priority",
    value: countByRisk("high").toString(),
    detail: "Cases that need first attention from the worker",
    icon: ShieldAlert,
    tone: "coral" as const
  },
  {
    label: "Medium-risk follow-ups",
    value: countByRisk("medium").toString(),
    detail: "Follow-ups that should be checked after the urgent queue",
    icon: Layers3,
    tone: "amber" as const
  },
  {
    label: "After-hours review",
    value: "2 pending",
    detail: "Unresolved handoffs that need morning visibility",
    icon: Clock3,
    tone: "slate" as const
  }
];

export default function WorkerCockpitPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">
              Worker cockpit
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Triage the day without losing the youth story.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              This shell keeps Mira at the top of the queue while showing the
              lighter follow-ups beside her, so the worker can move from signal
              to action quickly.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              href="/worker/signal-radar"
              className="inline-flex items-center justify-between gap-2 rounded-2xl border border-pine/20 bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
            >
              Open Signal Radar
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link
              href="/worker/handoffs"
              className="inline-flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-pine hover:text-pine"
            >
              Review handoffs
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <DashboardCard key={card.label} {...card} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.95fr]">
        <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Youth queue
              </p>
              <h3 className="mt-2 text-xl font-semibold text-ink">
                Morning priority queue
              </h3>
            </div>
            <Link
              href="/worker/cases"
              className="inline-flex items-center gap-2 text-sm font-semibold text-pine hover:text-ink"
            >
              Open cases tracker
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-4 grid gap-4">
            {sortedCases.map((youth) => {
              const risk = riskStyles[youth.riskLevel];
              return (
                <article
                  key={youth.id}
                  className="grid gap-4 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))] p-4 transition hover:-translate-y-0.5 hover:shadow-panel lg:grid-cols-[1.2fr_0.72fr_0.72fr_1.1fr]"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-semibold text-ink">{youth.youthName}</h4>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${risk.className}`}
                      >
                        {risk.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">Handoff: {youth.handoffId}</p>
                    <p className="text-sm leading-6 text-slate-700">{youth.concern}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Channel
                    </p>
                    <p className="mt-2 text-sm font-medium text-ink">
                      {channelLabels[youth.channel]}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">{youth.lastActive}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Status
                    </p>
                    <p className="mt-2 text-sm font-semibold text-ink">{youth.status}</p>
                    <p className="mt-2 text-sm text-slate-600">{youth.suggestedAction}</p>
                  </div>
                  <div className="flex flex-col justify-between gap-3">
                    <p className="rounded-2xl bg-mist px-4 py-3 text-sm leading-6 text-slate-700">
                      <span className="font-semibold text-ink">Key quote:</span>{" "}
                      {youth.keyQuote}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/worker/handoffs/${youth.id}`}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:border-pine hover:text-pine"
                      >
                        Open brief
                        <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                      </Link>
                      <Link
                        href={`/worker/youths/${youth.id}`}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:border-pine hover:text-pine"
                      >
                        View profile
                        <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </article>

        <aside className="grid gap-5">
          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-amber/10 p-3 text-amber">
                <MessageSquareText aria-hidden="true" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Worker focus
                </p>
                <h3 className="text-lg font-semibold text-ink">Mira first response</h3>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              SignalBridge keeps the worker response concise, low-pressure, and
              grounded in the handoff brief so Mira does not need to repeat the
              full bullying story again.
            </p>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              Hi Mira, I read the note you allowed SignalBridge to prepare. You
              do not have to repeat everything unless you want to. I am here now.
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-pine/10 p-3 text-pine">
                <BarChart3 aria-hidden="true" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Quick actions
                </p>
                <h3 className="text-lg font-semibold text-ink">Todays flow</h3>
              </div>
            </div>
            <ul className="mt-4 grid gap-3">
              {[
                "Open Mira's handoff brief first.",
                "Check any unresolved after-hours notes.",
                "Review worker load before picking up medium-risk follow-ups.",
                "Move stable cases into the cases tracker."
              ].map((item) => (
                <li key={item} className="rounded-2xl bg-mist px-4 py-3 text-sm leading-6 text-slate-700">
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(31,111,100,0.08),_rgba(255,255,255,1))] p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Next lane
            </p>
            <h3 className="mt-2 text-lg font-semibold text-ink">Signal Radar</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              See the same cases sorted by urgency, signal mix, and unresolved
              handoffs.
            </p>
            <Link
              href="/worker/signal-radar"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-pine hover:text-ink"
            >
              Go to radar
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </article>
        </aside>
      </section>
    </div>
  );
}

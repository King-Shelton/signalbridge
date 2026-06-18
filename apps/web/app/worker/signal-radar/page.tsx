import Link from "next/link";
import { ArrowRight, Radar, ShieldAlert, Sparkles, UsersRound } from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
import { channelLabels, countByRisk, workerYouthCases } from "@/lib/worker-data";

const priorityOrder: Record<"high" | "medium" | "low", number> = {
  high: 0,
  medium: 1,
  low: 2
};

const radarCards = [
  {
    label: "High-priority signals",
    value: countByRisk("high").toString(),
    detail: "Signals needing the fastest worker attention",
    icon: ShieldAlert,
    tone: "coral" as const
  },
  {
    label: "Priority queue",
    value: workerYouthCases.length.toString(),
    detail: "All current cases ranked by signal mix",
    icon: Radar,
    tone: "pine" as const
  },
  {
    label: "Youth profiles",
    value: "5",
    detail: "Profiles linked to continuity notes",
    icon: UsersRound,
    tone: "slate" as const
  },
  {
    label: "Suggested actions",
    value: "5 ready",
    detail: "One action path already attached to each case",
    icon: Sparkles,
    tone: "amber" as const
  }
];

const sortedCases = [...workerYouthCases].sort((a, b) => {
  const risk = priorityOrder[a.riskLevel] - priorityOrder[b.riskLevel];
  if (risk !== 0) {
    return risk;
  }

  return a.youthName.localeCompare(b.youthName);
});

const signalChips = [
  "After-hours message",
  "Cyberbullying",
  "School avoidance",
  "Repeated late-night contact",
  "Unresolved handoff"
];

export default function WorkerSignalRadarPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">
              Signal Radar
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Prioritise the queue before it becomes noise.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              This view surfaces the same cases from the cockpit, but sorted by
              risk signals, unresolved handoffs, and urgency so the worker can
              decide what to open first.
            </p>
          </div>
          <Link
            href="/worker/cockpit"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-pine hover:text-pine"
          >
            Back to cockpit
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {radarCards.map((card) => (
          <DashboardCard key={card.label} {...card} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Ranked signals
              </p>
              <h3 className="mt-2 text-xl font-semibold text-ink">Case order</h3>
            </div>
            <p className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-slate-600">
              Highest risk first
            </p>
          </div>

          <div className="mt-4 grid gap-4">
            {sortedCases.map((youth, index) => (
              <article
                key={youth.id}
                className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(247,250,252,0.96))] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Priority {index + 1}
                    </p>
                    <h4 className="mt-1 text-lg font-semibold text-ink">{youth.youthName}</h4>
                  </div>
                  <p
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      youth.riskLevel === "high"
                        ? "bg-coral/10 text-coral"
                        : youth.riskLevel === "medium"
                          ? "bg-amber/10 text-amber"
                          : "bg-pine/10 text-pine"
                    }`}
                  >
                    {youth.riskLevel} risk
                  </p>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Signals
                    </p>
                    <ul className="mt-2 grid gap-2">
                      {[
                        `Risk score: ${youth.riskLevel === "high" ? "88" : youth.riskLevel === "medium" ? "62" : "28"}`,
                        ...youth.signalNotes
                      ].map((note) => (
                        <li
                          key={note}
                          className="rounded-2xl bg-mist px-3 py-2 text-sm leading-6 text-slate-700"
                        >
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Channel
                    </p>
                    <p className="mt-2 text-sm font-medium text-ink">
                      {channelLabels[youth.channel]}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">{youth.lastActive}</p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{youth.suggestedAction}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Next worker move
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">{youth.keyQuote}</p>
                    <Link
                      href={`/worker/handoffs/${youth.id}`}
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-pine hover:text-ink"
                    >
                      Open brief
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </article>

        <aside className="grid gap-5">
          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Signal language
            </p>
            <h3 className="mt-2 text-lg font-semibold text-ink">What the radar catches</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {signalChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-slate-200 bg-mist px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  {chip}
                </span>
              ))}
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(183,121,31,0.08),_rgba(255,255,255,1))] p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Reminder
            </p>
            <h3 className="mt-2 text-lg font-semibold text-ink">Radar supports judgement</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              The prioritisation order is just a starting point. The worker still
              decides the actual next action after reviewing the handoff brief
              and case context.
            </p>
          </article>
        </aside>
      </section>
    </div>
  );
}

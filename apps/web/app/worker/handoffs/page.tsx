import Link from "next/link";
import { ArrowRight, ClipboardList, FileText, Sparkles } from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
import { workerYouthCases } from "@/lib/worker-data";

const cards = [
  {
    label: "Open handoffs",
    value: workerYouthCases.filter((caseItem) => caseItem.status !== "Stable").length.toString(),
    detail: "Briefs that still need a worker review",
    icon: ClipboardList,
    tone: "pine" as const
  },
  {
    label: "Review ready",
    value: "1",
    detail: "Mira's handoff is ready for the morning handover",
    icon: FileText,
    tone: "amber" as const
  },
  {
    label: "Suggested responses",
    value: "5",
    detail: "Each brief has a low-pressure opening line",
    icon: Sparkles,
    tone: "slate" as const
  }
];

export default function WorkerHandoffsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">
              Handoffs
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Review the structured brief before the youth has to repeat it.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              This lane collects the AI-assisted handoff note, the worker opening
              line, and the small safety flags that matter before a follow-up.
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <DashboardCard key={card.label} {...card} />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {workerYouthCases.map((youth) => (
          <article
            key={youth.id}
            className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Handoff brief
                </p>
                <h3 className="mt-2 text-xl font-semibold text-ink">{youth.youthName}</h3>
                <p className="mt-2 text-sm text-slate-500">{youth.handoffId}</p>
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

            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl bg-mist px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Main concern
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{youth.concern}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Suggested response
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{youth.workerResponse}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Emotional state
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{youth.emotionalState}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Key quote
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{youth.keyQuote}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">Last active: {youth.lastActive}</p>
              <Link
                href={`/worker/handoffs/${youth.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-pine/20 bg-pine px-3 py-2 text-xs font-semibold text-white transition hover:bg-pine/90"
              >
                Open full brief
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
              </Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

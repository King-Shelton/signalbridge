import Link from "next/link";
import { ArrowRight, HeartHandshake, Sparkles, UsersRound } from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
import { workerYouthCases } from "@/lib/worker-data";

const profileCards = [
  {
    label: "Youth profiles",
    value: workerYouthCases.length.toString(),
    detail: "Memory cards available for the active queue",
    icon: UsersRound,
    tone: "pine" as const
  },
  {
    label: "Support style",
    value: "Low-pressure",
    detail: "Most profiles need short, calm, and practical check-ins",
    icon: HeartHandshake,
    tone: "amber" as const
  },
  {
    label: "Helpful context",
    value: "Ready",
    detail: "Background notes and preferred approaches are attached",
    icon: Sparkles,
    tone: "slate" as const
  }
];

export default function WorkerYouthProfilesPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">
              Youth profiles
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Keep the continuity notes close to the conversation.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              These cards hold the worker-facing context that helps the next
              message feel familiar, calm, and specific instead of starting from
              zero again.
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
        {profileCards.map((card) => (
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
                  Youth memory card
                </p>
                <h3 className="mt-2 text-xl font-semibold text-ink">{youth.youthName}</h3>
                <p className="mt-2 text-sm text-slate-500">{youth.supportStyle}</p>
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

            <p className="mt-4 rounded-2xl bg-mist px-4 py-3 text-sm leading-7 text-slate-700">
              {youth.background}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Helpful approaches
                </p>
                <ul className="mt-2 grid gap-2">
                  {youth.helpfulApproaches.map((item) => (
                    <li key={item} className="text-sm leading-6 text-slate-700">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-200 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Signal notes
                </p>
                <ul className="mt-2 grid gap-2">
                  {youth.signalNotes.map((item) => (
                    <li key={item} className="text-sm leading-6 text-slate-700">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">Latest quote: {youth.keyQuote}</p>
              <Link
                href={`/worker/youths/${youth.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-pine/20 bg-pine px-3 py-2 text-xs font-semibold text-white transition hover:bg-pine/90"
              >
                Open profile
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
              </Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

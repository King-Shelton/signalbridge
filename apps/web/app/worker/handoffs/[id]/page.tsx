import Link from "next/link";
import { ArrowLeft, ClipboardList, MessageSquareText, ShieldCheck } from "lucide-react";
import { getWorkerCaseById, workerYouthCases } from "@/lib/worker-data";
import { notFound } from "next/navigation";

const riskStyles: Record<
  "high" | "medium" | "low",
  { label: string; className: string }
> = {
  high: {
    label: "High risk",
    className: "bg-coral/10 text-coral ring-1 ring-coral/20"
  },
  medium: {
    label: "Medium risk",
    className: "bg-amber/10 text-amber ring-1 ring-amber/20"
  },
  low: {
    label: "Low risk",
    className: "bg-pine/10 text-pine ring-1 ring-pine/20"
  }
};

type HandoffPageProps = {
  params: { id: string };
};

export function generateStaticParams() {
  return workerYouthCases.map((youth) => ({ id: youth.id }));
}

export default function HandoffBriefPage({ params }: HandoffPageProps) {
  const youth = getWorkerCaseById(params.id);

  if (!youth) {
    notFound();
  }

  const risk = riskStyles[youth.riskLevel];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/worker/cockpit"
          className="inline-flex items-center gap-2 text-sm font-semibold text-pine hover:text-ink"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to cockpit
        </Link>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Basic handoff brief
        </p>
      </header>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-panel">
        <div className="border-b border-slate-200 px-6 py-5 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">
                Handoff brief card
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
                {youth.youthName}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Worker-ready summary with the minimum context needed to pick up
                the conversation without making the youth repeat the full story.
              </p>
            </div>
            <span
              className={`inline-flex h-fit rounded-full px-3 py-1 text-xs font-semibold ${risk.className}`}
            >
              {risk.label}
            </span>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1.25fr_0.75fr]">
          <article className="grid gap-4">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-pine/10 p-3 text-pine">
                  <ClipboardList aria-hidden="true" className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Main concern
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-ink">{youth.concern}</h2>
                </div>
              </div>
              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  ["Emotional state", youth.emotionalState],
                  ["Key quote", youth.keyQuote],
                  ["Suggested response", youth.workerResponse]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {label}
                    </dt>
                    <dd className="mt-2 text-sm leading-6 text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-[24px] border border-slate-200 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-amber/10 p-3 text-amber">
                  <MessageSquareText aria-hidden="true" className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    What not to repeat
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Keep the conversation light on repetition. Let the worker
                    reference this note instead of re-opening the full incident
                    unless the youth chooses to go there again.
                  </p>
                </div>
              </div>
            </div>
          </article>

          <aside className="grid content-start gap-4">
            <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(31,111,100,0.08),_rgba(255,255,255,1))] p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white p-3 text-pine shadow-sm">
                  <ShieldCheck aria-hidden="true" className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Status
                  </p>
                  <p className="mt-1 text-lg font-semibold text-ink">{youth.status}</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <p className="rounded-2xl bg-white/90 p-4 text-sm leading-6 text-slate-700 shadow-sm">
                  <span className="font-semibold text-ink">Suggested action:</span>{" "}
                  {youth.suggestedAction}
                </p>
                <p className="rounded-2xl bg-white/90 p-4 text-sm leading-6 text-slate-700 shadow-sm">
                  <span className="font-semibold text-ink">Last active:</span> {youth.lastActive}
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Suggested first response
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-700">{youth.workerResponse}</p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

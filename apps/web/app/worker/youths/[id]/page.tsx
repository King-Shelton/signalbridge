import Link from "next/link";
import { ArrowLeft, HeartHandshake, MessageCircleMore, Sparkles } from "lucide-react";
import { channelLabels, getWorkerCaseById, workerYouthCases } from "@/lib/worker-data";
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

type YouthPageProps = {
  params: { id: string };
};

export function generateStaticParams() {
  return workerYouthCases.map((youth) => ({ id: youth.id }));
}

export default function WorkerYouthPage({ params }: YouthPageProps) {
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
          Youth detail
        </p>
      </header>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-panel">
        <div className="grid gap-6 border-b border-slate-200 p-6 sm:p-8 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">
              Youth memory card
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
              {youth.youthName}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              A quick worker-facing snapshot of current context, preferred
              support style, and the signals that shape the next conversation.
            </p>
          </div>
          <div className="grid gap-3">
            <span
              className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${risk.className}`}
            >
              {risk.label}
            </span>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Channel
              </p>
              <p className="mt-2 text-sm font-medium text-ink">
                {channelLabels[youth.channel]}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Current status
              </p>
              <p className="mt-2 text-sm font-medium text-ink">{youth.status}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1fr_1fr]">
          <article className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-pine/10 p-3 text-pine">
                <HeartHandshake aria-hidden="true" className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-ink">Support profile</h2>
                <p className="text-sm text-slate-500">{youth.supportStyle}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-700">{youth.background}</p>
            <div className="mt-5">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Helpful approaches
              </h3>
              <ul className="mt-3 grid gap-2">
                {youth.helpfulApproaches.map((item) => (
                  <li
                    key={item}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </article>

          <article className="rounded-[24px] border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-amber/10 p-3 text-amber">
                <Sparkles aria-hidden="true" className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-ink">Signal notes</h2>
                <p className="text-sm text-slate-500">What the cockpit is reacting to</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {youth.signalNotes.map((note) => (
                <div
                  key={note}
                  className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
                >
                  {note}
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-pine/15 bg-pine/5 p-4">
              <div className="flex items-center gap-3">
                <MessageCircleMore aria-hidden="true" className="h-5 w-5 text-pine" />
                <h3 className="text-sm font-semibold text-ink">Suggested worker line</h3>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-700">{youth.workerResponse}</p>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

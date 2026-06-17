import { CheckCircle2, FileText, ShieldCheck } from "lucide-react";

type HandoffConsentCardProps = {
  compact?: boolean;
};

export function HandoffConsentCard({ compact = false }: HandoffConsentCardProps) {
  return (
    <section className="rounded-lg border border-pine/20 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-pine/10 p-2 text-pine">
          <ShieldCheck aria-hidden="true" className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-ink">
            Share a short handoff note with your worker?
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Mira stays in control. The note only includes what helps the worker
            understand the situation without asking her to repeat everything.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-slate-600">
        <div className="flex gap-2">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 text-pine" />
          Cyberbullying and school worry context
        </div>
        <div className="flex gap-2">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 text-pine" />
          What SafeNight already said
        </div>
        <div className="flex gap-2">
          <FileText aria-hidden="true" className="mt-0.5 h-4 w-4 text-pine" />
          A suggested first response for the worker
        </div>
      </div>
      {!compact ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-lg bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90">
            Allow handoff note
          </button>
          <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300">
            Not now
          </button>
        </div>
      ) : null}
    </section>
  );
}

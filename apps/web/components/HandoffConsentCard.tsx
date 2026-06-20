"use client";

import { CheckCircle2, FileText, ShieldCheck } from "lucide-react";

type HandoffConsentCardProps = {
  compact?: boolean;
  consentGiven?: boolean;
  disabled?: boolean;
  onConsentChange?: (consentGiven: boolean) => void;
};

export function HandoffConsentCard({
  compact = false,
  consentGiven = false,
  disabled = false,
  onConsentChange
}: HandoffConsentCardProps) {
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
      <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-slate-200 bg-mist/40 px-3 py-2">
        <span>
          <span className="block text-sm font-semibold text-ink">Allow handoff note</span>
          <span className="block text-xs leading-5 text-slate-500">
            Share the prepared note with Mira&apos;s assigned youth worker.
          </span>
        </span>
        <input
          type="checkbox"
          checked={consentGiven}
          disabled={disabled}
          onChange={(event) => onConsentChange?.(event.target.checked)}
          className="h-5 w-5 rounded border-slate-300 text-pine focus:ring-pine"
        />
      </label>
      {consentGiven ? (
        <p className="mt-3 rounded-lg border border-pine/20 bg-pine/10 px-3 py-2 text-sm font-medium text-pine">
          Handoff consent saved. SafeNight will prepare a note for the worker to review.
        </p>
      ) : null}
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
          <button
            type="button"
            disabled={disabled || consentGiven}
            onClick={() => onConsentChange?.(true)}
            className="rounded-lg bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {consentGiven ? "Consent saved" : "Allow handoff note"}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onConsentChange?.(false)}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:bg-slate-50"
          >
            Not now
          </button>
        </div>
      ) : null}
    </section>
  );
}

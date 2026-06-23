"use client";

import { CheckCircle2, FileText, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/components/cn";

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
            Let your worker read a short note?
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            You choose what gets shared. The note is only to help your worker
            understand what happened without asking you to explain it all again.
          </p>
        </div>
      </div>
      <label
        className={cn(
          "mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-slate-200 bg-mist/40 px-3 py-2 transition",
          disabled && "cursor-not-allowed opacity-70"
        )}
      >
        <span>
          <span className="block text-sm font-semibold text-ink">
            I allow my worker to review this note
          </span>
          <span className="mt-0.5 block text-xs leading-5 text-slate-500">
            You can still choose what to talk about tomorrow.
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
          Consent saved. Your worker can review the note, and you do not have to repeat everything unless you want to.
        </p>
      ) : (
        <p className="mt-3 rounded-lg border border-amber/30 bg-amber/10 px-3 py-2 text-sm font-medium text-amber">
          Not shared yet. Your worker cannot review this note until you allow it.
        </p>
      )}
      <div className="mt-4 grid gap-2 text-sm text-slate-600">
        <div className="flex gap-2">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 text-pine" />
          What happened and what feels hard right now
        </div>
        <div className="flex gap-2">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 text-pine" />
          What SafeNight already replied
        </div>
        <div className="flex gap-2">
          <FileText aria-hidden="true" className="mt-0.5 h-4 w-4 text-pine" />
          A gentle first message your worker can start with
        </div>
      </div>
      {!compact ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled || consentGiven}
            onClick={() => onConsentChange?.(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90 focus:outline-none focus:ring-2 focus:ring-pine/20 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {disabled && !consentGiven ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : null}
            {consentGiven ? "Worker review allowed" : "Allow worker review"}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onConsentChange?.(false)}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-pine/20 disabled:cursor-not-allowed disabled:bg-slate-50"
          >
            Not now
          </button>
        </div>
      ) : null}
    </section>
  );
}

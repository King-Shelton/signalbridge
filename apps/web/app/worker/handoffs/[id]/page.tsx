"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Loader2,
  MessageSquare,
  PencilLine,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { fetchWorkerHandoff, saveWorkerNote, updateWorkerCaseStatus } from "@/lib/worker-api";
import { caseStatusOptions, type CaseStatusLabel, type WorkerYouthCase } from "@/lib/worker-data";

const riskStyles: Record<
  WorkerYouthCase["riskLevel"],
  {
    label: string;
    badgeClassName: string;
    panelClassName: string;
    glowClassName: string;
    accentClassName: string;
    surfaceClassName: string;
    caption: string;
  }
> = {
  high: {
    label: "High risk",
    badgeClassName: "bg-coral/15 text-coral ring-1 ring-coral/20",
    panelClassName: "from-coral/20 via-white to-white",
    glowClassName: "shadow-[0_24px_70px_rgba(217,95,72,0.18)]",
    accentClassName: "bg-coral",
    surfaceClassName: "border-coral/15 bg-coral/5",
    caption: "Immediate worker attention"
  },
  medium: {
    label: "Medium risk",
    badgeClassName: "bg-amber/15 text-amber ring-1 ring-amber/20",
    panelClassName: "from-amber/20 via-white to-white",
    glowClassName: "shadow-[0_24px_70px_rgba(203,138,0,0.16)]",
    accentClassName: "bg-amber",
    surfaceClassName: "border-amber/15 bg-amber/5",
    caption: "Check context and next contact"
  },
  low: {
    label: "Low risk",
    badgeClassName: "bg-pine/15 text-pine ring-1 ring-pine/20",
    panelClassName: "from-pine/15 via-white to-white",
    glowClassName: "shadow-[0_24px_70px_rgba(31,111,100,0.16)]",
    accentClassName: "bg-pine",
    surfaceClassName: "border-pine/15 bg-pine/5",
    caption: "Low risk, keep the note light"
  }
};

const caseStatusStyles: Record<CaseStatusLabel, string> = {
  New: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  "Needs Review": "bg-amber/10 text-amber ring-1 ring-amber/20",
  "In Progress": "bg-pine/10 text-pine ring-1 ring-pine/20",
  "Followed Up": "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  Escalated: "bg-coral/10 text-coral ring-1 ring-coral/20",
  Closed: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
};

type HandoffPageProps = {
  params: { id: string };
};

export default function HandoffBriefPage({ params }: HandoffPageProps) {
  const [handoff, setHandoff] = useState<WorkerYouthCase | null>(null);
  const [draftStatus, setDraftStatus] = useState<CaseStatusLabel>("New");
  const [workerNote, setWorkerNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadHandoff() {
      setIsLoading(true);
      setError("");

      try {
        const data = await fetchWorkerHandoff(params.id);
        if (mounted) {
          setHandoff(data);
          setDraftStatus(data.status);
          setWorkerNote(data.workerNote ?? "");
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "Handoff brief could not load.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadHandoff();

    return () => {
      mounted = false;
    };
  }, [params.id]);

  async function saveStatus() {
    if (!handoff) {
      return;
    }

    setIsSavingStatus(true);
    setError("");
    try {
      const updated = await updateWorkerCaseStatus(handoff.caseId, draftStatus);
      setHandoff(updated);
      setDraftStatus(updated.status);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Case status could not be saved.");
    } finally {
      setIsSavingStatus(false);
    }
  }

  async function saveNote() {
    if (!handoff) {
      return;
    }

    const trimmedNote = workerNote.trim();
    if (!trimmedNote) {
      setError("Write a note before saving it.");
      return;
    }

    setIsSavingNote(true);
    setError("");
    try {
      const updated = await saveWorkerNote(handoff.handoffId, trimmedNote);
      setHandoff(updated);
      setWorkerNote(updated.workerNote ?? trimmedNote);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Worker note could not be saved.");
    } finally {
      setIsSavingNote(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-[28px] border border-slate-200 bg-white px-6 py-12 shadow-sm">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-pine" />
          Loading the handoff brief...
        </div>
      </div>
    );
  }

  if (!handoff) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-12 shadow-sm">
        <p className="text-sm font-medium text-slate-600">{error || "Handoff brief not found."}</p>
        <Link
          href="/worker/cockpit"
          className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-ink transition hover:border-pine hover:text-pine"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to cockpit
        </Link>
      </div>
    );
  }

  const risk = riskStyles[handoff.riskLevel];
  const riskProgress = `${Math.min(handoff.riskScore, 100)}%`;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(31,111,100,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(217,95,72,0.14),_transparent_24%),linear-gradient(180deg,_#f3fbf8_0%,_#ffffff_48%,_#f5f8fb_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/worker/cockpit"
            className="inline-flex items-center gap-2 text-sm font-semibold text-pine transition hover:text-ink"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to cockpit
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Emotional handoff moment
          </p>
        </header>

        {error ? (
          <p className="flex items-center gap-2 rounded-2xl border border-coral/20 bg-coral/10 px-4 py-3 text-sm font-medium text-coral">
            <AlertTriangle aria-hidden="true" className="h-4 w-4" />
            {error}
          </p>
        ) : null}

        <section className="overflow-hidden rounded-[36px] border border-white/70 bg-white/80 shadow-[0_24px_90px_rgba(15,23,42,0.12)] backdrop-blur">
          <div
            className={`relative isolate overflow-hidden border-b border-slate-200/80 bg-gradient-to-br ${risk.panelClassName} px-6 py-6 sm:px-8 sm:py-7`}
          >
            <div className="absolute -right-16 top-0 h-40 w-40 rounded-full bg-white/40 blur-3xl" />
            <div className="absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-white/40 blur-3xl" />

            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pine">
                  Handoff brief detail
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl lg:text-5xl">
                  {handoff.youthName}
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                  This screen compresses the emotional story into a worker-ready brief so the next
                  shift can respond with context, care, and without making the youth start from
                  zero.
                </p>
              </div>

              <div
                className={`rounded-full px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] ${risk.badgeClassName}`}
              >
                {risk.label}
              </div>
            </div>

            <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Status
                </p>
                <p className="mt-2 text-lg font-semibold text-ink">{handoff.status}</p>
              </div>
              <div className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Last active
                </p>
                <p className="mt-2 text-lg font-semibold text-ink">{handoff.lastActive}</p>
              </div>
              <div className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Suggested action
                </p>
                <p className="mt-2 text-lg font-semibold text-ink">{handoff.suggestedAction}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-4 sm:p-6 xl:grid-cols-[1.1fr_0.9fr]">
            <article className="grid gap-5">
              <section className="rounded-[30px] border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      What the worker needs to know first
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                      Main concern
                    </h2>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <AlertTriangle aria-hidden="true" className="h-4 w-4 text-amber" />
                    {risk.caption}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                  <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Brief summary
                    </p>
                    <p className="mt-3 text-xl font-semibold leading-8 text-ink sm:text-2xl">
                      {handoff.concern}
                    </p>
                    <p className="mt-4 text-sm leading-7 text-slate-600">
                      This is the shortest honest summary of the incident so the worker can open
                      calmly and move straight to support.
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {handoff.signalNotes.map((note) => (
                        <span
                          key={note}
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                        >
                          {note}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,_#131f2b_0%,_#243042_100%)] p-5 text-white shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/65">
                      Key quote
                    </p>
                    <p className="mt-4 text-2xl font-semibold leading-9">{handoff.keyQuote}</p>
                    <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/65">
                        What not to repeat
                      </p>
                      <p className="mt-2 text-sm leading-6 text-white/85">
                        {handoff.whatNotToRepeat}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[30px] border border-slate-200 bg-white p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-pine/10 p-3 text-pine">
                    <Sparkles aria-hidden="true" className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      What AI did
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-ink">
                      Structured the messy conversation into a safe brief
                    </h2>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">{handoff.whatAiDid}</p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className={`rounded-[24px] border p-4 ${risk.surfaceClassName}`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Suggested first response
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-700">
                      {handoff.workerResponse}
                    </p>
                  </div>
                  <div className={`rounded-[24px] border p-4 ${risk.surfaceClassName}`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Recommended next step
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-700">
                      {handoff.recommendedNextStep}
                    </p>
                  </div>
                </div>
              </section>
            </article>

            <aside className="grid content-start gap-5">
              <section
                className={`rounded-[30px] border bg-[linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(255,255,255,0.78))] p-5 sm:p-6 ${risk.glowClassName} ${risk.surfaceClassName}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Risk score
                    </p>
                    <div className="mt-3 flex items-end gap-3">
                      <p className="text-5xl font-semibold tracking-tight text-ink">
                        {handoff.riskScore}
                      </p>
                      <p className="pb-1 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                        / 100
                      </p>
                    </div>
                  </div>
                  <div className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${risk.badgeClassName}`}>
                    {risk.label}
                  </div>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${risk.accentClassName}`} style={{ width: riskProgress }} />
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  The score is meant to cue attention, not replace judgment. It gives the worker a
                  fast sense of urgency before opening the full brief.
                </p>
              </section>

              <section className="rounded-[30px] border border-slate-200 bg-white p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-amber/10 p-3 text-amber">
                    <ShieldCheck aria-hidden="true" className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Worker opening
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-ink">
                      Suggested first response
                    </h2>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-700">{handoff.workerResponse}</p>
                <div className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <ArrowUpRight aria-hidden="true" className="h-4 w-4 text-pine" />
                  Lead with care, not repetition
                </div>
              </section>

              <section className="rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(31,111,100,0.08),_rgba(255,255,255,1))] p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Case status update
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <MessageSquare aria-hidden="true" className="h-4 w-4 text-pine" />
                  Current status
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${caseStatusStyles[handoff.status]}`}>
                    {handoff.status}
                  </span>
                </div>

                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Update case status
                  </label>
                  <select
                    value={draftStatus}
                    onChange={(event) => setDraftStatus(event.target.value as CaseStatusLabel)}
                    className="mt-3 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine"
                  >
                    {caseStatusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={saveStatus}
                    disabled={isSavingStatus}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isSavingStatus ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
                    Save status
                  </button>
                </div>
              </section>

              <section className="rounded-[30px] border border-slate-200 bg-white p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-pine/10 p-3 text-pine">
                    <PencilLine aria-hidden="true" className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Worker notes
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-ink">Save a follow-up note</h2>
                  </div>
                </div>

                <textarea
                  value={workerNote}
                  onChange={(event) => setWorkerNote(event.target.value)}
                  placeholder="Add what you want to remember before the next shift..."
                  rows={5}
                  className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-slate-400 focus:border-pine"
                />

                <button
                  type="button"
                  onClick={saveNote}
                  disabled={isSavingNote}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-pine/20 bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isSavingNote ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
                  Save note
                </button>

                {handoff.workerNote ? (
                  <div className="mt-4 rounded-2xl border border-pine/15 bg-pine/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">
                      Latest saved note
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{handoff.workerNote}</p>
                  </div>
                ) : null}
              </section>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

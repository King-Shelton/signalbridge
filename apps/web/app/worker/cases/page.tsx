"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2, RotateCcw, ShieldCheck, ClipboardCheck } from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
import { fetchWorkerCases, updateWorkerCaseStatus } from "@/lib/worker-api";
import { caseStatusOptions, type CaseStatusLabel, type WorkerYouthCase } from "@/lib/worker-data";

const statusStyles: Record<CaseStatusLabel, string> = {
  New: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  "Needs Review": "bg-amber/10 text-amber ring-1 ring-amber/20",
  "In Progress": "bg-pine/10 text-pine ring-1 ring-pine/20",
  "Followed Up": "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  Escalated: "bg-coral/10 text-coral ring-1 ring-coral/20",
  Closed: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
};

export default function WorkerCasesPage() {
  const [cases, setCases] = useState<WorkerYouthCase[]>([]);
  const [draftStatuses, setDraftStatuses] = useState<Record<string, CaseStatusLabel>>({});
  const [savingCaseId, setSavingCaseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadCases() {
      setIsLoading(true);
      setError("");

      try {
        const data = await fetchWorkerCases();
        if (mounted) {
          setCases(data);
          setDraftStatuses(
            Object.fromEntries(data.map((item) => [item.caseId, item.status])) as Record<
              string,
              CaseStatusLabel
            >
          );
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "Case data could not load.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadCases();

    return () => {
      mounted = false;
    };
  }, []);

  const cards = useMemo(
    () => [
      {
        label: "Active cases",
        value: cases.length.toString(),
        detail: "Tracked in the follow-up queue",
        icon: ClipboardCheck,
        tone: "pine" as const
      },
      {
        label: "Needs review",
        value: cases.filter((item) => item.status === "Needs Review" || item.status === "Escalated").length.toString(),
        detail: "Cases that need the next worker touchpoint",
        icon: RotateCcw,
        tone: "amber" as const
      },
      {
        label: "Closed or followed up",
        value: cases.filter((item) => item.status === "Followed Up" || item.status === "Closed").length.toString(),
        detail: "Cases that already have a documented next step",
        icon: ShieldCheck,
        tone: "slate" as const
      }
    ],
    [cases]
  );

  async function saveStatus(caseItem: WorkerYouthCase) {
    const nextStatus = draftStatuses[caseItem.caseId] ?? caseItem.status;
    if (nextStatus === caseItem.status) {
      return;
    }

    setSavingCaseId(caseItem.caseId);
    setError("");
    try {
      const updated = await updateWorkerCaseStatus(caseItem.caseId, nextStatus);
      setCases((current) =>
        current.map((item) => (item.caseId === updated.caseId ? updated : item))
      );
      setDraftStatuses((current) => ({ ...current, [updated.caseId]: updated.status }));
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : "Case status could not be updated."
      );
    } finally {
      setSavingCaseId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">
              Cases
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Keep follow-up status visible after the handoff is opened.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              The worker can now move a case through the full Day 5 status list without leaving the
              dashboard, and the choice persists back to the backend audit trail.
            </p>
          </div>
          <Link
            href="/worker/handoffs"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-pine hover:text-pine"
          >
            View handoffs
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <DashboardCard key={card.label} {...card} />
        ))}
      </section>

      {isLoading ? (
        <div className="flex items-center gap-3 rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-sm text-slate-500 shadow-sm">
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-pine" />
          Loading case records...
        </div>
      ) : null}

      {error ? (
        <p className="rounded-[24px] border border-coral/20 bg-coral/10 px-4 py-3 text-sm font-medium text-coral">
          {error}
        </p>
      ) : null}

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Follow-up tracker
            </p>
            <h3 className="mt-2 text-xl font-semibold text-ink">Case status list</h3>
          </div>
          <p className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-slate-600">
            Changes are visible to the whole team
          </p>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {cases.map((youth) => (
            <article
              key={youth.caseId}
              className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(247,250,252,0.96))] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-lg font-semibold text-ink">{youth.youthName}</h4>
                  <p className="mt-1 text-sm text-slate-500">{youth.handoffId}</p>
                </div>
                <p className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[youth.status]}`}>
                  {youth.status}
                </p>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-700">{youth.suggestedAction}</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-mist px-4 py-3 text-sm leading-6 text-slate-700">
                  <span className="font-semibold text-ink">Last active:</span> {youth.lastActive}
                </div>
                <div className="rounded-2xl bg-mist px-4 py-3 text-sm leading-6 text-slate-700">
                  <span className="font-semibold text-ink">Channel:</span> {youth.channel}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Update case status
                </label>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <select
                    value={draftStatuses[youth.caseId] ?? youth.status}
                    onChange={(event) =>
                      setDraftStatuses((current) => ({
                        ...current,
                        [youth.caseId]: event.target.value as CaseStatusLabel
                      }))
                    }
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-ink outline-none transition focus:border-pine"
                  >
                    {caseStatusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => saveStatus(youth)}
                    disabled={savingCaseId === youth.caseId}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-pine px-4 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {savingCaseId === youth.caseId ? (
                      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                    ) : null}
                    Save status
                  </button>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-sm text-slate-500">
                  {youth.workerNote ? `Latest note: ${youth.workerNote}` : "No worker note saved yet."}
                </p>
                <Link
                  href={`/worker/handoffs/${youth.handoffId}`}
                  className="inline-flex items-center gap-2 rounded-full border border-pine/20 bg-pine px-3 py-2 text-xs font-semibold text-white transition hover:bg-pine/90"
                >
                  Open handoff
                  <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Clock3, Loader2, MessageSquareMore, ShieldAlert, Users } from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
import { fetchWorkerCases } from "@/lib/worker-api";
import { caseStatusOptions, type WorkerYouthCase } from "@/lib/worker-data";

const statusStyles: Record<WorkerYouthCase["status"], string> = {
  New: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  "Needs Review": "bg-amber/10 text-amber ring-1 ring-amber/20",
  "In Progress": "bg-pine/10 text-pine ring-1 ring-pine/20",
  "Followed Up": "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  Escalated: "bg-coral/10 text-coral ring-1 ring-coral/20",
  Closed: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
};

const riskStyles: Record<WorkerYouthCase["riskLevel"], string> = {
  high: "bg-coral/10 text-coral ring-1 ring-coral/20",
  medium: "bg-amber/10 text-amber ring-1 ring-amber/20",
  low: "bg-pine/10 text-pine ring-1 ring-pine/20"
};

export default function WorkerCockpitPage() {
  const [cases, setCases] = useState<WorkerYouthCase[]>([]);
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
        }
      } catch (loadError) {
        if (mounted) {
          setError(
            loadError instanceof Error ? loadError.message : "Worker cockpit data could not load."
          );
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

  const summaryCards = useMemo(
    () => [
      {
        label: "Open youth cases",
        value: cases.length.toString(),
        detail: "Tracked in the worker queue",
        icon: Users
      },
      {
        label: "High-risk priority",
        value: cases.filter((item) => item.riskLevel === "high").length.toString(),
        detail: "Cases that need a fast worker read",
        icon: ShieldAlert
      },
      {
        label: "Needs review",
        value: cases.filter((item) => item.status === "Needs Review" || item.status === "Escalated").length.toString(),
        detail: "Status updates waiting on follow-up",
        icon: MessageSquareMore
      },
      {
        label: "Recent activity",
        value: cases.filter((item) => item.status !== "Closed").length.toString(),
        detail: "Cases with fresh activity in the queue",
        icon: Clock3
      }
    ],
    [cases]
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(31,111,100,0.14),_transparent_34%),linear-gradient(180deg,_#f6fbf9_0%,_#ffffff_55%,_#f5f8fb_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-panel backdrop-blur">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pine">
                Worker cockpit
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Triage the day from one live youth queue.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                This cockpit now reads the worker queue from the backend when it is available and
                falls back to seeded demo data when it is not, so the same card layout keeps
                working as the handoff flow gets real.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {summaryCards.map((card) => {
                const Icon = card.icon;
                return (
                  <DashboardCard
                    key={card.label}
                    label={card.label}
                    value={card.value}
                    detail={card.detail}
                    icon={Icon}
                  />
                );
              })}
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-panel">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Youth list
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {caseStatusOptions.length} case states, one shared cockpit contract.
                </p>
              </div>
              <p className="text-xs font-medium text-slate-500">
                Open handoff, review case status, and keep the next step visible.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-3 px-6 py-12 text-sm text-slate-500">
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-pine" />
              Loading the worker queue...
            </div>
          ) : null}

          {error ? (
            <div className="mx-6 mt-4 rounded-2xl border border-coral/20 bg-coral/10 px-4 py-3 text-sm text-coral">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 p-4 sm:p-6">
            {cases.map((youth) => (
              <article
                key={youth.caseId}
                className="grid gap-4 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.99),_rgba(246,249,251,0.97))] p-5 shadow-sm lg:grid-cols-[1.4fr_0.8fr]"
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold text-ink">{youth.youthName}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Case ID {youth.caseId} - Handoff {youth.handoffId}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${riskStyles[youth.riskLevel]}`}>
                        {youth.riskLevel} risk
                      </span>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[youth.status]}`}>
                        {youth.status}
                      </span>
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                        {youth.channel}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Last active
                      </p>
                      <p className="mt-2 text-sm font-medium text-ink">{youth.lastActive}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Channel
                      </p>
                      <p className="mt-2 text-sm font-medium text-ink">{youth.channel}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Risk level
                      </p>
                      <p className="mt-2 text-sm font-medium text-ink">{youth.riskLevel}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Suggested action
                      </p>
                      <p className="mt-2 text-sm font-medium text-ink">{youth.suggestedAction}</p>
                    </div>
                  </div>

                  {youth.workerNote ? (
                    <div className="rounded-2xl border border-pine/15 bg-pine/5 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">
                        Latest worker note
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{youth.workerNote}</p>
                    </div>
                  ) : null}
                </div>

                <aside className="grid content-start gap-3 rounded-[22px] border border-slate-200 bg-white p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Current case status
                    </p>
                    <p className="mt-2 text-lg font-semibold text-ink">{youth.status}</p>
                  </div>

                  <Link
                    href={`/worker/handoffs/${youth.handoffId}`}
                    className="inline-flex items-center justify-between gap-2 rounded-2xl bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
                  >
                    Open handoff
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>

                  <Link
                    href="/worker/cases"
                    className="inline-flex items-center justify-between gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-ink transition hover:border-pine hover:text-pine"
                  >
                    Review case status
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </aside>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

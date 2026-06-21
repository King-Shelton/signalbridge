"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { WorkerCaseFilters, type WorkerCaseFilterState } from "@/components/WorkerCaseFilters";
import { WorkerConversationPreview } from "@/components/WorkerConversationPreview";
import {
  channelLabels,
  type WorkerYouthCase
} from "@/lib/worker-data";

const priorityOrder: Record<WorkerYouthCase["riskLevel"], number> = {
  high: 0,
  medium: 1,
  low: 2
};

const initialFilters: WorkerCaseFilterState = {
  search: "",
  risk: "all",
  channel: "all",
  status: "all"
};

type FilteredWorkerCaseListProps = {
  cases: WorkerYouthCase[];
  variant: "cockpit" | "radar";
};

export function FilteredWorkerCaseList({ cases, variant }: FilteredWorkerCaseListProps) {
  const [filters, setFilters] = useState(initialFilters);

  const statusOptions = useMemo(
    () => Array.from(new Set(cases.map((caseItem) => caseItem.status))),
    [cases]
  );

  const filteredCases = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    const matches = cases.filter((caseItem) => {
      const searchableText = [
        caseItem.youthName,
        caseItem.concern,
        caseItem.keyQuote,
        caseItem.status,
        caseItem.suggestedAction,
        caseItem.channel,
        ...caseItem.signalNotes
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!search || searchableText.includes(search)) &&
        (filters.risk === "all" || caseItem.riskLevel === filters.risk) &&
        (filters.channel === "all" || caseItem.channel === filters.channel) &&
        (filters.status === "all" || caseItem.status === filters.status)
      );
    });

    if (variant !== "radar") {
      return matches;
    }

    return [...matches].sort((a, b) => {
      const risk = priorityOrder[a.riskLevel] - priorityOrder[b.riskLevel];
      if (risk !== 0) {
        return risk;
      }

      return b.riskScore - a.riskScore || a.youthName.localeCompare(b.youthName);
    });
  }, [cases, filters, variant]);

  return (
    <div className="grid gap-4">
      <WorkerCaseFilters
        filters={filters}
        onChange={setFilters}
        statusOptions={statusOptions}
        resultCount={filteredCases.length}
        totalCount={cases.length}
      />

      {filteredCases.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-slate-300 bg-white p-6 text-center">
          <p className="text-lg font-semibold text-ink">No matching cases</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Try widening the risk, channel, or status filters. The layout stays
            stable even when the queue is empty.
          </p>
        </div>
      ) : variant === "cockpit" ? (
        filteredCases.map((youth) => (
          <WorkerConversationPreview key={youth.id} youth={youth} />
        ))
      ) : (
        filteredCases.map((youth, index) => (
          <RadarCaseCard
            key={youth.id}
            youth={youth}
            priorityNumber={index + 1}
          />
        ))
      )}
    </div>
  );
}

function RadarCaseCard({
  youth,
  priorityNumber
}: {
  youth: WorkerYouthCase;
  priorityNumber: number;
}) {
  return (
    <article className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(247,250,252,0.96))] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Priority {priorityNumber}
          </p>
          <h4 className="mt-1 text-lg font-semibold text-ink">{youth.youthName}</h4>
        </div>
        <p
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            youth.riskLevel === "high"
              ? "bg-coral/10 text-coral ring-1 ring-coral/20"
              : youth.riskLevel === "medium"
                ? "bg-amber/10 text-amber ring-1 ring-amber/20"
                : "bg-pine/10 text-pine ring-1 ring-pine/20"
          }`}
        >
          {youth.riskLevel} risk
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Signals
          </p>
          <ul className="mt-2 grid gap-2">
            {[`Risk score: ${youth.riskScore}`, ...youth.signalNotes].map((note) => (
              <li
                key={note}
                className="rounded-2xl bg-mist px-3 py-2 text-sm leading-6 text-slate-700"
              >
                {note}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Channel
          </p>
          <p className="mt-2 text-sm font-medium text-ink">
            {channelLabels[youth.channel]}
          </p>
          <p className="mt-2 text-sm text-slate-600">{youth.lastActive}</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {youth.suggestedAction}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Next worker move
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-700">{youth.keyQuote}</p>
          <Link
            href={`/worker/handoffs/${youth.id}`}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-pine hover:text-ink"
          >
            Open brief
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

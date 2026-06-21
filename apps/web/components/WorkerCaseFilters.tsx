"use client";

import { Search } from "lucide-react";
import type { ChannelLabel, RiskLevel } from "@/lib/worker-data";
import { channelLabels, riskLabels } from "@/lib/worker-data";

export type WorkerCaseFilterState = {
  search: string;
  risk: "all" | RiskLevel;
  channel: "all" | ChannelLabel;
  status: "all" | string;
};

type WorkerCaseFiltersProps = {
  filters: WorkerCaseFilterState;
  onChange: (filters: WorkerCaseFilterState) => void;
  statusOptions: string[];
  resultCount: number;
  totalCount: number;
};

const riskOptions: Array<WorkerCaseFilterState["risk"]> = [
  "all",
  "high",
  "medium",
  "low"
];

const channelOptions: Array<WorkerCaseFilterState["channel"]> = [
  "all",
  "WhatsApp",
  "Instagram",
  "GatherTown",
  "Discord",
  "Web Chat"
];

export function WorkerCaseFilters({
  filters,
  onChange,
  statusOptions,
  resultCount,
  totalCount
}: WorkerCaseFiltersProps) {
  function updateFilter(nextFilters: Partial<WorkerCaseFilterState>) {
    onChange({ ...filters, ...nextFilters });
  }

  function resetFilters() {
    onChange({
      search: "",
      risk: "all",
      channel: "all",
      status: "all"
    });
  }

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="worker-case-search"
            className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
          >
            Search queue
          </label>
          <div className="mt-2 flex min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-pine focus-within:bg-white">
            <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              id="worker-case-search"
              value={filters.search}
              onChange={(event) => updateFilter({ search: event.target.value })}
              placeholder="Search youth, concern, signal, status..."
              className="min-w-0 flex-1 border-0 bg-transparent text-sm font-medium text-ink outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:w-[620px]">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Risk
            </span>
            <select
              value={filters.risk}
              onChange={(event) =>
                updateFilter({ risk: event.target.value as WorkerCaseFilterState["risk"] })
              }
              className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-pine focus:bg-white"
            >
              {riskOptions.map((risk) => (
                <option key={risk} value={risk}>
                  {risk === "all" ? "All risks" : `${riskLabels[risk]} risk`}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Channel
            </span>
            <select
              value={filters.channel}
              onChange={(event) =>
                updateFilter({
                  channel: event.target.value as WorkerCaseFilterState["channel"]
                })
              }
              className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-pine focus:bg-white"
            >
              {channelOptions.map((channel) => (
                <option key={channel} value={channel}>
                  {channel === "all" ? "All channels" : channelLabels[channel]}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Status
            </span>
            <select
              value={filters.status}
              onChange={(event) => updateFilter({ status: event.target.value })}
              className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-pine focus:bg-white"
            >
              <option value="all">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <p className="text-sm font-medium text-slate-600">
          Showing <span className="font-semibold text-ink">{resultCount}</span> of{" "}
          <span className="font-semibold text-ink">{totalCount}</span> cases
        </p>
        <button
          type="button"
          onClick={resetFilters}
          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-pine hover:text-pine"
        >
          Reset filters
        </button>
      </div>
    </section>
  );
}

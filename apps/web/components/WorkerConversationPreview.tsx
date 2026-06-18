import Link from "next/link";
import { ArrowRight, Clock3, MessageSquareMore } from "lucide-react";
import type { WorkerYouthCase } from "@/lib/worker-data";

const riskStyles: Record<
  WorkerYouthCase["riskLevel"],
  { label: string; className: string }
> = {
  high: {
    label: "High",
    className: "bg-coral/10 text-coral ring-1 ring-coral/20"
  },
  medium: {
    label: "Medium",
    className: "bg-amber/10 text-amber ring-1 ring-amber/20"
  },
  low: {
    label: "Low",
    className: "bg-pine/10 text-pine ring-1 ring-pine/20"
  }
};

const channelStyles: Record<WorkerYouthCase["channel"], string> = {
  WhatsApp: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  Instagram: "bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-200",
  GatherTown: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  Discord: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  "Web Chat": "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
};

const sourceStyles: Record<WorkerYouthCase["conversationSource"], string> = {
  "mock-seed": "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  "api-ready": "bg-pine/10 text-pine ring-1 ring-pine/20"
};

const sourceLabels: Record<WorkerYouthCase["conversationSource"], string> = {
  "mock-seed": "Mock seed feed",
  "api-ready": "API-ready feed"
};

export function WorkerConversationPreview({
  youth
}: {
  youth: WorkerYouthCase;
}) {
  const risk = riskStyles[youth.riskLevel];

  return (
    <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.99),_rgba(246,249,251,0.97))] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-ink">{youth.youthName}</h3>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${channelStyles[youth.channel]}`}
              >
                {youth.channel}
              </span>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${sourceStyles[youth.conversationSource]}`}
              >
                {sourceLabels[youth.conversationSource]}
              </span>
            </div>
            <p className="flex items-center gap-1 text-sm text-slate-500">
              <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
              Last active: {youth.lastActive}
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${risk.className}`}
          >
            {risk.label}
          </span>
        </div>
      </div>

      <div className="space-y-3 px-5 py-5 sm:px-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          <MessageSquareMore aria-hidden="true" className="h-3.5 w-3.5" />
          Conversation preview
        </div>

        <div className="space-y-3 rounded-2xl bg-slate-50 p-3">
          {youth.conversationPreview.map((turn) => {
            const isYouth = turn.sender === "youth";
            const isSystem = turn.sender === "system";

            return (
              <div
                key={`${youth.id}-${turn.timestamp}-${turn.sender}`}
                className={`flex ${isSystem ? "justify-center" : isYouth ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={[
                    "max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-6 shadow-sm",
                    isSystem
                      ? "border border-coral/20 bg-coral/10 text-coral"
                      : isYouth
                        ? "rounded-br-md bg-pine text-white"
                        : "rounded-bl-md border border-slate-200 bg-white text-ink"
                  ].join(" ")}
                >
                  <div
                    className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                      isYouth ? "text-white/70" : isSystem ? "text-coral/70" : "text-slate-500"
                    }`}
                  >
                    <span>{turn.author}</span>
                    <span>{turn.timestamp}</span>
                  </div>
                  <p className={`mt-1 ${isYouth ? "text-white" : isSystem ? "text-coral" : "text-slate-700"}`}>
                    {turn.message}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr] sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Suggested next step
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-700">{youth.suggestedAction}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Current status
            </p>
            <p className="mt-1 text-sm font-semibold text-ink">{youth.status}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="text-xs leading-5 text-slate-500">
            Seeded now, API-ready later. Day 5 can swap this feed for live conversation data
            without changing the cockpit card contract.
          </p>
          <Link
            href={`/worker/youths/${youth.id}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-pine hover:text-ink"
          >
            Open youth case
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

import Link from "next/link";
import type { WorkerYouthCase } from "@/lib/worker-data";

const riskStyles: Record<WorkerYouthCase["riskLevel"], { label: string; badgeClass: string; borderColor: string }> = {
  high: { label: "High", badgeClass: "risk-badge-high", borderColor: "rgba(217,95,72,0.4)" },
  medium: { label: "Medium", badgeClass: "risk-badge-medium", borderColor: "rgba(183,121,31,0.4)" },
  low: { label: "Low", badgeClass: "risk-badge-low", borderColor: "rgba(31,111,100,0.4)" },
};

const channelColors: Record<WorkerYouthCase["channel"], { bg: string; border: string; color: string }> = {
  WhatsApp: { bg: "rgba(22,163,74,0.12)", border: "rgba(22,163,74,0.25)", color: "#4ade80" },
  Instagram: { bg: "rgba(192,38,211,0.12)", border: "rgba(192,38,211,0.25)", color: "#e879f9" },
  GatherTown: { bg: "rgba(14,165,233,0.12)", border: "rgba(14,165,233,0.25)", color: "#38bdf8" },
  Discord: { bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.25)", color: "#a5b4fc" },
  "Web Chat": { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.12)", color: "rgba(214,235,230,0.6)" },
};

export function WorkerConversationPreview({ youth }: { youth: WorkerYouthCase }) {
  const risk = riskStyles[youth.riskLevel];
  const channelColor = channelColors[youth.channel] ?? channelColors["Web Chat"];

  return (
    <article
      className="glass-card overflow-hidden transition-all duration-200 hover:bg-white/[0.08]"
      style={{ borderLeft: `3px solid ${risk.borderColor}` }}
    >
      {/* Header */}
      <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[16px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.01em" }}>
                {youth.youthName}
              </h3>
              <span
                className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                style={{ background: channelColor.bg, border: `1px solid ${channelColor.border}`, color: channelColor.color }}
              >
                {youth.channel}
              </span>
            </div>
            <p className="text-[12px] font-mono text-[rgba(214,235,230,0.35)]">Last active: {youth.lastActive}</p>
          </div>
          <span className={risk.badgeClass}>{risk.label}</span>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-4 px-5 py-4">
        {/* Conversation preview */}
        <div>
          <p className="sb-eyebrow mb-3">Conversation preview</p>
          <div className="space-y-3 rounded-[14px] p-3" style={{ background: "rgba(0,0,0,0.2)" }}>
            {youth.conversationPreview.map((turn) => {
              const isYouth = turn.sender === "youth";
              const isSystem = turn.sender === "system";

              return (
                <div
                  key={`${youth.id}-${turn.timestamp}-${turn.sender}`}
                  className={`flex ${isSystem ? "justify-center" : isYouth ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className="max-w-[90%] px-3 py-2 text-[13px] leading-relaxed"
                    style={isSystem ? {
                      background: "rgba(183,121,31,0.12)",
                      border: "1px solid rgba(183,121,31,0.25)",
                      borderRadius: "12px",
                      color: "#e9c685",
                    } : isYouth ? {
                      background: "linear-gradient(180deg, rgba(31,111,100,0.36), rgba(31,111,100,0.2))",
                      border: "1px solid rgba(111,184,170,0.32)",
                      borderRadius: "16px 16px 4px 16px",
                      color: "#f1f6f4",
                    } : {
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "16px 16px 16px 4px",
                      backdropFilter: "blur(6px)",
                      color: "#f1f6f4",
                    }}
                  >
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] mb-1 opacity-50">
                      <span>{turn.author}</span>
                      <span>{turn.timestamp}</span>
                    </div>
                    <p>{turn.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Suggested action + status */}
        <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr] sm:items-start">
          <div>
            <p className="sb-eyebrow mb-2">Suggested next step</p>
            <p className="text-[13px] leading-relaxed text-[rgba(214,235,230,0.65)]">{youth.suggestedAction}</p>
          </div>
          <div className="rounded-[13px] px-4 py-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="sb-eyebrow mb-1">Status</p>
            <p className="text-[13px] font-semibold text-[#f1f6f4]">{youth.status}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-1">
          <Link
            href={`/worker/youths/${youth.id}`}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#6fb8aa] hover:text-[#8fcfc3] transition-colors"
          >
            Open youth case
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </div>
    </article>
  );
}

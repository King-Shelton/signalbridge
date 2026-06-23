"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { ConversationItem, label } from "@/lib/operations";
import { OperationsState } from "@/components/OperationsState";

function riskBadge(level: string) {
  if (level === "high" || level === "critical") return "risk-badge-high";
  if (level === "medium") return "risk-badge-medium";
  return "risk-badge-low";
}

function riskBorderColor(level: string) {
  if (level === "high" || level === "critical") return "rgba(217,95,72,0.4)";
  if (level === "medium") return "rgba(183,121,31,0.4)";
  return "rgba(31,111,100,0.4)";
}

export default function HandoffsPage() {
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ conversations: ConversationItem[] }>("/worker/cockpit");
      setItems(data.conversations.filter((item) => item.handoffId && item.consentToHandoff));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load handoffs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <p className="sb-eyebrow mb-2">Consent-approved handoffs</p>
        <h1 className="text-[28px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.025em" }}>
          Start with context, not repetition.
        </h1>
        <p className="mt-1 text-[13px] text-[rgba(214,235,230,0.45)]">
          Each brief was prepared by SafeNight with the youth&apos;s explicit consent.
        </p>
      </div>

      <OperationsState
        loading={loading}
        error={error}
        empty={!items.length}
        retry={load}
        emptyTitle="No approved handoffs yet"
        emptyDescription="There are no consent-approved handoff briefs waiting right now. Check the Signal Radar or return when a youth gives permission."
        emptyActionHref="/worker/signal-radar"
        emptyActionLabel="Open signal radar"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <article
              key={item.id}
              className="glass-card p-5"
              style={{ borderLeft: `3px solid ${riskBorderColor(item.riskLevel)}` }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="text-[16px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.01em" }}>
                  {item.youthName}
                </h3>
                <span className={riskBadge(item.riskLevel)}>{label(item.riskLevel)}</span>
              </div>
              {item.suggestedAction && (
                <p className="text-[13px] text-[rgba(214,235,230,0.6)] leading-relaxed mb-4">
                  {item.suggestedAction}
                </p>
              )}
              <Link
                href={`/worker/handoffs/${item.handoffId}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[9px] text-[12.5px] font-semibold transition-all"
                style={{ background: "rgba(31,111,100,0.2)", border: "1px solid rgba(111,184,170,0.3)", color: "#6fb8aa" }}
              >
                Review brief
                <span aria-hidden="true">-&gt;</span>
              </Link>
            </article>
          ))}
        </div>
      </OperationsState>
    </div>
  );
}

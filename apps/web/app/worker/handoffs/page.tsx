"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { ConversationItem, label } from "@/lib/operations";

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
      setItems(data.conversations.filter((i) => i.handoffId && i.consentToHandoff));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load handoffs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <p className="sb-eyebrow mb-2">Consent-approved handoffs</p>
        <h1 className="text-[28px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.025em" }}>Start with context, not repetition.</h1>
        <p className="mt-1 text-[13px] text-[rgba(214,235,230,0.45)]">Each brief was prepared by SafeNight with the youth&apos;s explicit consent.</p>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-[rgba(214,235,230,0.5)] text-sm">
          <div className="w-4 h-4 rounded-full border-2 border-[#6fb8aa] border-t-transparent animate-spin" />
          Loading handoffs…
        </div>
      )}
      {error && (
        <div className="text-[13px] text-[#e88d78] bg-[rgba(217,95,72,0.1)] border border-[rgba(217,95,72,0.2)] rounded-xl px-4 py-3 flex items-center gap-3">
          {error}
          <button onClick={() => void load()} className="underline">Retry</button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((item) => (
          <article key={item.id} className="glass-card p-5" style={{ borderLeft: `3px solid ${riskBorderColor(item.riskLevel)}` }}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-[16px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.01em" }}>{item.youthName}</h3>
              <span className={riskBadge(item.riskLevel)}>{label(item.riskLevel)}</span>
            </div>
            {item.suggestedAction && (
              <p className="text-[13px] text-[rgba(214,235,230,0.6)] leading-relaxed mb-4">{item.suggestedAction}</p>
            )}
            <Link
              href={`/worker/handoffs/${item.handoffId}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[9px] text-[12.5px] font-semibold transition-all"
              style={{ background: "rgba(31,111,100,0.2)", border: "1px solid rgba(111,184,170,0.3)", color: "#6fb8aa" }}
            >
              Review brief →
            </Link>
          </article>
        ))}
        {!loading && !error && items.length === 0 && (
          <div className="col-span-2 glass-card p-8 text-center">
            <p className="text-[rgba(214,235,230,0.4)] text-sm">No consent-approved handoffs yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

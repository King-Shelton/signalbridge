"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function WorkerCockpitPage() {
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<{ conversations: ConversationItem[] }>("/worker/cockpit");
      setItems(data.conversations);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load cockpit.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // 5-second polling
  useEffect(() => {
    const interval = setInterval(() => { void load(); }, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const metrics = useMemo(() => ({
    open: items.filter((i) => i.case?.status !== "closed").length,
    high: items.filter((i) => ["high", "critical"].includes(i.riskLevel)).length,
    handoffs: items.filter((i) => i.unresolvedHandoff).length,
  }), [items]);

  const now = new Date().toLocaleString("en-SG", { weekday: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="sb-eyebrow mb-2">Live worker cockpit</p>
          <h1 className="text-[28px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.025em" }}>
            Who needs attention first?
          </h1>
        </div>
        <div className="text-[12px] font-mono text-[rgba(214,235,230,0.35)] mt-1">{now}</div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-3">
        {([
          ["Open cases", metrics.open, "#6fb8aa"],
          ["High priority", metrics.high, "#e88d78"],
          ["Unresolved handoffs", metrics.handoffs, "#e9c685"],
        ] as [string, number, string][]).map(([name, value, color]) => (
          <div key={name} className="glass-card p-4">
            <p className="sb-eyebrow mb-2">{name}</p>
            <p className="text-[32px] font-semibold" style={{ color, letterSpacing: "-0.03em" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Loading / error */}
      {loading && items.length === 0 && (
        <div className="flex items-center gap-3 text-[rgba(214,235,230,0.5)] text-sm">
          <div className="w-4 h-4 rounded-full border-2 border-[#6fb8aa] border-t-transparent animate-spin" />
          Loading conversations…
        </div>
      )}
      {error && (
        <div className="text-[13px] text-[#e88d78] bg-[rgba(217,95,72,0.1)] border border-[rgba(217,95,72,0.2)] rounded-xl px-4 py-3 flex items-center gap-3">
          {error}
          <button onClick={() => void load()} className="underline text-[#e88d78]">Retry</button>
        </div>
      )}

      {/* Conversation cards */}
      <div className="space-y-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="glass-card p-5 transition-all duration-200 hover:bg-white/[0.08]"
            style={{ borderLeft: `3px solid ${riskBorderColor(item.riskLevel)}` }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-[17px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.01em" }}>
                  {item.youthName}
                </h3>
                <p className="mt-0.5 text-[12px] font-mono text-[rgba(214,235,230,0.4)]">
                  {item.channel} · {timeAgo(item.lastMessageAt)}
                </p>
              </div>
              <span className={riskBadge(item.riskLevel)}>
                {label(item.riskLevel)} · {item.riskScore}
              </span>
            </div>

            {item.suggestedAction && (
              <p className="text-[13px] text-[rgba(214,235,230,0.6)] mb-3 leading-relaxed">{item.suggestedAction}</p>
            )}

            {item.signals.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {item.signals.slice(0, 4).map((s) => (
                  <span
                    key={s.id}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                    style={{ background: "rgba(255,255,255,0.07)", color: "rgba(214,235,230,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    {label(s.type)}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/worker/youths/${item.youthId}`}
                className="px-3 py-1.5 rounded-[9px] text-[12px] font-medium transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(214,235,230,0.7)" }}
              >
                Memory Card
              </Link>
              {item.handoffId && (
                <Link
                  href={`/worker/handoffs/${item.handoffId}`}
                  className="px-3 py-1.5 rounded-[9px] text-[12px] font-medium transition-all"
                  style={{ background: "rgba(31,111,100,0.2)", border: "1px solid rgba(111,184,170,0.3)", color: "#6fb8aa" }}
                >
                  Open Handoff →
                </Link>
              )}
            </div>
          </article>
        ))}
        {!loading && !error && items.length === 0 && (
          <div className="glass-card p-8 text-center">
            <p className="text-[rgba(214,235,230,0.5)] text-sm">No active conversations. All caught up.</p>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { ConversationItem, label } from "@/lib/operations";

function riskBorderColor(level: string) {
  if (level === "high" || level === "critical") return "rgba(217,95,72,0.5)";
  if (level === "medium") return "rgba(183,121,31,0.5)";
  return "rgba(31,111,100,0.5)";
}

function riskBadgeClass(level: string) {
  if (level === "high" || level === "critical") return "risk-badge-high";
  if (level === "medium") return "risk-badge-medium";
  return "risk-badge-low";
}

const RISK_FILTERS = ["all", "critical", "high", "medium", "low"];

export default function SignalRadarPage() {
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [risk, setRisk] = useState("all");
  const [channel, setChannel] = useState("all");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<{ items: ConversationItem[] }>("/signals/radar");
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load radar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const channels = useMemo(() => Array.from(new Set(items.map((item) => item.channel))), [items]);

  const filtered = useMemo(
    () =>
      items
        .map((item) => ({
          ...item,
          signals: item.signals.filter((s) => s.type !== "after_hours_support"),
        }))
        .filter(
          (item) =>
            item.signals.length > 0 &&
            (risk === "all" || item.riskLevel === risk) &&
            (channel === "all" || item.channel === channel) &&
            item.youthName.toLowerCase().includes(query.toLowerCase())
        ),
    [items, risk, channel, query]
  );

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <p className="sb-eyebrow mb-2">Live | Risk Prioritised</p>
        <h1 className="text-[28px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.025em" }}>
          Signal Radar
        </h1>
        <p className="mt-1 text-[13px] text-[rgba(214,235,230,0.5)]">
          Explainable priority signals - each card shows why a youth is flagged.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 glass-card p-1">
          {RISK_FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRisk(value)}
              className="px-3 py-1.5 rounded-[9px] text-[12px] font-medium capitalize transition-all"
              style={{
                background: risk === value ? "rgba(31,111,100,0.25)" : "transparent",
                color: risk === value ? "#6fb8aa" : "rgba(214,235,230,0.5)",
                border: risk === value ? "1px solid rgba(111,184,170,0.3)" : "1px solid transparent",
              }}
            >
              {value === "all" ? "All risks" : value}
            </button>
          ))}
        </div>

        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="px-3 py-2 rounded-[11px] text-[12.5px] font-medium outline-none cursor-pointer"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(214,235,230,0.7)" }}
        >
          <option value="all">All channels</option>
          {channels.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name..."
          className="px-3 py-2 rounded-[11px] text-[12.5px] outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(214,235,230,0.8)", minWidth: "180px" }}
        />
      </div>

      {loading && items.length === 0 && (
        <div className="flex items-center gap-3 text-[rgba(214,235,230,0.5)] text-sm">
          <div className="w-4 h-4 rounded-full border-2 border-[#6fb8aa] border-t-transparent animate-spin" />
          Scanning signals...
        </div>
      )}
      {error && (
        <div className="text-[13px] text-[#e88d78] bg-[rgba(217,95,72,0.1)] border border-[rgba(217,95,72,0.2)] rounded-xl px-4 py-3 flex items-center gap-3">
          {error}
          <button type="button" onClick={() => void load()} className="underline">
            Retry
          </button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((item) => (
          <article
            key={item.id}
            className="glass-card p-5"
            style={{ borderLeft: `3px solid ${riskBorderColor(item.riskLevel)}` }}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <Link
                  href={`/worker/youths/${item.youthId}`}
                  className="text-[16px] font-semibold text-[#f1f6f4] hover:text-[#6fb8aa] transition-colors"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {item.youthName}
                </Link>
                <p className="text-[12px] font-mono text-[rgba(214,235,230,0.4)] mt-0.5">{item.channel}</p>
              </div>
              <span className={riskBadgeClass(item.riskLevel)}>
                {label(item.riskLevel)} {item.riskScore}
              </span>
            </div>

            <ul className="space-y-2 mb-4">
              {item.signals.map((signal) => (
                <li
                  key={signal.id}
                  className="p-3 rounded-[12px]"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[12px] font-semibold text-[rgba(214,235,230,0.8)]">{label(signal.type)}</span>
                    <span className="text-[10.5px] font-mono text-[rgba(214,235,230,0.3)]">{signal.source}</span>
                  </div>
                  <p className="text-[12px] text-[rgba(214,235,230,0.55)] leading-relaxed">{signal.reason}</p>
                </li>
              ))}
            </ul>

            <Link href={`/worker/youths/${item.youthId}`} className="text-[12.5px] font-semibold text-[#6fb8aa] hover:text-[#8fcfc3] transition-colors">
              Open memory card {"->"}
            </Link>
          </article>
        ))}

        {!loading && !error && filtered.length === 0 && (
          <div className="col-span-2 glass-card p-8 text-center">
            <p className="text-[rgba(214,235,230,0.4)] text-sm">No signals match the current filters.</p>
            <button
              type="button"
              onClick={() => {
                setRisk("all");
                setChannel("all");
                setQuery("");
              }}
              className="mt-3 text-[12.5px] text-[#6fb8aa] underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

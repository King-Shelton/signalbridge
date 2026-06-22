"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { ConversationItem, label } from "@/lib/operations";

type Load = { workerId: string; workerName: string; activeCases: number; highRiskCases: number; unresolvedHandoffs: number; loadScore: number; pressure: string; recommendation: string };
type Worker = { id: string; name: string; email: string };
type Audit = { id: string; eventType: string; entityType: string; details: string; createdAt: string };
type Analytics = { totalConversations: number; openCases: number; unresolvedHandoffs: number; highRiskConversations: number; afterHoursVolume: number; riskBreakdown: Record<string, number> };

function loadColor(score: number) {
  if (score > 70) return { bar: "#d95f48", text: "#e88d78", bg: "rgba(217,95,72,0.15)", border: "rgba(217,95,72,0.3)" };
  if (score > 40) return { bar: "#b7791f", text: "#e9c685", bg: "rgba(183,121,31,0.15)", border: "rgba(183,121,31,0.3)" };
  return { bar: "#1f6f64", text: "#6fb8aa", bg: "rgba(31,111,100,0.15)", border: "rgba(31,111,100,0.3)" };
}

function auditEventColor(type: string) {
  if (type.includes("escalat")) return { bg: "rgba(217,95,72,0.15)", border: "rgba(217,95,72,0.3)", color: "#e88d78" };
  if (type.includes("consent")) return { bg: "rgba(183,121,31,0.12)", border: "rgba(183,121,31,0.25)", color: "#e9c685" };
  if (type.includes("ai") || type.includes("response")) return { bg: "rgba(31,111,100,0.12)", border: "rgba(31,111,100,0.25)", color: "#6fb8aa" };
  return { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.1)", color: "rgba(214,235,230,0.6)" };
}

export default function SupervisorPage() {
  const [loads, setLoads] = useState<Load[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [cases, setCases] = useState<ConversationItem[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [channel, setChannel] = useState("WhatsApp Simulator");
  const [youthId, setYouthId] = useState("");
  const [message, setMessage] = useState("I do not want to go to school tomorrow. People keep sharing edited photos of me.");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    // Bug fix: use Promise.allSettled so partial failures don't block all data
    const [l, w, c, a, stats] = await Promise.allSettled([
      apiFetch<{ workers: Load[] }>("/supervisor/load"),
      apiFetch<{ workers: Worker[] }>("/supervisor/workers"),
      apiFetch<{ conversations: ConversationItem[] }>("/worker/cockpit"),
      apiFetch<{ logs: Audit[] }>("/audit/logs?limit=40"),
      apiFetch<Analytics>("/analytics/summary"),
    ]);
    if (l.status === "fulfilled") setLoads(l.value.workers);
    if (w.status === "fulfilled") setWorkers(w.value.workers);
    if (c.status === "fulfilled") {
      const convs = c.value.conversations.filter((i) => i.case);
      setCases(convs);
      setYouthId((cur) => cur || convs[0]?.youthId || "");
    }
    if (a.status === "fulfilled") setAudit(a.value.logs);
    if (stats.status === "fulfilled") setAnalytics(stats.value);

    const allFailed = [l, w, c, a, stats].every((r) => r.status === "rejected");
    if (allFailed) setError("Could not load supervisor data. Check the API is running.");
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function reassign(caseId: string) {
    const workerId = assignments[caseId];
    if (!workerId) return;
    try {
      await apiFetch(`/supervisor/cases/${caseId}/assign`, { method: "PATCH", body: JSON.stringify({ workerId }) });
      setNotice("Case reassigned and worker notified.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reassignment failed");
    }
  }

  async function simulate() {
    try {
      const result = await apiFetch<{ riskLevel: string; riskScore: number }>("/simulator/intake", {
        method: "POST",
        body: JSON.stringify({ youthId, channel, message }),
      });
      setNotice(`Simulated intake created at ${result.riskLevel} risk (${result.riskScore}); the assigned worker was alerted.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Simulation failed");
    }
  }

  const metrics = useMemo(() =>
    analytics
      ? [
          ["Conversations", analytics.totalConversations, "#6fb8aa"],
          ["Open cases", analytics.openCases, "#e9c685"],
          ["High risk", analytics.highRiskConversations, "#e88d78"],
          ["Unresolved handoffs", analytics.unresolvedHandoffs, "#e9c685"],
          ["After-hours", analytics.afterHoursVolume, "#6fb8aa"],
        ] as [string, number, string][]
      : [],
    [analytics]
  );

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <p className="sb-eyebrow mb-2">Operational oversight</p>
        <h1 className="text-[28px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.025em" }}>Protect continuity and worker capacity.</h1>
      </div>

      {notice && (
        <div className="text-[13px] text-[#6fb8aa] bg-[rgba(31,111,100,0.12)] border border-[rgba(31,111,100,0.25)] rounded-xl px-4 py-3">
          {notice}
        </div>
      )}
      {error && (
        <div className="text-[13px] text-[#e88d78] bg-[rgba(217,95,72,0.1)] border border-[rgba(217,95,72,0.2)] rounded-xl px-4 py-3 flex items-center gap-3">
          {error}
          <button onClick={() => void load()} className="underline">Retry</button>
        </div>
      )}
      {loading && (
        <div className="flex items-center gap-3 text-[rgba(214,235,230,0.5)] text-sm">
          <div className="w-4 h-4 rounded-full border-2 border-[#6fb8aa] border-t-transparent animate-spin" />
          Loading operational data…
        </div>
      )}

      {/* Metrics strip */}
      {metrics.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
          {metrics.map(([name, value, color]) => (
            <div key={name} className="glass-card p-4">
              <p className="sb-eyebrow mb-2">{name}</p>
              <p className="text-[28px] font-semibold" style={{ color, letterSpacing: "-0.03em" }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Worker load cards */}
      {loads.length > 0 && (
        <div>
          <p className="sb-eyebrow mb-3">Worker load</p>
          <div className="grid gap-4 lg:grid-cols-2">
            {loads.map((worker) => {
              const colors = loadColor(worker.loadScore);
              return (
                <div key={worker.workerId} className="glass-card p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-[16px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.01em" }}>{worker.workerName}</h3>
                      <p className="text-[12px] font-mono text-[rgba(214,235,230,0.4)] mt-0.5">
                        {worker.activeCases} active · {worker.highRiskCases} high risk · {worker.unresolvedHandoffs} unresolved
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}>
                      {label(worker.pressure)} · {worker.loadScore}
                    </span>
                  </div>
                  {/* Load bar */}
                  <div className="h-1.5 rounded-full mb-3" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(worker.loadScore, 100)}%`, background: colors.bar }} />
                  </div>
                  <p className="text-[12.5px] text-[rgba(214,235,230,0.55)] leading-relaxed">{worker.recommendation}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Case reassignment */}
      {cases.length > 0 && (
        <div className="glass-card p-5">
          <p className="sb-eyebrow mb-4">Case reassignment</p>
          <div className="space-y-3">
            {cases.map((item) => (
              <div key={item.case!.id} className="grid gap-2 sm:grid-cols-[1fr_200px_auto] p-3 rounded-[12px]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div>
                  <p className="text-[13.5px] font-semibold text-[#f1f6f4]">{item.youthName}</p>
                  <p className="text-[12px] text-[rgba(214,235,230,0.4)]">{item.case!.summary}</p>
                </div>
                <select
                  value={assignments[item.case!.id] ?? ""}
                  onChange={(e) => setAssignments({ ...assignments, [item.case!.id]: e.target.value })}
                  className="px-3 py-2 rounded-[9px] text-[12.5px] outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(214,235,230,0.75)" }}
                >
                  <option value="">Choose worker</option>
                  {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
                <button
                  onClick={() => void reassign(item.case!.id)}
                  className="px-4 py-2 rounded-[9px] text-[12.5px] font-semibold transition-all"
                  style={{ background: "rgba(31,111,100,0.2)", border: "1px solid rgba(111,184,170,0.3)", color: "#6fb8aa" }}
                >
                  Reassign
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Simulator */}
      <div className="glass-card p-5">
        <p className="sb-eyebrow mb-2">Approved-channel simulator</p>
        <p className="text-[12.5px] text-[rgba(214,235,230,0.45)] mb-4">Creates fictional intake, deterministic signals, a case, and a worker notification.</p>
        <div className="grid gap-2 lg:grid-cols-[180px_200px_1fr_auto]">
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="px-3 py-2 rounded-[9px] text-[12.5px] outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(214,235,230,0.75)" }}
          >
            {["WhatsApp Simulator", "Instagram Simulator", "Discord Simulator", "GatherTown Simulator", "Web Chat"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <select
            value={youthId}
            onChange={(e) => setYouthId(e.target.value)}
            className="px-3 py-2 rounded-[9px] text-[12.5px] outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(214,235,230,0.75)" }}
          >
            {Array.from(new Map(cases.map((i) => [i.youthId, i])).values()).map((i) => (
              <option key={i.youthId} value={i.youthId}>{i.youthName}</option>
            ))}
          </select>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="px-3 py-2 rounded-[9px] text-[12.5px] outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(214,235,230,0.8)" }}
          />
          <button
            onClick={() => void simulate()}
            className="px-4 py-2 rounded-[9px] text-[12.5px] font-semibold transition-all"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "#f1f6f4" }}
          >
            Simulate
          </button>
        </div>
      </div>

      {/* Audit log */}
      {audit.length > 0 && (
        <div className="glass-card p-5">
          <p className="sb-eyebrow mb-4">Safety audit trail</p>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {audit.map((row) => {
              const colors = auditEventColor(row.eventType);
              return (
                <div key={row.id} className="p-3 rounded-[11px] flex flex-wrap items-start justify-between gap-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold mb-1.5" style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.color }}>
                      {label(row.eventType)}
                    </span>
                    <p className="text-[12px] text-[rgba(214,235,230,0.55)] break-words">{row.entityType} · {row.details}</p>
                  </div>
                  <time className="text-[11px] font-mono text-[rgba(214,235,230,0.3)] flex-shrink-0">
                    {new Date(row.createdAt).toLocaleString("en-SG")}
                  </time>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

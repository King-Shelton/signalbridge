"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { ConversationItem, label } from "@/lib/operations";

type Load = {
  workerId: string;
  workerName: string;
  activeCases: number;
  highRiskCases: number;
  unresolvedHandoffs: number;
  loadScore: number;
  pressure: string;
  recommendation: string;
};

type Worker = { id: string; name: string; email: string };
type Audit = { id: string; eventType: string; entityType: string; details: string; createdAt: string };
type Analytics = {
  totalConversations: number;
  openCases: number;
  unresolvedHandoffs: number;
  highRiskConversations: number;
  afterHoursVolume: number;
  riskBreakdown: Record<string, number>;
};

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
  const [busyCaseId, setBusyCaseId] = useState("");
  const [simulating, setSimulating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

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
      const convs = c.value.conversations.filter((item) => item.case);
      setCases(convs);
      setYouthId((current) => current || convs[0]?.youthId || "");
    }
    if (a.status === "fulfilled") setAudit(a.value.logs);
    if (stats.status === "fulfilled") setAnalytics(stats.value);

    const allFailed = [l, w, c, a, stats].every((result) => result.status === "rejected");
    if (allFailed) setError("Could not load supervisor data. Check the API is running.");
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function reassign(caseId: string) {
    const workerId = assignments[caseId];
    if (!workerId) return;

    setBusyCaseId(caseId);
    setError("");
    try {
      await apiFetch(`/supervisor/cases/${caseId}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ workerId }),
      });
      setNotice("Case reassigned and worker notified.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reassignment failed");
    } finally {
      setBusyCaseId("");
    }
  }

  async function simulate() {
    if (!youthId || simulating) return;

    setSimulating(true);
    setError("");
    try {
      const result = await apiFetch<{ riskLevel: string; riskScore: number }>("/simulator/intake", {
        method: "POST",
        body: JSON.stringify({ youthId, channel, message }),
      });
      setNotice(`Simulated intake created at ${result.riskLevel} risk (${result.riskScore}); the assigned worker was alerted.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Simulation failed");
    } finally {
      setSimulating(false);
    }
  }

  const metrics = useMemo(() => {
    if (!analytics) return [];
    return [
      ["Conversations", analytics.totalConversations, "#6fb8aa"],
      ["Open cases", analytics.openCases, "#e9c685"],
      ["High risk", analytics.highRiskConversations, "#e88d78"],
      ["Unresolved handoffs", analytics.unresolvedHandoffs, "#e9c685"],
      ["After-hours", analytics.afterHoursVolume, "#6fb8aa"],
    ] as [string, number, string][];
  }, [analytics]);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <p className="sb-eyebrow mb-2">Operational oversight</p>
        <h1 className="text-[28px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.025em" }}>
          Protect continuity and worker capacity.
        </h1>
      </div>

      {notice && (
        <div className="text-[13px] text-[#6fb8aa] bg-[rgba(31,111,100,0.12)] border border-[rgba(31,111,100,0.25)] rounded-xl px-4 py-3">
          {notice}
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
      {loading && (
        <div className="flex items-center gap-3 text-[rgba(214,235,230,0.5)] text-sm">
          <div className="w-4 h-4 rounded-full border-2 border-[#6fb8aa] border-t-transparent animate-spin" />
          Loading operational data...
        </div>
      )}

      {metrics.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
          {metrics.map(([name, value, color]) => (
            <div key={name} className="glass-card p-4">
              <p className="sb-eyebrow mb-2">{name}</p>
              <p className="text-[28px] font-semibold" style={{ color, letterSpacing: "-0.03em" }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      <section className="glass-card overflow-hidden">
        <div className="border-b border-white/10 px-5 py-4">
          <p className="sb-eyebrow mb-2">Worker load</p>
          <p className="text-[13px] text-[rgba(214,235,230,0.5)]">
            Read the table left to right to see who is approaching overload and why.
          </p>
        </div>
        {loads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-[rgba(214,235,230,0.45)]">
                  <th className="px-5 py-4 font-semibold">Worker</th>
                  <th className="px-5 py-4 font-semibold">Cases</th>
                  <th className="px-5 py-4 font-semibold">High risk</th>
                  <th className="px-5 py-4 font-semibold">Handoffs</th>
                  <th className="px-5 py-4 font-semibold">Load</th>
                  <th className="px-5 py-4 font-semibold">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {loads.map((worker) => {
                  const colors = loadColor(worker.loadScore);
                  return (
                    <tr key={worker.workerId} className="border-t border-white/8">
                      <td className="px-5 py-4 align-top">
                        <div>
                          <p className="text-[14px] font-semibold text-[#f1f6f4]">{worker.workerName}</p>
                          <p className="text-[11.5px] font-mono text-[rgba(214,235,230,0.4)]">{worker.workerId}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top text-[13px] text-[rgba(214,235,230,0.7)]">{worker.activeCases}</td>
                      <td className="px-5 py-4 align-top text-[13px] text-[rgba(214,235,230,0.7)]">{worker.highRiskCases}</td>
                      <td className="px-5 py-4 align-top text-[13px] text-[rgba(214,235,230,0.7)]">{worker.unresolvedHandoffs}</td>
                      <td className="px-5 py-4 align-top">
                        <div className="space-y-2">
                          <span
                            className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold"
                            style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
                          >
                            {label(worker.pressure)} - {worker.loadScore}
                          </span>
                          <div className="h-1.5 w-28 rounded-full bg-white/10">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(worker.loadScore, 100)}%`, background: colors.bar }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top text-[13px] leading-6 text-[rgba(214,235,230,0.66)]">
                        {worker.recommendation}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-[13px] text-[rgba(214,235,230,0.45)]">
            No worker load data is available yet.
          </div>
        )}
      </section>

      <section className="glass-card overflow-hidden">
        <div className="border-b border-white/10 px-5 py-4">
          <p className="sb-eyebrow mb-2">Case reassignment</p>
          <p className="text-[13px] text-[rgba(214,235,230,0.5)]">
            Select a new worker, then press reassign to notify the next owner.
          </p>
        </div>
        {cases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-[rgba(214,235,230,0.45)]">
                  <th className="px-5 py-4 font-semibold">Youth</th>
                  <th className="px-5 py-4 font-semibold">Summary</th>
                  <th className="px-5 py-4 font-semibold">Reassign to</th>
                  <th className="px-5 py-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((item) => (
                  <tr key={item.case!.id} className="border-t border-white/8">
                    <td className="px-5 py-4 align-top">
                      <div>
                        <p className="text-[14px] font-semibold text-[#f1f6f4]">{item.youthName}</p>
                        <p className="text-[11.5px] font-mono text-[rgba(214,235,230,0.4)]">{label(item.case!.status)}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top text-[13px] leading-6 text-[rgba(214,235,230,0.66)]">
                      {item.case!.summary}
                    </td>
                    <td className="px-5 py-4 align-top">
                      <select
                        value={assignments[item.case!.id] ?? ""}
                        onChange={(e) => setAssignments({ ...assignments, [item.case!.id]: e.target.value })}
                        className="min-w-[200px] rounded-[10px] px-3 py-2 text-[12.5px] outline-none"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(214,235,230,0.75)" }}
                      >
                        <option value="">Choose worker</option>
                        {workers.map((worker) => (
                          <option key={worker.id} value={worker.id}>
                            {worker.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <button
                        type="button"
                        disabled={busyCaseId === item.case!.id || !assignments[item.case!.id]}
                        onClick={() => void reassign(item.case!.id)}
                        className="rounded-[10px] px-4 py-2 text-[12.5px] font-semibold transition-all disabled:opacity-40"
                        style={{ background: "rgba(31,111,100,0.2)", border: "1px solid rgba(111,184,170,0.3)", color: "#6fb8aa" }}
                      >
                        Reassign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-[13px] text-[rgba(214,235,230,0.45)]">
            No cases are ready for reassignment.
          </div>
        )}
      </section>

      <section className="glass-card p-5">
        <p className="sb-eyebrow mb-2">Approved-channel simulator</p>
        <p className="text-[12.5px] text-[rgba(214,235,230,0.45)] mb-4">
          Creates fictional intake, deterministic signals, a case, and a worker notification.
        </p>
        <div className="grid gap-2 lg:grid-cols-[180px_200px_1fr_auto]">
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="px-3 py-2 rounded-[9px] text-[12.5px] outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(214,235,230,0.75)" }}
          >
            {["WhatsApp Simulator", "Instagram Simulator", "Discord Simulator", "GatherTown Simulator", "Web Chat"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <select
            value={youthId}
            onChange={(e) => setYouthId(e.target.value)}
            className="px-3 py-2 rounded-[9px] text-[12.5px] outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(214,235,230,0.75)" }}
          >
            {Array.from(new Map(cases.map((item) => [item.youthId, item])).values()).map((item) => (
              <option key={item.youthId} value={item.youthId}>
                {item.youthName}
              </option>
            ))}
          </select>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="px-3 py-2 rounded-[9px] text-[12.5px] outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(214,235,230,0.8)" }}
          />
          <button
            type="button"
            disabled={simulating || !youthId}
            onClick={() => void simulate()}
            className="px-4 py-2 rounded-[9px] text-[12.5px] font-semibold transition-all disabled:opacity-40"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "#f1f6f4" }}
          >
            Simulate
          </button>
        </div>
      </section>

      <section className="glass-card overflow-hidden">
        <div className="border-b border-white/10 px-5 py-4">
          <p className="sb-eyebrow mb-2">Safety audit trail</p>
          <p className="text-[13px] text-[rgba(214,235,230,0.5)]">
            AI actions, consent events, and reassignment activity appear here in time order.
          </p>
        </div>
        {audit.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-[rgba(214,235,230,0.45)]">
                  <th className="px-5 py-4 font-semibold">Event</th>
                  <th className="px-5 py-4 font-semibold">Entity</th>
                  <th className="px-5 py-4 font-semibold">Details</th>
                  <th className="px-5 py-4 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((row) => {
                  const colors = auditEventColor(row.eventType);
                  return (
                    <tr key={row.id} className="border-t border-white/8">
                      <td className="px-5 py-4 align-top">
                        <span
                          className="inline-block rounded-full px-2.5 py-1 text-[10.5px] font-semibold"
                          style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.color }}
                        >
                          {label(row.eventType)}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-top text-[13px] text-[rgba(214,235,230,0.7)]">
                        {row.entityType}
                      </td>
                      <td className="px-5 py-4 align-top text-[13px] leading-6 text-[rgba(214,235,230,0.66)]">
                        {row.details}
                      </td>
                      <td className="px-5 py-4 align-top text-[12px] font-mono text-[rgba(214,235,230,0.35)]">
                        {new Date(row.createdAt).toLocaleString("en-SG")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-[13px] text-[rgba(214,235,230,0.45)]">
            No audit events available yet.
          </div>
        )}
      </section>
    </div>
  );
}

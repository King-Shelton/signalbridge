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

type WorkerView = Worker & {
  workerId: string;
  workerName: string;
  activeCases: number;
  highRiskCases: number;
  unresolvedHandoffs: number;
  loadScore: number;
  pressure: string;
  recommendation: string;
  loadRank: number;
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

function pressureTone(pressure: string) {
  if (pressure === "high") return { bg: "rgba(217,95,72,0.15)", border: "rgba(217,95,72,0.32)", color: "#e88d78" };
  if (pressure === "moderate") return { bg: "rgba(183,121,31,0.15)", border: "rgba(183,121,31,0.3)", color: "#e9c685" };
  return { bg: "rgba(31,111,100,0.15)", border: "rgba(31,111,100,0.3)", color: "#6fb8aa" };
}

export default function SupervisorPage() {
  const [loads, setLoads] = useState<Load[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [cases, setCases] = useState<ConversationItem[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [channel, setChannel] = useState("WhatsApp Simulator");
  const [youthId, setYouthId] = useState("");
  const [message, setMessage] = useState("I do not want to go to school tomorrow. People keep sharing edited photos of me.");
  const [notice, setNotice] = useState("");
  const [assignmentModalCase, setAssignmentModalCase] = useState<ConversationItem | null>(null);
  const [assignmentWorkerId, setAssignmentWorkerId] = useState("");

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

    if ([l, w, c, a, stats].every((result) => result.status === "rejected")) {
      setError("Could not load supervisor data. Check the API is running.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const workerCards: WorkerView[] = useMemo(() => {
    const loadMap = new Map(loads.map((item) => [item.workerId, item]));

    return workers
      .map((worker) => {
        const load = loadMap.get(worker.id);
        if (!load) {
          return {
            ...worker,
            workerId: worker.id,
            workerName: worker.name,
            activeCases: 0,
            highRiskCases: 0,
            unresolvedHandoffs: 0,
            loadScore: 0,
            pressure: "steady",
            recommendation: "No live load data yet",
            loadRank: Number.MAX_SAFE_INTEGER,
          };
        }

        return {
          ...worker,
          ...load,
          loadRank: 0,
        };
      })
      .sort((a, b) => b.loadScore - a.loadScore)
      .map((item, index) => ({ ...item, loadRank: index + 1 }));
  }, [loads, workers]);

  const bestFitWorker = workerCards[workerCards.length - 1] ?? null;
  const openCases = useMemo(() => cases.filter((item) => item.case?.status !== "closed"), [cases]);
  const workerMap = useMemo(() => new Map(workerCards.map((worker) => [worker.id, worker])), [workerCards]);
  const modalWorker = assignmentWorkerId ? workerMap.get(assignmentWorkerId) ?? null : null;

  function openReassignModal(item: ConversationItem) {
    setAssignmentModalCase(item);
    setAssignmentWorkerId(bestFitWorker?.id ?? workerCards[0]?.id ?? "");
  }

  async function confirmReassign() {
    if (!assignmentModalCase || !assignmentWorkerId) return;

    try {
      await apiFetch(`/supervisor/cases/${assignmentModalCase.case!.id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ workerId: assignmentWorkerId }),
      });
      setNotice("Case reassigned and worker notified.");
      setAssignmentModalCase(null);
      setAssignmentWorkerId("");
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

  const topRiskCases = useMemo(
    () =>
      [...openCases]
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, 6),
    [openCases]
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="sb-eyebrow mb-2">Operational oversight</p>
          <h1 className="text-[28px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.025em" }}>
            Protect continuity and worker capacity.
          </h1>
          <p className="mt-2 text-[13px] text-[rgba(214,235,230,0.5)] max-w-2xl">
            Compare worker load, spot unresolved cases, and reassign safely when one caseload starts to strain the team.
          </p>
        </div>
        <div className="glass-card px-4 py-3 min-w-[220px]">
          <p className="sb-eyebrow mb-1">Supervisor view</p>
          <p className="text-[13px] text-[rgba(214,235,230,0.6)]">
            {workerCards.length} workers, {openCases.length} active cases
          </p>
        </div>
      </div>

      {notice && (
        <div className="text-[13px] text-[#6fb8aa] bg-[rgba(31,111,100,0.12)] border border-[rgba(31,111,100,0.25)] rounded-xl px-4 py-3">
          {notice}
        </div>
      )}

      {error && (
        <div className="text-[13px] text-[#e88d78] bg-[rgba(217,95,72,0.1)] border border-[rgba(217,95,72,0.2)] rounded-xl px-4 py-3 flex items-center gap-3">
          {error}
          <button onClick={() => void load()} className="underline">
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

      {workerCards.length > 0 && (
        <section className="glass-card p-5 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="sb-eyebrow mb-2">Worker comparison</p>
              <h2 className="text-[18px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.015em" }}>
                Compare active load before you move a case.
              </h2>
            </div>
            {bestFitWorker && (
              <div className="rounded-2xl border px-4 py-3 text-[12.5px]" style={{ background: "rgba(31,111,100,0.1)", borderColor: "rgba(111,184,170,0.25)", color: "#cce9e3" }}>
                Best fit right now: <span className="font-semibold text-[#f1f6f4]">{bestFitWorker.name}</span>
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {workerCards.map((worker) => {
              const colors = loadColor(worker.loadScore);
              const pressure = pressureTone(worker.pressure);
              const isBestFit = bestFitWorker?.id === worker.id;
              const maxScore = Math.max(...workerCards.map((item) => item.loadScore), 1);
              const width = Math.max(10, (worker.loadScore / maxScore) * 100);

              return (
                <article key={worker.id} className="rounded-[18px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[16px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.01em" }}>
                          {worker.name}
                        </h3>
                        {isBestFit && (
                          <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(31,111,100,0.16)", border: "1px solid rgba(111,184,170,0.25)", color: "#aee0d6" }}>
                            Best fit
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[12px] text-[rgba(214,235,230,0.38)]">{worker.email}</p>
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}>
                      {label(worker.pressure)} - {worker.loadScore}
                    </span>
                  </div>

                  <div className="mt-4 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${width}%`, background: colors.bar }} />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
                    <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] px-3 py-2">
                      <p className="text-[rgba(214,235,230,0.38)]">Active</p>
                      <p className="mt-1 text-[13px] font-semibold text-[#f1f6f4]">{worker.activeCases}</p>
                    </div>
                    <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] px-3 py-2">
                      <p className="text-[rgba(214,235,230,0.38)]">High risk</p>
                      <p className="mt-1 text-[13px] font-semibold text-[#f1f6f4]">{worker.highRiskCases}</p>
                    </div>
                    <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] px-3 py-2">
                      <p className="text-[rgba(214,235,230,0.38)]">Unresolved</p>
                      <p className="mt-1 text-[13px] font-semibold text-[#f1f6f4]">{worker.unresolvedHandoffs}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border px-3 py-3 text-[12.5px] leading-relaxed" style={{ background: pressure.bg, borderColor: pressure.border, color: pressure.color }}>
                    {worker.recommendation}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {workerCards.length > 0 && (
        <section className="glass-card p-5 space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="sb-eyebrow mb-2">Worker list</p>
              <h2 className="text-[18px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.015em" }}>
                Quick scan of each worker load.
              </h2>
            </div>
            <p className="text-[12.5px] text-[rgba(214,235,230,0.45)]">
              Sorted by current load score.
            </p>
          </div>

          <div className="overflow-hidden rounded-[18px] border border-[rgba(255,255,255,0.07)]">
            {workerCards.map((worker, index) => {
              const colors = loadColor(worker.loadScore);
              return (
                <div
                  key={worker.id}
                  className={`grid gap-3 p-4 ${index !== workerCards.length - 1 ? "border-b border-[rgba(255,255,255,0.07)]" : ""} md:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_0.8fr_1fr_auto] md:items-center`}
                  style={{ background: "rgba(255,255,255,0.02)" }}
                >
                  <div>
                    <p className="text-[13.5px] font-semibold text-[#f1f6f4]">{worker.name}</p>
                    <p className="text-[12px] text-[rgba(214,235,230,0.38)]">{worker.email}</p>
                  </div>
                  <div className="text-[12.5px] text-[rgba(214,235,230,0.62)]">
                    <span className="text-[rgba(214,235,230,0.38)] md:hidden">Active: </span>
                    {worker.activeCases}
                  </div>
                  <div className="text-[12.5px] text-[rgba(214,235,230,0.62)]">
                    <span className="text-[rgba(214,235,230,0.38)] md:hidden">High risk: </span>
                    {worker.highRiskCases}
                  </div>
                  <div className="text-[12.5px] text-[rgba(214,235,230,0.62)]">
                    <span className="text-[rgba(214,235,230,0.38)] md:hidden">Unresolved: </span>
                    {worker.unresolvedHandoffs}
                  </div>
                  <div className="text-[12.5px] font-semibold" style={{ color: colors.text }}>
                    <span className="text-[rgba(214,235,230,0.38)] md:hidden">Score: </span>
                    {worker.loadScore}
                  </div>
                  <div className="text-[12.5px] text-[rgba(214,235,230,0.6)]">
                    {worker.recommendation}
                  </div>
                  <div className="flex justify-start md:justify-end">
                    <span className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full" style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}>
                      {label(worker.pressure)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {topRiskCases.length > 0 && (
        <section className="glass-card p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="sb-eyebrow mb-2">Case reassignment</p>
              <h2 className="text-[18px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.015em" }}>
                Open the modal when a case needs a new owner.
              </h2>
            </div>
            <p className="text-[12.5px] text-[rgba(214,235,230,0.45)] max-w-xl">
              Keep the queue focused on unresolved, high-risk work and move the case to the lowest-pressure worker when needed.
            </p>
          </div>

          <div className="grid gap-3">
            {topRiskCases.map((item) => (
              <div
                key={item.case!.id}
                className="grid gap-3 rounded-[16px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] p-4 md:grid-cols-[1.2fr_1fr_auto]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13.5px] font-semibold text-[#f1f6f4]">{item.youthName}</p>
                    <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(217,95,72,0.15)", border: "1px solid rgba(217,95,72,0.3)", color: "#e88d78" }}>
                      {label(item.riskLevel)} - {item.riskScore}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-[rgba(214,235,230,0.42)]">{item.case!.summary}</p>
                </div>
                <div className="text-[12.5px] text-[rgba(214,235,230,0.62)] leading-relaxed">
                  {item.suggestedAction}
                </div>
                <div className="flex items-center justify-start md:justify-end">
                  <button
                    onClick={() => void openReassignModal(item)}
                    className="px-4 py-2 rounded-[10px] text-[12.5px] font-semibold transition-all"
                    style={{ background: "rgba(31,111,100,0.2)", border: "1px solid rgba(111,184,170,0.3)", color: "#6fb8aa" }}
                  >
                    Open reassignment modal
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="glass-card p-5">
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
            onClick={() => void simulate()}
            className="px-4 py-2 rounded-[9px] text-[12.5px] font-semibold transition-all"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "#f1f6f4" }}
          >
            Simulate
          </button>
        </div>
      </div>

      {audit.length > 0 && (
        <div className="glass-card p-5">
          <p className="sb-eyebrow mb-4">Safety audit trail</p>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {audit.map((row) => {
              const colors = auditEventColor(row.eventType);

              return (
                <div
                  key={row.id}
                  className="p-3 rounded-[11px] flex flex-wrap items-start justify-between gap-2"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <div>
                    <span
                      className="inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold mb-1.5"
                      style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.color }}
                    >
                      {label(row.eventType)}
                    </span>
                    <p className="text-[12px] text-[rgba(214,235,230,0.55)] break-words">
                      {row.entityType} - {row.details}
                    </p>
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

      {assignmentModalCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            aria-label="Close reassignment modal"
            className="absolute inset-0 bg-black/70"
            onClick={() => {
              setAssignmentModalCase(null);
              setAssignmentWorkerId("");
            }}
          />
          <div className="relative z-10 w-full max-w-3xl rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[#081110] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="sb-eyebrow mb-2">Case reassignment</p>
                <h3 className="text-[20px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.02em" }}>
                  Move {assignmentModalCase.youthName} to a lower-pressure worker.
                </h3>
                <p className="mt-2 text-[13px] text-[rgba(214,235,230,0.5)] max-w-2xl">
                  {assignmentModalCase.case?.summary}
                </p>
              </div>
              <button
                onClick={() => {
                  setAssignmentModalCase(null);
                  setAssignmentWorkerId("");
                }}
                className="rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-[12px] font-semibold text-[rgba(214,235,230,0.7)]"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[18px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgba(214,235,230,0.45)]">
                  Current case
                </p>
                <div className="mt-3 space-y-2 text-[13px] text-[rgba(214,235,230,0.62)]">
                  <p>
                    Risk level: <span className="font-semibold text-[#f1f6f4]">{label(assignmentModalCase.riskLevel)}</span>
                  </p>
                  <p>
                    Risk score: <span className="font-semibold text-[#f1f6f4]">{assignmentModalCase.riskScore}</span>
                  </p>
                  <p>
                    Suggested action: <span className="text-[#f1f6f4]">{assignmentModalCase.suggestedAction}</span>
                  </p>
                </div>
              </div>

              <div className="rounded-[18px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgba(214,235,230,0.45)]">
                  Suggested worker
                </p>
                <div className="mt-3">
                  <select
                    value={assignmentWorkerId}
                    onChange={(e) => setAssignmentWorkerId(e.target.value)}
                    className="w-full rounded-[12px] px-3 py-3 text-[13px] outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(214,235,230,0.8)" }}
                  >
                    {workerCards.map((worker) => (
                      <option key={worker.id} value={worker.id}>
                        {worker.name} - load {worker.loadScore}
                      </option>
                    ))}
                  </select>
                </div>
                {modalWorker && (
                  <div
                    className="mt-3 rounded-[14px] border px-3 py-3 text-[12.5px]"
                    style={{
                      background: "rgba(31,111,100,0.08)",
                      borderColor: "rgba(111,184,170,0.25)",
                      color: "#cce9e3",
                    }}
                  >
                    <p className="font-semibold text-[#f1f6f4]">{modalWorker.name}</p>
                    <p className="mt-1">
                      {modalWorker.activeCases} active, {modalWorker.highRiskCases} high-risk, {modalWorker.unresolvedHandoffs} unresolved.
                    </p>
                    <p className="mt-2">{modalWorker.recommendation}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
              <button
                onClick={() => {
                  setAssignmentModalCase(null);
                  setAssignmentWorkerId("");
                }}
                className="px-4 py-2 rounded-[10px] text-[12.5px] font-semibold transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(214,235,230,0.72)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => void confirmReassign()}
                className="px-4 py-2 rounded-[10px] text-[12.5px] font-semibold transition-all"
                style={{ background: "rgba(31,111,100,0.2)", border: "1px solid rgba(111,184,170,0.3)", color: "#6fb8aa" }}
              >
                Confirm reassignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

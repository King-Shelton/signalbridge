"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { label } from "@/lib/operations";

type AuditLog = {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string | null;
  actorUserId: string | null;
  details: string;
  createdAt: string;
};

function eventColors(type: string) {
  if (type.includes("escalat"))
    return { bg: "rgba(217,95,72,0.15)", border: "rgba(217,95,72,0.3)", color: "#e88d78" };
  if (type.includes("consent"))
    return { bg: "rgba(183,121,31,0.12)", border: "rgba(183,121,31,0.25)", color: "#e9c685" };
  if (type.includes("ai") || type.includes("safenight"))
    return { bg: "rgba(31,111,100,0.12)", border: "rgba(31,111,100,0.25)", color: "#6fb8aa" };
  return { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.1)", color: "rgba(214,235,230,0.6)" };
}

export default function SupervisorAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setLogs((await apiFetch<{ logs: AuditLog[] }>("/audit/logs?limit=200")).logs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load audit logs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      <header>
        <p className="sb-eyebrow mb-2">Supervisor · Safety audit trail</p>
        <h1 className="text-[28px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.025em" }}>
          Every AI decision and consent event
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[rgba(214,235,230,0.5)] max-w-2xl">
          A chronological record of AI actions, consent events, status changes, and risk analyses.
          Use this to verify the system acted within its guardrails.
        </p>
      </header>

      {loading && (
        <div className="flex items-center gap-3 text-[rgba(214,235,230,0.5)] text-sm">
          <div className="w-4 h-4 rounded-full border-2 border-[#6fb8aa] border-t-transparent animate-spin" />
          Loading audit trail…
        </div>
      )}

      {error && (
        <div className="text-[13px] text-[#e88d78] bg-[rgba(217,95,72,0.1)] border border-[rgba(217,95,72,0.2)] rounded-xl px-4 py-3 flex items-center gap-3">
          {error}
          <button type="button" onClick={() => void load()} className="underline text-[#e88d78]">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && logs.length === 0 && (
        <div className="glass-card p-8 text-center">
          <p className="text-[rgba(214,235,230,0.4)] text-sm">No audit events recorded yet.</p>
        </div>
      )}

      <div className="space-y-2">
        {logs.map((row) => {
          let details: Record<string, unknown> = {};
          try {
            details = JSON.parse(row.details) as Record<string, unknown>;
          } catch {
            /* keep empty */
          }
          const colors = eventColors(row.eventType);

          return (
            <article
              key={row.id}
              className="rounded-[14px] p-4"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold"
                    style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.color }}
                  >
                    {label(row.eventType)}
                  </span>
                  <span
                    className="inline-block px-2.5 py-0.5 rounded-full text-[10.5px]"
                    style={{ background: "rgba(255,255,255,0.05)", color: "rgba(214,235,230,0.45)" }}
                  >
                    {row.entityType}
                    {row.entityId ? ` · ${row.entityId.slice(0, 16)}…` : ""}
                  </span>
                </div>
                <time className="text-[11px] font-mono text-[rgba(214,235,230,0.3)] flex-shrink-0">
                  {new Date(row.createdAt).toLocaleString("en-SG")}
                </time>
              </div>

              {Object.keys(details).length > 0 && (
                <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
                  {Object.entries(details).map(([key, value]) => (
                    <div key={key} className="flex gap-1 text-[12px]">
                      <dt className="font-semibold text-[rgba(214,235,230,0.4)]">{key}:</dt>
                      <dd className="text-[rgba(214,235,230,0.65)]">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {row.actorUserId && (
                <p className="mt-2 text-[11px] text-[rgba(214,235,230,0.3)]">Actor: {row.actorUserId}</p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

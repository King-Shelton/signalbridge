"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { label } from "@/lib/operations";
import { OperationsState } from "@/components/OperationsState";

type AuditLog = {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string | null;
  actorUserId: string | null;
  details: string;
  createdAt: string;
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setLogs((await apiFetch<{ logs: AuditLog[] }>("/audit/logs?limit=100")).logs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load audit logs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-pine">Safety audit trail</p>
        <h2 className="mt-2 text-3xl font-semibold text-ink">Every AI decision and consent event</h2>
        <p className="mt-3 text-sm text-slate-600">
          A chronological record of AI actions, consent events, status changes, and risk analyses.
          Use this to verify the system acted within its guardrails.
        </p>
      </section>

      <OperationsState loading={loading} error={error} empty={!logs.length} retry={load}>
        <section className="space-y-2">
          {logs.map((row) => {
            let details: Record<string, unknown> = {};
            try { details = JSON.parse(row.details) as Record<string, unknown>; } catch { /* raw string */ }

            return (
              <article
                key={row.id}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-pine/10 px-2.5 py-1 text-xs font-semibold text-pine">
                      {label(row.eventType)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                      {row.entityType}
                      {row.entityId ? ` · ${row.entityId}` : ""}
                    </span>
                  </div>
                  <time className="text-xs text-slate-400">
                    {new Date(row.createdAt).toLocaleString()}
                  </time>
                </div>

                {Object.keys(details).length > 0 && (
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
                    {Object.entries(details).map(([k, v]) => (
                      <div key={k} className="flex gap-1">
                        <dt className="font-semibold text-slate-500">{k}:</dt>
                        <dd className="text-slate-700">{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {row.actorUserId && (
                  <p className="mt-2 text-xs text-slate-400">Actor: {row.actorUserId}</p>
                )}
              </article>
            );
          })}
        </section>
      </OperationsState>
    </div>
  );
}

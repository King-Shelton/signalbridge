"use client";

import { AlertTriangle, CheckCircle2, Clock3, FileClock, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchAuditLogs, type AuditLogItem } from "@/lib/api-client";
import { readAuthSession } from "@/lib/auth-session";

type AuditSeverity = "critical" | "high" | "medium" | "low";

const eventCopy: Record<
  string,
  {
    label: string;
    severity: AuditSeverity;
  }
> = {
  ai_response_generated: { label: "AI response generated", severity: "medium" },
  safenight_fallback_response_created: { label: "AI response generated", severity: "medium" },
  handoff_consent_received: { label: "Handoff consent received", severity: "low" },
  handoff_consent_updated: { label: "Handoff consent received", severity: "low" },
  risk_signal_extracted: { label: "Risk signal extracted", severity: "high" },
  ai_risk_analysis_completed: { label: "Risk signal extracted", severity: "high" },
  handoff_created: { label: "Handoff created", severity: "high" },
  ai_handoff_brief_created: { label: "Handoff created", severity: "high" },
  worker_reviewed: { label: "Worker reviewed", severity: "medium" },
  worker_handoff_reviewed: { label: "Worker reviewed", severity: "medium" },
  worker_conversation_reviewed: { label: "Worker reviewed", severity: "medium" },
  case_reassigned: { label: "Case reassigned", severity: "medium" },
  case_status_updated: { label: "Case updated", severity: "medium" },
  case_note_added: { label: "Case note added", severity: "low" },
  seed_data_created: { label: "Seed data created", severity: "low" }
};

const severityStyles: Record<AuditSeverity, string> = {
  critical: "bg-coral text-white",
  high: "bg-coral/10 text-coral ring-1 ring-coral/20",
  medium: "bg-amber/10 text-amber ring-1 ring-amber/20",
  low: "bg-pine/10 text-pine ring-1 ring-pine/20"
};

function humaniseEventType(eventType: string) {
  return eventType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function readableDetails(details: string | null) {
  if (!details) {
    return "No extra audit details recorded.";
  }

  try {
    const parsed = JSON.parse(details) as Record<string, unknown>;
    return Object.entries(parsed)
      .map(([key, value]) => `${humaniseEventType(key)}: ${String(value)}`)
      .join(" | ");
  } catch {
    return details;
  }
}

const fallbackLogs: AuditLogItem[] = [
  {
    id: "fallback_case_reassigned",
    actorUserId: "user_supervisor",
    actorName: "Daniel Lim",
    eventType: "case_reassigned",
    entityType: "case",
    entityId: "case_jay_001",
    details: "Supervisor reassigned one medium-risk case to reduce morning worker load pressure.",
    createdAt: new Date().toISOString()
  },
  {
    id: "fallback_worker_reviewed",
    actorUserId: "user_worker_1",
    actorName: "Aisha Rahman",
    eventType: "worker_reviewed",
    entityType: "handoff_brief",
    entityId: "handoff_mira_current",
    details: "Aisha reviewed the pending handoff before opening the morning worker response.",
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString()
  },
  {
    id: "fallback_handoff_created",
    actorUserId: null,
    actorName: null,
    eventType: "handoff_created",
    entityType: "handoff_brief",
    entityId: "handoff_mira_current",
    details: "AI handoff brief created with the youth quote, risk score, and guidance on what not to repeat.",
    createdAt: new Date(Date.now() - 75 * 60 * 1000).toISOString()
  },
  {
    id: "fallback_signal",
    actorUserId: null,
    actorName: null,
    eventType: "risk_signal_extracted",
    entityType: "signal",
    entityId: "signal_mira_001",
    details: "Cyberbullying and school avoidance signals were extracted from the approved conversation context.",
    createdAt: new Date(Date.now() - 80 * 60 * 1000).toISOString()
  },
  {
    id: "fallback_consent",
    actorUserId: "user_mira",
    actorName: "Mira Tan",
    eventType: "handoff_consent_received",
    entityType: "conversation",
    entityId: "conv_mira_after_hours",
    details: "Mira approved sharing a short handoff note with her assigned worker.",
    createdAt: new Date(Date.now() - 85 * 60 * 1000).toISOString()
  },
  {
    id: "fallback_ai_response",
    actorUserId: null,
    actorName: null,
    eventType: "ai_response_generated",
    entityType: "conversation",
    entityId: "conv_mira_after_hours",
    details: "SafeNight generated a safety-bounded first response for Mira's after-hours cyberbullying message.",
    createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString()
  }
];

export default function SupervisorAuditPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");

  useEffect(() => {
    const session = readAuthSession();
    if (!session) {
      setLogs(fallbackLogs);
      setStatus("fallback");
      return;
    }

    fetchAuditLogs(session.accessToken)
      .then((response) => {
        setLogs(response.logs.length ? response.logs : fallbackLogs);
        setStatus("ready");
      })
      .catch(() => {
        setLogs(fallbackLogs);
        setStatus("fallback");
      });
  }, []);

  const counts = useMemo(() => {
    return logs.reduce(
      (acc, log) => {
        const severity = eventCopy[log.eventType]?.severity ?? "low";
        acc[severity] += 1;
        return acc;
      },
      { critical: 0, high: 0, medium: 0, low: 0 } as Record<AuditSeverity, number>
    );
  }, [logs]);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">
              Safety Audit Log
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Trace every AI-assisted handoff decision.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Supervisors can see when SignalBridge generated a response, captured
              consent, extracted risk signals, created handoffs, and recorded
              worker or reassignment actions.
            </p>
          </div>
          <div className="rounded-2xl border border-pine/15 bg-pine/5 px-4 py-3 text-sm text-slate-600">
            <div className="flex items-center gap-2 font-semibold text-pine">
              {status === "loading" ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              )}
              {status === "fallback" ? "Demo fallback view" : "Live audit feed"}
            </div>
            <p className="mt-1 text-xs text-slate-500">Readable timestamps and event types</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "High severity", value: counts.high, icon: AlertTriangle, tone: "text-coral" },
          { label: "Medium severity", value: counts.medium, icon: FileClock, tone: "text-amber" },
          { label: "Low severity", value: counts.low, icon: CheckCircle2, tone: "text-pine" },
          { label: "Total events", value: logs.length, icon: Clock3, tone: "text-slate-600" }
        ].map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {card.label}
                </p>
                <Icon aria-hidden="true" className={`h-4 w-4 ${card.tone}`} />
              </div>
              <p className="mt-3 text-3xl font-semibold text-ink">{card.value}</p>
            </article>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Audit trail
          </p>
          <h3 className="mt-2 text-xl font-semibold text-ink">Mira handoff journey</h3>
        </div>

        <div className="divide-y divide-slate-200">
          {logs.map((log) => {
            const copy = eventCopy[log.eventType] ?? {
              label: humaniseEventType(log.eventType),
              severity: "low" as AuditSeverity
            };

            return (
              <article key={log.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[170px_1fr_auto] lg:items-start">
                <div>
                  <p className="text-sm font-semibold text-ink">{formatTimestamp(log.createdAt)}</p>
                  <p className="mt-1 text-xs text-slate-500">{log.actorName ?? "SignalBridge system"}</p>
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-semibold text-ink">{copy.label}</h4>
                    <span className="rounded-full bg-mist px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {log.entityType.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{readableDetails(log.details)}</p>
                  <p className="mt-2 font-mono text-xs text-slate-400">{log.entityId}</p>
                </div>

                <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${severityStyles[copy.severity]}`}>
                  {copy.severity.charAt(0).toUpperCase() + copy.severity.slice(1)}
                </span>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

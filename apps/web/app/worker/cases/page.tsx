"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { caseStatuses, ConversationItem, label } from "@/lib/operations";
import { OperationsState } from "@/components/OperationsState";

function priorityBadge(level: string) {
  if (level === "high" || level === "critical") return "risk-badge-high";
  if (level === "medium") return "risk-badge-medium";
  return "risk-badge-low";
}

export default function CasesPage() {
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState("");
  const [confirmEscalate, setConfirmEscalate] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ conversations: ConversationItem[] }>("/worker/cockpit");
      setItems(data.conversations.filter((item) => item.case));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load cases");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(caseId: string, value: string) {
    if (value === "escalated" && confirmEscalate !== caseId) {
      setConfirmEscalate(caseId);
      return;
    }

    setConfirmEscalate(null);
    setSaving(caseId);
    try {
      await apiFetch(`/worker/cases/${caseId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: value }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving("");
    }
  }

  async function addNote(caseId: string) {
    if (!notes[caseId]?.trim()) return;

    setSaving(caseId);
    try {
      await apiFetch(`/worker/cases/${caseId}/notes`, {
        method: "POST",
        body: JSON.stringify({ content: notes[caseId] }),
      });
      setNotes({ ...notes, [caseId]: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Note failed");
    } finally {
      setSaving("");
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <p className="sb-eyebrow mb-2">Case workflow</p>
        <h1 className="text-[28px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.025em" }}>
          Move every follow-up to a clear state.
        </h1>
      </div>

      <OperationsState
        loading={loading}
        error={error}
        empty={!items.length}
        retry={load}
        emptyTitle="No active cases"
        emptyDescription="There are no open case follow-ups right now. Use the cockpit to review conversations and come back when a new case appears."
        emptyActionHref="/worker/cockpit"
        emptyActionLabel="Open cockpit"
      >
        <div className="space-y-4">
          {items.map((item) => (
            <article key={item.case!.id} className="glass-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-[16px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.01em" }}>
                    {item.youthName}
                  </h3>
                  <p className="mt-0.5 text-[12.5px] text-[rgba(214,235,230,0.5)] leading-relaxed">
                    {item.case!.summary}
                  </p>
                </div>
                <span className={priorityBadge(item.case!.priority)}>{label(item.case!.priority)}</span>
              </div>

              <div className="flex flex-wrap gap-1 mb-4 glass-card p-1">
                {caseStatuses.map((status) => {
                  const active = item.case!.status === status;
                  const isEscalate = status === "escalated";

                  return (
                    <button
                      key={status}
                      type="button"
                      disabled={saving === item.case!.id}
                      onClick={() => void updateStatus(item.case!.id, status)}
                      className="px-3 py-1.5 rounded-[8px] text-[11.5px] font-medium capitalize transition-all disabled:opacity-50"
                      style={{
                        background: active
                          ? isEscalate
                            ? "rgba(217,95,72,0.2)"
                            : "rgba(31,111,100,0.25)"
                          : "transparent",
                        color: active
                          ? isEscalate
                            ? "#e88d78"
                            : "#6fb8aa"
                          : "rgba(214,235,230,0.45)",
                        border: active
                          ? isEscalate
                            ? "1px solid rgba(217,95,72,0.3)"
                            : "1px solid rgba(111,184,170,0.3)"
                          : "1px solid transparent",
                      }}
                    >
                      {label(status)}
                    </button>
                  );
                })}
              </div>

              {confirmEscalate === item.case!.id && (
                <div
                  className="mb-4 p-3 rounded-[11px] text-[12.5px]"
                  style={{ background: "rgba(217,95,72,0.1)", border: "1px solid rgba(217,95,72,0.25)" }}
                >
                  <p className="text-[#e88d78] mb-3">
                    Confirm escalation? This will notify a supervisor immediately.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void updateStatus(item.case!.id, "escalated")}
                      className="px-4 py-1.5 rounded-[8px] text-[12px] font-semibold"
                      style={{ background: "rgba(217,95,72,0.2)", border: "1px solid rgba(217,95,72,0.3)", color: "#e88d78" }}
                    >
                      Yes, escalate
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmEscalate(null)}
                      className="px-4 py-1.5 rounded-[8px] text-[12px] font-medium text-[rgba(214,235,230,0.5)]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  value={notes[item.case!.id] ?? ""}
                  onChange={(e) => setNotes({ ...notes, [item.case!.id]: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void addNote(item.case!.id);
                  }}
                  placeholder="Add a concise worker note..."
                  className="flex-1 px-3 py-2 rounded-[9px] text-[13px] outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(214,235,230,0.8)" }}
                />
                <button
                  type="button"
                  disabled={saving === item.case!.id || !notes[item.case!.id]?.trim()}
                  onClick={() => void addNote(item.case!.id)}
                  className="px-4 py-2 rounded-[9px] text-[12.5px] font-semibold transition-all disabled:opacity-40"
                  style={{ background: "rgba(31,111,100,0.2)", border: "1px solid rgba(111,184,170,0.3)", color: "#6fb8aa" }}
                >
                  Add note
                </button>
              </div>
            </article>
          ))}
        </div>
      </OperationsState>
    </div>
  );
}

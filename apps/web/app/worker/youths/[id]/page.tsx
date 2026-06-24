"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { Handoff, label } from "@/lib/operations";

type Youth = {
  id: string;
  name: string;
  preferredChannel: string;
  assignedWorker?: string;
  supportStyle?: string;
  stressors?: string;
  cases: Array<{ id: string; status: string; priority: string; summary: string }>;
  handoffs: Handoff[];
  notes: Array<{ id: string; content: string }>;
};

function caseStatusColor(status: string) {
  if (status === "open" || status === "active") return { bg: "rgba(217,95,72,0.12)", border: "rgba(217,95,72,0.25)", color: "#e88d78" };
  if (status === "in_progress") return { bg: "rgba(183,121,31,0.12)", border: "rgba(183,121,31,0.25)", color: "#e9c685" };
  return { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)", color: "rgba(214,235,230,0.5)" };
}

export default function YouthPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  const [data, setData] = useState<Youth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void params.then((value) => setId(value.id));
  }, [params]);


  const load = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      setData(await apiFetch<Youth>(`/worker/youths/${id}`));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load youth context");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-3 text-[rgba(214,235,230,0.5)] text-sm">
        <div className="w-4 h-4 rounded-full border-2 border-[#6fb8aa] border-t-transparent animate-spin" />
        Loading memory card...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="text-[13px] text-[#e88d78] bg-[rgba(217,95,72,0.1)] border border-[rgba(217,95,72,0.2)] rounded-xl px-4 py-3 flex items-center gap-3">
          {error || "Youth not found"}
          <button type="button" onClick={() => void load()} className="underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stressors = data.stressors?.split(",").map((value) => value.trim()).filter(Boolean) ?? [];

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div className="glass-card p-6">
        <p className="sb-eyebrow mb-2">Youth memory card</p>
        <h1 className="text-[28px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.025em" }}>
          {data.name}
        </h1>
        <div className="mt-3 flex flex-wrap gap-3">
          <span className="px-3 py-1 rounded-full text-[12px] font-medium" style={{ background: "rgba(31,111,100,0.15)", border: "1px solid rgba(31,111,100,0.3)", color: "#6fb8aa" }}>
            {data.preferredChannel}
          </span>
          <span className="px-3 py-1 rounded-full text-[12px] font-medium" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(214,235,230,0.6)" }}>
            Assigned to {data.assignedWorker ?? "Unassigned"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card p-5" style={{ borderLeft: "3px solid rgba(111,184,170,0.4)" }}>
          <p className="sb-eyebrow mb-3">Helpful support approach</p>
          <p className="text-[14px] text-[rgba(214,235,230,0.8)] leading-relaxed">{data.supportStyle ?? "No style recorded yet."}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Listen first", "No rapid-fire questions", "Normalise feelings"].map((tip) => (
              <span
                key={tip}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                style={{ background: "rgba(31,111,100,0.12)", border: "1px solid rgba(31,111,100,0.25)", color: "#6fb8aa" }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {tip}
              </span>
            ))}
          </div>
        </div>

        <div className="glass-card p-5">
          <p className="sb-eyebrow mb-3">Known stressors</p>
          {stressors.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {stressors.map((stress) => (
                <span
                  key={stress}
                  className="px-3 py-1.5 rounded-full text-[12px] font-medium"
                  style={{ background: "rgba(217,95,72,0.12)", border: "1px solid rgba(217,95,72,0.25)", color: "#e88d78" }}
                >
                  {stress}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-[rgba(214,235,230,0.5)]">{data.stressors ?? "No stressors recorded."}</p>
          )}
        </div>
      </div>

      <div className="glass-card p-5">
        <p className="sb-eyebrow mb-4">Cases and follow-up</p>
        {data.cases.length > 0 ? (
          <div className="space-y-2">
            {data.cases.map((item) => {
              const colors = caseStatusColor(item.status);
              return (
                <div key={item.id} className="p-3 rounded-[12px] flex items-start gap-3" style={{ background: colors.bg, border: `1px solid ${colors.border}` }}>
                  <span className="text-[11px] font-semibold mt-0.5 flex-shrink-0" style={{ color: colors.color }}>
                    {label(item.status)}
                  </span>
                  <p className="text-[13px] text-[rgba(214,235,230,0.7)] leading-relaxed">{item.summary}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[13px] text-[rgba(214,235,230,0.4)]">No cases yet.</p>
        )}
      </div>

      <div className="glass-card p-5">
        <p className="sb-eyebrow mb-4">Previous approved handoffs</p>
        {data.handoffs.length > 0 ? (
          <div className="space-y-3">
            {data.handoffs.map((handoff) => (
              <Link
                key={handoff.id}
                href={`/worker/handoffs/${handoff.id}`}
                className="flex items-start gap-4 p-3 rounded-[12px] transition-all hover:bg-white/5"
                style={{ border: "1px solid rgba(111,184,170,0.15)" }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#6fb8aa] mt-2 flex-shrink-0" />
                <div>
                  <p className="text-[11.5px] font-mono text-[rgba(214,235,230,0.35)]">
                    {new Date(handoff.createdAt).toLocaleString("en-SG")}
                  </p>
                  <p className="text-[13.5px] text-[rgba(214,235,230,0.75)] mt-0.5">{handoff.mainConcern}</p>
                </div>
                <svg className="ml-auto mt-0.5 flex-shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(111,184,170,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-[rgba(214,235,230,0.4)]">No approved handoffs yet.</p>
        )}
      </div>

      <div className="glass-card p-5">
        <p className="sb-eyebrow mb-4">Worker notes</p>
        {data.notes.length > 0 ? (
          <div className="space-y-2">
            {data.notes.map((note) => (
              <p
                key={note.id}
                className="p-3 rounded-[12px] text-[13px] text-[rgba(214,235,230,0.7)] leading-relaxed"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                {note.content}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-[rgba(214,235,230,0.4)]">No notes yet.</p>
        )}
      </div>
    </div>
  );
}

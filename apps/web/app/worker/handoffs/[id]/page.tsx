"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, downloadAuthenticated } from "@/lib/api-client";
import { Handoff, label } from "@/lib/operations";

function riskBadgeClass(level: string) {
  if (level === "high" || level === "critical") return "risk-badge-high";
  if (level === "medium") return "risk-badge-medium";
  return "risk-badge-low";
}

function riskScore(level: string) {
  if (level === "high" || level === "critical") return "#e88d78";
  if (level === "medium") return "#e9c685";
  return "#6fb8aa";
}

export default function HandoffPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  const [data, setData] = useState<Handoff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void params.then((value) => setId(value.id));
  }, [params]);

  const load = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      setData(await apiFetch<Handoff>(`/worker/handoffs/${id}`));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load handoff");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function review(status: string) {
    setSaving(true);
    try {
      setData(await apiFetch<Handoff>(`/worker/handoffs/${id}/review`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed");
    } finally {
      setSaving(false);
    }
  }

  function copyResponse() {
    if (!data?.suggestedWorkerResponse) return;

    void navigator.clipboard.writeText(data.suggestedWorkerResponse).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-3 text-[rgba(214,235,230,0.5)] text-sm">
        <div className="w-4 h-4 rounded-full border-2 border-[#6fb8aa] border-t-transparent animate-spin" />
        Loading handoff brief...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="text-[13px] text-[#e88d78] bg-[rgba(217,95,72,0.1)] border border-[rgba(217,95,72,0.2)] rounded-xl px-4 py-3 flex items-center gap-3">
          {error || "Handoff not found"}
          <button type="button" onClick={() => void load()} className="underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div className="glass-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="sb-eyebrow mb-2">Youth-approved handoff</p>
            <h1 className="text-[28px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.025em" }}>
              {data.youthName}
            </h1>
            <p className="mt-2 text-[12px] font-mono text-[rgba(214,235,230,0.35)]">
              Status: {label(data.reviewStatus)} | Created {new Date(data.createdAt).toLocaleString("en-SG")}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={riskBadgeClass(data.riskLevel)}>{label(data.riskLevel)}</span>
            <span className="text-[36px] font-semibold font-mono" style={{ color: riskScore(data.riskLevel), letterSpacing: "-0.03em" }}>
              {data.riskScore}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card p-5">
          <p className="sb-eyebrow mb-3">Main concern</p>
          <p className="text-[14px] text-[rgba(214,235,230,0.8)] leading-relaxed">{data.mainConcern}</p>
        </div>
        <div className="glass-card p-5">
          <p className="sb-eyebrow mb-3">Emotional state</p>
          <p className="text-[14px] text-[rgba(214,235,230,0.8)] leading-relaxed">{data.emotionalState}</p>
        </div>
      </div>

      <div className="glass-card p-5 relative overflow-hidden" style={{ borderLeft: "3px solid rgba(111,184,170,0.5)" }}>
        <div className="absolute top-4 right-5 text-[80px] font-serif text-[rgba(111,184,170,0.08)] leading-none select-none">
          &ldquo;
        </div>
        <p className="sb-eyebrow mb-3">Key quote</p>
        <p className="text-[18px] italic text-[#f1f6f4] leading-relaxed" style={{ letterSpacing: "-0.01em" }}>
          &ldquo;{data.keyQuote}&rdquo;
        </p>
      </div>

      <div className="glass-card p-5">
        <p className="sb-eyebrow mb-3">What AI did</p>
        <p className="text-[14px] text-[rgba(214,235,230,0.7)] leading-relaxed">{data.whatAiDid}</p>
      </div>

      <div className="p-5 rounded-[18px]" style={{ background: "rgba(111,184,170,0.08)", border: "1px solid rgba(111,184,170,0.2)", borderLeft: "3px solid #6fb8aa" }}>
        <p className="sb-eyebrow mb-3">What not to repeat</p>
        <p className="text-[14px] text-[rgba(214,235,230,0.85)] leading-relaxed">{data.whatNotToRepeat}</p>
      </div>

      <div className="glass-card p-5">
        <p className="sb-eyebrow mb-3">Recommended next step</p>
        <p className="text-[14px] text-[rgba(214,235,230,0.8)] leading-relaxed">{data.recommendedNextStep}</p>
      </div>

      <div className="p-5 rounded-[18px]" style={{ background: "rgba(31,111,100,0.1)", border: "1px solid rgba(111,184,170,0.25)" }}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="sb-eyebrow">Suggested worker response</p>
          <button
            type="button"
            onClick={copyResponse}
            className="text-[11.5px] font-medium px-3 py-1 rounded-[8px] transition-all"
            style={{
              background: copied ? "rgba(31,111,100,0.3)" : "rgba(255,255,255,0.07)",
              border: "1px solid rgba(111,184,170,0.25)",
              color: copied ? "#6fb8aa" : "rgba(214,235,230,0.6)",
            }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="text-[14px] text-[rgba(214,235,230,0.8)] leading-relaxed">{data.suggestedWorkerResponse}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => void review("reviewed")}
          className="px-5 py-2.5 rounded-[11px] text-[13.5px] font-semibold transition-all disabled:opacity-50"
          style={{ background: "rgba(31,111,100,0.25)", border: "1px solid rgba(111,184,170,0.35)", color: "#6fb8aa" }}
        >
          Mark Reviewed
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void review("escalated")}
          className="px-5 py-2.5 rounded-[11px] text-[13.5px] font-semibold transition-all disabled:opacity-50"
          style={{ background: "rgba(217,95,72,0.15)", border: "1px solid rgba(217,95,72,0.3)", color: "#e88d78" }}
        >
          Escalate
        </button>
        <button
          type="button"
          onClick={() => void downloadAuthenticated(`/worker/handoffs/${id}/pdf`, `signalbridge-${id}.pdf`)}
          className="px-5 py-2.5 rounded-[11px] text-[13.5px] font-semibold transition-all"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(214,235,230,0.6)" }}
        >
          Export PDF
        </button>
      </div>

      {error && (
        <div className="text-[13px] text-[#e88d78] bg-[rgba(217,95,72,0.1)] border border-[rgba(217,95,72,0.2)] rounded-xl px-4 py-3">
          {error}
        </div>
      )}
    </div>
  );
}

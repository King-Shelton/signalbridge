"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  Clock,
  HeartPulse,
  Thermometer,
  Sparkles,
  CircleSlash,
  Footprints,
  MessageSquareQuote,
  CheckCircle2,
  Copy,
  Download,
  TriangleAlert,
  Send,
} from "lucide-react";
import { apiFetch, downloadAuthenticated } from "@/lib/api-client";
import { Handoff, label } from "@/lib/operations";

function riskMeta(level: string) {
  if (level === "high" || level === "critical")
    return { fg: "#e88d78", soft: "rgba(217,95,72,0.15)", border: "rgba(217,95,72,0.4)" };
  if (level === "medium")
    return { fg: "#e9c685", soft: "rgba(183,121,31,0.15)", border: "rgba(183,121,31,0.4)" };
  return { fg: "#6fb8aa", soft: "rgba(31,111,100,0.15)", border: "rgba(31,111,100,0.4)" };
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function Section({
  icon,
  title,
  tone,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  tone: "pine" | "amber" | "coral";
  children: React.ReactNode;
}) {
  const toneColor = tone === "coral" ? "#e88d78" : tone === "amber" ? "#e9c685" : "#6fb8aa";
  const toneBg = tone === "coral" ? "rgba(217,95,72,0.15)" : tone === "amber" ? "rgba(183,121,31,0.15)" : "rgba(31,111,100,0.15)";
  return (
    <div className="glass-card p-[18px]">
      <div className="flex items-center gap-2.5 mb-2.5">
        <span className="w-8 h-8 rounded-[9px] flex items-center justify-center" style={{ background: toneBg, color: toneColor }}>
          {icon}
        </span>
        <h3 className="text-[14px] font-semibold text-[#f1f6f4]">{title}</h3>
      </div>
      <div className="text-[14px] leading-relaxed text-[rgba(214,235,230,0.75)]">{children}</div>
    </div>
  );
}

export default function HandoffPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const [data, setData] = useState<Handoff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replyStatus, setReplyStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);


  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const handoff = await apiFetch<Handoff>(`/worker/handoffs/${id}`);
      setData(handoff);
      setReplyText((current) => current || handoff.suggestedWorkerResponse || "");
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
      setData(await apiFetch<Handoff>(`/worker/handoffs/${id}/review`, { method: "PATCH", body: JSON.stringify({ status }) }));
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

  async function sendReply() {
    if (!data || !replyText.trim()) return;
    setReplySending(true);
    setReplyStatus(null);
    try {
      await apiFetch(`/worker/conversations/${data.conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: replyText.trim() }),
      });
      setReplyStatus({ ok: true, text: "Reply sent to the youth and saved to the conversation." });
    } catch (e) {
      setReplyStatus({ ok: false, text: e instanceof Error ? e.message : "Reply failed." });
    } finally {
      setReplySending(false);
    }
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
          <button type="button" onClick={() => void load()} className="underline">Retry</button>
        </div>
      </div>
    );
  }

  const m = riskMeta(data.riskLevel);

  return (
    <div className="p-6 lg:p-8 space-y-5 max-w-4xl mx-auto">
      <Link href="/worker/cockpit" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[rgba(214,235,230,0.55)] hover:text-[rgba(214,235,230,0.85)] transition-colors">
        <ArrowLeft size={16} strokeWidth={1.75} /> Back to Worker Cockpit
      </Link>

      {/* Hero */}
      <header className="rounded-[24px] p-6" style={{ background: "rgba(31,111,100,0.1)", border: "1px solid rgba(111,184,170,0.22)" }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex gap-4">
            <span className="w-14 h-14 flex-shrink-0 rounded-full flex items-center justify-center text-[18px] font-semibold" style={{ background: m.soft, color: m.fg, border: `1px solid ${m.border}` }}>
              {initials(data.youthName)}
            </span>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-[26px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.02em" }}>{data.youthName}</h1>
                <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full" style={{ background: m.soft, color: m.fg, border: `1px solid ${m.border}` }}>
                  {label(data.riskLevel)} · {data.riskScore}
                </span>
              </div>
              <p className="mt-1.5 text-[13px] text-[rgba(214,235,230,0.4)] flex items-center gap-1.5">
                <Clock size={14} strokeWidth={1.75} /> Created {new Date(data.createdAt).toLocaleString("en-SG")}
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(31,111,100,0.18)", color: "#6fb8aa", border: "1px solid rgba(111,184,170,0.3)" }}>
                <ShieldCheck size={13} strokeWidth={2} /> Consent received · handoff approved
              </span>
            </div>
          </div>
          <div className="flex gap-2.5 flex-wrap">
            <button type="button" disabled={saving} onClick={() => void review("reviewed")} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[11px] text-[13px] font-semibold transition-all disabled:opacity-50" style={{ background: "rgba(31,111,100,0.25)", border: "1px solid rgba(111,184,170,0.35)", color: "#6fb8aa" }}>
              <CheckCircle2 size={16} strokeWidth={1.75} /> Mark Reviewed
            </button>
            <button type="button" disabled={saving} onClick={() => void review("escalated")} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[11px] text-[13px] font-semibold transition-all disabled:opacity-50" style={{ background: "rgba(217,95,72,0.15)", border: "1px solid rgba(217,95,72,0.3)", color: "#e88d78" }}>
              <TriangleAlert size={16} strokeWidth={1.75} /> Escalate
            </button>
          </div>
        </div>
        <p className="mt-3 text-[12px] font-mono text-[rgba(214,235,230,0.35)]">Status: {label(data.reviewStatus)}</p>
      </header>

      {/* Key quote */}
      <div className="glass-card p-[18px] relative overflow-hidden" style={{ borderLeft: "3px solid rgba(111,184,170,0.6)" }}>
        <div className="absolute top-3 right-5 text-[80px] font-serif text-[rgba(111,184,170,0.08)] leading-none select-none">&ldquo;</div>
        <p className="sb-eyebrow mb-2.5">Key quote</p>
        <p className="text-[20px] font-medium italic text-[#f1f6f4] leading-snug">&ldquo;{data.keyQuote}&rdquo;</p>
      </div>

      {/* Sections grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Section icon={<HeartPulse size={17} strokeWidth={1.75} />} title="Main concern" tone="pine">{data.mainConcern}</Section>
        <Section icon={<Thermometer size={17} strokeWidth={1.75} />} title="Emotional state" tone="amber">{data.emotionalState}</Section>
        <Section icon={<Sparkles size={17} strokeWidth={1.75} />} title="What was covered" tone="pine">{data.whatAiDid}</Section>
        <Section icon={<CircleSlash size={17} strokeWidth={1.75} />} title="Sensitive areas" tone="coral">{data.whatNotToRepeat}</Section>
      </div>

      {/* Suggested first response */}
      <div className="rounded-[18px] p-[22px]" style={{ background: "rgba(31,111,100,0.1)", border: "1px solid rgba(111,184,170,0.25)" }}>
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: "#1f6f64", color: "#fff" }}>
            <MessageSquareQuote size={18} strokeWidth={1.75} />
          </span>
          <div className="flex-1">
            <p className="sb-eyebrow">Suggested first response</p>
            <h3 className="mt-0.5 text-[16px] font-semibold text-[#f1f6f4]">A gentle opener you can edit</h3>
          </div>
          <button type="button" onClick={copyResponse} className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-3 py-1.5 rounded-[9px] transition-all" style={{ background: copied ? "rgba(31,111,100,0.3)" : "rgba(255,255,255,0.07)", border: "1px solid rgba(111,184,170,0.25)", color: copied ? "#6fb8aa" : "rgba(214,235,230,0.6)" }}>
            <Copy size={14} strokeWidth={1.75} /> {copied ? "Copied!" : "Copy opener"}
          </button>
        </div>
        <div className="rounded-[12px] px-4 py-3.5 text-[14.5px] leading-relaxed text-[rgba(214,235,230,0.85)]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
          {data.suggestedWorkerResponse}
        </div>
      </div>

      {/* Worker reply */}
      <div className="glass-card p-[22px]">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: "rgba(111,184,170,0.15)", color: "#6fb8aa" }}>
            <Send size={17} strokeWidth={1.75} />
          </span>
          <div>
            <p className="sb-eyebrow">Reply through SignalBridge</p>
            <h3 className="mt-0.5 text-[16px] font-semibold text-[#f1f6f4]">Send this back to the youth</h3>
          </div>
        </div>
        <textarea
          value={replyText}
          onChange={(event) => setReplyText(event.target.value)}
          rows={5}
          className="w-full resize-none rounded-[12px] px-4 py-3.5 text-[14px] leading-relaxed text-[#f1f6f4] outline-none"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
        />
        <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[11.5px] text-[rgba(214,235,230,0.4)]">
            Telegram conversations are delivered through the bot and saved on the SignalBridge timeline.
          </p>
          <button
            type="button"
            disabled={replySending || !replyText.trim()}
            onClick={() => void sendReply()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[11px] text-[13px] font-semibold transition-all disabled:opacity-50"
            style={{ background: "rgba(31,111,100,0.25)", border: "1px solid rgba(111,184,170,0.35)", color: "#6fb8aa" }}
          >
            <Send size={15} strokeWidth={1.75} /> {replySending ? "Sending..." : "Send reply"}
          </button>
        </div>
        {replyStatus && (
          <p className="mt-2 text-[12px]" style={{ color: replyStatus.ok ? "#6fb8aa" : "#e88d78" }}>
            {replyStatus.text}
          </p>
        )}
      </div>

      {/* Next step + export */}
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] items-stretch">
        <Section icon={<Footprints size={17} strokeWidth={1.75} />} title="Recommended next step" tone="pine">{data.recommendedNextStep}</Section>
        <div className="glass-card p-[18px] flex flex-col justify-center">
          <button type="button" onClick={() => void downloadAuthenticated(`/worker/handoffs/${id}/pdf`, `signalbridge-${id}.pdf`)} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-[11px] text-[13.5px] font-semibold transition-all" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(214,235,230,0.7)" }}>
            <Download size={16} strokeWidth={1.75} /> Export PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="text-[13px] text-[#e88d78] bg-[rgba(217,95,72,0.1)] border border-[rgba(217,95,72,0.2)] rounded-xl px-4 py-3">{error}</div>
      )}
    </div>
  );
}

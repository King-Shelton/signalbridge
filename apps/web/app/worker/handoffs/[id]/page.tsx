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
  MessageCircle,
  Hash,
  Globe,
  Brain,
  Layers,
  AlertCircle,
  Users,
  Zap,
  Bot,
} from "lucide-react";
import { apiFetch, downloadAuthenticated } from "@/lib/api-client";
import { Handoff, MemoryCardSnapshot, label } from "@/lib/operations";

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

function platformMeta(platform: string | null | undefined) {
  switch (platform) {
    case "telegram_business":
      return { label: "Telegram Business", icon: <MessageCircle size={12} strokeWidth={2} />, fg: "#5ba3e8", bg: "rgba(91,163,232,0.12)", border: "rgba(91,163,232,0.3)" };
    case "telegram_bot":
      return { label: "Telegram", icon: <Bot size={12} strokeWidth={2} />, fg: "#5ba3e8", bg: "rgba(91,163,232,0.12)", border: "rgba(91,163,232,0.3)" };
    case "discord_private_channel":
      return { label: "Discord Private", icon: <Hash size={12} strokeWidth={2} />, fg: "#a08de8", bg: "rgba(88,101,242,0.12)", border: "rgba(88,101,242,0.3)" };
    case "discord_dm":
      return { label: "Discord DM", icon: <Hash size={12} strokeWidth={2} />, fg: "#a08de8", bg: "rgba(88,101,242,0.12)", border: "rgba(88,101,242,0.3)" };
    default:
      return { label: "Web Chat", icon: <Globe size={12} strokeWidth={2} />, fg: "#6fb8aa", bg: "rgba(31,111,100,0.15)", border: "rgba(111,184,170,0.3)" };
  }
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

function TagList({ items, tone }: { items: string[]; tone: "pine" | "amber" | "coral" | "purple" }) {
  const colors = {
    pine: { bg: "rgba(31,111,100,0.18)", text: "#6fb8aa", border: "rgba(111,184,170,0.25)" },
    amber: { bg: "rgba(183,121,31,0.15)", text: "#e9c685", border: "rgba(183,121,31,0.3)" },
    coral: { bg: "rgba(217,95,72,0.15)", text: "#e88d78", border: "rgba(217,95,72,0.3)" },
    purple: { bg: "rgba(160,141,232,0.12)", text: "#a08de8", border: "rgba(160,141,232,0.25)" },
  };
  const c = colors[tone];
  if (!items.length) return <span className="text-[13px] text-[rgba(214,235,230,0.35)] italic">None recorded yet</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className="text-[12px] font-medium px-2.5 py-1 rounded-full" style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
          {item}
        </span>
      ))}
    </div>
  );
}

function MemoryCard({ snapshot }: { snapshot: MemoryCardSnapshot }) {
  const rm = riskMeta(snapshot.last_risk_level ?? "low");

  return (
    <div className="glass-card p-[22px]" style={{ borderLeft: "3px solid rgba(160,141,232,0.5)" }}>
      <div className="flex items-center gap-2.5 mb-4">
        <span className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: "rgba(160,141,232,0.12)", color: "#a08de8" }}>
          <Brain size={18} strokeWidth={1.75} />
        </span>
        <div className="flex-1">
          <p className="sb-eyebrow">Youth memory card</p>
          <h3 className="mt-0.5 text-[16px] font-semibold text-[#f1f6f4]">Longitudinal profile · across all sessions</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <p className="text-[22px] font-semibold text-[#f1f6f4]">{snapshot.session_count}</p>
            <p className="text-[10px] uppercase tracking-wide text-[rgba(214,235,230,0.4)]">sessions</p>
          </div>
          {snapshot.last_risk_level && (
            <span className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full" style={{ background: rm.soft, color: rm.fg, border: `1px solid ${rm.border}` }}>
              Last: {label(snapshot.last_risk_level)}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(214,235,230,0.4)] mb-2 flex items-center gap-1.5">
            <AlertCircle size={12} strokeWidth={2} /> Key concerns
          </p>
          <TagList items={snapshot.key_concerns ?? []} tone="coral" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(214,235,230,0.4)] mb-2 flex items-center gap-1.5">
            <Zap size={12} strokeWidth={2} /> Known triggers
          </p>
          <TagList items={snapshot.triggers ?? []} tone="amber" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(214,235,230,0.4)] mb-2 flex items-center gap-1.5">
            <Sparkles size={12} strokeWidth={2} /> What&apos;s helped before
          </p>
          <TagList items={snapshot.coping_strategies ?? []} tone="pine" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(214,235,230,0.4)] mb-2 flex items-center gap-1.5">
            <Users size={12} strokeWidth={2} /> Support network
          </p>
          <TagList items={snapshot.support_network ?? []} tone="purple" />
        </div>
      </div>

      {snapshot.cumulative_risk_score > 0 && (
        <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)] flex items-center gap-3">
          <p className="text-[12px] text-[rgba(214,235,230,0.45)]">Cumulative risk score (EMA):</p>
          <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, snapshot.cumulative_risk_score)}%`,
                background: snapshot.cumulative_risk_score >= 70 ? "#e88d78" : snapshot.cumulative_risk_score >= 40 ? "#e9c685" : "#6fb8aa",
              }}
            />
          </div>
          <p className="text-[12px] font-semibold text-[rgba(214,235,230,0.6)]">{snapshot.cumulative_risk_score.toFixed(1)}</p>
        </div>
      )}
    </div>
  );
}

function PreHandoffContext({ messages, platform }: { messages: string[]; platform: string | null | undefined }) {
  const pm = platformMeta(platform);
  return (
    <div className="glass-card p-[22px]">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: pm.bg, color: pm.fg }}>
          <Layers size={18} strokeWidth={1.75} />
        </span>
        <div>
          <p className="sb-eyebrow">Worker context before handoff</p>
          <h3 className="mt-0.5 text-[16px] font-semibold text-[#f1f6f4]">Last {messages.length} message{messages.length !== 1 ? "s" : ""} the worker sent</h3>
        </div>
      </div>
      <div className="space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="mt-0.5 text-[10px] font-mono text-[rgba(214,235,230,0.3)] w-5 flex-shrink-0 text-right">{i + 1}</span>
            <p className="text-[13.5px] leading-relaxed text-[rgba(214,235,230,0.75)] rounded-[10px] px-3.5 py-2.5 flex-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              {msg}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11.5px] text-[rgba(214,235,230,0.35)]">
        Pick up the conversation naturally — the youth already knows this person.
      </p>
    </div>
  );
}

export default function HandoffPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  const [data, setData] = useState<Handoff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [caseStatus, setCaseStatus] = useState<string | null>(null);
  const [caseUpdating, setCaseUpdating] = useState(false);
  const [caseMsg, setCaseMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replyStatus, setReplyStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void params.then((value) => setId(value.id));
  }, [params]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const handoff = await apiFetch<Handoff>(`/worker/handoffs/${id}`);
      setData(handoff);
      setCaseStatus(handoff.caseStatus ?? null);
      setReplyText((current) => current || handoff.suggestedWorkerResponse || "");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load handoff");
    } finally {
      setLoading(false);
    }
  }, [id]);

  async function updateCaseStatus(newStatus: string) {
    if (!data?.caseId) return;
    setCaseUpdating(true);
    setCaseMsg(null);
    try {
      await apiFetch(`/worker/cases/${data.caseId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setCaseStatus(newStatus);
      setCaseMsg({ ok: true, text: `Case marked as ${newStatus.replace("_", " ")}.` });
    } catch (e) {
      setCaseMsg({ ok: false, text: e instanceof Error ? e.message : "Update failed." });
    } finally {
      setCaseUpdating(false);
    }
  }

  useEffect(() => {
    void load();
  }, [load]);

  async function review(reviewStatus: string) {
    setSaving(true);
    try {
      setData(await apiFetch<Handoff>(`/worker/handoffs/${id}/review`, { method: "PATCH", body: JSON.stringify({ status: reviewStatus }) }));
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
  const pm = platformMeta(data.platform);

  return (
    <div className="p-6 lg:p-8 space-y-5 max-w-4xl mx-auto">
      <Link href="/worker/cockpit" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[rgba(214,235,230,0.55)] hover:text-[rgba(214,235,230,0.85)] transition-colors">
        <ArrowLeft size={16} strokeWidth={1.75} /> Back to Signal Radar
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
                <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold px-2.5 py-1 rounded-full" style={{ background: pm.bg, color: pm.fg, border: `1px solid ${pm.border}` }}>
                  {pm.icon} {pm.label}
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

      {/* Case status actions */}
      {data.caseId && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <div>
              <p className="sb-eyebrow">Case status</p>
              <p className="mt-0.5 text-[13px] text-[rgba(214,235,230,0.5)]">
                Current: <span className="text-[#f1f6f4] font-medium">{label(caseStatus ?? "unknown")}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { status: "in_progress", label: "In Progress", color: "#6fb8aa", bg: "rgba(31,111,100,0.2)", border: "rgba(111,184,170,0.35)" },
              { status: "followed_up", label: "Followed Up", color: "#e9c685", bg: "rgba(183,121,31,0.18)", border: "rgba(183,121,31,0.35)" },
              { status: "needs_review", label: "Needs Review", color: "#e9c685", bg: "rgba(183,121,31,0.12)", border: "rgba(183,121,31,0.25)" },
              { status: "escalated", label: "Escalate Case", color: "#e88d78", bg: "rgba(217,95,72,0.15)", border: "rgba(217,95,72,0.3)" },
              { status: "closed", label: "Close Case", color: "rgba(214,235,230,0.5)", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)" },
            ].map((opt) => (
              <button
                key={opt.status}
                type="button"
                disabled={caseUpdating || caseStatus === opt.status}
                onClick={() => void updateCaseStatus(opt.status)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[12.5px] font-semibold transition-all disabled:opacity-40"
                style={{ background: caseStatus === opt.status ? opt.bg : "rgba(255,255,255,0.04)", border: `1px solid ${caseStatus === opt.status ? opt.border : "rgba(255,255,255,0.1)"}`, color: caseStatus === opt.status ? opt.color : "rgba(214,235,230,0.55)" }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {caseMsg && (
            <p className="mt-2 text-[12px]" style={{ color: caseMsg.ok ? "#6fb8aa" : "#e88d78" }}>{caseMsg.text}</p>
          )}
        </div>
      )}

      {/* Key quote */}
      <div className="glass-card p-[18px] relative overflow-hidden" style={{ borderLeft: "3px solid rgba(111,184,170,0.6)" }}>
        <div className="absolute top-3 right-5 text-[80px] font-serif text-[rgba(111,184,170,0.08)] leading-none select-none">&ldquo;</div>
        <p className="sb-eyebrow mb-2.5">Key quote</p>
        <p className="text-[20px] font-medium italic text-[#f1f6f4] leading-snug">&ldquo;{data.keyQuote}&rdquo;</p>
      </div>

      {/* Worker pre-handoff context */}
      {data.preHandoffContext && data.preHandoffContext.length > 0 && (
        <PreHandoffContext messages={data.preHandoffContext} platform={data.platform} />
      )}

      {/* Sections grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Section icon={<HeartPulse size={17} strokeWidth={1.75} />} title="Main concern" tone="pine">{data.mainConcern}</Section>
        <Section icon={<Thermometer size={17} strokeWidth={1.75} />} title="Emotional state" tone="amber">{data.emotionalState}</Section>
        <Section icon={<Sparkles size={17} strokeWidth={1.75} />} title="What was covered" tone="pine">{data.whatAiDid}</Section>
        <Section icon={<CircleSlash size={17} strokeWidth={1.75} />} title="Sensitive areas" tone="coral">{data.whatNotToRepeat}</Section>
      </div>

      {/* Youth memory card */}
      {data.memoryCardSnapshot && data.memoryCardSnapshot.session_count > 0 && (
        <MemoryCard snapshot={data.memoryCardSnapshot} />
      )}

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
            {data.platform === "telegram_business"
              ? "Reply will be sent via Telegram Business and saved to the SignalBridge timeline."
              : data.platform === "discord_private_channel" || data.platform === "discord_dm"
              ? "Reply will be posted to the Discord channel and saved to the SignalBridge timeline."
              : "Telegram conversations are delivered through the bot and saved on the SignalBridge timeline."}
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

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { Handoff, label } from "@/lib/operations";

type Message = { id: string; senderType: string; content: string; createdAt: string };
type ConvItem = {
  id: string; channel: string; riskLevel: string; riskScore: number; status: string;
  consentToHandoff: boolean; lastMessageAt: string; messages: Message[];
};

type Youth = {
  id: string;
  name: string;
  email?: string;
  preferredChannel: string;
  hasTelegram?: boolean;
  hasDiscord?: boolean;
  assignedWorker?: string;
  supportStyle?: string;
  stressors?: string;
  conversations: ConvItem[];
  cases: Array<{ id: string; status: string; priority: string; summary: string; updatedAt: string }>;
  handoffs: Handoff[];
  notes: Array<{ id: string; content: string; authorUserId: string; createdAt: string }>;
};

function riskMeta(level: string) {
  if (level === "high" || level === "critical")
    return { fg: "#e88d78", soft: "rgba(217,95,72,0.15)", border: "rgba(217,95,72,0.4)" };
  if (level === "medium")
    return { fg: "#e9c685", soft: "rgba(183,121,31,0.15)", border: "rgba(183,121,31,0.4)" };
  return { fg: "#6fb8aa", soft: "rgba(31,111,100,0.15)", border: "rgba(31,111,100,0.4)" };
}

function caseStatusColor(status: string) {
  if (status === "open" || status === "active" || status === "needs_review")
    return { bg: "rgba(217,95,72,0.12)", border: "rgba(217,95,72,0.25)", color: "#e88d78" };
  if (status === "in_progress")
    return { bg: "rgba(183,121,31,0.12)", border: "rgba(183,121,31,0.25)", color: "#e9c685" };
  return { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)", color: "rgba(214,235,230,0.5)" };
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-SG", { hour: "numeric", minute: "2-digit", hour12: true, month: "short", day: "numeric" }).format(new Date(value));
}

function ChannelBadge({ channel }: { channel: string }) {
  const isTelegram = channel.toLowerCase().includes("telegram");
  const isDiscord = channel.toLowerCase().includes("discord");
  const bg = isTelegram ? "rgba(41,128,185,0.18)" : isDiscord ? "rgba(88,101,242,0.18)" : "rgba(31,111,100,0.15)";
  const border = isTelegram ? "rgba(41,128,185,0.4)" : isDiscord ? "rgba(88,101,242,0.4)" : "rgba(111,184,170,0.35)";
  const color = isTelegram ? "#5dade2" : isDiscord ? "#7289da" : "#6fb8aa";
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: bg, border: `1px solid ${border}`, color }}>
      {channel}
    </span>
  );
}

function ConversationThread({ conv, youthName }: { conv: ConvItem; youthName: string }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyStatus, setReplyStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const m = riskMeta(conv.riskLevel);

  const visibleMessages = conv.messages.filter((msg) => msg.senderType !== "system");

  async function sendReply() {
    if (!replyText.trim() || sending) return;
    setSending(true);
    setReplyStatus(null);
    try {
      await apiFetch(`/worker/conversations/${conv.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: replyText.trim() }),
      });
      setReplyStatus({ ok: true, text: "Reply sent. Youth will see it in their SafeNight chat." });
      setReplyText("");
    } catch (e) {
      setReplyStatus({ ok: false, text: e instanceof Error ? e.message : "Reply failed." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-[16px] overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-2.5 flex-wrap">
          <ChannelBadge channel={conv.channel} />
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: m.soft, border: `1px solid ${m.border}`, color: m.fg }}>
            {label(conv.riskLevel)} · {conv.riskScore}
          </span>
          {conv.consentToHandoff && (
            <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: "rgba(31,111,100,0.15)", color: "#6fb8aa", border: "1px solid rgba(111,184,170,0.3)" }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              Consent given
            </span>
          )}
        </div>
        <span className="text-[11px] font-mono text-[rgba(214,235,230,0.3)]">{formatTime(conv.lastMessageAt)}</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="max-h-[340px] overflow-y-auto px-4 py-4 space-y-2.5" style={{ background: "rgba(0,0,0,0.15)" }}>
        {visibleMessages.length === 0 && (
          <p className="text-[12.5px] text-[rgba(214,235,230,0.35)] text-center py-4">No messages yet.</p>
        )}
        {visibleMessages.map((msg) => {
          const isYouth = msg.senderType === "youth";
          const isWorker = msg.senderType === "worker";
          return (
            <div key={msg.id} className={`flex ${isYouth ? "justify-start" : "justify-end"}`}>
              <div className="max-w-[80%]">
                <div
                  className="px-3 py-2 text-[13px] leading-relaxed rounded-[14px]"
                  style={isYouth ? {
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "14px 14px 14px 4px",
                    color: "#e8f2ef",
                  } : isWorker ? {
                    background: "rgba(183,121,31,0.18)",
                    border: "1px solid rgba(183,121,31,0.3)",
                    borderRadius: "14px 14px 4px 14px",
                    color: "#f1f6f4",
                  } : {
                    background: "rgba(31,111,100,0.2)",
                    border: "1px solid rgba(111,184,170,0.25)",
                    borderRadius: "14px 14px 4px 14px",
                    color: "#e8f2ef",
                  }}
                >
                  {msg.content}
                </div>
                <p className={`mt-0.5 text-[10px] font-mono px-1 ${isYouth ? "text-left" : "text-right"}`} style={{ color: "rgba(214,235,230,0.25)" }}>
                  {isYouth ? youthName : isWorker ? "You" : "SafeNight"} · {formatTime(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply box */}
      <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
        <div className="flex gap-2">
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendReply(); } }}
            placeholder={`Reply to ${youthName}…`}
            className="flex-1 text-[13px] px-3 py-2 rounded-[10px] text-[#f1f6f4] outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
          />
          <button
            type="button"
            onClick={() => void sendReply()}
            disabled={sending || !replyText.trim()}
            className="px-3 py-2 rounded-[10px] text-[12.5px] font-semibold transition-all disabled:opacity-40"
            style={{ background: "rgba(31,111,100,0.25)", border: "1px solid rgba(111,184,170,0.3)", color: "#6fb8aa" }}
          >
            {sending ? "…" : "Send"}
          </button>
        </div>
        {replyStatus && (
          <p className="mt-1.5 text-[11.5px]" style={{ color: replyStatus.ok ? "#6fb8aa" : "#e88d78" }}>
            {replyStatus.text}
          </p>
        )}
      </div>
    </div>
  );
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
        Loading memory card…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="text-[13px] text-[#e88d78] bg-[rgba(217,95,72,0.1)] border border-[rgba(217,95,72,0.2)] rounded-xl px-4 py-3 flex items-center gap-3">
          {error || "Youth not found"}
          <button type="button" onClick={() => void load()} className="underline">Retry</button>
        </div>
      </div>
    );
  }

  const stressors = data.stressors?.split(",").map((value) => value.trim()).filter(Boolean) ?? [];

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      {/* Identity */}
      <div className="glass-card p-6">
        <p className="sb-eyebrow mb-2">Youth profile</p>
        <h1 className="text-[28px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.025em" }}>
          {data.name}
        </h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <ChannelBadge channel={data.preferredChannel} />
          <span className="px-3 py-1 rounded-full text-[12px] font-medium" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(214,235,230,0.6)" }}>
            Assigned to {data.assignedWorker ?? "Unassigned"}
          </span>
          {data.hasTelegram && (
            <span className="px-3 py-1 rounded-full text-[12px] font-semibold" style={{ background: "rgba(41,128,185,0.15)", border: "1px solid rgba(41,128,185,0.3)", color: "#5dade2" }}>
              Telegram linked
            </span>
          )}
          {data.hasDiscord && (
            <span className="px-3 py-1 rounded-full text-[12px] font-semibold" style={{ background: "rgba(88,101,242,0.15)", border: "1px solid rgba(88,101,242,0.3)", color: "#7289da" }}>
              Discord linked
            </span>
          )}
          {data.email && !data.email.endsWith("@signalbridge.local") && (
            <span className="px-3 py-1 rounded-full text-[12px] font-mono" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(214,235,230,0.4)" }}>
              {data.email}
            </span>
          )}
        </div>
      </div>

      {/* Conversations with messages */}
      {data.conversations && data.conversations.length > 0 && (
        <section className="glass-card p-5">
          <p className="sb-eyebrow mb-4">Conversation history</p>
          <div className="space-y-4">
            {data.conversations.map((conv) => (
              <ConversationThread key={conv.id} conv={conv} youthName={data.name} />
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card p-5" style={{ borderLeft: "3px solid rgba(111,184,170,0.4)" }}>
          <p className="sb-eyebrow mb-3">Support approach</p>
          <p className="text-[14px] text-[rgba(214,235,230,0.8)] leading-relaxed">{data.supportStyle ?? "No style recorded yet."}</p>
        </div>

        <div className="glass-card p-5">
          <p className="sb-eyebrow mb-3">Known stressors</p>
          {stressors.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {stressors.map((stress) => (
                <span key={stress} className="px-3 py-1.5 rounded-full text-[12px] font-medium" style={{ background: "rgba(217,95,72,0.12)", border: "1px solid rgba(217,95,72,0.25)", color: "#e88d78" }}>
                  {stress}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-[rgba(214,235,230,0.5)]">{data.stressors ?? "No stressors recorded."}</p>
          )}
        </div>
      </div>

      {/* Cases */}
      <div className="glass-card p-5">
        <p className="sb-eyebrow mb-4">Cases</p>
        {data.cases.length > 0 ? (
          <div className="space-y-2">
            {data.cases.map((item) => {
              const colors = caseStatusColor(item.status);
              return (
                <div key={item.id} className="p-3 rounded-[12px] flex items-start gap-3" style={{ background: colors.bg, border: `1px solid ${colors.border}` }}>
                  <span className="text-[11px] font-semibold mt-0.5 flex-shrink-0" style={{ color: colors.color }}>{label(item.status)}</span>
                  <p className="text-[13px] text-[rgba(214,235,230,0.7)] leading-relaxed flex-1">{item.summary}</p>
                  <span className="text-[10.5px] font-mono text-[rgba(214,235,230,0.3)] flex-shrink-0">{new Date(item.updatedAt).toLocaleDateString("en-SG")}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[13px] text-[rgba(214,235,230,0.4)]">No cases yet.</p>
        )}
      </div>

      {/* Approved handoffs */}
      <div className="glass-card p-5">
        <p className="sb-eyebrow mb-4">Approved handoff briefs</p>
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
                <div className="flex-1 min-w-0">
                  <p className="text-[11.5px] font-mono text-[rgba(214,235,230,0.35)]">{new Date(handoff.createdAt).toLocaleString("en-SG")}</p>
                  <p className="text-[13.5px] text-[rgba(214,235,230,0.75)] mt-0.5 truncate">{handoff.mainConcern}</p>
                </div>
                <svg className="flex-shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(111,184,170,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                </svg>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-[rgba(214,235,230,0.4)]">No approved handoffs yet.</p>
        )}
      </div>

      {/* Worker notes */}
      <div className="glass-card p-5">
        <p className="sb-eyebrow mb-4">Worker notes</p>
        {data.notes.length > 0 ? (
          <div className="space-y-2">
            {data.notes.map((note) => (
              <div key={note.id} className="p-3 rounded-[12px]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-[13px] text-[rgba(214,235,230,0.7)] leading-relaxed">{note.content}</p>
                <p className="mt-1.5 text-[10.5px] font-mono text-[rgba(214,235,230,0.25)]">{new Date(note.createdAt).toLocaleString("en-SG")}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-[rgba(214,235,230,0.4)]">No notes yet.</p>
        )}
      </div>
    </div>
  );
}

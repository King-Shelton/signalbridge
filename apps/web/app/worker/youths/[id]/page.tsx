"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { usePolling } from "@/lib/use-polling";
import { Handoff, label } from "@/lib/operations";
import { caseStatusColor, formatDateTime, riskMeta } from "@/lib/ui";

type Message = { id: string; senderType: string; content: string; createdAt: string };
type ConvItem = {
  id: string; channel: string; channelType: string; riskLevel: string; riskScore: number; status: string;
  consentToHandoff: boolean; lastMessageAt: string; messages: Message[];
};
type CaseItem = { id: string; status: string; priority: string; summary: string; updatedAt: string; notes: Array<{ id: string; content: string; authorUserId: string; createdAt: string }> };

// Shape returned by GET /worker/youths/{id} (WorkerYouthDetailResponse)
type YouthDetailResponse = {
  youth: {
    id: string; name: string; preferredChannel: string; assignedWorkerId?: string;
    supportStyle?: string; stressors?: string;
  };
  case: CaseItem | null;
  conversations: ConvItem[];
  previousHandoffs: Handoff[];
};

type LegacyYouthDetailResponse = {
  id: string;
  name: string;
  preferredChannel: string;
  assignedWorker?: string;
  supportStyle?: string;
  stressors?: string;
  conversations?: Array<Partial<ConvItem> & { id: string; channel: string; riskLevel: string; riskScore: number; status: string; consentToHandoff: boolean; lastMessageAt: string; messages?: Message[] }>;
  cases?: Array<Omit<CaseItem, "notes"> & { notes?: CaseItem["notes"] }>;
  handoffs?: Handoff[];
  notes?: CaseItem["notes"];
};

function normalizeYouthDetailResponse(response: YouthDetailResponse | LegacyYouthDetailResponse): YouthDetailResponse {
  if ("youth" in response) return response;

  const firstCase = response.cases?.[0] ?? null;
  return {
    youth: {
      id: response.id,
      name: response.name,
      preferredChannel: response.preferredChannel,
      assignedWorkerId: response.assignedWorker,
      supportStyle: response.supportStyle,
      stressors: response.stressors,
    },
    case: firstCase ? { ...firstCase, notes: firstCase.notes ?? response.notes ?? [] } : null,
    conversations: (response.conversations ?? []).map((conv) => ({
      id: conv.id,
      channel: conv.channel,
      channelType: conv.channelType ?? conv.channel,
      riskLevel: conv.riskLevel,
      riskScore: conv.riskScore,
      status: conv.status,
      consentToHandoff: conv.consentToHandoff,
      lastMessageAt: conv.lastMessageAt,
      messages: conv.messages ?? [],
    })),
    previousHandoffs: response.handoffs ?? [],
  };
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

const DELIVERY_LABEL: Record<string, string> = {
  telegram: "Delivered to Telegram.",
  discord: "Delivered to Discord.",
  signalbridge: "Sent. Youth will see it in their SafeNight chat.",
};

function ConversationThread({ conv, youthName }: { conv: ConvItem; youthName: string }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyStatus, setReplyStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [sentMessages, setSentMessages] = useState<Message[]>([]);
  const m = riskMeta(conv.riskLevel);

  // Merge any optimistically-sent replies with the loaded thread, de-duped by id
  // so a later parent refetch (which will include the same message) doesn't double it.
  const merged = [...conv.messages, ...sentMessages];
  const seen = new Set<string>();
  const visibleMessages = merged.filter((msg) => {
    if (msg.senderType === "system" || seen.has(msg.id)) return false;
    seen.add(msg.id);
    return true;
  });

  async function sendReply() {
    if (!replyText.trim() || sending) return;
    setSending(true);
    setReplyStatus(null);
    try {
      const res = await apiFetch<{ message: Message; deliveryChannel?: string }>(
        `/worker/conversations/${conv.id}/messages`,
        { method: "POST", body: JSON.stringify({ content: replyText.trim() }) }
      );
      if (res.message) setSentMessages((prev) => [...prev, res.message]);
      setReplyStatus({ ok: true, text: DELIVERY_LABEL[res.deliveryChannel ?? "signalbridge"] ?? "Reply sent." });
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
        <span className="text-[11px] font-mono text-[rgba(214,235,230,0.3)]">{formatDateTime(conv.lastMessageAt)}</span>
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
                  {isYouth ? youthName : isWorker ? "You" : "SafeNight"} · {formatDateTime(msg.createdAt)}
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
        {replyStatus ? (
          <p className="mt-1.5 text-[11.5px]" style={{ color: replyStatus.ok ? "#6fb8aa" : "#e88d78" }}>
            {replyStatus.text}
          </p>
        ) : (
          <p className="mt-1.5 text-[10.5px]" style={{ color: "rgba(214,235,230,0.3)" }}>
            Delivers via <span style={{ color: "rgba(214,235,230,0.55)" }}>{conv.channel}</span> · Enter to send
          </p>
        )}
      </div>
    </div>
  );
}

export default function YouthPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  const [data, setData] = useState<YouthDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void params.then((value) => setId(value.id));
  }, [params]);

  const load = useCallback(async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    try {
      const response = await apiFetch<YouthDetailResponse | LegacyYouthDetailResponse>(`/worker/youths/${id}`);
      setData(normalizeYouthDetailResponse(response));
      setError("");
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : "Could not load youth context");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Quietly refresh so new youth messages appear without a manual reload —
  // paused while the tab is in the background.
  usePolling(() => void load(true), 12000, Boolean(id));

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

  const youth = data.youth;
  const stressors = youth.stressors?.split(",").map((value) => value.trim()).filter(Boolean) ?? [];
  const notes = data.case?.notes ?? [];

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      {/* Identity */}
      <div className="glass-card p-6">
        <p className="sb-eyebrow mb-2">Youth profile</p>
        <h1 className="text-[28px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.025em" }}>
          {youth.name}
        </h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <ChannelBadge channel={youth.preferredChannel} />
          <span className="px-3 py-1 rounded-full text-[12px] font-medium" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(214,235,230,0.6)" }}>
            Assigned to {youth.assignedWorkerId ?? "Unassigned"}
          </span>
        </div>
      </div>

      {/* Conversations with messages */}
      {data.conversations && data.conversations.length > 0 && (
        <section className="glass-card p-5">
          <p className="sb-eyebrow mb-4">Conversation history</p>
          <div className="space-y-4">
            {data.conversations.map((conv) => (
              <ConversationThread key={conv.id} conv={conv} youthName={youth.name} />
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card p-5" style={{ borderLeft: "3px solid rgba(111,184,170,0.4)" }}>
          <p className="sb-eyebrow mb-3">Support approach</p>
          <p className="text-[14px] text-[rgba(214,235,230,0.8)] leading-relaxed">{youth.supportStyle ?? "No style recorded yet."}</p>
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
            <p className="text-[14px] text-[rgba(214,235,230,0.5)]">{youth.stressors ?? "No stressors recorded."}</p>
          )}
        </div>
      </div>

      {/* Case */}
      <div className="glass-card p-5">
        <p className="sb-eyebrow mb-4">Case</p>
        {data.case ? (() => {
          const colors = caseStatusColor(data.case.status);
          return (
            <div className="p-3 rounded-[12px] flex items-start gap-3" style={{ background: colors.bg, border: `1px solid ${colors.border}` }}>
              <span className="text-[11px] font-semibold mt-0.5 flex-shrink-0" style={{ color: colors.color }}>{label(data.case.status)}</span>
              <p className="text-[13px] text-[rgba(214,235,230,0.7)] leading-relaxed flex-1">{data.case.summary}</p>
              <span className="text-[10.5px] font-mono text-[rgba(214,235,230,0.3)] flex-shrink-0">{new Date(data.case.updatedAt).toLocaleDateString("en-SG")}</span>
            </div>
          );
        })() : (
          <p className="text-[13px] text-[rgba(214,235,230,0.4)]">No case yet.</p>
        )}
      </div>

      {/* Approved handoffs */}
      <div className="glass-card p-5">
        <p className="sb-eyebrow mb-4">Approved handoff briefs</p>
        {data.previousHandoffs.length > 0 ? (
          <div className="space-y-3">
            {data.previousHandoffs.map((handoff) => (
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
        {notes.length > 0 ? (
          <div className="space-y-2">
            {notes.map((note) => (
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

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { readYouthSession, type YouthSession } from "@/lib/youth-session";

type ApiMessage = {
  id: string;
  conversationId: string;
  senderType: "youth" | "ai" | "system" | "worker";
  content: string;
  safetyStatus?: string | null;
  createdAt: string;
};

type ApiSignal = {
  id: string;
  type: string;
  severity: string;
  reason: string;
  source: string;
  createdAt: string;
};

type Conversation = {
  id: string;
  youthName: string;
  riskLevel: string;
  riskScore: number;
  consentToHandoff: boolean;
  messages: ApiMessage[];
  signals: ApiSignal[];
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-SG", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(value));
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[6px] h-[6px] rounded-full bg-[#6fb8aa]"
          style={{ animation: `sb-dot 1.3s ease-in-out ${i * 0.22}s infinite` }}
        />
      ))}
    </div>
  );
}

export default function YouthChatPage() {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [session, setSession] = useState<YouthSession | null>(null);
  const [youthName, setYouthName] = useState<string>("You");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSavingConsent, setIsSavingConsent] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");

  const messages = useMemo(() => {
    if (!conversation) return [];
    return [
      {
        id: "after-hours-banner",
        conversationId: conversation.id,
        senderType: "system" as const,
        content: "It may be after your worker's usual hours. SafeNight can stay with you and help prepare a note only if you allow it.",
        createdAt: new Date().toISOString(),
      },
      ...conversation.messages,
    ];
  }, [conversation]);

  // Load session + conversation
  useEffect(() => {
    async function loadConversation() {
      const currentSession = readYouthSession();
      setSession(currentSession);

      // Pull youth name from session
      if (currentSession?.name) {
        setYouthName(currentSession.name);
      }

      if (!currentSession?.accessToken) {
        setError("Please log in again to continue your conversation.");
        setIsLoading(false);
        return;
      }

      try {
        const data = await apiFetch<{ conversations: Conversation[] }>("/youth/conversations");
        setConversation(data.conversations[0] ?? null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load chat.");
      } finally {
        setIsLoading(false);
      }
    }
    loadConversation();
  }, []);

  // 5-second polling
  useEffect(() => {
    if (!session?.accessToken || !conversation) return;
    const conversationId = conversation.id;
    const interval = setInterval(async () => {
      if (isSending) return;
      try {
        const data = await apiFetch<{ conversations: Conversation[] }>("/youth/conversations");
        const updated = data.conversations.find((item) => item.id === conversationId) ?? data.conversations[0];
        if (updated) setConversation(updated);
      } catch { /* silent */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [session?.accessToken, conversation, isSending]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length, isSending]);

  async function sendMessage() {
    const content = draft.trim();
    if (!content || !conversation || !session?.accessToken) return;
    setDraft("");
    setError("");
    setIsSending(true);

    const optimisticMessage: ApiMessage = {
      id: `local_${Date.now()}`,
      conversationId: conversation.id,
      senderType: "youth",
      content,
      createdAt: new Date().toISOString(),
    };
    setConversation({ ...conversation, messages: [...conversation.messages, optimisticMessage] });

    try {
      const data = await apiFetch<{ conversation?: Conversation; message?: ApiMessage; aiReply?: ApiMessage }>(
        `/youth/conversations/${conversation.id}/messages`,
        { method: "POST", body: JSON.stringify({ content }) }
      );
      if (data.conversation) {
        setConversation(data.conversation);
      } else if (data.aiReply) {
        setConversation((current) =>
          current ? { ...current, messages: [...current.messages.filter((m) => m.id !== optimisticMessage.id), { ...optimisticMessage, id: data.message?.id ?? optimisticMessage.id }, data.aiReply!] } : current
        );
      }
    } catch (sendError) {
      setConversation((current) =>
        current ? { ...current, messages: current.messages.filter((m) => m.id !== optimisticMessage.id) } : current
      );
      setError(sendError instanceof Error ? sendError.message : "Message could not be sent.");
    } finally {
      setIsSending(false);
    }
  }

  async function updateConsent(consentGiven: boolean) {
    if (!conversation || !session?.accessToken) return;
    setError("");
    setIsSavingConsent(true);
    try {
      const data = await apiFetch<{ conversation: Conversation }>(
        `/youth/conversations/${conversation.id}/handoff-consent`,
        { method: "POST", body: JSON.stringify({ consentGiven }) }
      );
      setConversation(data.conversation);
    } catch (consentError) {
      setError(consentError instanceof Error ? consentError.message : "Consent could not be saved.");
    } finally {
      setIsSavingConsent(false);
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#060d0c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-[#6fb8aa] border-t-transparent animate-spin" />
          <p className="text-[rgba(214,235,230,0.5)] text-sm">Loading your conversation...</p>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="fixed inset-0 bg-[#060d0c] flex items-center justify-center px-6">
        <div className="glass-card p-8 max-w-sm w-full text-center">
          <p className="text-[#f1f6f4] font-semibold mb-2">{error ? "Chat unavailable" : "No conversation yet"}</p>
          <p className="text-[rgba(214,235,230,0.55)] text-sm mb-5">{error || "Start a SafeNight conversation to see your messages here."}</p>
          {error && (
            <a href="/login" className="inline-block px-5 py-2.5 rounded-[11px] bg-[rgba(31,111,100,0.2)] border border-[rgba(111,184,170,0.25)] text-[#6fb8aa] text-sm font-medium">
              Return to login
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#060d0c] flex flex-col font-sans overflow-hidden" style={{ WebkitFontSmoothing: "antialiased" }}>
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute" style={{ top: "-15%", left: "-8%", width: "55vw", height: "55vw", background: "radial-gradient(circle, rgba(31,111,100,0.18), transparent 62%)", filter: "blur(8px)", animation: "sb-drift1 24s ease-in-out infinite" }} />
        <div className="absolute" style={{ bottom: "-20%", right: "-10%", width: "48vw", height: "48vw", background: "radial-gradient(circle, rgba(217,95,72,0.08), transparent 62%)", filter: "blur(8px)", animation: "sb-drift2 28s ease-in-out infinite" }} />
        <div className="absolute inset-0" style={{ opacity: 0.35, backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "38px 38px" }} />
        <div className="absolute left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(111,184,170,0.35), transparent)", animation: "sb-scan 14s linear infinite" }} />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[9px] flex items-center justify-center" style={{ background: "linear-gradient(160deg, #2a8576, #164b44)", boxShadow: "0 6px 18px rgba(31,111,100,0.4)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#eaf6f2" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9"/><path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5"/><circle cx="12" cy="9" r="2"/>
              <path d="M16.2 4.8c2 2 2.26 5.11.8 7.47"/><path d="M19.1 1.9a9.96 9.96 0 0 1 0 14.1"/>
              <path d="M9.5 18h5"/><path d="m8 22 4-11 4 11"/>
            </svg>
          </div>
          <div>
            <div className="text-[14px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.01em" }}>SafeNight</div>
            <div className="text-[11px] text-[rgba(214,235,230,0.4)]">Your private space</div>
          </div>
        </div>

        {/* After-hours pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(183,121,31,0.15)", border: "1px solid rgba(183,121,31,0.3)" }}>
          <div className="w-1.5 h-1.5 rounded-full bg-[#e9c685]" style={{ animation: "sb-core 2.8s ease-in-out infinite" }} />
          <span className="text-[11px] font-semibold text-[#e9c685]">After hours</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((message) => {
          const isYouth = message.senderType === "youth";
          const isSystem = message.senderType === "system";

          if (isSystem) {
            return (
              <div key={message.id} className="flex justify-center">
                <div className="text-center px-4 py-2.5 rounded-[14px] max-w-[80%]" style={{ background: "rgba(183,121,31,0.12)", border: "1px solid rgba(183,121,31,0.25)" }}>
                  <p className="text-[12px] text-[#e9c685] leading-relaxed">{message.content}</p>
                </div>
              </div>
            );
          }

          return (
            <div key={message.id} className={`flex ${isYouth ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[75%]">
                <div
                  className="px-4 py-3 text-[14px] leading-relaxed"
                  style={isYouth ? {
                    background: "linear-gradient(180deg, rgba(31,111,100,0.36), rgba(31,111,100,0.2))",
                    border: "1px solid rgba(111,184,170,0.32)",
                    borderRadius: "20px 20px 6px 20px",
                    color: "#f1f6f4",
                  } : {
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "20px 20px 20px 6px",
                    backdropFilter: "blur(6px)",
                    color: "#f1f6f4",
                  }}
                >
                  {message.content}
                </div>
                <div className={`mt-1 text-[10.5px] text-[rgba(214,235,230,0.35)] font-mono ${isYouth ? "text-right pr-2" : "pl-2"}`}>
                  {isYouth ? youthName : "SafeNight"} · {message.id === "after-hours-banner" ? "Now" : formatTime(message.createdAt)}
                </div>
              </div>
            </div>
          );
        })}

        {isSending && (
          <div className="flex justify-start">
            <div className="px-4 py-3" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px 20px 20px 6px", backdropFilter: "blur(6px)" }}>
              <TypingDots />
            </div>
          </div>
        )}

        {/* Support signals — transparency for the youth about what was noticed */}
        {conversation.signals.length > 0 && (
          <div className="glass-card p-4 mt-2">
            <p className="sb-eyebrow mb-1">Support signals</p>
            <p className="text-[12px] text-[rgba(214,235,230,0.5)] leading-relaxed mb-3">
              These help your worker notice what may need care. They are not a diagnosis.
            </p>
            <div className="space-y-2">
              {conversation.signals.slice(0, 4).map((signal) => {
                const sev = signal.severity.toLowerCase();
                const tone =
                  sev === "critical" || sev === "high"
                    ? { fg: "#e88d78", soft: "rgba(217,95,72,0.15)" }
                    : sev === "medium"
                      ? { fg: "#e9c685", soft: "rgba(183,121,31,0.15)" }
                      : { fg: "rgba(214,235,230,0.6)", soft: "rgba(255,255,255,0.06)" };
                return (
                  <div key={signal.id} className="rounded-[12px] px-3 py-2.5" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold text-[#f1f6f4]">
                        {signal.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                      <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: tone.soft, color: tone.fg }}>
                        {signal.severity.replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-[rgba(214,235,230,0.5)]">{signal.reason}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Handoff consent card */}
        {conversation && (
          <div className="glass-card p-4 mt-2">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="sb-eyebrow mb-1">Worker note consent</p>
                <p className="text-[13px] text-[rgba(214,235,230,0.6)] leading-relaxed">
                  Allow SafeNight to prepare a brief for your worker? You stay in control.
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  disabled={isSavingConsent}
                  onClick={() => updateConsent(false)}
                  className="px-3 py-1.5 rounded-[9px] text-[12px] font-medium transition-all"
                  style={{
                    background: !conversation.consentToHandoff ? "rgba(217,95,72,0.2)" : "rgba(255,255,255,0.06)",
                    border: !conversation.consentToHandoff ? "1px solid rgba(217,95,72,0.35)" : "1px solid rgba(255,255,255,0.1)",
                    color: !conversation.consentToHandoff ? "#e88d78" : "rgba(214,235,230,0.5)",
                  }}
                >
                  No thanks
                </button>
                <button
                  disabled={isSavingConsent}
                  onClick={() => updateConsent(true)}
                  className="px-3 py-1.5 rounded-[9px] text-[12px] font-medium transition-all"
                  style={{
                    background: conversation.consentToHandoff ? "rgba(31,111,100,0.25)" : "rgba(255,255,255,0.06)",
                    border: conversation.consentToHandoff ? "1px solid rgba(111,184,170,0.35)" : "1px solid rgba(255,255,255,0.1)",
                    color: conversation.consentToHandoff ? "#6fb8aa" : "rgba(214,235,230,0.5)",
                  }}
                >
                  Yes, prepare a note
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="relative z-10 mx-4 mb-2 px-4 py-2.5 rounded-[11px] text-[13px] text-[#e88d78]" style={{ background: "rgba(217,95,72,0.1)", border: "1px solid rgba(217,95,72,0.2)" }}>
          {error}
        </div>
      )}

      {/* Composer */}
      <div className="relative z-10 px-4 pb-5 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-end gap-3 glass-card p-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
            placeholder="What's on your mind tonight..."
            rows={1}
            disabled={isSending}
            className="flex-1 bg-transparent text-[14px] text-[#f1f6f4] placeholder-[rgba(214,235,230,0.3)] resize-none outline-none leading-relaxed"
            style={{ minHeight: "24px", maxHeight: "120px" }}
          />
          <button
            onClick={() => void sendMessage()}
            disabled={isSending || !draft.trim()}
            className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              background: draft.trim() ? "linear-gradient(160deg, #2a8576, #164b44)" : "rgba(255,255,255,0.06)",
              boxShadow: draft.trim() ? "0 4px 16px rgba(31,111,100,0.4)" : "none",
              border: draft.trim() ? "none" : "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {isSending ? (
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={draft.trim() ? "#eaf6f2" : "rgba(214,235,230,0.3)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9l20-7z"/>
              </svg>
            )}
          </button>
        </div>
        <p className="mt-2 text-center text-[10.5px] text-[rgba(214,235,230,0.25)]">
          SafeNight is an after-hours companion, not a counsellor. You decide what your worker sees.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { readYouthSession, type YouthSession } from "@/lib/youth-session";
import { useRouter } from "next/navigation";

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

type HandoffSummary = {
  mainConcern: string;
  emotionalState: string;
  keyQuote?: string;
  whatAiDid?: string;
  whatNotToRepeat?: string;
  recommendedNextStep?: string;
  createdAt?: string;
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-SG", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(value));
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[5px] h-[5px] rounded-full bg-[#6fb8aa]"
          style={{ animation: `sb-dot 1.3s ease-in-out ${i * 0.22}s infinite` }}
        />
      ))}
    </div>
  );
}

export default function YouthChatPage() {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const router = useRouter();
  const [session, setSession] = useState<YouthSession | null>(null);
  const [youthName, setYouthName] = useState<string>("You");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSavingConsent, setIsSavingConsent] = useState(false);
  const [consentDismissed, setConsentDismissed] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [showHandoffPreview, setShowHandoffPreview] = useState(false);
  const [handoffData, setHandoffData] = useState<HandoffSummary | null>(null);
  const [handoffLoading, setHandoffLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const messages = useMemo(() => {
    if (!conversation) return [];
    return conversation.messages.filter((m) => m.senderType !== "system");
  }, [conversation]);

  const createConversation = useCallback(async () => {
    const data = await apiFetch<{ conversation: Conversation }>("/youth/conversations", { method: "POST" });
    return data.conversation;
  }, []);

  useEffect(() => {
    async function loadConversation() {
      const currentSession = readYouthSession();
      setSession(currentSession);
      if (currentSession?.name) setYouthName(currentSession.name);

      if (!currentSession?.accessToken) {
        setError("Please log in again to continue.");
        setIsLoading(false);
        return;
      }

      try {
        const data = await apiFetch<{ conversations: Conversation[] }>("/youth/conversations");
        const latestUnshared = data.conversations.find((item) => !item.consentToHandoff);
        const nextConversation = latestUnshared ?? (await createConversation());
        setConversation(nextConversation);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load chat.");
      } finally {
        setIsLoading(false);
      }
    }
    loadConversation();
  }, [createConversation]);

  // Restore dismissed consent from sessionStorage when conversation loads
  useEffect(() => {
    if (!conversation?.id) return;
    if (sessionStorage.getItem(`consent_dismissed_${conversation.id}`) === "true") {
      setConsentDismissed(true);
    }
  }, [conversation?.id]);

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length, isSending]);

  function handleDraftChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDraft(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  async function sendMessage() {
    const content = draft.trim();
    if (!content || !conversation || !session?.accessToken) return;
    setDraft("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
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
      const data = await apiFetch<{
        conversation?: Conversation;
        message?: ApiMessage;
        aiReply?: ApiMessage;
        aiTriggeredConsent?: boolean;
      }>(
        `/youth/conversations/${conversation.id}/messages`,
        { method: "POST", body: JSON.stringify({ content }) }
      );
      if (data.conversation) {
        setConversation(data.conversation);
        // If the AI triggered consent on this turn, clear any dismissed state so
        // the "See what your worker will receive" button appears immediately.
        if (data.aiTriggeredConsent && data.conversation.id) {
          sessionStorage.removeItem(`consent_dismissed_${data.conversation.id}`);
          setConsentDismissed(false);
        }
      } else if (data.aiReply) {
        setConversation((current) =>
          current
            ? {
                ...current,
                messages: [
                  ...current.messages.filter((m) => m.id !== optimisticMessage.id),
                  { ...optimisticMessage, id: data.message?.id ?? optimisticMessage.id },
                  data.aiReply!,
                ],
              }
            : current
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
    if (!consentGiven) {
      setConsentDismissed(true);
      if (conversation?.id) {
        sessionStorage.setItem(`consent_dismissed_${conversation.id}`, "true");
      }
      return;
    }
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
      setError(consentError instanceof Error ? consentError.message : "Could not save your choice.");
    } finally {
      setIsSavingConsent(false);
    }
  }

  async function openHandoffPreview() {
    setShowHandoffPreview(true);
    setHandoffLoading(true);
    try {
      const d = await apiFetch<{ handoffs: HandoffSummary[] }>("/youth/handoffs");
      const sorted = [...d.handoffs].sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setHandoffData(sorted[0] ?? d.handoffs[d.handoffs.length - 1] ?? null);
    } catch { /* silently fail */ }
    finally { setHandoffLoading(false); }
  }

  async function resetChat() {
    setIsResetting(true);
    setShowResetConfirm(false);
    setDraft("");
    setError("");
    setHandoffData(null);
    setShowHandoffPreview(false);
    setConsentDismissed(false);
    if (conversation?.id) {
      sessionStorage.removeItem(`consent_dismissed_${conversation.id}`);
    }
    try {
      setConversation(await createConversation());
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Could not start a new chat.");
    } finally {
      setIsResetting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#060d0c" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#6fb8aa] border-t-transparent animate-spin" />
          <p className="text-[13px]" style={{ color: "rgba(214,235,230,0.4)" }}>Just a moment…</p>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="fixed inset-0 flex items-center justify-center px-6" style={{ background: "#060d0c" }}>
        <div className="glass-card p-8 max-w-sm w-full text-center">
          <p className="text-[#f1f6f4] font-semibold mb-2">{error ? "Something went wrong" : "No conversation yet"}</p>
          <p className="text-[rgba(214,235,230,0.55)] text-sm mb-5">{error || "Start a SafeNight conversation to see your messages here."}</p>
          <a href="/login" className="inline-block px-5 py-2.5 rounded-[11px] text-sm font-medium" style={{ background: "rgba(31,111,100,0.2)", border: "1px solid rgba(111,184,170,0.25)", color: "#6fb8aa" }}>
            Return to sign in
          </a>
        </div>
      </div>
    );
  }

  const showConsentBar = !conversation.consentToHandoff && !consentDismissed && messages.length >= 2;
  const showRestoreConsent = !conversation.consentToHandoff && consentDismissed && messages.length >= 2;

  return (
    <div className="fixed inset-0 flex flex-col font-sans overflow-hidden" style={{ background: "#060d0c", WebkitFontSmoothing: "antialiased" }}>
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute" style={{ top: "-15%", left: "-8%", width: "55vw", height: "55vw", background: "radial-gradient(circle, rgba(31,111,100,0.18), transparent 62%)", filter: "blur(8px)", animation: "sb-drift1 24s ease-in-out infinite" }} />
        <div className="absolute" style={{ bottom: "-20%", right: "-10%", width: "48vw", height: "48vw", background: "radial-gradient(circle, rgba(217,95,72,0.07), transparent 62%)", filter: "blur(8px)", animation: "sb-drift2 28s ease-in-out infinite" }} />
        <div className="absolute inset-0" style={{ opacity: 0.3, backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "38px 38px" }} />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="flex items-center justify-center w-7 h-7 rounded-full transition"
            style={{ color: "rgba(214,235,230,0.4)" }}
            aria-label="Leave chat"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
            </svg>
          </button>

          <div className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: "linear-gradient(160deg, #2a8576, #164b44)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#eaf6f2" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9"/><path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5"/><circle cx="12" cy="9" r="2"/>
              <path d="M16.2 4.8c2 2 2.26 5.11.8 7.47"/><path d="M19.1 1.9a9.96 9.96 0 0 1 0 14.1"/>
              <path d="M9.5 18h5"/><path d="m8 22 4-11 4 11"/>
            </svg>
          </div>
          <div>
            <div className="text-[13px] font-semibold" style={{ color: "#f1f6f4", letterSpacing: "-0.01em" }}>SafeNight</div>
            <div className="text-[10px]" style={{ color: "rgba(214,235,230,0.35)" }}>
              {youthName && youthName !== "You" ? `Here for you, ${youthName}` : "Here for you, whenever you're ready"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 relative">
          {conversation.consentToHandoff ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "rgba(111,184,170,0.12)", border: "1px solid rgba(111,184,170,0.25)" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6fb8aa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
              <span className="text-[10px] font-semibold text-[#6fb8aa]">Worker notified</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "rgba(183,121,31,0.12)", border: "1px solid rgba(183,121,31,0.25)" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-[#e9c685]" style={{ animation: "sb-core 2.8s ease-in-out infinite" }} />
              <span className="text-[10px] font-semibold text-[#e9c685]">After hours</span>
            </div>
          )}

          {/* Menu toggle */}
          <button
            type="button"
            onClick={() => setShowMenu((prev) => !prev)}
            className="flex items-center justify-center w-7 h-7 rounded-full transition"
            style={{ background: showMenu ? "rgba(255,255,255,0.08)" : "transparent", color: "rgba(214,235,230,0.4)" }}
            aria-label="More options"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
            </svg>
          </button>

          {/* Dropdown menu */}
          {showMenu && (
            <div
              className="absolute top-full right-0 mt-2 w-[220px] rounded-[14px] overflow-hidden shadow-xl z-20"
              style={{ background: "#0d1f1d", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <button
                type="button"
                onClick={() => { setShowMenu(false); void openHandoffPreview(); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-[13px] transition hover:bg-white/5"
                style={{ color: "#e8f2ef", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6fb8aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <div>
                  <div className="font-medium">{conversation.consentToHandoff ? "See my note" : "Preview my note"}</div>
                  <div className="text-[10.5px] mt-0.5" style={{ color: "rgba(214,235,230,0.35)" }}>
                    {conversation.consentToHandoff ? "What your worker will receive" : "See what would be shared"}
                  </div>
                </div>
              </button>

              {showResetConfirm ? (
                <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-[12px] mb-2" style={{ color: "rgba(214,235,230,0.5)" }}>Start a fresh conversation?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowMenu(false); void resetChat(); }}
                      disabled={isResetting}
                      className="flex-1 py-1.5 rounded-[8px] text-[12px] font-semibold"
                      style={{ background: "rgba(217,95,72,0.2)", border: "1px solid rgba(217,95,72,0.3)", color: "#e88d78" }}
                    >
                      {isResetting ? "…" : "Yes, new chat"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(false)}
                      className="flex-1 py-1.5 rounded-[8px] text-[12px] font-medium"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(214,235,230,0.4)" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setShowResetConfirm(true); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-[13px] transition hover:bg-white/5"
                  style={{ color: "#e8f2ef", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(214,235,230,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                    <path d="M3 3v5h5"/>
                  </svg>
                  <div>
                    <div className="font-medium">New conversation</div>
                    <div className="text-[10.5px] mt-0.5" style={{ color: "rgba(214,235,230,0.35)" }}>Start fresh with SafeNight</div>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={() => { setShowMenu(false); router.push("/login"); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-[13px] transition hover:bg-white/5"
                style={{ color: "rgba(214,235,230,0.45)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Leave SafeNight
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto px-4 py-5 space-y-3">
        {messages.map((message) => {
          const isYouth = message.senderType === "youth";
          const isWorker = message.senderType === "worker";

          return (
            <div key={message.id} className={`flex ${isYouth ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[78%]">
                {isWorker && (
                  <div className="flex items-center gap-1.5 mb-1 pl-1">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "rgba(233,198,133,0.15)" }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#e9c685" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                    </div>
                    <span className="text-[10px] font-semibold" style={{ color: "rgba(233,198,133,0.65)" }}>Your worker</span>
                  </div>
                )}
                <div
                  className="px-3.5 py-2.5 text-[14px] leading-relaxed"
                  style={isYouth ? {
                    background: "linear-gradient(180deg, rgba(31,111,100,0.4), rgba(31,111,100,0.25))",
                    border: "1px solid rgba(111,184,170,0.28)",
                    borderRadius: "18px 18px 5px 18px",
                    color: "#f1f6f4",
                  } : isWorker ? {
                    background: "rgba(183,121,31,0.12)",
                    border: "1px solid rgba(183,121,31,0.25)",
                    borderRadius: "18px 18px 18px 5px",
                    color: "#e8f2ef",
                  } : {
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    borderRadius: "18px 18px 18px 5px",
                    color: "#e8f2ef",
                  }}
                >
                  {message.content}
                </div>
                <div className={`mt-1 text-[10px] font-mono ${isYouth ? "text-right pr-2" : "pl-2"}`} style={{ color: "rgba(214,235,230,0.28)" }}>
                  {isYouth ? youthName : isWorker ? "Your worker" : "SafeNight"} · {formatTime(message.createdAt)}
                </div>
              </div>
            </div>
          );
        })}

        {isSending && (
          <div className="flex justify-start">
            <div className="px-3.5 py-2.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "18px 18px 18px 5px" }}>
              <TypingDots />
            </div>
          </div>
        )}

        {/* Consent separator — shown after consent is given */}
        {conversation.consentToHandoff && messages.length > 0 && (
          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 h-px" style={{ background: "rgba(111,184,170,0.12)" }} />
            <span className="text-[10px] shrink-0" style={{ color: "rgba(111,184,170,0.45)" }}>Your worker will see a note from tonight</span>
            <div className="flex-1 h-px" style={{ background: "rgba(111,184,170,0.12)" }} />
          </div>
        )}
      </div>

      {/* Consent bar — only after 2+ messages and not yet dismissed */}
      {showConsentBar && (
        <div className="relative z-10 mx-4 mb-2 flex items-center justify-between gap-3 rounded-[10px] px-3.5 py-2.5" style={{ background: "rgba(31,111,100,0.1)", border: "1px solid rgba(111,184,170,0.18)" }}>
          <p className="text-[12px] leading-snug flex-1" style={{ color: "rgba(214,235,230,0.6)" }}>
            Let your worker see a brief note from tonight? You can review it first.
          </p>
          <div className="flex gap-2 shrink-0">
            <button
              disabled={isSavingConsent}
              onClick={() => updateConsent(false)}
              className="px-2.5 py-1 rounded-[7px] text-[11px] font-medium transition"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(214,235,230,0.5)" }}
            >
              Not now
            </button>
            <button
              disabled={isSavingConsent}
              onClick={() => updateConsent(true)}
              className="px-2.5 py-1 rounded-[7px] text-[11px] font-semibold transition"
              style={{ background: "rgba(31,111,100,0.3)", border: "1px solid rgba(111,184,170,0.3)", color: "#6fb8aa" }}
            >
              Yes, share
            </button>
          </div>
        </div>
      )}

      {/* Restore consent — shows after "Not now" so it's not lost forever */}
      {showRestoreConsent && (
        <div className="relative z-10 mx-4 mb-2">
          <button
            type="button"
            onClick={() => {
              setConsentDismissed(false);
              if (conversation?.id) sessionStorage.removeItem(`consent_dismissed_${conversation.id}`);
            }}
            className="w-full text-left px-3.5 py-2 rounded-[9px] text-[11.5px] transition"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(214,235,230,0.35)" }}
          >
            Changed your mind? <span style={{ color: "#6fb8aa" }}>Share a note with your worker →</span>
          </button>
        </div>
      )}

      {/* "See your note" — shown after consent is given */}
      {conversation.consentToHandoff && (
        <div className="relative z-10 px-4 pb-2">
          <button
            type="button"
            onClick={() => void openHandoffPreview()}
            className="flex w-full items-center justify-between gap-2 rounded-[10px] px-3.5 py-2.5 text-left transition"
            style={{ background: "rgba(31,111,100,0.07)", border: "1px solid rgba(111,184,170,0.15)" }}
          >
            <div>
              <span className="text-[12px] font-medium block" style={{ color: "rgba(214,235,230,0.65)" }}>See what your worker will receive</span>
              <span className="text-[10px] mt-0.5 block" style={{ color: "rgba(214,235,230,0.3)" }}>The note SafeNight prepared from tonight</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(111,184,170,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="relative z-10 mx-4 mb-2 px-3 py-2 rounded-[9px] text-[12px]" style={{ background: "rgba(217,95,72,0.1)", border: "1px solid rgba(217,95,72,0.2)", color: "#e88d78" }}>
          {error}
        </div>
      )}

      {/* Composer */}
      <div className="relative z-10 px-4 pb-4 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-end gap-2 rounded-[12px] px-3 py-2" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={handleDraftChange}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
            placeholder={youthName && youthName !== "You" ? `What's on your mind, ${youthName}…` : "What's on your mind…"}
            rows={1}
            disabled={isSending}
            className="flex-1 bg-transparent text-[14px] placeholder-[rgba(214,235,230,0.28)] resize-none outline-none leading-relaxed"
            style={{ minHeight: "22px", maxHeight: "120px", color: "#f1f6f4" }}
          />
          <button
            onClick={() => void sendMessage()}
            disabled={isSending || !draft.trim()}
            className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 transition-all mb-0.5"
            style={{
              background: draft.trim() ? "linear-gradient(160deg, #2a8576, #164b44)" : "rgba(255,255,255,0.05)",
              border: draft.trim() ? "none" : "1px solid rgba(255,255,255,0.08)",
              boxShadow: draft.trim() ? "0 3px 12px rgba(31,111,100,0.4)" : "none",
            }}
          >
            {isSending ? (
              <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={draft.trim() ? "#eaf6f2" : "rgba(214,235,230,0.25)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9l20-7z"/>
              </svg>
            )}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px]" style={{ color: "rgba(214,235,230,0.2)" }}>
          SafeNight is not a counsellor · You decide what your worker sees
        </p>
      </div>

      {/* Handoff preview modal */}
      {showHandoffPreview && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#060d0c" }}>
          {/* Ambient */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute" style={{ top: "-15%", left: "-8%", width: "55vw", height: "55vw", background: "radial-gradient(circle, rgba(31,111,100,0.18), transparent 62%)", filter: "blur(8px)" }} />
          </div>

          {/* Header */}
          <div className="relative z-10 flex items-center px-4 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <button
              type="button"
              onClick={() => setShowHandoffPreview(false)}
              className="flex items-center gap-1.5 text-[13px] transition"
              style={{ color: "rgba(214,235,230,0.5)" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
              </svg>
              Back
            </button>
            <div className="flex-1 text-center text-[14px] font-semibold" style={{ color: "#f1f6f4" }}>What your worker will see</div>
            <div className="w-12" />
          </div>

          {/* Content */}
          <div className="relative z-10 flex-1 overflow-y-auto px-4 py-5">
            {handoffLoading && (
              <div className="flex items-center justify-center h-full gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-[#6fb8aa] border-t-transparent animate-spin" />
                <span className="text-[13px]" style={{ color: "rgba(214,235,230,0.4)" }}>Preparing your note…</span>
              </div>
            )}

            {!handoffLoading && !handoffData && (
              <div className="flex items-center justify-center h-full text-center px-8">
                <div>
                  <div className="w-12 h-12 mx-auto rounded-full mb-4 flex items-center justify-center" style={{ background: "rgba(31,111,100,0.15)" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6fb8aa" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <p className="text-[15px] font-semibold mb-2" style={{ color: "#f1f6f4" }}>Your note is being prepared</p>
                  <p className="text-[13px] leading-relaxed" style={{ color: "rgba(214,235,230,0.45)" }}>
                    Continue the conversation — your worker will receive a summary once you&apos;re done for the night.
                  </p>
                </div>
              </div>
            )}

            {!handoffLoading && handoffData && (
              <div className="space-y-3 max-w-lg mx-auto pb-6">
                {/* Header */}
                <div className="mb-6">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-4" style={{ background: "rgba(31,111,100,0.15)", border: "1px solid rgba(111,184,170,0.2)" }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6fb8aa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5"/>
                    </svg>
                    <span className="text-[10px] font-semibold" style={{ color: "#6fb8aa" }}>Shared with your worker</span>
                  </div>
                  <h1 className="text-[22px] font-semibold leading-snug" style={{ color: "#f1f6f4", letterSpacing: "-0.02em" }}>
                    Your worker is ready for you.
                  </h1>
                  <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "rgba(214,235,230,0.5)" }}>
                    Here&apos;s what they&apos;ll know before they speak to you — you won&apos;t need to explain any of this again.
                  </p>
                </div>

                {/* Key quote — most personal, shown first */}
                {handoffData.keyQuote && (
                  <div className="rounded-[14px] px-4 py-4 relative overflow-hidden" style={{ background: "rgba(31,111,100,0.08)", border: "1px solid rgba(111,184,170,0.18)" }}>
                    <div className="absolute top-0 right-3 text-[64px] font-serif leading-none select-none" style={{ color: "rgba(111,184,170,0.09)" }}>&ldquo;</div>
                    <p className="text-[15px] italic leading-relaxed" style={{ color: "#e8f2ef" }}>&ldquo;{handoffData.keyQuote}&rdquo;</p>
                  </div>
                )}

                {/* What happened */}
                {handoffData.mainConcern && (
                  <div className="rounded-[14px] px-4 py-3.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: "rgba(214,235,230,0.3)" }}>What happened tonight</p>
                    <p className="text-[14px] leading-relaxed" style={{ color: "#e8f2ef" }}>{handoffData.mainConcern}</p>
                  </div>
                )}

                {/* How they were feeling */}
                {handoffData.emotionalState && (
                  <div className="rounded-[14px] px-4 py-3.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: "rgba(214,235,230,0.3)" }}>How you were feeling</p>
                    <p className="text-[14px] leading-relaxed" style={{ color: "#e8f2ef" }}>{handoffData.emotionalState}</p>
                  </div>
                )}

                {/* What comes next */}
                {handoffData.recommendedNextStep && (
                  <div className="rounded-[14px] px-4 py-3.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: "rgba(214,235,230,0.3)" }}>What comes next</p>
                    <p className="text-[14px] leading-relaxed" style={{ color: "#e8f2ef" }}>{handoffData.recommendedNextStep}</p>
                  </div>
                )}

                {/* Reassurance */}
                <div className="rounded-[14px] px-4 py-3.5 mt-1" style={{ background: "rgba(31,111,100,0.06)", border: "1px solid rgba(111,184,170,0.12)" }}>
                  <p className="text-[12px] leading-relaxed" style={{ color: "rgba(214,235,230,0.45)" }}>
                    Your worker will read this before they reach out. You&apos;re not starting from scratch — they already know what tonight was about.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

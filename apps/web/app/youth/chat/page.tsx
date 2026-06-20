"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { AfterHoursBadge } from "@/components/AfterHoursBadge";
import { ChatBubble } from "@/components/ChatBubble";
import { HandoffConsentCard } from "@/components/HandoffConsentCard";
import { MessageInput } from "@/components/MessageInput";
import { StatePanel } from "@/components/StatePanel";
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

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-SG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(new Date(value));
}

function bubbleSender(senderType: ApiMessage["senderType"]): "youth" | "assistant" | "system" {
  if (senderType === "ai" || senderType === "worker") {
    return "assistant";
  }

  return senderType;
}

function authorFor(message: ApiMessage) {
  if (message.senderType === "youth") {
    return "Mira";
  }

  if (message.senderType === "system") {
    return "SignalBridge";
  }

  return "SafeNight";
}

export default function YouthChatPage() {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [session, setSession] = useState<YouthSession | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSavingConsent, setIsSavingConsent] = useState(false);
  const [error, setError] = useState("");

  const messages = useMemo(() => {
    if (!conversation) {
      return [];
    }

    return [
      {
        id: "after-hours-banner",
        conversationId: conversation.id,
        senderType: "system" as const,
        content:
          "It may be after your worker's usual hours. SafeNight can stay with you and help prepare a note only if you allow it.",
        createdAt: new Date().toISOString()
      },
      ...conversation.messages
    ];
  }, [conversation]);

  useEffect(() => {
    async function loadConversation() {
      const currentSession = readYouthSession();
      setSession(currentSession);

      if (!currentSession?.accessToken) {
        setError("Please log in again so SignalBridge can load Mira's saved chat.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${apiBaseUrl}/youth/conversations`, {
          headers: { Authorization: `Bearer ${currentSession.accessToken}` }
        });
        if (!response.ok) {
          throw new Error("Could not load Mira's chat history.");
        }

        const data = (await response.json()) as { conversations: Conversation[] };
        setConversation(data.conversations[0] ?? null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load chat.");
      } finally {
        setIsLoading(false);
      }
    }

    loadConversation();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isSending]);

  async function sendMessage(content: string) {
    if (!conversation || !session?.accessToken) {
      return;
    }

    setError("");
    setIsSending(true);

    const optimisticMessage: ApiMessage = {
      id: `local_${Date.now()}`,
      conversationId: conversation.id,
      senderType: "youth",
      content,
      createdAt: new Date().toISOString()
    };
    setConversation({
      ...conversation,
      messages: [...conversation.messages, optimisticMessage]
    });

    try {
      const response = await fetch(`${apiBaseUrl}/youth/conversations/${conversation.id}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        throw new Error("Message could not be sent. Please try again.");
      }

      const data = (await response.json()) as { conversation: Conversation };
      setConversation(data.conversation);
    } catch (sendError) {
      setConversation((current) =>
        current
          ? {
              ...current,
              messages: current.messages.filter((message) => message.id !== optimisticMessage.id)
            }
          : current
      );
      setError(sendError instanceof Error ? sendError.message : "Message could not be sent.");
    } finally {
      setIsSending(false);
    }
  }

  async function updateConsent(consentGiven: boolean) {
    if (!conversation || !session?.accessToken) {
      return;
    }

    setError("");
    setIsSavingConsent(true);
    try {
      const response = await fetch(
        `${apiBaseUrl}/youth/conversations/${conversation.id}/handoff-consent`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ consentGiven })
        }
      );

      if (!response.ok) {
        throw new Error("Consent could not be saved. Please try again.");
      }

      const data = (await response.json()) as { conversation: Conversation };
      setConversation(data.conversation);
    } catch (consentError) {
      setError(
        consentError instanceof Error ? consentError.message : "Consent could not be saved."
      );
    } finally {
      setIsSavingConsent(false);
    }
  }

  if (isLoading) {
    return (
      <StatePanel
        title="Loading Mira's chat"
        description="SignalBridge is getting the saved conversation history."
        variant="loading"
      />
    );
  }

  if (!conversation) {
    return (
      <StatePanel
        title={error ? "Chat unavailable" : "No chat yet"}
        description={
          error ||
          "When Mira starts a SafeNight conversation, the messages and consent choices will appear here."
        }
        actionHref={error ? "/login" : undefined}
        actionLabel={error ? "Go to login" : undefined}
        variant={error ? "error" : "empty"}
      />
    );
  }

  return (
    <section className="flex min-h-[calc(100vh-220px)] w-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Mira&apos;s chat</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            SafeNight can listen, respond gently, and prepare a worker note only with Mira&apos;s permission.
          </p>
        </div>
        <AfterHoursBadge />
      </header>

      {error ? (
        <p className="mt-4 flex items-center gap-2 rounded-lg border border-coral/20 bg-coral/10 px-3 py-2 text-sm font-medium text-coral">
          <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}

      <div className="mt-5 grid flex-1 overflow-hidden rounded-lg border border-slate-200 bg-mist/50 shadow-panel lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-h-[560px] flex-col bg-white sm:min-h-[640px]">
          <div className="flex-1 space-y-5 overflow-y-auto p-3 sm:p-6">
            {messages.map((message) => (
              <ChatBubble
                key={message.id}
                sender={bubbleSender(message.senderType)}
                author={authorFor(message)}
                timestamp={message.id === "after-hours-banner" ? "Now" : formatTime(message.createdAt)}
              >
                {message.content}
              </ChatBubble>
            ))}
            {messages.length === 1 ? (
              <StatePanel
                title="Start with what feels easiest"
                description="You can write one sentence. SafeNight will not ask you to explain everything at once."
                compact
                variant="empty"
              />
            ) : null}
            {isSending ? (
              <ChatBubble sender="assistant" author="SafeNight" timestamp="Now">
                <span className="inline-flex items-center gap-2">
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  Preparing a careful reply...
                </span>
              </ChatBubble>
            ) : null}
            <HandoffConsentCard
              compact
              consentGiven={conversation.consentToHandoff}
              disabled={isSavingConsent}
              onConsentChange={updateConsent}
            />
            <div ref={bottomRef} />
          </div>
          <MessageInput
            disabled={isSending}
            onSend={sendMessage}
            defaultValue="Can you help me tell my worker without making me explain it again?"
          />
        </div>

        <aside className="border-t border-slate-200 bg-mist/60 p-4 sm:p-5 lg:border-l lg:border-t-0">
          <h2 className="text-sm font-semibold text-ink">Support signals</h2>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            These help the worker notice what may need care. They are not a diagnosis.
          </p>
          <div className="mt-4 grid gap-3">
            {conversation.signals.length ? (
              conversation.signals.map((signal) => (
                <article key={signal.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold capitalize text-ink">
                      {signal.type.replaceAll("_", " ")}
                    </h3>
                    <span className="rounded-full bg-coral/10 px-2 py-0.5 text-xs font-semibold capitalize text-coral">
                      {signal.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{signal.reason}</p>
                </article>
              ))
            ) : (
              <StatePanel
                title="No signals yet"
                description="When Mira sends a message, support signals will appear here for worker review."
                compact
                variant="empty"
              />
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

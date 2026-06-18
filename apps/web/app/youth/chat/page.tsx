"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { AfterHoursBadge } from "@/components/AfterHoursBadge";
import { ChatBubble } from "@/components/ChatBubble";
import { HandoffConsentCard } from "@/components/HandoffConsentCard";
import { MessageInput } from "@/components/MessageInput";
import { StatePanel } from "@/components/StatePanel";

type ApiMessage = {
  id: string;
  senderType: "youth" | "ai" | "system" | "worker";
  content: string;
  safetyStatus?: string | null;
  createdAt: string;
};

type ApiSignal = {
  type: string;
  severity: string;
  reason: string;
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
  if (senderType === "ai") {
    return "assistant";
  }

  return senderType === "worker" ? "assistant" : senderType;
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
        senderType: "system" as const,
        content:
          "A youth worker may not be available now. SignalBridge can help prepare a handoff note.",
        createdAt: new Date().toISOString()
      },
      ...conversation.messages
    ];
  }, [conversation]);

  useEffect(() => {
    async function loadConversation() {
      try {
        const response = await fetch(`${apiBaseUrl}/youth/conversation`);
        if (!response.ok) {
          throw new Error("Could not load Mira's chat history.");
        }

        const data = (await response.json()) as { conversation: Conversation };
        setConversation(data.conversation);
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
    if (!conversation) {
      return;
    }

    setError("");
    setIsSending(true);

    const optimisticMessage: ApiMessage = {
      id: `local_${Date.now()}`,
      senderType: "youth",
      content,
      createdAt: new Date().toISOString()
    };
    setConversation({
      ...conversation,
      messages: [...conversation.messages, optimisticMessage]
    });

    try {
      const response = await fetch(`${apiBaseUrl}/conversations/${conversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        throw new Error("Message could not be sent. Please try again.");
      }

      const data = (await response.json()) as {
        message: ApiMessage;
        aiReply: ApiMessage;
        signals: ApiSignal[];
      };

      setConversation((current) =>
        current
          ? {
              ...current,
              messages: [
                ...current.messages.filter((message) => message.id !== optimisticMessage.id),
                data.message,
                data.aiReply
              ],
              signals: data.signals
            }
          : current
      );
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
    if (!conversation) {
      return;
    }

    setError("");
    setIsSavingConsent(true);
    try {
      const response = await fetch(`${apiBaseUrl}/handoffs/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversation.id, consentGiven })
      });

      if (!response.ok) {
        throw new Error("Consent could not be saved. Please try again.");
      }

      const data = (await response.json()) as { consentToHandoff: boolean };
      setConversation({ ...conversation, consentToHandoff: data.consentToHandoff });
    } catch (consentError) {
      setError(consentError instanceof Error ? consentError.message : "Consent could not be saved.");
    } finally {
      setIsSavingConsent(false);
    }
  }

  if (isLoading) {
    return (
      <StatePanel
        title="Loading Mira's chat"
        description="SignalBridge is getting the saved conversation history from the backend."
        variant="loading"
      />
    );
  }

  if (!conversation) {
    return (
      <StatePanel
        title="Chat unavailable"
        description={error || "Mira's conversation could not be opened."}
        variant="error"
      />
    );
  }

  return (
    <section className="flex min-h-[720px] w-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Mira&apos;s chat</h1>
          <p className="mt-1 text-sm text-slate-600">
            Message history is loaded from SignalBridge&apos;s backend.
          </p>
        </div>
        <AfterHoursBadge />
      </header>

      {error ? (
        <p className="mt-4 flex items-center gap-2 rounded-lg border border-coral/20 bg-coral/10 px-3 py-2 text-sm font-medium text-coral">
          <AlertCircle aria-hidden="true" className="h-4 w-4" />
          {error}
        </p>
      ) : null}

      <div className="mt-5 grid flex-1 overflow-hidden rounded-lg border border-slate-200 bg-mist/50 shadow-panel lg:grid-cols-[1fr_340px]">
        <div className="flex min-h-[680px] flex-col bg-white">
          <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
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
            {isSending ? (
              <ChatBubble sender="assistant" author="SafeNight" timestamp="Now">
                <span className="inline-flex items-center gap-2">
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  Preparing a safe reply...
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

        <aside className="border-t border-slate-200 bg-mist/60 p-5 lg:border-l lg:border-t-0">
          <h2 className="text-sm font-semibold text-ink">Detected support signals</h2>
          <div className="mt-4 grid gap-3">
            {conversation.signals.map((signal) => (
              <article key={signal.type} className="rounded-lg border border-slate-200 bg-white p-3">
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
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

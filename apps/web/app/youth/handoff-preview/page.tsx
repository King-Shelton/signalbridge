"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  ShieldCheck
} from "lucide-react";
import { AfterHoursBadge } from "@/components/AfterHoursBadge";
import { StatePanel } from "@/components/StatePanel";
import { readYouthSession, type YouthSession } from "@/lib/youth-session";

type SessionWithToken = YouthSession & {
  accessToken?: string;
};

type ApiMessage = {
  id: string;
  senderType: "youth" | "ai" | "system" | "worker";
  content: string;
  createdAt: string;
};

type ApiSignal = {
  id: string;
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

type HandoffNote = {
  youthName: string;
  riskLevel: string;
  riskScore: number;
  mainConcern: string;
  emotionalState: string;
  keyQuote: string;
  whatSafeNightDid: string;
  whatNotToRepeat: string;
  suggestedWorkerResponse: string;
  recommendedNextStep: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const demoNote: HandoffNote = {
  youthName: "Mira Tan",
  riskLevel: "high",
  riskScore: 78,
  mainConcern: "Cyberbullying involving edited photos in a class group chat.",
  emotionalState: "Tired, embarrassed, and reluctant to repeat the story.",
  keyQuote: "I'm so tired of explaining this.",
  whatSafeNightDid:
    "Acknowledged distress, avoided diagnosis, offered handoff preparation, and asked for consent.",
  whatNotToRepeat:
    "Do not ask Mira to retell the full incident immediately unless she chooses to.",
  suggestedWorkerResponse:
    "Hi Mira, I read the note you allowed SignalBridge to prepare. You don't have to repeat everything unless you want to. I'm here now. Can I first check whether you feel safe going to school today?",
  recommendedNextStep: "Worker to check immediate school safety and agree on a next step with Mira."
};

function latestYouthMessage(messages: ApiMessage[]) {
  return [...messages].reverse().find((message) => message.senderType === "youth");
}

function buildNote(conversation: Conversation | null): HandoffNote {
  if (!conversation) {
    return demoNote;
  }

  const youthMessage = latestYouthMessage(conversation.messages);
  const signalSummary = conversation.signals
    .slice(0, 3)
    .map((signal) => signal.type.replaceAll("_", " "))
    .join(", ");

  return {
    youthName: conversation.youthName,
    riskLevel: conversation.riskLevel,
    riskScore: conversation.riskScore,
    mainConcern: signalSummary
      ? `Support signals detected: ${signalSummary}.`
      : demoNote.mainConcern,
    emotionalState:
      "Mira sounded overwhelmed and wants the worker to understand the situation without asking her to repeat everything.",
    keyQuote: youthMessage?.content ?? demoNote.keyQuote,
    whatSafeNightDid:
      "Acknowledged the after-hours message, avoided giving counselling advice, and prepared a structured note for human review.",
    whatNotToRepeat:
      "Do not ask Mira to retell the full incident at the start. First acknowledge the note and let her choose what to add.",
    suggestedWorkerResponse: demoNote.suggestedWorkerResponse,
    recommendedNextStep:
      "Worker to review the approved note, check immediate safety, and decide the first follow-up with Mira."
  };
}

const noteSections: Array<[keyof HandoffNote, string]> = [
  ["mainConcern", "Main concern"],
  ["emotionalState", "Emotional state"],
  ["keyQuote", "Key quote"],
  ["whatSafeNightDid", "What SafeNight did"],
  ["whatNotToRepeat", "What not to repeat"],
  ["recommendedNextStep", "Recommended next step"]
];

export default function HandoffPreviewPage() {
  const [session, setSession] = useState<SessionWithToken | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingConsent, setIsSavingConsent] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [error, setError] = useState("");

  const note = buildNote(conversation);

  useEffect(() => {
    async function loadConversation() {
      const currentSession = readYouthSession() as SessionWithToken | null;
      setSession(currentSession);

      if (!currentSession?.accessToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${apiBaseUrl}/youth/conversations`, {
          headers: { Authorization: `Bearer ${currentSession.accessToken}` }
        });
        if (!response.ok) {
          throw new Error("Could not load the latest generated note.");
        }

        const data = (await response.json()) as { conversations: Conversation[] };
        const latestConversation = data.conversations[0] ?? null;
        setConversation(latestConversation);
        setConsentGiven(Boolean(latestConversation?.consentToHandoff));
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load the latest generated note."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadConversation();
  }, []);

  async function allowWorkerReview() {
    setError("");

    if (!conversation || !session?.accessToken) {
      setConsentGiven(true);
      return;
    }

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
          body: JSON.stringify({ consentGiven: true })
        }
      );

      if (!response.ok) {
        throw new Error("Consent could not be saved. Please try again.");
      }

      const data = (await response.json()) as { conversation: Conversation };
      setConversation(data.conversation);
      setConsentGiven(data.conversation.consentToHandoff);
    } catch (consentError) {
      setError(
        consentError instanceof Error ? consentError.message : "Consent could not be saved."
      );
    } finally {
      setIsSavingConsent(false);
    }
  }

  function keepPrivateForNow() {
    setError("");
    setConsentGiven(false);
  }

  if (isLoading) {
    return (
      <StatePanel
        title="Preparing handoff preview"
        description="SignalBridge is loading the latest youth-approved note draft."
        variant="loading"
      />
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-5 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <Link
            href="/youth/chat"
            className="inline-flex items-center gap-2 text-sm font-semibold text-pine hover:text-ink"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to chat
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-ink">Handoff preview</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Review what SignalBridge will share before a youth worker sees it.
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

      <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-pine/10 p-2 text-pine">
                <ClipboardCheck aria-hidden="true" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-pine">Generated worker note</p>
                <h2 className="text-xl font-semibold text-ink">{note.youthName}</h2>
              </div>
            </div>
            <div className="rounded-lg border border-coral/20 bg-coral/10 px-3 py-2 text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-coral">
                {note.riskLevel} risk
              </p>
              <p className="text-lg font-semibold text-coral">{note.riskScore}/100</p>
            </div>
          </div>

          <dl className="mt-6 grid gap-4">
            {noteSections.map(([key, label]) => (
              <div key={key} className="rounded-lg border border-slate-200 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {label}
                </dt>
                <dd className="mt-2 text-sm leading-6 text-ink">{note[key]}</dd>
              </div>
            ))}
          </dl>
        </article>

        <aside className="grid content-start gap-4">
          <section className="rounded-lg border border-pine/20 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-pine/10 p-2 text-pine">
                <ShieldCheck aria-hidden="true" className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-ink">
                  Allow worker to review this note?
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Mira stays in control. The worker sees this summary only after she allows it.
                </p>
              </div>
            </div>

            {consentGiven ? (
              <div className="mt-4 rounded-lg border border-pine/20 bg-pine/10 p-3 text-sm leading-6 text-pine">
                <div className="flex gap-2 font-semibold">
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4" />
                  Consent saved
                </div>
                <p className="mt-1">
                  You do not have to repeat everything tomorrow. Your worker can review this note.
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-amber/30 bg-amber/10 p-3 text-sm leading-6 text-amber">
                No consent has been given yet. The worker cannot review this note until Mira allows it.
              </div>
            )}

            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={allowWorkerReview}
                disabled={isSavingConsent || consentGiven}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSavingConsent ? (
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                ) : null}
                {consentGiven ? "Worker review allowed" : "Allow worker to review this note"}
              </button>
              <button
                type="button"
                onClick={keepPrivateForNow}
                disabled={isSavingConsent}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                Keep private for now
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-ink">Suggested first response</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {note.suggestedWorkerResponse}
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}

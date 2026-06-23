"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { OperationsState } from "@/components/OperationsState";
import { apiFetch } from "@/lib/api-client";
import { Handoff, label, riskClass } from "@/lib/operations";

const noteRows: Array<[string, keyof Handoff]> = [
  ["Main concern", "mainConcern"],
  ["How the message sounded", "emotionalState"],
  ["Your words", "keyQuote"],
  ["What SafeNight did", "whatAiDid"],
  ["What you should not need to repeat", "whatNotToRepeat"],
  ["Recommended next step", "recommendedNextStep"]
];

export default function HandoffPreviewPage() {
  const [data, setData] = useState<Handoff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiFetch<{ handoffs: Handoff[] }>("/youth/handoffs");
      setData(result.handoffs[0] ?? null);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load the handoff note.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <OperationsState
      loading={loading}
      error={error}
      empty={!data}
      emptyTitle="No approved handoff yet"
      emptyDescription="A worker cannot review a handoff note until SafeNight has a note and consent has been given. Return to chat when you are ready."
      retry={load}
    >
      {data ? (
        <div className="space-y-5">
          <section className="rounded-[28px] border bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-pine">
              Consent-approved handoff note
            </p>
            <div className="mt-2 flex flex-wrap justify-between gap-3">
              <h1 className="text-3xl font-semibold">Review what your worker can see</h1>
              <span className={`h-fit rounded-full px-3 py-1 text-xs font-semibold ${riskClass(data.riskLevel)}`}>
                {label(data.riskLevel)}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              You remain in control and can choose what to add when your worker follows up.
            </p>
          </section>

          <section className="grid gap-4">
            {noteRows.map(([title, key]) => (
              <article key={title} className="rounded-2xl border bg-white p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {data[key] || "No detail added yet."}
                </p>
              </article>
            ))}
          </section>

          <Link
            href="/youth/chat"
            className="inline-block rounded-xl bg-pine px-4 py-2 text-sm font-semibold text-white"
          >
            Return to SafeNight
          </Link>
        </div>
      ) : null}
    </OperationsState>
  );
}

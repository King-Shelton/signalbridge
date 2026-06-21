"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, downloadAuthenticated } from "@/lib/api-client";
import { Handoff, label, riskClass } from "@/lib/operations";
import { OperationsState } from "@/components/OperationsState";

export default function HandoffPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  const [data, setData] = useState<Handoff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void params.then((value) => setId(value.id));
  }, [params]);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }

    setLoading(true);

    try {
      setData(await apiFetch<Handoff>(`/worker/handoffs/${id}`));
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
      setData(
        await apiFetch<Handoff>(`/worker/handoffs/${id}/review`, {
          method: "PATCH",
          body: JSON.stringify({ status })
        })
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed");
    } finally {
      setSaving(false);
    }
  }

  const sections = data
    ? [
        ["Main concern", data.mainConcern],
        ["Emotional state", data.emotionalState],
        ["Key quote", data.keyQuote],
        ["What AI did", data.whatAiDid],
        ["Recommended next step", data.recommendedNextStep]
      ]
    : [];

  return (
    <OperationsState loading={loading} error={error} empty={!data} retry={load}>
      {data ? (
        <div className="space-y-5">
          <section className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(31,111,100,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(217,95,72,0.12),_transparent_30%),linear-gradient(180deg,_#ffffff_0%,_#f7fbf9_100%)] p-6 shadow-sm">
            <div className="flex flex-wrap justify-between gap-3">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pine">
                  Youth-approved handoff
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                  {data.youthName}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  This is the bridge from SafeNight into the worker shift. The highlighted guidance
                  below is the part that prevents the youth from repeating the story twice.
                </p>
              </div>
              <span className={`h-fit rounded-full px-3 py-1 text-xs font-semibold ${riskClass(data.riskLevel)}`}>
                {label(data.riskLevel)} - {data.riskScore}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Review status: {label(data.reviewStatus)}
              </span>
              <Link
                href={`/worker/youths/${data.youthId}`}
                className="rounded-full border border-pine/20 bg-pine/10 px-3 py-1 text-xs font-semibold text-pine transition hover:bg-pine/15"
              >
                Open youth memory card
              </Link>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {sections.map(([title, value]) => (
                  <article key={title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{value}</p>
                  </article>
                ))}
              </div>

              <article className="rounded-[28px] border border-pine/20 bg-[linear-gradient(180deg,_rgba(31,111,100,0.08),_white)] p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">
                  Suggested first response
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-700">{data.suggestedWorkerResponse}</p>
              </article>
            </div>

            <aside className="space-y-4">
              <section className="rounded-[28px] border border-coral/15 bg-coral/5 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral">
                  What not to repeat
                </p>
                <p className="mt-3 text-base leading-7 text-slate-800">
                  {data.whatNotToRepeat}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Keep this visible while opening the case so the first reply stays short, human, and
                  continuity-focused.
                </p>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">
                  Youth memory card
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Jump straight to the youth profile for preferred channel, assigned worker, stressors,
                  helpful approaches, previous handoffs, and notes.
                </p>
                <Link
                  href={`/worker/youths/${data.youthId}`}
                  className="mt-4 inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-ink transition hover:border-pine hover:bg-pine/5"
                >
                  Open memory card
                </Link>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Review actions
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    disabled={saving}
                    onClick={() => void review("reviewed")}
                    className="rounded-xl bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:opacity-60"
                  >
                    Mark reviewed
                  </button>
                  <button
                    disabled={saving}
                    onClick={() => void review("escalated")}
                    className="rounded-xl bg-coral px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    Escalate
                  </button>
                  <button
                    onClick={() => void downloadAuthenticated(`/worker/handoffs/${id}/pdf`, `signalbridge-${id}.pdf`)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-ink transition hover:border-pine hover:bg-mist"
                  >
                    Export PDF
                  </button>
                </div>
              </section>
            </aside>
          </section>
        </div>
      ) : null}
    </OperationsState>
  );
}

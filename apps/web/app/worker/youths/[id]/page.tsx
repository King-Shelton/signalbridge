"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { Handoff, label } from "@/lib/operations";
import { OperationsState } from "@/components/OperationsState";

type Youth = {
  id: string;
  name: string;
  preferredChannel: string;
  assignedWorker?: string;
  supportStyle?: string;
  stressors?: string;
  cases: Array<{ id: string; status: string; priority: string; summary: string }>;
  handoffs: Handoff[];
  notes: Array<{ id: string; content: string }>;
};

export default function YouthPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  const [data, setData] = useState<Youth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void params.then((value) => setId(value.id));
  }, [params]);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }

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

  return (
    <OperationsState loading={loading} error={error} empty={!data} retry={load}>
      {data ? (
        <div className="space-y-5">
          <section className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(31,111,100,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(217,95,72,0.12),_transparent_30%),linear-gradient(180deg,_#ffffff_0%,_#f7fbf9_100%)] p-6 shadow-sm">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pine">
                Youth memory card
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                {data.name}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                Keep this card open when a worker needs the youth&apos;s preferred channel, support style,
                past stressors, previous handoffs, and current notes.
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Preferred channel", data.preferredChannel],
                ["Assigned worker", data.assignedWorker || "Unassigned"],
                ["Support style", data.supportStyle || "No preference yet"],
                ["Stressors", data.stressors || "No stressors recorded"]
              ].map(([title, value]) => (
                <article
                  key={title}
                  className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink">{value}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-ink">Helpful approaches</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                The worker should use this tone when opening the next conversation.
              </p>
              <p className="mt-4 rounded-2xl bg-pine/5 p-4 text-sm leading-7 text-slate-700">
                {data.supportStyle}
              </p>
            </article>

            <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-ink">Past stressors</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                These are the recurring pressures the worker should keep in mind.
              </p>
              <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                {data.stressors}
              </p>
            </article>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-ink">Previous handoffs</h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {data.handoffs.length} records
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                {data.handoffs.map((handoff) => (
                  <Link
                    key={handoff.id}
                    href={`/worker/handoffs/${handoff.id}`}
                    className="rounded-2xl border border-slate-200 p-4 text-sm transition hover:border-pine hover:bg-pine/5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="font-semibold text-ink">{handoff.mainConcern}</p>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                        {label(handoff.reviewStatus)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {new Date(handoff.createdAt).toLocaleString()}
                    </p>
                  </Link>
                ))}
              </div>
            </article>

            <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-ink">Worker notes</h3>
                <span className="rounded-full bg-pine/10 px-3 py-1 text-xs font-semibold text-pine">
                  Keep visible
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                {data.notes.length ? (
                  data.notes.map((note) => (
                    <p key={note.id} className="rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                      {note.content}
                    </p>
                  ))
                ) : (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No notes yet.</p>
                )}
              </div>
            </article>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-ink">Cases and follow-up</h3>
              <Link
                href="/worker/cases"
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-ink transition hover:border-pine hover:bg-pine/5"
              >
                Open case tracker
              </Link>
            </div>
            <div className="mt-4 grid gap-3">
              {data.cases.map((caseItem) => (
                <div key={caseItem.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-semibold text-ink">{caseItem.summary}</p>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
                      {label(caseItem.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">Priority: {label(caseItem.priority)}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </OperationsState>
  );
}

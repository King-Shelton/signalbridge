"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { ConversationItem, label, riskClass } from "@/lib/operations";
import { OperationsState } from "@/components/OperationsState";

function sortByPriority(items: ConversationItem[]) {
  const riskOrder: Record<ConversationItem["riskLevel"], number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3
  };

  return [...items].sort((a, b) => {
    const handoffDelta = Number(b.unresolvedHandoff) - Number(a.unresolvedHandoff);
    if (handoffDelta !== 0) {
      return handoffDelta;
    }

    const riskDelta = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    if (riskDelta !== 0) {
      return riskDelta;
    }

    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
  });
}

export default function WorkerCockpitPage() {
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiFetch<{ conversations: ConversationItem[] }>("/worker/cockpit");
      setItems(sortByPriority(data.conversations));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load cockpit.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(
    () => ({
      open: items.filter((item) => item.case?.status !== "closed").length,
      high: items.filter((item) => ["high", "critical"].includes(item.riskLevel)).length,
      handoffs: items.filter((item) => item.unresolvedHandoff).length,
      recent: items[0]
    }),
    [items]
  );

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(31,111,100,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(217,95,72,0.12),_transparent_30%),linear-gradient(180deg,_#ffffff_0%,_#f7fbf9_100%)] p-6 shadow-sm">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pine">
            Live worker cockpit
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Who needs attention first, and what context do they need?
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            The cockpit ranks unresolved handoffs, recent signal spikes, and follow-up work so the
            next worker can start with continuity instead of a blank slate.
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            ["Open cases", metrics.open],
            ["High priority", metrics.high],
            ["Unresolved handoffs", metrics.handoffs]
          ].map(([name, value]) => (
            <article
              key={name}
              className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {name}
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
            </article>
          ))}
        </div>

        {metrics.recent ? (
          <div className="mt-5 rounded-2xl border border-pine/15 bg-pine/5 px-4 py-3 text-sm text-slate-700">
            <span className="font-semibold text-pine">Most urgent now:</span>{" "}
            {metrics.recent.youthName} from {metrics.recent.channel} is showing{" "}
            {label(metrics.recent.riskLevel).toLowerCase()} risk with{" "}
            {metrics.recent.unresolvedHandoff ? "an unresolved handoff." : "active follow-up."}
          </div>
        ) : null}
      </section>

      <OperationsState loading={loading} error={error} empty={!items.length} retry={load}>
        <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="grid gap-4">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {item.channel} - {new Date(item.lastMessageAt).toLocaleString()}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold text-ink">{item.youthName}</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                      {item.suggestedAction}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${riskClass(item.riskLevel)}`}
                  >
                    {label(item.riskLevel)} - {item.riskScore}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {item.signals.slice(0, 4).map((signal) => (
                    <span
                      key={signal.id}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                    >
                      {label(signal.type)}
                    </span>
                  ))}
                  {item.unresolvedHandoff ? (
                    <span className="rounded-full bg-coral/10 px-3 py-1 text-xs font-semibold text-coral">
                      Unresolved handoff
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Signal evidence
                    </p>
                    <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                      {item.signals.slice(0, 3).map((signal) => (
                        <li key={signal.id} className="rounded-xl bg-white px-3 py-2 shadow-sm">
                          <strong>{label(signal.type)}:</strong> {signal.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Recommended move
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{item.suggestedAction}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/worker/youths/${item.youthId}`}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-ink transition hover:border-pine hover:bg-pine/5"
                  >
                    Open memory card
                  </Link>
                  {item.handoffId ? (
                    <Link
                      href={`/worker/handoffs/${item.handoffId}`}
                      className="inline-flex items-center justify-center rounded-xl bg-pine px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-pine/90"
                    >
                      Open handoff
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          <aside className="space-y-4">
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">
                Radar console
              </p>
              <h3 className="mt-2 text-xl font-semibold text-ink">Current triage stack</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                High-risk and unresolved items sit at the top so the worker starts with the strongest
                continuity cues first.
              </p>
              <div className="mt-4 space-y-3">
                {items.slice(0, 4).map((item, index) => (
                  <div
                    key={`${item.id}-stack`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-ink">
                        {index + 1}. {item.youthName}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${riskClass(item.riskLevel)}`}
                      >
                        {label(item.riskLevel)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {item.unresolvedHandoff ? "Unresolved handoff" : "Follow-up queue"} -{" "}
                      {item.channel}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-pine/15 bg-[linear-gradient(180deg,_rgba(31,111,100,0.08),_rgba(255,255,255,1))] p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">
                Command centre note
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                This workspace is meant to feel like an operations board, not a simple table. The
                priority queue, signal chips, and memory-card links keep the Mira journey visible at
                every step.
              </p>
              <div className="mt-4">
                <Link
                  href="/worker/youth-profiles"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm transition hover:bg-mist"
                >
                  Browse memory cards
                </Link>
              </div>
            </section>
          </aside>
        </section>
      </OperationsState>
    </div>
  );
}

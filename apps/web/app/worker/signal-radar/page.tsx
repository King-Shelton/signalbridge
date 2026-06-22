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

export default function SignalRadarPage() {
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [risk, setRisk] = useState("all");
  const [channel, setChannel] = useState("all");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiFetch<{ items: ConversationItem[] }>("/signals/radar");
      setItems(sortByPriority(data.items));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load radar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (risk === "all" || item.riskLevel === risk) &&
          (channel === "all" || item.channel === channel) &&
          item.youthName.toLowerCase().includes(query.toLowerCase())
      ),
    [items, risk, channel, query]
  );

  const metrics = useMemo(
    () => ({
      total: items.length,
      urgent: items.filter((item) => item.riskLevel === "high" || item.riskLevel === "critical")
        .length,
      unresolved: items.filter((item) => item.unresolvedHandoff).length,
      latest: items[0]
    }),
    [items]
  );

  const filterCount = [risk !== "all", channel !== "all", query.trim().length > 0].filter(Boolean).length;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(31,111,100,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(217,95,72,0.12),_transparent_30%),linear-gradient(180deg,_#ffffff_0%,_#f7fbf9_100%)] p-6 shadow-sm">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pine">
            Signal Radar
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            A command centre for urgency, not a flat list of cases.
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            Priority is driven by unresolved handoffs, risk level, and recent activity so the worker
            can triage at a glance and move straight into the most important youth context.
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Tracked cases", metrics.total],
            ["Urgent signals", metrics.urgent],
            ["Unresolved handoffs", metrics.unresolved],
            ["Active filters", filterCount]
          ].map(([title, value]) => (
            <article
              key={title}
              className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {title}
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
            </article>
          ))}
        </div>

        {metrics.latest ? (
          <div className="mt-5 rounded-2xl border border-coral/15 bg-coral/5 px-4 py-3 text-sm text-slate-700">
            <span className="font-semibold text-coral">Top priority:</span>{" "}
            {metrics.latest.youthName} is currently surfacing{" "}
            {label(metrics.latest.riskLevel).toLowerCase()} risk with{" "}
            {metrics.latest.unresolvedHandoff ? "an unresolved handoff." : "an active follow-up."}
          </div>
        ) : null}

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search youth"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-pine"
          />
          <select
            value={risk}
            onChange={(e) => setRisk(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-pine"
          >
            <option value="all">All risks</option>
            {["critical", "high", "medium", "low"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-pine"
          >
            <option value="all">All channels</option>
            {Array.from(new Set(items.map((item) => item.channel))).map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
      </section>

      <OperationsState loading={loading} error={error} empty={!filtered.length} retry={load}>
        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-4">
            {filtered.map((item, index) => (
              <article
                key={item.id}
                className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Priority {index + 1} - {item.channel}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold text-ink">{item.youthName}</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                      Last active {new Date(item.lastMessageAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${riskClass(item.riskLevel)}`}
                  >
                    {label(item.riskLevel)} - {item.riskScore}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {item.signals.map((signal) => (
                    <span
                      key={signal.id}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                    >
                      {label(signal.type)}
                    </span>
                  ))}
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Why it is here
                    </p>
                    <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                      {item.signals.slice(0, 3).map((signal) => (
                        <li key={signal.id} className="rounded-xl bg-white px-3 py-2 shadow-sm">
                          <strong>{label(signal.type)}:</strong> {signal.reason}
                          <span className="ml-2 text-xs text-slate-400">Source: {signal.source}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-pine/15 bg-[linear-gradient(180deg,_rgba(31,111,100,0.08),_white)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pine">
                      Worker action
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{item.suggestedAction}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`/worker/youths/${item.youthId}`}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:border-pine hover:bg-mist"
                      >
                        Memory card
                      </Link>
                      {item.handoffId ? (
                        <Link
                          href={`/worker/handoffs/${item.handoffId}`}
                          className="inline-flex items-center justify-center rounded-xl bg-pine px-3 py-2 text-xs font-semibold text-white transition hover:bg-pine/90"
                        >
                          Handoff brief
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className="space-y-4">
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">
                Radar stack
              </p>
              <h3 className="mt-2 text-xl font-semibold text-ink">At-a-glance triage</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                The stack below mirrors the live priority order so the worker can move from the
                highest-risk youth to the next best follow-up without hunting through a table.
              </p>
              <div className="mt-4 space-y-3">
                {filtered.slice(0, 4).map((item, index) => (
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
                      {item.unresolvedHandoff ? "Unresolved handoff" : "Review in queue"} -{" "}
                      {item.channel}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-coral/15 bg-coral/5 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral">
                Triage rule
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Unresolved handoffs come first, then higher risk scores, then the newest activity.
                That keeps the radar explainable and easy to defend in front of judges.
              </p>
            </section>
          </aside>
        </section>
      </OperationsState>
    </div>
  );
}

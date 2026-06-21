"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { ConversationItem, label, riskClass } from "@/lib/operations";
import { OperationsState } from "@/components/OperationsState";

export default function WorkerCockpitPage() {
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { setItems((await apiFetch<{ conversations: ConversationItem[] }>("/worker/cockpit")).conversations); } catch (e) { setError(e instanceof Error ? e.message : "Could not load cockpit."); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const metrics = useMemo(() => ({ open: items.filter(i => i.case?.status !== "closed").length, high: items.filter(i => ["high", "critical"].includes(i.riskLevel)).length, handoffs: items.filter(i => i.unresolvedHandoff).length }), [items]);
  return <div className="space-y-5">
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[.2em] text-pine">Live worker cockpit</p><h2 className="mt-2 text-3xl font-semibold text-ink">Who needs attention first?</h2><p className="mt-3 text-sm text-slate-600">Persisted conversations are ordered by risk, unresolved handoff, and recent activity.</p></section>
    <section className="grid gap-3 sm:grid-cols-3">{[["Open cases",metrics.open],["High priority",metrics.high],["Unresolved handoffs",metrics.handoffs]].map(([name,value]) => <article key={name} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase text-slate-500">{name}</p><p className="mt-2 text-2xl font-semibold text-ink">{value}</p></article>)}</section>
    <OperationsState loading={loading} error={error} empty={!items.length} retry={load}><section className="grid gap-4">{items.map(item => <article key={item.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-slate-500">{item.channel} · {new Date(item.lastMessageAt).toLocaleString()}</p><h3 className="mt-1 text-xl font-semibold text-ink">{item.youthName}</h3></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${riskClass(item.riskLevel)}`}>{label(item.riskLevel)} · {item.riskScore}</span></div><p className="mt-3 text-sm text-slate-600">{item.suggestedAction}</p><div className="mt-3 flex flex-wrap gap-2">{item.signals.slice(0,3).map(s => <span key={s.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{label(s.type)}</span>)}</div><div className="mt-4 flex flex-wrap gap-2"><Link href={`/worker/youths/${item.youthId}`} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold">Memory card</Link>{item.handoffId ? <Link href={`/worker/handoffs/${item.handoffId}`} className="rounded-xl bg-pine px-3 py-2 text-xs font-semibold text-white">Open handoff</Link> : null}</div></article>)}</section></OperationsState>
  </div>;
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, downloadAuthenticated } from "@/lib/api-client";
import { Handoff, label, riskClass } from "@/lib/operations";
import { OperationsState } from "@/components/OperationsState";

export default function HandoffPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState(""); const [data, setData] = useState<Handoff | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  useEffect(() => { void params.then(value => setId(value.id)); }, [params]);
  const load = useCallback(async () => { if (!id) return; setLoading(true); try { setData(await apiFetch<Handoff>(`/worker/handoffs/${id}`)); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Could not load handoff"); } finally { setLoading(false); } }, [id]);
  useEffect(() => { void load(); }, [load]);
  async function review(status: string) { setSaving(true); try { setData(await apiFetch<Handoff>(`/worker/handoffs/${id}/review`, { method: "PATCH", body: JSON.stringify({ status }) })); } catch (e) { setError(e instanceof Error ? e.message : "Review failed"); } finally { setSaving(false); } }
  const sections = data ? [["Main concern", data.mainConcern], ["Emotional state", data.emotionalState], ["Key quote", data.keyQuote], ["What AI did", data.whatAiDid], ["What not to repeat", data.whatNotToRepeat], ["Recommended next step", data.recommendedNextStep]] : [];
  return <OperationsState loading={loading} error={error} empty={!data} retry={load}>{data ? <div className="space-y-5"><section className="rounded-[28px] border bg-white p-6"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-pine">Youth-approved handoff</p><h2 className="mt-2 text-3xl font-semibold">{data.youthName}</h2></div><span className={`h-fit rounded-full px-3 py-1 text-xs font-semibold ${riskClass(data.riskLevel)}`}>{label(data.riskLevel)} · {data.riskScore}</span></div><p className="mt-4 text-sm text-slate-500">Review status: {label(data.reviewStatus)}</p></section><section className="grid gap-4 lg:grid-cols-2">{sections.map(([title, value]) => <article key={title} className="rounded-2xl border bg-white p-4"><p className="text-xs font-semibold uppercase text-slate-500">{title}</p><p className="mt-2 text-sm leading-6 text-slate-700">{value}</p></article>)}</section><article className="rounded-2xl border border-pine/20 bg-pine/5 p-5"><p className="text-xs font-semibold uppercase text-pine">Suggested first response</p><p className="mt-2 text-sm leading-7">{data.suggestedWorkerResponse}</p></article><div className="flex flex-wrap gap-2"><button disabled={saving} onClick={() => void review("reviewed")} className="rounded-xl bg-pine px-4 py-2 text-sm font-semibold text-white">Mark reviewed</button><button disabled={saving} onClick={() => void review("escalated")} className="rounded-xl bg-coral px-4 py-2 text-sm font-semibold text-white">Escalate</button><button onClick={() => void downloadAuthenticated(`/worker/handoffs/${id}/pdf`, `signalbridge-${id}.pdf`)} className="rounded-xl border px-4 py-2 text-sm font-semibold">Export PDF</button></div></div> : null}</OperationsState>;
}

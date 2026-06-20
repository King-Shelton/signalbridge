"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { Handoff, label } from "@/lib/operations";
import { OperationsState } from "@/components/OperationsState";

type Youth = { id:string; name:string; preferredChannel:string; assignedWorker?:string; supportStyle?:string; stressors?:string; cases:Array<{id:string;status:string;priority:string;summary:string}>; handoffs:Handoff[]; notes:Array<{id:string;content:string}> };
export default function YouthPage({ params }: { params: Promise<{ id: string }> }) {
  const [id,setId]=useState(""); const [data,setData]=useState<Youth|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  useEffect(()=>{void params.then(value=>setId(value.id))},[params]);
  const load=useCallback(async()=>{if(!id)return;setLoading(true);try{setData(await apiFetch<Youth>(`/worker/youths/${id}`));setError("")}catch(e){setError(e instanceof Error?e.message:"Could not load youth context")}finally{setLoading(false)}},[id]);
  useEffect(()=>{void load()},[load]);
  return <OperationsState loading={loading} error={error} empty={!data} retry={load}>{data?<div className="space-y-5"><section className="rounded-[28px] border bg-white p-6"><p className="text-xs font-semibold uppercase text-pine">Youth memory card</p><h2 className="mt-2 text-3xl font-semibold">{data.name}</h2><p className="mt-2 text-sm text-slate-500">{data.preferredChannel} · Assigned to {data.assignedWorker||"Unassigned"}</p></section><section className="grid gap-4 lg:grid-cols-2"><article className="rounded-2xl border bg-white p-5"><h3 className="font-semibold">Helpful support approach</h3><p className="mt-2 text-sm leading-6 text-slate-600">{data.supportStyle}</p></article><article className="rounded-2xl border bg-white p-5"><h3 className="font-semibold">Known stressors</h3><p className="mt-2 text-sm leading-6 text-slate-600">{data.stressors}</p></article></section><section className="rounded-2xl border bg-white p-5"><h3 className="font-semibold">Cases and follow-up</h3><div className="mt-3 grid gap-2">{data.cases.map(c=><div key={c.id} className="rounded-xl bg-slate-50 p-3 text-sm"><strong>{label(c.status)}</strong> · {c.summary}</div>)}</div></section><section className="rounded-2xl border bg-white p-5"><h3 className="font-semibold">Previous approved handoffs</h3><div className="mt-3 grid gap-2">{data.handoffs.map(h=><Link key={h.id} href={`/worker/handoffs/${h.id}`} className="rounded-xl border p-3 text-sm text-pine">{new Date(h.createdAt).toLocaleString()} · {h.mainConcern}</Link>)}</div></section><section className="rounded-2xl border bg-white p-5"><h3 className="font-semibold">Worker notes</h3><div className="mt-3 grid gap-2">{data.notes.length?data.notes.map(n=><p key={n.id} className="rounded-xl bg-slate-50 p-3 text-sm">{n.content}</p>):<p className="text-sm text-slate-500">No notes yet.</p>}</div></section></div>:null}</OperationsState>;
}

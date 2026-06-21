"use client";

import { useCallback,useEffect,useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { Handoff,label } from "@/lib/operations";
import { OperationsState } from "@/components/OperationsState";

export default function PastNotesPage(){const[items,setItems]=useState<Handoff[]>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState("");const load=useCallback(async()=>{setLoading(true);try{setItems((await apiFetch<{handoffs:Handoff[]}>("/youth/handoffs")).handoffs);setError("")}catch(e){setError(e instanceof Error?e.message:"Could not load shared notes")}finally{setLoading(false)}},[]);useEffect(()=>{void load()},[load]);return <div className="space-y-5"><section><p className="text-xs font-semibold uppercase tracking-[.2em] text-pine">Shared handoff history</p><h1 className="mt-2 text-2xl font-semibold">Notes you approved</h1></section><OperationsState loading={loading} error={error} empty={!items.length} retry={load}><section className="grid gap-3">{items.map(item=><article key={item.id} className="rounded-2xl border bg-white p-4"><div className="flex justify-between"><strong>{item.mainConcern}</strong><span className="text-xs text-slate-500">{label(item.riskLevel)}</span></div><p className="mt-2 text-sm text-slate-600">{item.whatNotToRepeat}</p><time className="mt-2 block text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</time></article>)}</section></OperationsState></div>}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Radar, ShieldAlert, ClipboardList, Sparkles, MessageCircle, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { ConversationItem, label } from "@/lib/operations";

function riskMeta(level: string) {
  if (level === "high" || level === "critical")
    return { fg: "#e88d78", soft: "rgba(217,95,72,0.15)", border: "rgba(217,95,72,0.4)" };
  if (level === "medium")
    return { fg: "#e9c685", soft: "rgba(183,121,31,0.15)", border: "rgba(183,121,31,0.4)" };
  return { fg: "#6fb8aa", soft: "rgba(31,111,100,0.15)", border: "rgba(31,111,100,0.4)" };
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function greetingFor(date: Date) {
  const hour = Number(
    new Intl.DateTimeFormat("en-SG", { hour: "numeric", hour12: false, timeZone: "Asia/Singapore" }).format(date)
  );
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 22) return "Good evening";
  return "Working late";
}

export default function WorkerCockpitPage() {
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState<Date | null>(null);

  // Render the live clock and greeting only after mount so the server-rendered
  // markup matches the first client paint (avoids a hydration mismatch).
  useEffect(() => {
    setNow(new Date());
    const tick = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(tick);
  }, []);

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await apiFetch<{ conversations: ConversationItem[] }>("/worker/cockpit");
      setItems(data.conversations);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load cockpit.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const interval = setInterval(() => void load(), 5000);
    return () => clearInterval(interval);
  }, [load]);

  const ranked = useMemo(() => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 } as Record<string, number>;
    return [...items].sort(
      (a, b) => (order[a.riskLevel] ?? 4) - (order[b.riskLevel] ?? 4) || b.riskScore - a.riskScore
    );
  }, [items]);

  const stats = useMemo(
    () => ({
      queue: items.length,
      high: items.filter((item) => ["high", "critical"].includes(item.riskLevel)).length,
      handoffs: items.filter((item) => item.unresolvedHandoff).length,
      open: items.filter((item) => item.case && item.case.status !== "closed").length,
    }),
    [items]
  );

  const tiles: [string, number | string, string, React.ReactNode][] = [
    ["Priority queue", stats.queue, "#6fb8aa", <Radar key="i" size={20} strokeWidth={1.75} />],
    ["High-priority", stats.high, "#e88d78", <ShieldAlert key="i" size={20} strokeWidth={1.75} />],
    ["Unresolved handoffs", stats.handoffs, "#e9c685", <ClipboardList key="i" size={20} strokeWidth={1.75} />],
    ["Open cases", stats.open, "#6fb8aa", <Sparkles key="i" size={20} strokeWidth={1.75} />],
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex items-end justify-between gap-5 flex-wrap">
        <div className="max-w-xl">
          <p className="sb-eyebrow mb-2">Signal Radar{now ? ` · ${greetingFor(now)}` : ""}</p>
          <h1 className="text-[30px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.025em" }}>
            Prioritise the queue before it becomes noise.
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-[rgba(214,235,230,0.55)]">
            Cases ranked by risk signals, unresolved handoffs, and urgency — so you decide what to open first.
          </p>
        </div>
        <div className="text-[12px] font-mono text-[rgba(214,235,230,0.35)]">
          {now ? now.toLocaleString("en-SG", { weekday: "short", hour: "2-digit", minute: "2-digit" }) : ""}
        </div>
      </header>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map(([name, value, color, icon]) => (
          <div key={name} className="glass-card p-4 flex items-start justify-between gap-2">
            <div>
              <p className="sb-eyebrow mb-2">{name}</p>
              <p className="text-[30px] font-semibold leading-none" style={{ color, letterSpacing: "-0.03em" }}>
                {value}
              </p>
            </div>
            <span className="w-9 h-9 rounded-[11px] flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.05)", color }}>
              {icon}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div className="text-[13px] text-[#e88d78] bg-[rgba(217,95,72,0.1)] border border-[rgba(217,95,72,0.2)] rounded-xl px-4 py-3 flex items-center gap-3">
          {error}
          <button type="button" onClick={() => void load()} className="underline text-[#e88d78]">Retry</button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.55fr_0.85fr] items-start">
        {/* Ranked queue */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between pb-4 mb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div>
              <p className="sb-eyebrow">Ranked signals</p>
              <h2 className="mt-1 text-[18px] font-semibold text-[#f1f6f4]">Case order</h2>
            </div>
            <span className="text-[11.5px] font-semibold text-[rgba(214,235,230,0.55)] px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
              Highest risk first
            </span>
          </div>

          {loading && items.length === 0 && (
            <div className="flex items-center gap-3 text-[rgba(214,235,230,0.5)] text-sm py-4">
              <div className="w-4 h-4 rounded-full border-2 border-[#6fb8aa] border-t-transparent animate-spin" />
              Loading conversations...
            </div>
          )}

          <div className="space-y-3">
            {ranked.map((item, i) => {
              const m = riskMeta(item.riskLevel);
              const href = item.handoffId ? `/worker/handoffs/${item.handoffId}` : `/worker/youths/${item.youthId}`;
              return (
                <Link
                  key={item.id}
                  href={href}
                  className="block rounded-[16px] p-4 transition-all duration-200 hover:-translate-y-0.5"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] font-bold w-5 flex-shrink-0 text-[rgba(214,235,230,0.3)]">{i + 1}</span>
                    <span className="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center text-[13px] font-semibold" style={{ background: m.soft, color: m.fg, border: `1px solid ${m.border}` }}>
                      {initials(item.youthName)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-[16px] font-semibold text-[#f1f6f4]">{item.youthName}</span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: m.soft, color: m.fg, border: `1px solid ${m.border}` }}>
                          {label(item.riskLevel)} · {item.riskScore}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[12.5px] text-[rgba(214,235,230,0.4)] flex items-center gap-1.5">
                        <MessageCircle size={13} strokeWidth={1.75} /> {item.channel} · {timeAgo(item.lastMessageAt)}
                      </p>
                    </div>
                    <ChevronRight size={20} strokeWidth={1.75} className="text-[rgba(214,235,230,0.3)] flex-shrink-0" />
                  </div>

                  {item.suggestedAction && (
                    <p className="mt-3 text-[13px] leading-relaxed text-[rgba(214,235,230,0.6)]">{item.suggestedAction}</p>
                  )}

                  {item.signals.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {item.signals.slice(0, 3).map((signal) => (
                        <span key={signal.id} className="px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(214,235,230,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
                          {label(signal.type)}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              );
            })}

            {!loading && !error && items.length === 0 && (
              <div className="p-8 text-center text-[rgba(214,235,230,0.5)] text-sm">
                No active conversations. All caught up.
              </div>
            )}
          </div>
        </div>

        {/* Aside */}
        <aside className="space-y-4">
          <div className="glass-card p-5">
            <p className="sb-eyebrow">Signal language</p>
            <h3 className="mt-1.5 mb-3.5 text-[16px] font-semibold text-[#f1f6f4]">What the radar catches</h3>
            <div className="flex flex-wrap gap-2">
              {["After-hours message", "Cyberbullying", "School avoidance", "Repeated late-night contact", "Unresolved handoff"].map((s) => (
                <span key={s} className="px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(214,235,230,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-[18px] p-5" style={{ background: "rgba(183,121,31,0.1)", border: "1px solid rgba(183,121,31,0.28)" }}>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#e9c685]">Reminder</p>
            <h3 className="mt-1.5 mb-2 text-[16px] font-semibold text-[#f1f6f4]">Radar supports judgement</h3>
            <p className="text-[13px] leading-relaxed text-[rgba(214,235,230,0.6)]">
              The order is a starting point. You still decide the actual next action after reading the handoff brief.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

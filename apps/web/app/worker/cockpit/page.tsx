"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Radar, ShieldAlert, ClipboardList, Sparkles, MessageCircle, ChevronRight, Bell, Send } from "lucide-react";
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

type NotifSettings = { telegramChatId: string | null; discordWebhookUrl: string | null };

export default function WorkerCockpitPage() {
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState<Date | null>(null);

  const [notifSettings, setNotifSettings] = useState<NotifSettings>({ telegramChatId: null, discordWebhookUrl: null });
  const [telegramInput, setTelegramInput] = useState("");
  const [discordInput, setDiscordInput] = useState("");
  const [notifSaving, setNotifSaving] = useState<"telegram" | "discord" | null>(null);
  const [notifTesting, setNotifTesting] = useState<"telegram" | "discord" | null>(null);
  const [notifMsg, setNotifMsg] = useState<{ channel: "telegram" | "discord"; text: string; ok: boolean } | null>(null);

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

  const loadNotifSettings = useCallback(async () => {
    try {
      const data = await apiFetch<NotifSettings>("/worker/notification-settings");
      setNotifSettings(data);
      setTelegramInput(data.telegramChatId ?? "");
      setDiscordInput(data.discordWebhookUrl ?? "");
    } catch { /* non-critical */ }
  }, []);

  const saveNotifChannel = useCallback(async (channel: "telegram" | "discord") => {
    setNotifSaving(channel);
    setNotifMsg(null);
    try {
      const body = channel === "telegram"
        ? { telegramChatId: telegramInput.trim() || null }
        : { discordWebhookUrl: discordInput.trim() || null };
      const data = await apiFetch<NotifSettings>("/worker/notification-settings", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setNotifSettings(data);
      setNotifMsg({ channel, text: "Saved.", ok: true });
    } catch (e) {
      setNotifMsg({ channel, text: e instanceof Error ? e.message : "Save failed.", ok: false });
    } finally {
      setNotifSaving(null);
    }
  }, [telegramInput, discordInput]);

  const testNotifChannel = useCallback(async (channel: "telegram" | "discord") => {
    setNotifTesting(channel);
    setNotifMsg(null);
    try {
      await apiFetch("/worker/notification-settings/test", {
        method: "POST",
        body: JSON.stringify({ channel }),
      });
      setNotifMsg({ channel, text: "Test sent — check your app.", ok: true });
    } catch (e) {
      setNotifMsg({ channel, text: e instanceof Error ? e.message : "Test failed.", ok: false });
    } finally {
      setNotifTesting(null);
    }
  }, []);

  useEffect(() => {
    void load();
    void loadNotifSettings();
  }, [load, loadNotifSettings]);

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
                        {item.consentToHandoff && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: "rgba(31,111,100,0.15)", color: "#6fb8aa", border: "1px solid rgba(111,184,170,0.3)" }}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                            Consent
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[12.5px] text-[rgba(214,235,230,0.4)] flex items-center gap-1.5">
                        <MessageCircle size={13} strokeWidth={1.75} /> {item.channel} · {timeAgo(item.lastMessageAt)}
                      </p>
                    </div>
                    <ChevronRight size={20} strokeWidth={1.75} className="text-[rgba(214,235,230,0.3)] flex-shrink-0" />
                  </div>

                  {(() => {
                    const youthMessages = item.messages.filter((m) => m.senderType === "youth");
                    const last = youthMessages[youthMessages.length - 1];
                    return last ? (
                      <p className="mt-3 text-[13px] leading-snug text-[rgba(214,235,230,0.5)] truncate">
                        <span className="text-[rgba(214,235,230,0.3)] mr-1">&ldquo;</span>
                        {last.content.length > 90 ? last.content.slice(0, 90) + "…" : last.content}
                        <span className="text-[rgba(214,235,230,0.3)] ml-0.5">&rdquo;</span>
                      </p>
                    ) : null;
                  })()}

                  {item.suggestedAction && (
                    <p className="mt-2 text-[12px] leading-relaxed text-[rgba(214,235,230,0.5)] italic">{item.suggestedAction}</p>
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

          {/* Alert channels */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <Bell size={15} strokeWidth={1.75} className="text-[#6fb8aa]" />
              <div>
                <p className="sb-eyebrow">Alert channels</p>
                <h3 className="mt-0.5 text-[15px] font-semibold text-[#f1f6f4]">Get notified off-platform</h3>
              </div>
            </div>

            {/* Telegram */}
            <div className="space-y-2">
              <p className="text-[12px] font-semibold text-[rgba(214,235,230,0.7)] flex items-center gap-1.5">
                <span className="text-[14px]">✈️</span> Telegram chat ID
                {notifSettings.telegramChatId && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: "rgba(31,111,100,0.2)", color: "#6fb8aa", border: "1px solid rgba(111,184,170,0.25)" }}>Active</span>}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={telegramInput}
                  onChange={(e) => setTelegramInput(e.target.value)}
                  placeholder="e.g. 123456789"
                  className="flex-1 text-[13px] px-3 py-2 rounded-xl text-[#f1f6f4] outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
                <button
                  type="button"
                  onClick={() => void saveNotifChannel("telegram")}
                  disabled={!!notifSaving}
                  className="text-[12px] font-semibold px-3 py-2 rounded-xl transition-opacity disabled:opacity-50"
                  style={{ background: "rgba(111,184,170,0.15)", color: "#6fb8aa", border: "1px solid rgba(111,184,170,0.3)" }}
                >
                  {notifSaving === "telegram" ? "…" : "Save"}
                </button>
                {notifSettings.telegramChatId && (
                  <button
                    type="button"
                    onClick={() => void testNotifChannel("telegram")}
                    disabled={!!notifTesting}
                    title="Send test"
                    className="w-9 h-9 flex items-center justify-center rounded-xl transition-opacity disabled:opacity-50"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(214,235,230,0.6)" }}
                  >
                    <Send size={13} strokeWidth={1.75} />
                  </button>
                )}
              </div>
              {notifMsg?.channel === "telegram" && (
                <p className="text-[11.5px]" style={{ color: notifMsg.ok ? "#6fb8aa" : "#e88d78" }}>{notifMsg.text}</p>
              )}
            </div>

            {/* Discord */}
            <div className="space-y-2">
              <p className="text-[12px] font-semibold text-[rgba(214,235,230,0.7)] flex items-center gap-1.5">
                <span className="text-[14px]">🎮</span> Discord webhook URL
                {notifSettings.discordWebhookUrl && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: "rgba(31,111,100,0.2)", color: "#6fb8aa", border: "1px solid rgba(111,184,170,0.25)" }}>Active</span>}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={discordInput}
                  onChange={(e) => setDiscordInput(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/…"
                  className="flex-1 text-[13px] px-3 py-2 rounded-xl text-[#f1f6f4] outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
                <button
                  type="button"
                  onClick={() => void saveNotifChannel("discord")}
                  disabled={!!notifSaving}
                  className="text-[12px] font-semibold px-3 py-2 rounded-xl transition-opacity disabled:opacity-50"
                  style={{ background: "rgba(111,184,170,0.15)", color: "#6fb8aa", border: "1px solid rgba(111,184,170,0.3)" }}
                >
                  {notifSaving === "discord" ? "…" : "Save"}
                </button>
                {notifSettings.discordWebhookUrl && (
                  <button
                    type="button"
                    onClick={() => void testNotifChannel("discord")}
                    disabled={!!notifTesting}
                    title="Send test"
                    className="w-9 h-9 flex items-center justify-center rounded-xl transition-opacity disabled:opacity-50"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(214,235,230,0.6)" }}
                  >
                    <Send size={13} strokeWidth={1.75} />
                  </button>
                )}
              </div>
              {notifMsg?.channel === "discord" && (
                <p className="text-[11.5px]" style={{ color: notifMsg.ok ? "#6fb8aa" : "#e88d78" }}>{notifMsg.text}</p>
              )}
            </div>

            <p className="text-[11px] text-[rgba(214,235,230,0.35)] leading-relaxed">
              High-risk signals and handoff briefs fire an alert to your configured channels automatically.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

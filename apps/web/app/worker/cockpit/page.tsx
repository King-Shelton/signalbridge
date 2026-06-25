"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle, ChevronRight, ArrowRight, Bell, Send, Check, Hash, Globe, Bot, Wifi, WifiOff } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { usePolling } from "@/lib/use-polling";
import { ConversationItem, label } from "@/lib/operations";
import { initials, riskMeta, timeAgo } from "@/lib/ui";

type ChannelType = "telegram_business" | "telegram_bot" | "discord_private_channel" | "discord_dm" | "web_chat" | string;

function channelMeta(ct: ChannelType) {
  switch (ct) {
    case "telegram_business":
      return { icon: <MessageCircle size={11} strokeWidth={2} />, label: "TG Business", fg: "#5ba3e8", bg: "rgba(91,163,232,0.12)", border: "rgba(91,163,232,0.3)" };
    case "telegram_bot":
      return { icon: <Bot size={11} strokeWidth={2} />, label: "Telegram", fg: "#5ba3e8", bg: "rgba(91,163,232,0.12)", border: "rgba(91,163,232,0.3)" };
    case "discord_private_channel":
      return { icon: <Hash size={11} strokeWidth={2} />, label: "Discord", fg: "#a08de8", bg: "rgba(88,101,242,0.12)", border: "rgba(88,101,242,0.3)" };
    case "discord_dm":
      return { icon: <Hash size={11} strokeWidth={2} />, label: "Discord DM", fg: "#a08de8", bg: "rgba(88,101,242,0.12)", border: "rgba(88,101,242,0.3)" };
    default:
      return { icon: <Globe size={11} strokeWidth={2} />, label: "Web", fg: "#6fb8aa", bg: "rgba(31,111,100,0.15)", border: "rgba(111,184,170,0.25)" };
  }
}

function ChannelBadge({ channelType }: { channelType: ChannelType }) {
  const m = channelMeta(channelType);
  return (
    <span
      className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ background: m.bg, color: m.fg, border: `1px solid ${m.border}` }}
    >
      {m.icon} {m.label}
    </span>
  );
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
type ChannelSettings = { workHoursStart: number; workHoursEnd: number; telegramBusinessConnected: boolean; discordConnected: boolean };

function isInWorkHours(settings: ChannelSettings, now: Date): boolean {
  const sgtHour = Number(
    new Intl.DateTimeFormat("en-SG", { hour: "numeric", hour12: false, timeZone: "Asia/Singapore" }).format(now)
  );
  return sgtHour >= settings.workHoursStart && sgtHour < settings.workHoursEnd;
}

export default function WorkerCockpitPage() {
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState<Date | null>(null);
  const [channelSettings, setChannelSettings] = useState<ChannelSettings | null>(null);

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
      const [notif, chSettings] = await Promise.all([
        apiFetch<NotifSettings>("/worker/notification-settings"),
        apiFetch<ChannelSettings>("/worker/channel-settings"),
      ]);
      setNotifSettings(notif);
      setTelegramInput(notif.telegramChatId ?? "");
      setDiscordInput(notif.discordWebhookUrl ?? "");
      setChannelSettings(chSettings);
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
      setNotifMsg({ channel, text: "Test sent. Check your app.", ok: true });
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

  // Live-refresh the queue, but pause while the tab is backgrounded.
  usePolling(() => void load(), 12000);

  const ranked = useMemo(() => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 } as Record<string, number>;
    return [...items].sort(
      (a, b) => (order[a.riskLevel] ?? 4) - (order[b.riskLevel] ?? 4) || b.riskScore - a.riskScore
    );
  }, [items]);

  const statline = useMemo(
    () => [
      { value: items.length, label: "youth waiting", color: "#6fb8aa" },
      { value: items.filter((i) => ["high", "critical"].includes(i.riskLevel)).length, label: "high priority", color: "#e88d78" },
      { value: items.filter((i) => i.unresolvedHandoff).length, label: "to review", color: "#e9c685" },
    ],
    [items]
  );

  const spotlight = ranked[0] ?? null;
  const rest = ranked.slice(1);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-end justify-between gap-5 flex-wrap">
        <div>
          <p className="text-[12px] text-[rgba(214,235,230,0.45)]" style={{ letterSpacing: "0.02em" }}>
            Today&apos;s queue{now ? ` · ${greetingFor(now)}` : ""}
          </p>
          <h1 className="mt-2 text-[30px] font-semibold text-[#f4f9f7]" style={{ letterSpacing: "-0.03em" }}>
            Start with the youths who need you soonest.
          </h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-[rgba(214,235,230,0.6)] max-w-[50ch]">
            Risk level, consented handoffs and recent messages — all in one place so you can choose the right next step.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 text-[12px] font-mono text-[rgba(214,235,230,0.4)]">
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#6fb8aa]"
              style={{ boxShadow: "0 0 8px 1px rgba(111,184,170,0.7)", animation: "sb-core 2.4s ease-in-out infinite" }}
            />
            {now ? now.toLocaleString("en-SG", { weekday: "short", hour: "2-digit", minute: "2-digit" }) : ""}
          </div>
          {/* Worker online/offline badge */}
          {channelSettings && now && (() => {
            const online = isInWorkHours(channelSettings, now);
            return (
              <span
                className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 py-1 rounded-full"
                style={online
                  ? { background: "rgba(31,111,100,0.2)", color: "#6fb8aa", border: "1px solid rgba(111,184,170,0.3)" }
                  : { background: "rgba(183,121,31,0.15)", color: "#e9c685", border: "1px solid rgba(183,121,31,0.35)" }
                }
              >
                {online
                  ? <><Wifi size={12} strokeWidth={2} /> You&apos;re online · SafeNight inactive</>
                  : <><WifiOff size={12} strokeWidth={2} /> You&apos;re offline · SafeNight covering</>
                }
              </span>
            );
          })()}
        </div>
      </header>

      {/* Slim stat line */}
      {items.length > 0 && (
        <div className="flex items-center gap-5 flex-wrap text-[13px] text-[rgba(214,235,230,0.5)]">
          {statline.map((s) => (
            <span key={s.label} className="flex items-center gap-2">
              <span className="text-[17px] font-semibold" style={{ color: s.color, letterSpacing: "-0.02em" }}>{s.value}</span>
              {s.label}
            </span>
          ))}
        </div>
      )}

      {error && (
        <div className="text-[13px] text-[#e88d78] bg-[rgba(217,95,72,0.1)] border border-[rgba(217,95,72,0.2)] rounded-xl px-4 py-3 flex items-center gap-3">
          {error}
          <button type="button" onClick={() => void load()} className="underline text-[#e88d78]">Retry</button>
        </div>
      )}

      {loading && items.length === 0 && (
        <div className="flex items-center gap-3 text-[rgba(214,235,230,0.5)] text-sm">
          <div className="w-4 h-4 rounded-full border-2 border-[#6fb8aa] border-t-transparent animate-spin" />
          Loading conversations…
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.55fr_0.85fr] items-start">
        {/* Left: spotlight + ranked list */}
        <div className="space-y-4">

          {/* "Start here" spotlight */}
          {spotlight && (() => {
            const m = riskMeta(spotlight.riskLevel);
            const briefHref = spotlight.handoffId ? `/worker/handoffs/${spotlight.handoffId}` : null;
            const memoryHref = `/worker/youths/${spotlight.youthId}`;
            const firstName = spotlight.youthName.split(" ")[0];
            return (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(214,235,230,0.4)] mb-2">Start here</p>
                <div
                  className="rounded-[22px] p-6"
                  style={{
                    background: `linear-gradient(180deg, ${
                      spotlight.riskLevel === "high" || spotlight.riskLevel === "critical"
                        ? "rgba(217,95,72,0.1)"
                        : spotlight.riskLevel === "medium"
                        ? "rgba(183,121,31,0.09)"
                        : "rgba(31,111,100,0.1)"
                    }, rgba(255,255,255,0.02))`,
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderLeft: `3px solid ${m.fg}`,
                    boxShadow: "0 18px 50px rgba(0,0,0,0.28)",
                  }}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3.5">
                      <span
                        className="w-13 h-13 rounded-full flex items-center justify-center text-[18px] font-semibold flex-shrink-0 text-[#f4f9f7]"
                        style={{ width: 52, height: 52, background: m.soft, border: `1px solid ${m.border}` }}
                      >
                        {initials(spotlight.youthName)}
                      </span>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-[21px] font-semibold text-[#f4f9f7]" style={{ letterSpacing: "-0.02em" }}>
                            {spotlight.youthName}
                          </span>
                          <span
                            className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-3 py-1 rounded-full"
                            style={{ background: m.soft, border: `1px solid ${m.border}`, color: m.fg }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.fg }} />
                            {label(spotlight.riskLevel)} · {spotlight.riskScore}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <ChannelBadge channelType={spotlight.channelType} />
                          <span className="text-[12px] font-mono text-[rgba(214,235,230,0.42)]">{timeAgo(spotlight.lastMessageAt)}</span>
                        </div>
                      </div>
                    </div>
                    {spotlight.consentToHandoff && (
                      <span
                        className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-3 py-1.5 rounded-full"
                        style={{ background: "rgba(31,111,100,0.18)", border: "1px solid rgba(111,184,170,0.3)", color: "#8fcfc3" }}
                      >
                        <Check size={12} strokeWidth={2.4} />
                        Consent on file
                      </span>
                    )}
                  </div>

                  {spotlight.suggestedAction && (
                    <p className="mt-4 text-[15px] leading-relaxed text-[rgba(238,244,242,0.82)] max-w-[58ch]">
                      {spotlight.suggestedAction}
                    </p>
                  )}

                  {spotlight.signals.filter((s) => s.type !== "after_hours_support").length > 0 && (
                    <div className="mt-3.5 flex flex-wrap gap-1.5">
                      {spotlight.signals.filter((s) => s.type !== "after_hours_support").slice(0, 4).map((sig) => (
                        <span
                          key={sig.id}
                          className="inline-flex items-center gap-1.5 text-[11.5px] font-medium px-2.5 py-1 rounded-full"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(214,235,230,0.66)" }}
                        >
                          <span className="w-1 h-1 rounded-full" style={{ background: m.fg }} />
                          {label(sig.type)}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2.5">
                    {briefHref && (
                      <Link
                        href={briefHref}
                        className="inline-flex items-center gap-2 text-[13.5px] font-semibold px-5 py-3 rounded-[12px] text-white transition-all hover:-translate-y-0.5"
                        style={{ background: "#1f6f64", boxShadow: "0 10px 26px rgba(31,111,100,0.3)" }}
                      >
                        Open {firstName}&apos;s handoff brief
                        <ArrowRight size={16} strokeWidth={2} />
                      </Link>
                    )}
                    <Link
                      href={memoryHref}
                      className="inline-flex items-center gap-2 text-[13.5px] font-semibold px-5 py-3 rounded-[12px] transition-all"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(214,235,230,0.72)" }}
                    >
                      Memory card
                    </Link>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* "Then, in order" hairline list */}
          {rest.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(214,235,230,0.4)] mb-2.5">Then, in order</p>
              <div className="rounded-[18px] overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
                {rest.map((item, i) => {
                  const m = riskMeta(item.riskLevel);
                  const href = item.handoffId ? `/worker/handoffs/${item.handoffId}` : `/worker/youths/${item.youthId}`;
                  const firstSig = item.signals.filter((s) => s.type !== "after_hours_support")[0];
                  const reason = firstSig ? label(firstSig.type) : (item.suggestedAction ?? "");
                  return (
                    <Link
                      key={item.id}
                      href={href}
                      className="flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-[rgba(255,255,255,0.03)]"
                      style={{ borderBottom: i < rest.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
                    >
                      <span className="text-[12px] font-bold font-mono w-4 flex-shrink-0 text-[rgba(214,235,230,0.28)]">
                        {i + 2}
                      </span>
                      <span
                        className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold flex-shrink-0 text-[#f4f9f7]"
                        style={{ background: m.soft, border: `1px solid ${m.border}` }}
                      >
                        {initials(item.youthName)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[14.5px] font-semibold text-[#f4f9f7]">{item.youthName}</span>
                          <span
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: m.soft, border: `1px solid ${m.border}`, color: m.fg }}
                          >
                            {label(item.riskLevel)} · {item.riskScore}
                          </span>
                        </div>
                        <p className="text-[12.5px] text-[rgba(214,235,230,0.5)] truncate mt-0.5">{reason}</p>
                      </div>
                      <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                        <ChannelBadge channelType={item.channelType} />
                        <span className="text-[11px] font-mono text-[rgba(214,235,230,0.35)] whitespace-nowrap">{timeAgo(item.lastMessageAt)}</span>
                      </div>
                      <ChevronRight size={16} strokeWidth={2} className="text-[rgba(214,235,230,0.3)] flex-shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="glass-card p-10 text-center text-[rgba(214,235,230,0.5)] text-sm">
              No active conversations. All caught up.
            </div>
          )}
        </div>

        {/* Aside */}
        <aside className="space-y-4">
          {(() => {
            const allSignalTypes = Array.from(new Set(ranked.flatMap((item) => item.signals.map((s) => s.type)).filter((t) => t !== "after_hours_support")));
            const unresolvedCount = ranked.filter((item) => item.unresolvedHandoff).length;
            const highCount = ranked.filter((item) => ["high", "critical"].includes(item.riskLevel)).length;
            return (
              <div className="glass-card p-5">
                <p className="sb-eyebrow">Live signals</p>
                <h3 className="mt-1.5 mb-3.5 text-[16px] font-semibold text-[#f1f6f4]">What&apos;s driving the queue</h3>
                {allSignalTypes.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {allSignalTypes.slice(0, 6).map((s) => (
                      <span key={s} className="px-2.5 py-1 rounded-full text-[11px] font-medium capitalize" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(214,235,230,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        {label(s)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] text-[rgba(214,235,230,0.4)]">No high-risk signals active right now.</p>
                )}
                {(unresolvedCount > 0 || highCount > 0) && (
                  <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                    {highCount > 0 && (
                      <p className="text-[12px]" style={{ color: "#e88d78" }}>⚠ {highCount} high or critical risk conversation{highCount > 1 ? "s" : ""}</p>
                    )}
                    {unresolvedCount > 0 && (
                      <p className="text-[12px]" style={{ color: "#e9c685" }}>📋 {unresolvedCount} handoff{unresolvedCount > 1 ? "s" : ""} waiting to be read</p>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
          <div className="rounded-[18px] p-5" style={{ background: "rgba(183,121,31,0.1)", border: "1px solid rgba(183,121,31,0.28)" }}>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#e9c685]">Reminder</p>
            <h3 className="mt-1.5 mb-2 text-[16px] font-semibold text-[#f1f6f4]">You make the call</h3>
            <p className="text-[13px] leading-relaxed text-[rgba(214,235,230,0.6)]">
              The queue is a starting point. Read the note, check the youth&apos;s words, then decide what to do next.
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
                Telegram chat ID
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
                Discord webhook URL
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
              High-risk messages and consented handoffs can alert your saved channels automatically.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

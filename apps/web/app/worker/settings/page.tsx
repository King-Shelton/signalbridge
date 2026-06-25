"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MessageCircle,
  Hash,
  Clock,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  Bot,
  ChevronDown,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";

type ChannelSettings = {
  telegramBusinessConnected: boolean;
  discordConnected: boolean;
  workHoursStart: number;
  workHoursEnd: number;
};

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const suffix = i < 12 ? "AM" : "PM";
  const display = i === 0 ? "12 AM (midnight)" : i === 12 ? "12 PM (noon)" : `${i > 12 ? i - 12 : i} ${suffix}`;
  return { value: i, label: `${String(i).padStart(2, "0")}:00 — ${display}` };
});

function StatusPill({ connected, label }: { connected: boolean; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full"
      style={
        connected
          ? { background: "rgba(31,111,100,0.2)", color: "#6fb8aa", border: "1px solid rgba(111,184,170,0.35)" }
          : { background: "rgba(217,95,72,0.12)", color: "#e88d78", border: "1px solid rgba(217,95,72,0.3)" }
      }
    >
      {connected ? <CheckCircle2 size={12} strokeWidth={2} /> : <AlertCircle size={12} strokeWidth={2} />}
      {label}
    </span>
  );
}

function StepCard({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: "rgba(111,184,170,0.15)", color: "#6fb8aa" }}>
        {number}
      </span>
      <p className="text-[13px] leading-relaxed text-[rgba(214,235,230,0.65)] pt-0.5">{children}</p>
    </div>
  );
}

function HourSelect({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(214,235,230,0.4)] mb-1.5">{label}</p>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full appearance-none rounded-[11px] px-3.5 py-2.5 text-[13.5px] text-[#f1f6f4] pr-9 outline-none"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          {HOURS.map((h) => (
            <option key={h.value} value={h.value} style={{ background: "#0d1f1d" }}>
              {h.label}
            </option>
          ))}
        </select>
        <ChevronDown size={14} strokeWidth={1.75} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[rgba(214,235,230,0.4)]" />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<ChannelSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(18);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<ChannelSettings>("/worker/channel-settings");
      setSettings(data);
      setStartHour(data.workHoursStart);
      setEndHour(data.workHoursEnd);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function saveHours() {
    setSaving(true);
    setSaveStatus(null);
    try {
      const updated = await apiFetch<ChannelSettings>("/worker/channel-settings", {
        method: "PATCH",
        body: JSON.stringify({ workHoursStart: startHour, workHoursEnd: endHour }),
      });
      setSettings(updated);
      setSaveStatus({ ok: true, text: "Work hours saved. SafeNight will take over outside this window." });
    } catch (e) {
      setSaveStatus({ ok: false, text: e instanceof Error ? e.message : "Save failed." });
    } finally {
      setSaving(false);
    }
  }

  const isDirty = settings && (startHour !== settings.workHoursStart || endHour !== settings.workHoursEnd);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl mx-auto">
      <div>
        <p className="sb-eyebrow mb-2">Integration settings</p>
        <h1 className="text-[28px] font-semibold text-[#f1f6f4]" style={{ letterSpacing: "-0.025em" }}>
          Channel connections
        </h1>
        <p className="mt-1 text-[13px] text-[rgba(214,235,230,0.45)]">
          Connect Telegram Business and Discord so SafeNight can cover you after hours.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-[rgba(214,235,230,0.5)] text-sm">
          <div className="w-4 h-4 rounded-full border-2 border-[#6fb8aa] border-t-transparent animate-spin" />
          Loading settings…
        </div>
      ) : error ? (
        <div className="text-[13px] text-[#e88d78] bg-[rgba(217,95,72,0.1)] border border-[rgba(217,95,72,0.2)] rounded-xl px-4 py-3 flex items-center gap-3">
          {error}
          <button type="button" onClick={() => void load()} className="underline inline-flex items-center gap-1">
            <RefreshCw size={13} strokeWidth={2} /> Retry
          </button>
        </div>
      ) : (
        <>
          {/* ── Telegram Business ─────────────────────────────────────── */}
          <section className="glass-card p-[22px]" style={{ borderLeft: "3px solid rgba(91,163,232,0.5)" }}>
            <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-[11px] flex items-center justify-center" style={{ background: "rgba(91,163,232,0.12)", color: "#5ba3e8" }}>
                  <MessageCircle size={20} strokeWidth={1.75} />
                </span>
                <div>
                  <h2 className="text-[16px] font-semibold text-[#f1f6f4]">Telegram Business</h2>
                  <p className="text-[12px] text-[rgba(214,235,230,0.45)]">Youth messages your personal Telegram account</p>
                </div>
              </div>
              <StatusPill connected={settings!.telegramBusinessConnected} label={settings!.telegramBusinessConnected ? "Connected" : "Not connected"} />
            </div>

            {settings!.telegramBusinessConnected ? (
              <div className="rounded-[12px] px-4 py-3.5" style={{ background: "rgba(31,111,100,0.12)", border: "1px solid rgba(111,184,170,0.2)" }}>
                <p className="text-[13px] text-[rgba(214,235,230,0.7)] leading-relaxed">
                  SafeNight is linked to your Telegram Business account. During your work hours it logs conversations only — after hours it replies on your behalf using your business connection.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[13px] text-[rgba(214,235,230,0.55)]">Follow these steps to connect your Telegram Business account:</p>
                <div className="space-y-2.5">
                  <StepCard number={1}>Upgrade to <strong className="text-[#f1f6f4]">Telegram Premium</strong> or <strong className="text-[#f1f6f4]">Telegram Business</strong> from your Telegram app settings.</StepCard>
                  <StepCard number={2}>Open <strong className="text-[#f1f6f4]">Settings → Telegram Business → Chatbots</strong>.</StepCard>
                  <StepCard number={3}>Tap <strong className="text-[#f1f6f4]">Add a bot</strong> and search for the SignalBridge bot username.</StepCard>
                  <StepCard number={4}>Enable <strong className="text-[#f1f6f4]">Reply to messages</strong> so SafeNight can respond after your work hours.</StepCard>
                  <StepCard number={5}>The connection will appear as <strong className="text-[rgba(111,184,170,0.9)]">Connected</strong> here once the bot receives your business connection handshake.</StepCard>
                </div>
                <div className="mt-3 rounded-[11px] px-3.5 py-2.5 text-[12px] text-[rgba(214,235,230,0.5)] flex items-center gap-2" style={{ background: "rgba(183,121,31,0.1)", border: "1px solid rgba(183,121,31,0.25)" }}>
                  <Bot size={14} strokeWidth={1.75} className="flex-shrink-0 text-[#e9c685]" />
                  Send <code className="mx-1 text-[#e9c685]">/start</code> to the SignalBridge bot in Telegram first so it can identify you.
                </div>
              </div>
            )}
          </section>

          {/* ── Discord ────────────────────────────────────────────────── */}
          <section className="glass-card p-[22px]" style={{ borderLeft: "3px solid rgba(160,141,232,0.5)" }}>
            <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-[11px] flex items-center justify-center" style={{ background: "rgba(88,101,242,0.12)", color: "#a08de8" }}>
                  <Hash size={20} strokeWidth={1.75} />
                </span>
                <div>
                  <h2 className="text-[16px] font-semibold text-[#f1f6f4]">Discord</h2>
                  <p className="text-[12px] text-[rgba(214,235,230,0.45)]">Private per-youth channels in your team server</p>
                </div>
              </div>
              <StatusPill connected={settings!.discordConnected} label={settings!.discordConnected ? "Registered" : "Not registered"} />
            </div>

            {settings!.discordConnected ? (
              <div className="rounded-[12px] px-4 py-3.5" style={{ background: "rgba(31,111,100,0.12)", border: "1px solid rgba(111,184,170,0.2)" }}>
                <p className="text-[13px] text-[rgba(214,235,230,0.7)] leading-relaxed">
                  Your Discord account is registered with SignalBridge. The bot will create private channels when you open a case and handle after-hours replies automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[13px] text-[rgba(214,235,230,0.55)]">Link your Discord account to the SignalBridge bot:</p>
                <div className="space-y-2.5">
                  <StepCard number={1}>Join the <strong className="text-[#f1f6f4]">SignalBridge Discord server</strong> using the invite your administrator shared.</StepCard>
                  <StepCard number={2}>Find the SignalBridge bot and open a <strong className="text-[#f1f6f4]">Direct Message</strong> with it.</StepCard>
                  <StepCard number={3}>
                    Send the following command, replacing <code className="text-[#a08de8]">&lt;your-id&gt;</code> with your SignalBridge user ID:
                  </StepCard>
                </div>
                <div className="rounded-[11px] px-4 py-3 font-mono text-[13px]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <span className="text-[rgba(214,235,230,0.4)]">!register_worker </span>
                  <span className="text-[#a08de8]">&lt;your-signalbridge-user-id&gt;</span>
                </div>
                <div className="rounded-[11px] px-3.5 py-2.5 text-[12px] text-[rgba(214,235,230,0.5)] flex items-center gap-2" style={{ background: "rgba(183,121,31,0.1)", border: "1px solid rgba(183,121,31,0.25)" }}>
                  <Bot size={14} strokeWidth={1.75} className="flex-shrink-0 text-[#e9c685]" />
                  Your user ID is shown in your profile. Once sent, this page will update to <strong className="text-[#e9c685]">Registered</strong>.
                </div>
              </div>
            )}
          </section>

          {/* ── Work hours ─────────────────────────────────────────────── */}
          <section className="glass-card p-[22px]" style={{ borderLeft: "3px solid rgba(111,184,170,0.5)" }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-[11px] flex items-center justify-center" style={{ background: "rgba(31,111,100,0.18)", color: "#6fb8aa" }}>
                <Clock size={20} strokeWidth={1.75} />
              </span>
              <div>
                <h2 className="text-[16px] font-semibold text-[#f1f6f4]">After-hours window</h2>
                <p className="text-[12px] text-[rgba(214,235,230,0.45)]">All times in SGT (Asia/Singapore, UTC+8)</p>
              </div>
            </div>

            <p className="text-[13px] text-[rgba(214,235,230,0.6)] leading-relaxed mb-5">
              During your work hours, SignalBridge logs conversations and you handle them. Outside these hours, SafeNight AI takes over and replies on your behalf — then packages everything into a handoff brief for you to review.
            </p>

            <div className="flex gap-4 flex-wrap">
              <HourSelect label="Work starts" value={startHour} onChange={setStartHour} />
              <HourSelect label="Work ends" value={endHour} onChange={setEndHour} />
            </div>

            {startHour >= endHour && (
              <p className="mt-3 text-[12px] text-[#e88d78] flex items-center gap-1.5">
                <AlertCircle size={13} strokeWidth={2} /> End time must be after start time.
              </p>
            )}

            <div className="mt-5 flex items-center gap-3 flex-wrap">
              <button
                type="button"
                disabled={saving || !isDirty || startHour >= endHour}
                onClick={() => void saveHours()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[11px] text-[13px] font-semibold transition-all disabled:opacity-40"
                style={{ background: "rgba(31,111,100,0.25)", border: "1px solid rgba(111,184,170,0.35)", color: "#6fb8aa" }}
              >
                <Save size={15} strokeWidth={1.75} />
                {saving ? "Saving…" : "Save work hours"}
              </button>
              {saveStatus && (
                <p className="text-[12px]" style={{ color: saveStatus.ok ? "#6fb8aa" : "#e88d78" }}>
                  {saveStatus.text}
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

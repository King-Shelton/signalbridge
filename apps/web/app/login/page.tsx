"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api-client";
import { getRoleHome, saveAuthSession } from "@/lib/auth-session";

const DEMOS = [
  {
    role: "youth",
    label: "SafeNight Companion",
    sublabel: "Youth · Mira Tan",
    description: "After-hours chat with consent-gated handoff",
    email: "mira@signalbridge.test",
    password: "password",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
      </svg>
    ),
    accentClass: "from-[rgba(31,111,100,0.1)] to-[rgba(31,111,100,0.05)]",
    borderClass: "border-[rgba(31,111,100,0.25)] hover:border-[rgba(31,111,100,0.5)]",
    iconBg: "bg-[rgba(31,111,100,0.15)]",
    iconColor: "text-[#6fb8aa]",
  },
  {
    role: "worker",
    label: "Worker Cockpit",
    sublabel: "Worker · Aisha Rahman",
    description: "Signal Radar, handoff briefs, case workflow",
    email: "worker1@signalbridge.test",
    password: "password",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"/><path d="M4 6h.01"/><path d="M2.29 9.62A10 10 0 1 0 21.31 8.35"/><path d="M16.24 7.76A6 6 0 1 0 8.23 16.67"/><path d="M12 18h.01"/><path d="M17.99 11.66A6 6 0 0 1 15.77 16.67"/><circle cx="12" cy="12" r="2"/><path d="m13.41 10.59 5.66-5.66"/>
      </svg>
    ),
    accentClass: "from-[rgba(217,95,72,0.1)] to-[rgba(217,95,72,0.05)]",
    borderClass: "border-[rgba(217,95,72,0.25)] hover:border-[rgba(217,95,72,0.5)]",
    iconBg: "bg-[rgba(217,95,72,0.15)]",
    iconColor: "text-[#e88d78]",
  },
  {
    role: "supervisor",
    label: "Supervisor",
    sublabel: "Supervisor · Daniel Lim",
    description: "Worker load monitor, audit log, case reassignment",
    email: "supervisor@signalbridge.test",
    password: "password",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 21a8 8 0 0 0-16 0"/><circle cx="10" cy="8" r="5"/><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"/>
      </svg>
    ),
    accentClass: "from-[rgba(183,121,31,0.1)] to-[rgba(183,121,31,0.05)]",
    borderClass: "border-[rgba(183,121,31,0.25)] hover:border-[rgba(183,121,31,0.5)]",
    iconBg: "bg-[rgba(183,121,31,0.15)]",
    iconColor: "text-[#e9c685]",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDemoLogin(demo: typeof DEMOS[0]) {
    setLoading(demo.role);
    setError(null);
    try {
      // Use the existing login function which saves to the correct signalbridge.authSession key
      const session = await login(demo.email, demo.password);
      saveAuthSession(session);
      router.push(getRoleHome(session.user.role));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect to API. Make sure the backend is running.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#060d0c] font-sans" style={{ WebkitFontSmoothing: "antialiased" }}>
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute rounded-full"
          style={{
            top: "-18%", left: "-8%", width: "60vw", height: "60vw",
            background: "radial-gradient(circle, rgba(31,111,100,0.22), transparent 62%)",
            filter: "blur(8px)",
            animation: "sb-drift1 24s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            bottom: "-22%", right: "-10%", width: "52vw", height: "52vw",
            background: "radial-gradient(circle, rgba(217,95,72,0.10), transparent 62%)",
            filter: "blur(8px)",
            animation: "sb-drift2 28s ease-in-out infinite",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            opacity: 0.45,
            backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Scan line */}
        <div
          className="absolute left-0 right-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(111,184,170,0.4), transparent)",
            animation: "sb-scan 14s linear infinite",
          }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(130% 120% at 50% 38%, transparent 52%, rgba(0,0,0,0.55) 100%)" }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12">
        {/* Logo */}
        <div
          className="flex flex-col items-center text-center mb-14"
          style={{ opacity: 0, animation: "sb-rise 1s cubic-bezier(0.2,0,0,1) 0.1s forwards" }}
        >
          <div className="relative w-[88px] h-[88px] flex items-center justify-center mb-8">
            <div
              className="absolute w-[26px] h-[26px] rounded-full border border-[rgba(111,184,170,0.7)]"
              style={{ animation: "sb-ring 3.4s ease-out infinite" }}
            />
            <div
              className="absolute w-[26px] h-[26px] rounded-full border border-[rgba(111,184,170,0.5)]"
              style={{ animation: "sb-ring 3.4s ease-out 1.7s infinite" }}
            />
            <div
              className="w-[52px] h-[52px] rounded-[16px] flex items-center justify-center"
              style={{
                background: "linear-gradient(160deg, #2a8576, #164b44)",
                boxShadow: "0 18px 50px rgba(31,111,100,0.45), inset 0 1px 0 rgba(255,255,255,0.18)",
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#eaf6f2" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9"/><path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5"/>
                <circle cx="12" cy="9" r="2"/>
                <path d="M16.2 4.8c2 2 2.26 5.11.8 7.47"/><path d="M19.1 1.9a9.96 9.96 0 0 1 0 14.1"/>
                <path d="M9.5 18h5"/><path d="m8 22 4-11 4 11"/>
              </svg>
            </div>
          </div>

          <div
            className="sb-eyebrow mb-4"
            style={{ opacity: 0, animation: "sb-soft 0.8s ease 0.4s forwards" }}
          >
            Dell InnovateDash 2026
          </div>
          <h1
            className="text-[clamp(32px,5vw,60px)] font-semibold text-[#f1f6f4]"
            style={{ letterSpacing: "-0.03em", opacity: 0, animation: "sb-rise 1s cubic-bezier(0.2,0,0,1) 0.6s forwards" }}
          >
            <span style={{ color: "#6fb8aa" }}>Signal</span>Bridge
          </h1>
          <p
            className="mt-3 text-base text-[rgba(214,235,230,0.6)] max-w-[32ch]"
            style={{ lineHeight: 1.6, opacity: 0, animation: "sb-soft 1s ease 1s forwards" }}
          >
            Proactive youth support command centre. Not a chatbot — a bridge.
          </p>
        </div>

        {/* Role cards */}
        <div
          className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-3 gap-4"
          style={{ opacity: 0, animation: "sb-soft 0.8s ease 1.2s forwards" }}
        >
          {DEMOS.map((demo) => (
            <button
              key={demo.role}
              onClick={() => handleDemoLogin(demo)}
              disabled={loading !== null}
              className={`relative text-left rounded-[22px] p-6 border transition-all duration-200 bg-gradient-to-b ${demo.accentClass} ${demo.borderClass} disabled:opacity-60 disabled:cursor-not-allowed group`}
              style={{ backdropFilter: "blur(8px)" }}
            >
              <div className={`w-11 h-11 rounded-[13px] flex items-center justify-center mb-4 ${demo.iconBg} ${demo.iconColor}`}>
                {loading === demo.role ? (
                  <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/>
                  </svg>
                ) : demo.icon}
              </div>
              <div className="font-semibold text-[#f1f6f4] text-[17px] leading-tight" style={{ letterSpacing: "-0.01em" }}>
                {demo.label}
              </div>
              <div className="mt-1 text-[12px] font-medium text-[rgba(214,235,230,0.5)]">{demo.sublabel}</div>
              <p className="mt-3 text-[13px] leading-relaxed text-[rgba(214,235,230,0.55)]">{demo.description}</p>
              <div className="mt-4 flex items-center gap-2 text-[12.5px] font-semibold text-[rgba(214,235,230,0.5)] group-hover:text-[rgba(214,235,230,0.8)] transition-colors">
                Enter
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                </svg>
              </div>
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-6 text-[13px] text-[#e88d78] bg-[rgba(217,95,72,0.1)] border border-[rgba(217,95,72,0.2)] rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <p
          className="mt-10 text-[11px] text-[rgba(214,235,230,0.3)] text-center max-w-[40ch]"
          style={{ letterSpacing: "0.02em", opacity: 0, animation: "sb-soft 0.8s ease 1.6s forwards" }}
        >
          Fictional seed data · Simulated approved channels · Production-grade alpha
        </p>
      </div>
    </div>
  );
}

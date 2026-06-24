"use client";

import { Suspense, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Loader2, Lock, Mail, Moon, RadioTower, Shield, UserRound, UsersRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { login } from "@/lib/api-client";
import { getRoleHome, saveAuthSession } from "@/lib/auth-session";
import type { Role } from "@/lib/constants";

const ACCOUNTS: Array<{
  role: Role;
  label: string;
  description: string;
  email: string;
  password: string;
  icon: ReactNode;
  accent: string;
}> = [
  {
    role: "youth",
    label: "Young person",
    description: "Chat privately with SafeNight.",
    email: "mira@signalbridge.test",
    password: "password",
    icon: <Moon size={21} strokeWidth={1.8} />,
    accent: "#6fb8aa",
  },
  {
    role: "worker",
    label: "Youth worker",
    description: "Morning queue, signals, and handoffs.",
    email: "worker1@signalbridge.test",
    password: "password",
    icon: <UsersRound size={21} strokeWidth={1.8} />,
    accent: "#e88d78",
  },
  {
    role: "supervisor",
    label: "Supervisor",
    description: "Team overview and audit trail.",
    email: "supervisor@signalbridge.test",
    password: "password",
    icon: <Shield size={21} strokeWidth={1.8} />,
    accent: "#e9c685",
  },
];

const ROLE_LABELS: Record<string, string> = {
  worker: "Youth worker",
  supervisor: "Supervisor",
};

function Background() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute" style={{ top: "-15%", left: "-8%", width: "55vw", height: "55vw", background: "radial-gradient(circle, rgba(31,111,100,0.22), transparent 62%)", filter: "blur(8px)" }} />
      <div className="absolute" style={{ bottom: "-20%", right: "-10%", width: "48vw", height: "48vw", background: "radial-gradient(circle, rgba(217,95,72,0.1), transparent 62%)", filter: "blur(8px)" }} />
      <div className="absolute inset-0" style={{ opacity: 0.3, backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "38px 38px" }} />
    </div>
  );
}

function BrandMark() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-[12px] text-[#eaf6f2]" style={{ background: "linear-gradient(160deg, #2a8576, #164b44)", boxShadow: "0 8px 24px rgba(31,111,100,0.4)" }}>
      <RadioTower size={20} strokeWidth={1.75} />
    </div>
  );
}

function LoadingIcon() {
  return <Loader2 size={16} strokeWidth={2} className="animate-spin" />;
}

function YouthChatStart() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startChat(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const session = await login("mira@signalbridge.test", "password");
      const displayName = name.trim();
      saveAuthSession({
        ...session,
        user: {
          ...session.user,
          name: displayName || "You",
        },
      });
      router.push("/youth/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={startChat} className="rounded-[12px] p-5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(111,184,170,0.2)" }}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]" style={{ background: "rgba(111,184,170,0.15)", color: "#6fb8aa" }}>
          <Moon size={20} strokeWidth={1.8} />
        </div>
        <div>
          <h2 className="text-[16px] font-semibold leading-tight" style={{ color: "#f1f6f4" }}>Start a private conversation</h2>
          <p className="mt-1 text-[13px] leading-5" style={{ color: "rgba(214,235,230,0.55)" }}>
            No account needed. Your conversation stays private until you choose to share it.
          </p>
        </div>
      </div>

      <label className="mt-5 block text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "rgba(214,235,230,0.45)" }} htmlFor="chat-name">
        Your name <span className="normal-case font-normal tracking-normal">(optional)</span>
      </label>
      <div className="mt-2 flex items-center gap-2 rounded-[8px] px-3 py-2.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <UserRound size={15} strokeWidth={1.8} style={{ color: "rgba(214,235,230,0.35)", flexShrink: 0 }} />
        <input
          id="chat-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="How should SafeNight address you?"
          className="min-w-0 flex-1 bg-transparent text-[14px] outline-none"
          style={{ color: "#f1f6f4" }}
        />
      </div>

      {error && (
        <div className="mt-3 rounded-[8px] px-3 py-2 text-[13px]" style={{ background: "rgba(217,95,72,0.12)", border: "1px solid rgba(217,95,72,0.25)", color: "#e88d78" }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[8px] px-4 py-2.5 text-[14px] font-semibold transition"
        style={{ background: loading ? "rgba(31,111,100,0.4)" : "rgba(31,111,100,0.7)", color: "#eaf6f2", border: "1px solid rgba(111,184,170,0.3)" }}
      >
        {loading ? <LoadingIcon /> : <ArrowRight size={16} strokeWidth={2} />}
        {loading ? "Opening SafeNight…" : "Open SafeNight"}
      </button>
    </form>
  );
}

function StaffLoginForm({ roleKey }: { roleKey: "worker" | "supervisor" }) {
  const router = useRouter();
  const account = ACCOUNTS.find((a) => a.role === roleKey);
  const [email, setEmail] = useState(account?.email ?? "");
  const [password, setPassword] = useState(account?.password ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(targetEmail = email, targetPassword = password) {
    setLoading(true);
    setError(null);
    try {
      const session = await login(targetEmail, targetPassword);
      saveAuthSession(session);
      router.push(getRoleHome(session.user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Incorrect email or password.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void signIn();
  }

  const roleLabel = ROLE_LABELS[roleKey];

  return (
    <main className="relative min-h-screen overflow-hidden text-[#f1f6f4]" style={{ background: "#060d0c" }}>
      <Background />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-[380px]">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-[13px] mb-8 transition" style={{ color: "rgba(214,235,230,0.5)" }}>
            <ArrowLeft size={14} strokeWidth={2} />
            Back
          </Link>

          <div className="mb-6 flex items-center gap-3">
            <BrandMark />
            <span className="text-[15px] font-semibold" style={{ color: "#f1f6f4" }}>SignalBridge</span>
          </div>

          <h1 className="text-[24px] font-semibold leading-tight" style={{ color: "#f1f6f4" }}>{roleLabel} sign in</h1>
          <p className="mt-1.5 text-[14px]" style={{ color: "rgba(214,235,230,0.5)" }}>
            {roleKey === "worker" ? "Review overnight signals and handoffs." : "Monitor team activity and manage oversight."}
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: "rgba(214,235,230,0.45)" }} htmlFor="email">
                Email
              </label>
              <div className="flex items-center gap-2 rounded-[8px] px-3 py-2.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Mail size={15} strokeWidth={1.8} style={{ color: "rgba(214,235,230,0.35)", flexShrink: 0 }} />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-[14px] outline-none"
                  style={{ color: "#f1f6f4" }}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: "rgba(214,235,230,0.45)" }} htmlFor="password">
                Password
              </label>
              <div className="flex items-center gap-2 rounded-[8px] px-3 py-2.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Lock size={15} strokeWidth={1.8} style={{ color: "rgba(214,235,230,0.35)", flexShrink: 0 }} />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-[14px] outline-none"
                  style={{ color: "#f1f6f4" }}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-[8px] px-3 py-2 text-[13px]" style={{ background: "rgba(217,95,72,0.12)", border: "1px solid rgba(217,95,72,0.25)", color: "#e88d78" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] px-4 py-2.5 text-[14px] font-semibold transition"
              style={{ background: "rgba(31,111,100,0.7)", border: "1px solid rgba(111,184,170,0.3)", color: "#eaf6f2" }}
            >
              {loading ? <LoadingIcon /> : null}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

function LoginHub() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen overflow-hidden text-[#f1f6f4]" style={{ background: "#060d0c" }}>
      <Background />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[480px] flex-col items-center justify-center px-5 py-10">
        <div className="w-full">
          <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] mb-10 transition" style={{ color: "rgba(214,235,230,0.4)" }}>
            <ArrowLeft size={14} strokeWidth={2} />
            Back to intro
          </Link>

          <div className="mb-8 flex items-center gap-3">
            <BrandMark />
            <span className="text-[15px] font-semibold">SignalBridge</span>
          </div>

          <h1 className="text-[28px] font-semibold leading-tight" style={{ color: "#f1f6f4" }}>Welcome back.</h1>
          <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "rgba(214,235,230,0.5)" }}>
            After-hours support for young people, and a space for the people who care for them.
          </p>

          <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(214,235,230,0.35)" }}>
            Who are you signing in as?
          </p>

          <div className="mt-3 space-y-3">
            <YouthChatStart />

            {ACCOUNTS.filter((a) => a.role !== "youth").map((account) => (
              <button
                key={account.role}
                type="button"
                onClick={() => router.push(`/login?role=${account.role}`)}
                className="group w-full rounded-[12px] p-4 text-left transition"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]" style={{ background: `${account.accent}18`, color: account.accent }}>
                      {account.icon}
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold" style={{ color: "#f1f6f4" }}>{account.label}</p>
                      <p className="text-[12px]" style={{ color: "rgba(214,235,230,0.45)" }}>{account.description}</p>
                    </div>
                  </div>
                  <ArrowRight size={16} strokeWidth={2} style={{ color: "rgba(214,235,230,0.25)", flexShrink: 0 }} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function LoginRouter() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role");

  if (role === "worker" || role === "supervisor") {
    return <StaffLoginForm roleKey={role} />;
  }

  return <LoginHub />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen" style={{ background: "#060d0c" }} />}>
      <LoginRouter />
    </Suspense>
  );
}

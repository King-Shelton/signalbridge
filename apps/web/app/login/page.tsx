"use client";

import { Suspense, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Loader2, Lock, Mail, Moon, RadioTower, Shield, UserRound, UsersRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { login } from "@/lib/api-client";
import { getRoleHome, saveAuthSession } from "@/lib/auth-session";
import type { Role } from "@/lib/constants";

const DEMOS: Array<{
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
    label: "Guest SafeNight chat",
    description: "Start privately with a demo youth session.",
    email: "mira@signalbridge.test",
    password: "password",
    icon: <Moon size={21} strokeWidth={1.8} />,
    accent: "#1f6f64",
  },
  {
    role: "worker",
    label: "Youth worker",
    description: "Morning queue, signals, and handoffs.",
    email: "worker1@signalbridge.test",
    password: "password",
    icon: <UsersRound size={21} strokeWidth={1.8} />,
    accent: "#d95f48",
  },
  {
    role: "supervisor",
    label: "Supervisor",
    description: "Team load, audit trail, and oversight.",
    email: "supervisor@signalbridge.test",
    password: "password",
    icon: <Shield size={21} strokeWidth={1.8} />,
    accent: "#b7791f",
  },
];

const ROLE_LABELS: Record<string, string> = {
  worker: "Youth worker",
  supervisor: "Supervisor",
};

function Background() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#f6fbf9_0%,#ffffff_56%,#f5f8fb_100%)]" />
      <div className="absolute -left-[12vw] -top-[18vw] h-[58vw] w-[58vw] rounded-full bg-[radial-gradient(circle,rgba(31,111,100,0.14),transparent_63%)]" />
      <div className="absolute -right-[10vw] -top-[10vw] h-[44vw] w-[44vw] rounded-full bg-[radial-gradient(circle,rgba(217,95,72,0.09),transparent_62%)]" />
      <div className="absolute inset-0 opacity-[0.45] [background-image:radial-gradient(rgba(24,33,47,0.07)_1px,transparent_1px)] [background-size:38px_38px]" />
    </div>
  );
}

function BrandMark() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[linear-gradient(160deg,#2a8576,#164b44)] text-[#eaf6f2] shadow-[0_14px_36px_rgba(31,111,100,0.28)]">
      <RadioTower size={24} strokeWidth={1.75} />
    </div>
  );
}

function LoadingIcon() {
  return <Loader2 size={17} strokeWidth={2} className="animate-spin" />;
}

function YouthGuestStart() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startGuest(e: FormEvent) {
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
          name: displayName || "Guest",
        },
      });
      router.push("/youth/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the guest chat.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={startGuest} className="rounded-[8px] border border-[#dbe7e3] bg-white/82 p-5 shadow-[0_18px_48px_rgba(24,33,47,0.08)] backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] bg-[#e5f2ef] text-[#1f6f64]">
          <Moon size={21} strokeWidth={1.8} />
        </div>
        <div>
          <h2 className="text-[20px] font-semibold leading-tight text-[#18212f]">Start SafeNight as a guest</h2>
          <p className="mt-1 text-[13.5px] leading-6 text-[#64748b]">
            No password needed. This opens the demo chat from the intro and keeps the handoff story moving.
          </p>
        </div>
      </div>

      <label className="mt-5 block text-[12px] font-semibold uppercase tracking-[0.16em] text-[#64748b]" htmlFor="guest-name">
        Display name
      </label>
      <div className="mt-2 flex items-center gap-2 rounded-[8px] border border-[#dbe7e3] bg-white px-3 py-2.5 focus-within:border-[#6fb8aa]">
        <UserRound size={17} strokeWidth={1.8} className="text-[#94a3b8]" />
        <input
          id="guest-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Guest"
          className="min-w-0 flex-1 bg-transparent text-[14px] text-[#18212f] outline-none placeholder:text-[#94a3b8]"
        />
      </div>

      {error && (
        <div className="mt-3 rounded-[8px] border border-[#f0c5ba] bg-[#fff4f1] px-3 py-2 text-[13px] text-[#b44a35]">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#1f6f64] px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-[#1a5d54] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <LoadingIcon /> : <ArrowRight size={17} strokeWidth={2} />}
        {loading ? "Opening SafeNight" : "Continue as guest"}
      </button>
    </form>
  );
}

function StaffLoginForm({ roleKey }: { roleKey: "worker" | "supervisor" }) {
  const router = useRouter();
  const demo = DEMOS.find((item) => item.role === roleKey);
  const [email, setEmail] = useState(demo?.email ?? "");
  const [password, setPassword] = useState("");
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
      setError(err instanceof Error ? err.message : "Could not sign in. Check your credentials.");
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
    <main className="relative min-h-screen overflow-hidden bg-[#f6fbf9] px-5 py-7 text-[#18212f]">
      <Background />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-5xl flex-col">
        <Link href="/" className="inline-flex w-fit items-center gap-2 text-[13px] font-semibold text-[#64748b] transition hover:text-[#1f6f64]">
          <ArrowLeft size={16} strokeWidth={1.8} />
          Back to intro
        </Link>

        <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[1fr_390px]">
          <section>
            <BrandMark />
            <p className="mt-6 text-[12px] font-semibold uppercase tracking-[0.24em] text-[#1f6f64]">SignalBridge staff</p>
            <h1 className="mt-3 max-w-xl text-[clamp(34px,5vw,58px)] font-semibold leading-[1.04] text-[#18212f]">
              Pick up the overnight context without asking them to start over.
            </h1>
            <p className="mt-5 max-w-[48ch] text-[16px] leading-7 text-[#64748b]">
              Sign in with the seeded staff account, or use the demo shortcut for the hackathon walkthrough.
            </p>
          </section>

          <form onSubmit={handleSubmit} className="rounded-[8px] border border-[#dbe7e3] bg-white/86 p-5 shadow-[0_18px_48px_rgba(24,33,47,0.09)] backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[8px] bg-[#e5f2ef] text-[#1f6f64]">
                {roleKey === "worker" ? <UsersRound size={21} strokeWidth={1.8} /> : <Shield size={21} strokeWidth={1.8} />}
              </div>
              <div>
                <h2 className="text-[21px] font-semibold text-[#18212f]">{roleLabel} sign in</h2>
                <p className="text-[13px] text-[#64748b]">Email and password access</p>
              </div>
            </div>

            <label className="mt-6 block text-[12px] font-semibold uppercase tracking-[0.16em] text-[#64748b]" htmlFor="email">
              Email
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-[8px] border border-[#dbe7e3] bg-white px-3 py-2.5 focus-within:border-[#6fb8aa]">
              <Mail size={17} strokeWidth={1.8} className="text-[#94a3b8]" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-[14px] text-[#18212f] outline-none placeholder:text-[#94a3b8]"
              />
            </div>

            <label className="mt-4 block text-[12px] font-semibold uppercase tracking-[0.16em] text-[#64748b]" htmlFor="password">
              Password
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-[8px] border border-[#dbe7e3] bg-white px-3 py-2.5 focus-within:border-[#6fb8aa]">
              <Lock size={17} strokeWidth={1.8} className="text-[#94a3b8]" />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password"
                className="min-w-0 flex-1 bg-transparent text-[14px] text-[#18212f] outline-none placeholder:text-[#94a3b8]"
              />
            </div>

            {error && (
              <div className="mt-4 rounded-[8px] border border-[#f0c5ba] bg-[#fff4f1] px-3 py-2 text-[13px] text-[#b44a35]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#1f6f64] px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-[#1a5d54] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <LoadingIcon /> : <ArrowRight size={17} strokeWidth={2} />}
              {loading ? "Signing in" : "Sign in"}
            </button>

            {demo && (
              <button
                type="button"
                disabled={loading}
                onClick={() => void signIn(demo.email, demo.password)}
                className="mt-3 w-full rounded-[8px] border border-[#dbe7e3] bg-white px-4 py-3 text-[13px] font-semibold text-[#1f6f64] transition hover:border-[#6fb8aa] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Use demo account
              </button>
            )}

            <p className="mt-3 text-center text-[12px] text-[#64748b]">
              Demo password: <span className="font-mono text-[#18212f]">password</span>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}

function LoginHub() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6fbf9] px-5 py-7 text-[#18212f]">
      <Background />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-6xl flex-col">
        <Link href="/" className="inline-flex w-fit items-center gap-2 text-[13px] font-semibold text-[#64748b] transition hover:text-[#1f6f64]">
          <ArrowLeft size={16} strokeWidth={1.8} />
          Back to intro
        </Link>

        <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[0.9fr_1.1fr]">
          <section>
            <BrandMark />
            <p className="mt-6 text-[12px] font-semibold uppercase tracking-[0.24em] text-[#1f6f64]">SignalBridge</p>
            <h1 className="mt-3 max-w-xl text-[clamp(36px,5.4vw,64px)] font-semibold leading-[1.04] text-[#18212f]">
              Choose how you want to enter the demo.
            </h1>
            <p className="mt-5 max-w-[47ch] text-[16px] leading-7 text-[#64748b]">
              Youth can start as a guest without a password. Staff can use email and password from their sign-in pages.
            </p>
          </section>

          <section className="space-y-4">
            <YouthGuestStart />

            <div className="grid gap-3 sm:grid-cols-2">
              {DEMOS.filter((demo) => demo.role !== "youth").map((demo) => (
                <button
                  key={demo.role}
                  type="button"
                  onClick={() => router.push(`/login?role=${demo.role}`)}
                  className="group rounded-[8px] border border-[#dbe7e3] bg-white/78 p-4 text-left shadow-[0_14px_36px_rgba(24,33,47,0.06)] transition hover:border-[#6fb8aa] hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[8px]" style={{ backgroundColor: `${demo.accent}18`, color: demo.accent }}>
                      {demo.icon}
                    </div>
                    <ArrowRight size={17} strokeWidth={2} className="mt-1 text-[#94a3b8] transition group-hover:translate-x-0.5 group-hover:text-[#1f6f64]" />
                  </div>
                  <h2 className="mt-4 text-[17px] font-semibold text-[#18212f]">{demo.label}</h2>
                  <p className="mt-2 text-[13px] leading-5 text-[#64748b]">{demo.description}</p>
                </button>
              ))}
            </div>

            <div className="rounded-[8px] border border-[#dbe7e3] bg-white/70 p-4 text-[13px] leading-6 text-[#64748b]">
              Staff demo accounts use <span className="font-mono text-[#18212f]">password</span>. Youth guest mode uses the seeded Mira session so the chat and handoff flow work immediately.
            </div>

          </section>
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
    <Suspense fallback={<main className="min-h-screen bg-[#f6fbf9]" />}>
      <LoginRouter />
    </Suspense>
  );
}

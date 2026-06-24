"use client";

import { Suspense, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Loader2, Lock, Mail, Moon, RadioTower, Shield, UserRound, UsersRound, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, login } from "@/lib/api-client";
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
    <div className="flex h-10 w-10 items-center justify-center rounded-[12px] text-[#eaf6f2] flex-shrink-0" style={{ background: "linear-gradient(160deg, #2a8576, #164b44)", boxShadow: "0 8px 24px rgba(31,111,100,0.4)" }}>
      <RadioTower size={20} strokeWidth={1.75} />
    </div>
  );
}

function LoadingIcon() {
  return <Loader2 size={16} strokeWidth={2} className="animate-spin" />;
}

function YouthAuthPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<"guest" | "login" | "signup">("guest");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startAsGuest(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const session = await login("mira@signalbridge.test", "password");
      const displayName = name.trim();
      saveAuthSession({ ...session, user: { ...session.user, name: displayName || "You" } });
      router.push("/youth/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function loginYouth(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const session = await login(email, password);
      saveAuthSession(session);
      router.push("/youth/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Incorrect email or password.");
    } finally {
      setLoading(false);
    }
  }

  async function signupYouth(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const session = await apiFetch<{ accessToken: string; user: { id: string; name: string; email: string; role: "youth" | "worker" | "supervisor" | "admin" } }>(
        "/auth/register",
        { method: "POST", body: JSON.stringify({ name: name.trim(), email, password }) }
      );
      saveAuthSession(session);
      router.push("/youth/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[16px]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(111,184,170,0.2)" }}>
      {/* Header */}
      <div className="p-5 pb-0 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]" style={{ background: "rgba(111,184,170,0.15)", color: "#6fb8aa" }}>
          <Moon size={20} strokeWidth={1.8} />
        </div>
        <div>
          <h2 className="text-[16px] font-semibold leading-tight" style={{ color: "#f1f6f4" }}>I need someone to talk to</h2>
          <p className="mt-1 text-[13px] leading-5" style={{ color: "rgba(214,235,230,0.5)" }}>
            SafeNight is here. Private, judgement-free, and always on your terms.
          </p>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 mx-5 mt-4 p-1 rounded-[10px]" style={{ background: "rgba(255,255,255,0.05)" }}>
        {(["guest", "login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError(null); }}
            className="flex-1 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all"
            style={{
              background: mode === m ? "rgba(31,111,100,0.4)" : "transparent",
              color: mode === m ? "#6fb8aa" : "rgba(214,235,230,0.45)",
              border: mode === m ? "1px solid rgba(111,184,170,0.3)" : "1px solid transparent",
            }}
          >
            {m === "guest" ? "Continue as guest" : m === "login" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      {/* Guest form */}
      {mode === "guest" && (
        <form onSubmit={startAsGuest} className="p-5 pt-4 space-y-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] mb-1.5" style={{ color: "rgba(214,235,230,0.4)" }} htmlFor="guest-name">
              Your name <span className="normal-case font-normal tracking-normal">(optional)</span>
            </label>
            <div className="flex items-center gap-2 rounded-[8px] px-3 py-2.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <UserRound size={15} strokeWidth={1.8} style={{ color: "rgba(214,235,230,0.35)", flexShrink: 0 }} />
              <input id="guest-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="What should SafeNight call you?" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none" style={{ color: "#f1f6f4" }} />
            </div>
          </div>
          <p className="text-[11.5px] leading-relaxed" style={{ color: "rgba(214,235,230,0.35)" }}>
            No account needed. Your conversation stays private until you choose to share it. To save your history across sessions, create an account instead.
          </p>
          {error && <ErrorBox text={error} />}
          <SubmitButton loading={loading} label="Open SafeNight" loadingLabel="Opening SafeNight…" />
        </form>
      )}

      {/* Login form */}
      {mode === "login" && (
        <form onSubmit={loginYouth} className="p-5 pt-4 space-y-3">
          <EmailField value={email} onChange={setEmail} />
          <PasswordField value={password} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
          {error && <ErrorBox text={error} />}
          <SubmitButton loading={loading} label="Sign in" loadingLabel="Signing in…" />
        </form>
      )}

      {/* Signup form */}
      {mode === "signup" && (
        <form onSubmit={signupYouth} className="p-5 pt-4 space-y-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] mb-1.5" style={{ color: "rgba(214,235,230,0.4)" }} htmlFor="signup-name">Your name</label>
            <div className="flex items-center gap-2 rounded-[8px] px-3 py-2.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <UserRound size={15} strokeWidth={1.8} style={{ color: "rgba(214,235,230,0.35)", flexShrink: 0 }} />
              <input id="signup-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Name or nickname" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none" style={{ color: "#f1f6f4" }} />
            </div>
          </div>
          <EmailField value={email} onChange={setEmail} />
          <PasswordField value={password} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword(!showPassword)} helpText="At least 6 characters" />
          <p className="text-[11.5px] leading-relaxed" style={{ color: "rgba(214,235,230,0.35)" }}>
            Creating an account means your conversations are saved, and your worker will have more context when following up.
          </p>
          {error && <ErrorBox text={error} />}
          <SubmitButton loading={loading} label="Create account" loadingLabel="Creating account…" />
        </form>
      )}
    </div>
  );
}

function EmailField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] mb-1.5" style={{ color: "rgba(214,235,230,0.4)" }} htmlFor="email">Email</label>
      <div className="flex items-center gap-2 rounded-[8px] px-3 py-2.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <Mail size={15} strokeWidth={1.8} style={{ color: "rgba(214,235,230,0.35)", flexShrink: 0 }} />
        <input id="email" type="email" autoComplete="email" required value={value} onChange={(e) => onChange(e.target.value)} className="min-w-0 flex-1 bg-transparent text-[14px] outline-none" style={{ color: "#f1f6f4" }} />
      </div>
    </div>
  );
}

function PasswordField({ value, onChange, show, onToggle, helpText }: { value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; helpText?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] mb-1.5" style={{ color: "rgba(214,235,230,0.4)" }} htmlFor="password">Password</label>
      <div className="flex items-center gap-2 rounded-[8px] px-3 py-2.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <Lock size={15} strokeWidth={1.8} style={{ color: "rgba(214,235,230,0.35)", flexShrink: 0 }} />
        <input id="password" type={show ? "text" : "password"} autoComplete="current-password" required value={value} onChange={(e) => onChange(e.target.value)} className="min-w-0 flex-1 bg-transparent text-[14px] outline-none" style={{ color: "#f1f6f4" }} />
        <button type="button" onClick={onToggle} style={{ color: "rgba(214,235,230,0.3)", flexShrink: 0 }}>
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {helpText && <p className="mt-1 text-[11px]" style={{ color: "rgba(214,235,230,0.3)" }}>{helpText}</p>}
    </div>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div className="rounded-[8px] px-3 py-2 text-[13px]" style={{ background: "rgba(217,95,72,0.12)", border: "1px solid rgba(217,95,72,0.25)", color: "#e88d78" }}>{text}</div>
  );
}

function SubmitButton({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] px-4 py-2.5 text-[14px] font-semibold transition" style={{ background: loading ? "rgba(31,111,100,0.4)" : "rgba(31,111,100,0.7)", color: "#eaf6f2", border: "1px solid rgba(111,184,170,0.3)" }}>
      {loading ? <LoadingIcon /> : <ArrowRight size={16} strokeWidth={2} />}
      {loading ? loadingLabel : label}
    </button>
  );
}

function StaffLoginForm({ roleKey }: { roleKey: "worker" | "supervisor" }) {
  const router = useRouter();
  const account = ACCOUNTS.find((a) => a.role === roleKey);
  const [email, setEmail] = useState(account?.email ?? "");
  const [password, setPassword] = useState(account?.password ?? "");
  const [showPassword, setShowPassword] = useState(false);
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
        <div className="w-full max-w-[400px]">
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
              <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: "rgba(214,235,230,0.45)" }} htmlFor="staff-email">Email</label>
              <div className="flex items-center gap-2 rounded-[8px] px-3 py-2.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Mail size={15} strokeWidth={1.8} style={{ color: "rgba(214,235,230,0.35)", flexShrink: 0 }} />
                <input id="staff-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="min-w-0 flex-1 bg-transparent text-[14px] outline-none" style={{ color: "#f1f6f4" }} />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: "rgba(214,235,230,0.45)" }} htmlFor="staff-password">Password</label>
              <div className="flex items-center gap-2 rounded-[8px] px-3 py-2.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Lock size={15} strokeWidth={1.8} style={{ color: "rgba(214,235,230,0.35)", flexShrink: 0 }} />
                <input id="staff-password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="min-w-0 flex-1 bg-transparent text-[14px] outline-none" style={{ color: "#f1f6f4" }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ color: "rgba(214,235,230,0.3)" }}>
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && <ErrorBox text={error} />}

            <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] px-4 py-2.5 text-[14px] font-semibold transition" style={{ background: "rgba(31,111,100,0.7)", border: "1px solid rgba(111,184,170,0.3)", color: "#eaf6f2" }}>
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

      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        {/* Left panel — branding + youth */}
        <div className="flex flex-1 flex-col justify-center px-8 py-12 lg:px-16 lg:max-w-[580px]">
          <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] mb-10 transition self-start" style={{ color: "rgba(214,235,230,0.4)" }}>
            <ArrowLeft size={14} strokeWidth={2} />
            Back to intro
          </Link>

          <div className="mb-8 flex items-center gap-3">
            <BrandMark />
            <span className="text-[15px] font-semibold">SignalBridge</span>
          </div>

          <h1 className="text-[32px] font-semibold leading-tight" style={{ color: "#f1f6f4", letterSpacing: "-0.025em" }}>
            You don&apos;t have to hold it alone tonight.
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "rgba(214,235,230,0.5)" }}>
            SafeNight is here whenever you need to talk — privately, without judgement, on your terms.
          </p>

          <div className="mt-8">
            <YouthAuthPanel />
          </div>
        </div>

        {/* Right panel — staff */}
        <div className="flex flex-col justify-center px-8 py-12 lg:px-12 lg:w-[340px] lg:border-l" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.12)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-5" style={{ color: "rgba(214,235,230,0.35)" }}>
            Staff access
          </p>

          <div className="space-y-3">
            {ACCOUNTS.map((account) => (
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
                      <p className="text-[14px] font-semibold" style={{ color: "#f1f6f4" }}>{account.label}</p>
                      <p className="text-[11.5px]" style={{ color: "rgba(214,235,230,0.4)" }}>{account.description}</p>
                    </div>
                  </div>
                  <ArrowRight size={15} strokeWidth={2} style={{ color: "rgba(214,235,230,0.25)", flexShrink: 0 }} />
                </div>
              </button>
            ))}
          </div>

          <p className="mt-6 text-[11.5px] leading-relaxed" style={{ color: "rgba(214,235,230,0.25)" }}>
            Staff accounts are managed by your organisation. Contact your supervisor if you need access.
          </p>
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

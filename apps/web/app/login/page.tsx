"use client";

import { useRouter } from "next/navigation";
import { LockKeyhole, Loader2, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { login } from "@/lib/api-client";
import { getRoleHome, saveAuthSession } from "@/lib/auth-session";
import { DEMO_ACCOUNTS } from "@/lib/constants";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState("password");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const session = await login(email.trim().toLowerCase(), password);
      saveAuthSession(session);
      router.push(getRoleHome(session.user.role));
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Could not sign in to SignalBridge."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-6 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-pine">
          SignalBridge
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-ink">Demo login</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Choose a seeded SignalBridge role and use the shared demo password.
        </p>
        <div className="mt-5 grid gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => setEmail(account.email)}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                email === account.email
                  ? "border-pine bg-pine/10 text-pine"
                  : "border-slate-200 bg-white text-slate-600 hover:border-pine/30"
              }`}
            >
              <span className="font-semibold">{account.label}</span>
              <span className="ml-2 text-xs text-slate-500">{account.email}</span>
            </button>
          ))}
        </div>
        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Email
            <span className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 focus-within:border-pine focus-within:ring-2 focus-within:ring-pine/15">
              <UserRound aria-hidden="true" className="h-4 w-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full border-0 bg-transparent text-sm outline-none"
              />
            </span>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Password
            <span className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 focus-within:border-pine focus-within:ring-2 focus-within:ring-pine/15">
              <LockKeyhole aria-hidden="true" className="h-4 w-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full border-0 bg-transparent text-sm outline-none"
              />
            </span>
          </label>
          {error ? (
            <p className="rounded-lg border border-coral/20 bg-coral/10 px-3 py-2 text-sm font-medium text-coral">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-pine px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:bg-pine/60"
          >
            {isLoading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
            {isLoading ? "Opening dashboard" : "Continue"}
          </button>
        </form>
      </section>
    </main>
  );
}

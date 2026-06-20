"use client";

import { useRouter } from "next/navigation";
import { LockKeyhole, Loader2, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { demoYouthSession, saveYouthSession } from "@/lib/youth-session";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(demoYouthSession.email);
  const [password, setPassword] = useState("password");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
      });

      if (!response.ok) {
        throw new Error("Use Mira's demo login to open the youth dashboard.");
      }

      const data = (await response.json()) as {
        accessToken: string;
        user: {
          id: string;
          name: string;
          email: string;
          role: string;
        };
      };

      if (data.user.role !== "youth") {
        throw new Error("This login is not a youth account.");
      }

      saveYouthSession({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: "youth",
        accessToken: data.accessToken
      });
      router.push("/youth/chat");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Could not open Mira's dashboard.");
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
        <h1 className="mt-3 text-2xl font-semibold text-ink">Youth login</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Continue as Mira to open the SafeNight Companion flow.
        </p>
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
            {isLoading ? "Opening dashboard" : "Continue as Mira"}
          </button>
        </form>
      </section>
    </main>
  );
}

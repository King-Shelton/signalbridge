import Link from "next/link";
import { LockKeyhole, UserRound } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-pine">
          SignalBridge
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-ink">Youth login</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Day 1 mock login for Mira&apos;s SafeNight Companion flow.
        </p>
        <form className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Email
            <span className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 focus-within:border-pine focus-within:ring-2 focus-within:ring-pine/15">
              <UserRound aria-hidden="true" className="h-4 w-4 text-slate-400" />
              <input
                type="email"
                defaultValue="mira@signalbridge.test"
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
                defaultValue="password"
                className="w-full border-0 bg-transparent text-sm outline-none"
              />
            </span>
          </label>
          <Link
            href="/youth/chat"
            className="mt-2 rounded-lg bg-pine px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-pine/90"
          >
            Continue as Mira
          </Link>
        </form>
      </section>
    </main>
  );
}

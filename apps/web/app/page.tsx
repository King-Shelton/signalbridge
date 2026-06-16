import Link from "next/link";
import { ArrowRight } from "lucide-react";

const links = [
  { href: "/login", label: "Login" },
  { href: "/youth/chat", label: "SafeNight chat" },
  { href: "/youth/handoff-preview", label: "Handoff preview" }
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-pine">
        SignalBridge
      </p>
      <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-ink sm:text-5xl">
        SafeNight Companion youth flow
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
        Day 1 mock screens for Mira&apos;s after-hours cyberbullying journey and
        youth-approved handoff preview.
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink shadow-sm transition hover:border-pine hover:text-pine"
          >
            {link.label}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        ))}
      </div>
    </main>
  );
}

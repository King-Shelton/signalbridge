import Link from "next/link";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { AfterHoursBadge } from "@/components/AfterHoursBadge";
import { HandoffConsentCard } from "@/components/HandoffConsentCard";

const briefItems = [
  ["Main concern", "Cyberbullying involving edited photos in a class group chat"],
  ["Emotional state", "Tired, embarrassed, and reluctant to repeat the story"],
  ["Key quote", "\"I'm so tired of explaining this.\""],
  [
    "What SafeNight did",
    "Acknowledged distress, avoided diagnosis, offered handoff preparation, and asked for consent."
  ],
  [
    "What not to repeat",
    "Do not ask Mira to retell the full incident immediately unless she chooses to."
  ]
];

export default function HandoffPreviewPage() {
  return (
    <section className="w-full">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <Link
            href="/youth/chat"
            className="inline-flex items-center gap-2 text-sm font-semibold text-pine hover:text-ink"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to chat
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-ink">Handoff preview</h1>
        </div>
        <AfterHoursBadge />
      </header>

      <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-pine/10 p-2 text-pine">
              <ClipboardCheck aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-pine">Worker note draft</p>
              <h2 className="text-xl font-semibold text-ink">Mira Tan</h2>
            </div>
          </div>

          <dl className="mt-6 grid gap-4">
            {briefItems.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-200 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {label}
                </dt>
                <dd className="mt-2 text-sm leading-6 text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </article>

        <aside className="grid content-start gap-4">
          <HandoffConsentCard />
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-ink">Suggested first response</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Hi Mira, I read the note you allowed SignalBridge to prepare. You
              don&apos;t have to repeat everything unless you want to. I&apos;m here now.
              Can I first check whether you feel safe going to school today?
            </p>
          </section>
        </aside>
      </section>
    </section>
  );
}

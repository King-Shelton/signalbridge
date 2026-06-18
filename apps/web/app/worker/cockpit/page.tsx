import { Clock3, Layers3, ShieldAlert, Users } from "lucide-react";
import { countByRisk, workerYouthCases } from "@/lib/worker-data";
import { WorkerConversationPreview } from "@/components/WorkerConversationPreview";

const summaryCards = [
  {
    label: "Open youth cases",
    value: workerYouthCases.length.toString(),
    icon: Users
  },
  {
    label: "High-risk priority",
    value: countByRisk("high").toString(),
    icon: ShieldAlert
  },
  {
    label: "Medium-risk follow-ups",
    value: countByRisk("medium").toString(),
    icon: Layers3
  },
  {
    label: "After-hours review",
    value: "2 pending",
    icon: Clock3
  }
];

export default function WorkerCockpitPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(31,111,100,0.14),_transparent_34%),linear-gradient(180deg,_#f6fbf9_0%,_#ffffff_55%,_#f5f8fb_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-panel backdrop-blur">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pine">
                Worker cockpit
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Triage the day without losing the youth story.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                This cockpit surfaces seeded conversation previews for Mira and
                the rest of the youth queue so the worker can move from signal
                to action quickly today, then swap in real conversations on Day 5
                without redesigning the feed.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {summaryCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article
                    key={card.label}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {card.label}
                      </p>
                      <Icon aria-hidden="true" className="h-4 w-4 text-pine" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-ink">{card.value}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-panel">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Youth conversation feed
              </h2>
              <p className="text-xs font-medium text-slate-500">
                Approved channels: WhatsApp, Instagram, GatherTown, Discord, Web Chat
              </p>
            </div>
          </div>

          <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-4">
              {workerYouthCases.map((youth) => (
                <WorkerConversationPreview key={youth.id} youth={youth} />
              ))}
            </div>

            <aside className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Day 5 seam
              </p>
              <h3 className="mt-2 text-lg font-semibold text-ink">
                Ready for real conversations later
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                The cockpit now reads from one shared mock conversation feed. On
                Day 5, the team can swap that feed for an API response or live
                backend query while keeping the card layout and worker actions
                unchanged.
              </p>

              <div className="mt-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Supported labels
                </p>
                <div className="flex flex-wrap gap-2">
                  {["WhatsApp", "Instagram", "GatherTown", "Discord", "Web Chat"].map((label) => (
                    <span
                      key={label}
                      className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Feed contract
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Keep the worker card shape stable so an API response can be
                  dropped in later without changing the worker cockpit layout.
                </p>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

import { StatePanel } from "@/components/StatePanel";

export default function PastNotesPage() {
  return (
    <section className="grid gap-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-pine">Past notes</p>
        <h2 className="mt-1 text-xl font-semibold text-ink">Shared handoff history</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Notes Mira has approved for her worker will appear here after they are saved.
        </p>
      </div>
      <StatePanel
        title="No past notes yet"
        description="Once Mira approves a handoff note, SignalBridge will keep the youth-visible version here for review."
        actionHref="/youth/handoff-preview"
        actionLabel="Review current handoff"
        variant="empty"
      />
    </section>
  );
}

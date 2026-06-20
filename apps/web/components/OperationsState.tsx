"use client";

import { StatePanel } from "@/components/StatePanel";

export function OperationsState({ loading, error, empty, retry, children }: { loading: boolean; error: string; empty?: boolean; retry?: () => void; children: React.ReactNode }) {
  if (loading) return <StatePanel title="Loading live SignalBridge data" description="The app is reading the latest persisted workflow state." variant="loading" />;
  if (error) return <div className="space-y-3"><StatePanel title="Live data unavailable" description={error} variant="error" />{retry ? <button onClick={retry} className="rounded-xl bg-pine px-4 py-2 text-sm font-semibold text-white">Try again</button> : null}</div>;
  if (empty) return <StatePanel title="Nothing needs attention" description="No matching records are currently assigned to this workspace." variant="empty" />;
  return <>{children}</>;
}

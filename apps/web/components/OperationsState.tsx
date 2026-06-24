"use client";

import { StatePanel } from "@/components/StatePanel";

type OperationsStateProps = {
  loading: boolean;
  error: string;
  empty?: boolean;
  retry?: () => void;
  children: React.ReactNode;
  loadingTitle?: string;
  loadingDescription?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionHref?: string;
  emptyActionLabel?: string;
};

export function OperationsState({
  loading,
  error,
  empty,
  retry,
  children,
  loadingTitle = "Loading live SignalBridge data",
  loadingDescription = "The app is reading the latest persisted workflow state.",
  emptyTitle = "Nothing needs attention",
  emptyDescription = "No matching records are currently assigned to this workspace.",
  emptyActionHref,
  emptyActionLabel,
}: OperationsStateProps) {
  if (loading) {
    return (
      <StatePanel
        title={loadingTitle}
        description={loadingDescription}
        variant="loading"
      />
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <StatePanel title="Live data unavailable" description={error} variant="error" />
        {retry ? (
          <button type="button" onClick={retry} className="rounded-xl bg-pine px-4 py-2 text-sm font-semibold text-white">
            Try again
          </button>
        ) : null}
      </div>
    );
  }

  if (empty) {
    return (
      <StatePanel
        title={emptyTitle}
        description={emptyDescription}
        actionHref={emptyActionHref}
        actionLabel={emptyActionLabel}
        variant="empty"
      />
    );
  }

  return <>{children}</>;
}

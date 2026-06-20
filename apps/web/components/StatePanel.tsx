import Link from "next/link";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";

type StatePanelProps = {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  compact?: boolean;
  variant?: "loading" | "empty" | "error";
};

const icons = {
  loading: Loader2,
  empty: Inbox,
  error: AlertTriangle
};

export function StatePanel({
  title,
  description,
  actionHref,
  actionLabel,
  compact = false,
  variant = "empty"
}: StatePanelProps) {
  const Icon = icons[variant];

  return (
    <section
      className={
        compact
          ? "grid place-items-center rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm"
          : "grid min-h-[320px] place-items-center rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm"
      }
    >
      <div className="max-w-sm">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-mist text-pine">
          <Icon
            aria-hidden="true"
            className={variant === "loading" ? "h-5 w-5 animate-spin" : "h-5 w-5"}
          />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-ink">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        {actionHref && actionLabel ? (
          <Link
            href={actionHref}
            className="mt-5 inline-flex rounded-lg bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

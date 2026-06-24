import Link from "next/link";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { cn } from "@/components/cn";

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
  const iconStyles = {
    loading: "bg-mist text-pine",
    empty: "bg-mist text-pine",
    error: "bg-coral/10 text-coral"
  };

  return (
    <section
      className={cn(
        "grid place-items-center rounded-lg border bg-white text-center shadow-sm",
        variant === "error" ? "border-coral/20" : "border-slate-200",
        compact ? "p-4" : "min-h-[320px] p-6 sm:p-8"
      )}
    >
      <div className="max-w-sm">
        <div className={cn("mx-auto grid h-11 w-11 place-items-center rounded-full", iconStyles[variant])}>
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
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90 focus:outline-none focus:ring-2 focus:ring-pine/20"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

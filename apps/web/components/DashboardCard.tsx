import type { LucideIcon } from "lucide-react";
import { cn } from "@/components/cn";

type DashboardCardProps = {
  label: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
  tone?: "pine" | "amber" | "coral" | "slate";
  className?: string;
};

const toneStyles: Record<
  NonNullable<DashboardCardProps["tone"]>,
  { badge: string; panel: string; icon: string }
> = {
  pine: {
    badge: "bg-pine/10 text-pine",
    panel: "bg-[linear-gradient(180deg,_rgba(31,111,100,0.08),_rgba(255,255,255,0.98))]",
    icon: "text-pine"
  },
  amber: {
    badge: "bg-amber/10 text-amber",
    panel: "bg-[linear-gradient(180deg,_rgba(183,121,31,0.08),_rgba(255,255,255,0.98))]",
    icon: "text-amber"
  },
  coral: {
    badge: "bg-coral/10 text-coral",
    panel: "bg-[linear-gradient(180deg,_rgba(217,95,72,0.08),_rgba(255,255,255,0.98))]",
    icon: "text-coral"
  },
  slate: {
    badge: "bg-slate-100 text-slate-600",
    panel: "bg-[linear-gradient(180deg,_rgba(241,245,249,0.92),_rgba(255,255,255,0.98))]",
    icon: "text-slate-600"
  }
};

export function DashboardCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "pine",
  className
}: DashboardCardProps) {
  const styles = toneStyles[tone];

  return (
    <article
      className={cn(
        "rounded-[24px] border border-slate-200 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-panel",
        styles.panel,
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{value}</p>
        </div>
        <div className={cn("rounded-2xl p-3", styles.badge)}>
          <Icon aria-hidden="true" className={cn("h-5 w-5", styles.icon)} />
        </div>
      </div>
      {detail ? <p className="mt-4 text-sm leading-6 text-slate-600">{detail}</p> : null}
    </article>
  );
}

import { Moon } from "lucide-react";

type AfterHoursBadgeProps = {
  timeLabel?: string;
};

export function AfterHoursBadge({ timeLabel = "11:42 PM" }: AfterHoursBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-amber/30 bg-amber/10 px-3 py-1 text-xs font-semibold text-amber">
      <Moon aria-hidden="true" className="h-3.5 w-3.5" />
      <span>After-hours support active</span>
      <span className="text-amber/70">{timeLabel}</span>
    </div>
  );
}

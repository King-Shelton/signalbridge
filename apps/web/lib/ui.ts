// Shared presentational helpers. These were duplicated across the worker
// cockpit and youth-detail pages; centralising them keeps risk colours and
// time formatting provably identical everywhere they appear.

/** Foreground / soft-fill / border colours for a conversation's risk level. */
export function riskMeta(level: string) {
  if (level === "high" || level === "critical")
    return { fg: "#e88d78", soft: "rgba(217,95,72,0.15)", border: "rgba(217,95,72,0.4)" };
  if (level === "medium")
    return { fg: "#e9c685", soft: "rgba(183,121,31,0.15)", border: "rgba(183,121,31,0.4)" };
  return { fg: "#6fb8aa", soft: "rgba(31,111,100,0.15)", border: "rgba(31,111,100,0.4)" };
}

/** Background / border / text colours for a case status pill. */
export function caseStatusColor(status: string) {
  if (status === "open" || status === "active" || status === "needs_review")
    return { bg: "rgba(217,95,72,0.12)", border: "rgba(217,95,72,0.25)", color: "#e88d78" };
  if (status === "in_progress")
    return { bg: "rgba(183,121,31,0.12)", border: "rgba(183,121,31,0.25)", color: "#e9c685" };
  return { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)", color: "rgba(214,235,230,0.5)" };
}

/** Up to two uppercase initials from a name, e.g. "Mira Tan" -> "MT". */
export function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Compact relative time: "3m ago", "2h ago", "4d ago". */
export function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Time of day in Singapore locale, e.g. "9:41 PM". */
export function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-SG", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(value));
}

/** Date + time, e.g. "Jun 25, 9:41 PM". */
export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-SG", { hour: "numeric", minute: "2-digit", hour12: true, month: "short", day: "numeric" }).format(new Date(value));
}

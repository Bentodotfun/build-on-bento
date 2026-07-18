export function money(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  return `$${Math.round(n)}`;
}

export function kickoffLabel(ms: number): string {
  if (!ms) return "outright market";
  const diff = ms - Date.now();
  if (diff <= 0) return "in play";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 24) return `in ${Math.round(h / 24)}d`;
  if (h >= 1) return `kickoff in ${h}h ${m}m`;
  return `kickoff in ${m}m`;
}

export function dateLabel(ms: number): string {
  try {
    return new Date(ms).toLocaleString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

import type { PoolSummary } from "@/lib/pools-types";

const map = {
  leaning_true: { label: "Leaning True", emoji: "🟢", cls: "bg-verdict-green/20 text-ink border-verdict-green" },
  leaning_false: { label: "Leaning False", emoji: "🔴", cls: "bg-verdict-red/15 text-ink border-verdict-red" },
  too_early: { label: "Too early to tell", emoji: "🟡", cls: "bg-zap/40 text-ink border-zap" },
} as const;

export function SentimentChip({ sentiment }: { sentiment: PoolSummary["sentiment"] }) {
  const m = map[sentiment];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-semibold ${m.cls}`}>
      <span className="animate-pulse">{m.emoji}</span>
      {m.label}
    </span>
  );
}

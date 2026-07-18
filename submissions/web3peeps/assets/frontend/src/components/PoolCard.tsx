import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import type { PoolSummary } from "@/lib/pools-types";
import { SentimentChip } from "./SentimentChip";
import { StatusBadge } from "./StatusBadge";

export function PoolCard({ pool }: { pool: PoolSummary }) {
  const truePct = Math.round(pool.oddsTrue * 100);
  const falsePct = 100 - truePct;
  const leadsTrue = truePct >= falsePct;

  return (
    <div className="group relative flex flex-col gap-4 rounded-2xl bg-card p-5 ink-border hard-shadow-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:hard-shadow">
      <div className="flex items-start justify-between gap-3">
        <StatusBadge status={pool.status} />
        <a
          href={pool.sourceTweetUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 font-mono text-xs text-ink/60 hover:text-electric"
        >
          {pool.sourceAuthor}
          <ExternalLink className="size-3" />
        </a>
      </div>

      <Link
        to="/pools/$id"
        params={{ id: pool.id }}
        className="block font-display text-lg font-bold leading-tight text-ink hover:underline decoration-electric decoration-4 underline-offset-4"
      >
        {pool.claim}
      </Link>

      <div className="grid grid-cols-2 gap-2">
        <div
          className={`rounded-xl border-2 p-3 ${
            leadsTrue ? "border-verdict-green bg-verdict-green/15" : "border-ink/10 bg-muted"
          }`}
        >
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink/60">
            True
          </p>
          <p className="font-mono text-3xl font-black tabular-nums text-ink">{truePct}%</p>
        </div>
        <div
          className={`rounded-xl border-2 p-3 ${
            !leadsTrue ? "border-verdict-red bg-verdict-red/10" : "border-ink/10 bg-muted"
          }`}
        >
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink/60">
            False
          </p>
          <p className="font-mono text-3xl font-black tabular-nums text-ink">{falsePct}%</p>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-lilac p-3">
        <SentimentChip sentiment={pool.sentiment} />
      </div>
      <p className="text-sm italic text-ink/75">"{pool.hookLine}"</p>

      <div className="mt-auto flex items-center justify-between border-t-2 border-dashed border-ink/15 pt-3 font-mono text-xs text-ink/60">
        <span>Vol ${pool.volume.toLocaleString()}</span>
        <Link
          to="/pools/$id"
          params={{ id: pool.id }}
          className="font-semibold text-electric hover:underline"
        >
          View →
        </Link>
      </div>
    </div>
  );
}

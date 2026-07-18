import { useEffect, useState } from "react";
import type { PoolSummary } from "@/lib/pools-types";

export function VerdictTicker() {
  const [pools, setPools] = useState<PoolSummary[]>([]);

  useEffect(() => {
    fetch("/api/pools?status=open")
      .then((r) => r.json())
      .then((data) => setPools(Array.isArray(data) ? data : []))
      .catch(() => setPools([]));
  }, []);

  if (pools.length === 0) {
    return (
      <div className="border-y-2 border-ink bg-ink py-3">
        <p className="text-center font-mono text-xs text-paper/60">Loading live markets…</p>
      </div>
    );
  }

  const loop = [...pools, ...pools];

  return (
    <div className="relative overflow-hidden border-y-2 border-ink bg-ink py-3">
      <div className="flex w-max animate-marquee gap-8">
        {loop.map((p, i) => {
          const pct = Math.round(p.oddsTrue * 100);
          const up = pct >= 50;
          return (
            <div
              key={`${p.id}-${i}`}
              className="flex items-center gap-3 whitespace-nowrap font-mono text-sm text-paper"
            >
              <span
                className={`inline-block size-2 rounded-full ${
                  up ? "bg-verdict-green" : "bg-verdict-red"
                }`}
              />
              <span className="max-w-[420px] truncate">{p.claim}</span>
              <span
                className={`font-bold tabular-nums ${
                  up ? "text-verdict-green" : "text-verdict-red"
                }`}
              >
                {pct}% TRUE
              </span>
              <span className="text-paper/30">•</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

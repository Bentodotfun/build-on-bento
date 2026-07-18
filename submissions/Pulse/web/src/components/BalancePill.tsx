"use client";

import { useEffect, useState } from "react";
import { loadBentoSession, onBentoSessionChange, refreshCredits } from "@/lib/bentoAuth";

/**
 * Local running credits estimate — see BentoSession.credits' comment in
 * bentoAuth.ts for why this isn't a live on-chain balance read (Bento has
 * no confirmed endpoint for that). Click to re-sync against the faucet
 * (picks up out-of-band mints, e.g. a manual `npm run faucet` elsewhere).
 * Renders nothing when signed out.
 */
export function BalancePill() {
  const [credits, setCredits] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const refresh = () => setCredits(loadBentoSession()?.credits ?? null);
    refresh();
    return onBentoSessionChange(refresh);
  }, []);

  if (credits == null) return null;

  const onClick = async () => {
    setBusy(true);
    console.log("[BalancePill] refreshing...");
    try {
      const next = await refreshCredits();
      console.log("[BalancePill] refreshed:", next);
    } catch (e) {
      console.error("[BalancePill] refresh failed:", e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={busy}
      title="Estimated credits balance (local, not a live read) — tap to re-sync against the faucet"
      className="num flex items-center gap-1 rounded-xl border border-line-strong px-2.5 py-1.5 text-[12.5px] font-semibold text-ink transition hover:border-ink disabled:opacity-60"
    >
      <span className="text-faint">$</span>
      {busy ? "…" : credits.toFixed(0)}
    </button>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  loadBentoSession,
  onBentoSessionChange,
  refreshCredits,
  loadLocalBets,
  type BentoSession,
  type LocalBet,
} from "@/lib/bentoAuth";
import { PulseLogo } from "@/components/PulseLogo";

function ago(ts: number) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function truncate(a: string): string {
  return a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

export default function Portfolio() {
  const [session, setSession] = useState<BentoSession | null>(null);
  const [bets, setBets] = useState<LocalBet[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setSession(loadBentoSession());
      setBets(loadLocalBets());
    };
    refresh();
    return onBentoSessionChange(refresh);
  }, []);

  const resync = async () => {
    setBusy(true);
    try {
      await refreshCredits();
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-[540px] flex-col px-5 pb-16">
      <header className="flex items-center justify-between pt-7 pb-1">
        <Link href="/" className="flex items-center gap-2.5">
          <PulseLogo size={24} className="shadow-sm" />
          <span className="text-[15px] font-semibold tracking-tight">Pulse</span>
        </Link>
        <Link href="/" className="rounded-xl border border-line-strong px-3.5 py-1.5 text-[12.5px] font-semibold text-ink transition hover:border-ink">
          ← Deck
        </Link>
      </header>

      {!session && (
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <div className="text-[15px] font-semibold">Connect to see your bets</div>
          <p className="max-w-[300px] text-[13.5px] text-muted">Your credits balance and bet history show up here once you&apos;ve backed a call.</p>
          <Link href="/" className="mt-1 rounded-2xl bg-ink px-6 py-3 text-[14px] font-semibold text-white hover:opacity-90">Go to the deck →</Link>
        </div>
      )}

      {session && (
        <>
          <div className="mt-6 rounded-2xl border border-line bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.08em] text-muted">Credits balance</div>
                <div className="num text-[26px] font-extrabold tracking-tight">${session.credits.toFixed(0)}</div>
                <div className="num mt-0.5 truncate text-[11px] text-faint">
                  {truncate(session.managedAddress ?? session.address)} · Bento testnet
                </div>
              </div>
              <button
                onClick={resync}
                disabled={busy}
                className="shrink-0 rounded-xl border border-line-strong px-4 py-2 text-[13px] font-semibold text-ink transition hover:border-ink disabled:opacity-50"
              >
                {busy ? "…" : "Re-sync"}
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-faint">
              Estimated locally from the testnet faucet — Bento doesn&apos;t expose a live balance read yet.
            </p>
          </div>

          <div className="mt-9 mb-3">
            <h1 className="text-[20px] font-bold tracking-tight">Your bets</h1>
          </div>

          {bets.length === 0 ? (
            <div className="mt-2 text-center text-[14px] text-muted">No bets yet. <Link href="/" className="font-semibold text-ink underline">Back a call →</Link></div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {bets.map((b, i) => {
                const cls = "flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 shadow-sm";
                const inner = (
                  <>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-semibold tracking-tight">{b.label}</div>
                      <div className="num text-[11px] text-muted">
                        <span className={b.outcome === "YES" ? "font-semibold text-good" : "font-semibold text-bad"}>{b.outcome}</span>
                        {` · $${b.amount} @ ${Math.round(b.price * 100)}¢ · ${ago(b.ts)}`}
                      </div>
                    </div>
                    <div className="num shrink-0 text-right text-[13px] font-bold">${b.amount}</div>
                  </>
                );
                return b.txHash ? (
                  <a key={i} href={`https://testnet.bscscan.com/tx/${b.txHash}`} target="_blank" rel="noreferrer" className={`${cls} transition hover:border-line-strong`}>
                    {inner}
                  </a>
                ) : (
                  <div key={i} className={cls}>{inner}</div>
                );
              })}
              <p className="mt-2 text-center text-[11.5px] text-faint">Local record of your bets this session · tap one to view it on-chain.</p>
            </div>
          )}
        </>
      )}
    </main>
  );
}

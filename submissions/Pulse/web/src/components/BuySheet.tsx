"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import type { Buyable, FixtureDTO } from "@/lib/types";
import { Flag } from "./Flag";
import { ShareCard } from "./ShareCard";
import { track } from "@vercel/analytics";
import { connectBento, loadBentoSession, injectedWalletInstalled, spendLocalCredits, recordLocalBet, type BentoSession } from "@/lib/bentoAuth";

const PRESETS = [5, 20, 50, 100];

export function BuySheet({
  fx,
  buyable,
  onClose,
}: {
  fx: FixtureDTO;
  buyable: Buyable;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(20);
  const [step, setStep] = useState<"stake" | "confirm">("stake");
  const [placing, setPlacing] = useState(false);
  const [status, setStatus] = useState("");
  const [session, setSession] = useState<BentoSession | null>(null);
  const [result, setResult] = useState<{ ok: boolean; msg: string; txHash?: string | null } | null>(null);
  const [livePrice, setLivePrice] = useState<number | null>(null);

  useEffect(() => {
    setSession(loadBentoSession());
  }, []);

  // The deck list has no real price field (see bento.ts's impliedYes — a
  // rough guess, not the pricing engine). Fetch the real one from
  // estimateBuy before showing a price to bet against — only possible once
  // we have a session, since estimateBuy needs a Bearer token (confirmed
  // live — it's not actually anonymous despite being a pure quote).
  useEffect(() => {
    if (!session) return;
    const optionIndex = buyable.optionIndex ?? (buyable.outcome === "YES" ? 0 : 1);
    console.log("[BuySheet] fetching live price for", { duelId: fx.id, optionIndex });
    fetch("/api/bet/estimate", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${session.token}` },
      body: JSON.stringify({ duelId: fx.id, optionIndex, amountUsd: 1 }),
    })
      .then((r) => r.json())
      .then((d) => {
        console.log("[BuySheet] live price response:", d);
        if (d.ok) setLivePrice(buyable.outcome === "YES" ? d.yesPrice : d.noPrice);
      })
      .catch((e) => console.error("[BuySheet] live price fetch failed:", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, fx.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const price = livePrice ?? buyable.price ?? 0.5;
  const shares = price > 0 ? amount / price : 0;
  const payout = shares; // each winning share settles at $1
  const profit = payout - amount;
  const iso = buyable.side === "away" ? fx.away.iso : fx.home.iso;
  const teamName = buyable.side === "away" ? fx.away.name : fx.home.name;

  const shareRef = useRef<HTMLDivElement>(null);
  const onShare = async () => {
    const node = shareRef.current;
    if (!node) return;
    try {
      const dataUrl = await toPng(node, { width: 1080, height: 1080, pixelRatio: 1, cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "pulse-pick.png", { type: "image/png" });
      const text = `I'm on ${buyable.outcome} for "${buyable.label}" @ ${buyable.price != null ? Math.round(buyable.price * 100) : ""}¢ on Pulse — read the odds like the stars. pulse.fun`;
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "pulse-pick.png";
        a.click();
        await navigator.clipboard.writeText(text).catch(() => {});
      }
    } catch (e) {
      console.error("[BuySheet] share failed:", e);
    }
  };

  const placeOrder = async () => {
    setPlacing(true);
    setResult(null);
    track("bet_attempt", { outcome: buyable.outcome, amount, label: buyable.label });
    console.log("[BuySheet] placeOrder start", { duelId: fx.id, optionIndex: buyable.optionIndex, amount, collateralMode: buyable.collateralMode });

    try {
      let s = session ?? loadBentoSession();
      if (!s) {
        if (!injectedWalletInstalled()) {
          console.warn("[BuySheet] no injected wallet found");
          setResult({ ok: false, msg: "No wallet found. Install MetaMask (or another EVM wallet), then tap Back it again." });
          setPlacing(false);
          return;
        }
        console.log("[BuySheet] no session — connecting wallet...");
        s = await connectBento(setStatus);
        console.log("[BuySheet] connected:", { address: s.address, managedAddress: s.managedAddress });
        setSession(s);
      }

      const optionIndex = buyable.optionIndex ?? (buyable.outcome === "YES" ? 0 : 1);
      const collateralMode = buyable.collateralMode ?? "credits";

      setStatus("Placing your order…");
      console.log("[BuySheet] POST /api/bet/place", { duelId: fx.id, optionIndex, amountUsd: amount, collateralMode });
      const r = await fetch("/api/bet/place", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${s.token}` },
        body: JSON.stringify({
          duelId: fx.id,
          optionIndex,
          amountUsd: amount,
          collateralMode,
        }),
      });
      const data = await r.json();
      console.log("[BuySheet] /api/bet/place response:", data);

      if (data.ok) {
        track("bet_placed", { outcome: buyable.outcome, amount });
        if (collateralMode === "credits") spendLocalCredits(amount);
        const txHash = data.raw?.raw?.txHash ?? null;
        recordLocalBet({ label: buyable.label, outcome: buyable.outcome, amount, price, txHash, ts: Date.now() });
        setResult({ ok: true, msg: data.message ?? "Order placed.", txHash });
      } else {
        console.warn("[BuySheet] bet rejected:", data.message);
        setResult({ ok: false, msg: data.message ?? "Order failed." });
      }
    } catch (e: any) {
      console.error("[BuySheet] placeOrder threw:", e);
      const m =
        e?.message === "WALLET_MISSING"
          ? "No wallet found."
          : e?.code === 4001
            ? "Signature cancelled."
            : e?.message === "WALLET_SIGN_FAILED"
              ? "Signature failed."
              : "Could not complete sign-in.";
      setResult({ ok: false, msg: m });
    } finally {
      setPlacing(false);
      setStatus("");
      console.log("[BuySheet] placeOrder end");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4 animate-fadein"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] overflow-hidden rounded-t-[26px] border border-line bg-card shadow-[var(--shadow-lg)] sm:rounded-[26px] animate-rise"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            {(buyable.side === "home" || buyable.side === "away") && (
              <Flag name={teamName} iso={iso} size={34} />
            )}
            <div>
              <div className="text-[15px] font-semibold tracking-tight">{buyable.label}</div>
              <div className="text-[12px] text-muted">
                {fx.home.name} vs {fx.away.name}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full px-2 py-1 text-[18px] leading-none text-faint hover:text-ink">
            ✕
          </button>
        </div>

        {step === "stake" && (
          <div className="px-5 py-5">
            <div className="mb-4 flex items-end justify-between">
              <span className="text-[13px] text-muted">Your stake</span>
              <span className="num text-[12.5px] text-faint">
                YES @ {Math.round(price * 100)}¢
              </span>
            </div>

            <div className="flex items-center justify-center gap-1 py-2">
              <span className="text-[34px] font-bold tracking-tight text-faint">$</span>
              <input
                type="number"
                value={amount}
                min={1}
                onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                className="num w-[140px] bg-transparent text-center text-[46px] font-bold tracking-tight outline-none"
              />
            </div>

            <div className="mt-2 grid grid-cols-4 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setAmount(p)}
                  className={`num rounded-xl border px-2 py-2 text-[13.5px] font-semibold transition ${
                    amount === p ? "border-ink bg-ink text-white" : "border-line-strong text-muted hover:border-ink hover:text-ink"
                  }`}
                >
                  ${p}
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-2 rounded-2xl bg-wash px-4 py-3.5 text-[13px]">
              <Line k="Shares" v={shares.toFixed(1)} />
              <Line k="If it hits" v={`$${payout.toFixed(2)}`} strong />
              <Line k="Potential profit" v={`+$${profit.toFixed(2)}`} good />
              <Line k="Collateral" v={buyable.collateralMode === "usdc" ? "USDC" : "Credits"} />
            </div>

            <button
              onClick={() => setStep("confirm")}
              className="mt-5 w-full rounded-2xl bg-ink px-4 py-3.5 text-[15px] font-semibold tracking-tight text-white transition hover:opacity-90"
            >
              Continue →
            </button>
            <p className="mt-3 text-center text-[11.5px] leading-relaxed text-faint">
              Real on-chain market. Odds move; you can lose your stake.
            </p>
          </div>
        )}

        {step === "confirm" && (
          <div className="px-5 py-6">
            {!result && (
              <>
                <div className="mb-1 text-[16px] font-semibold tracking-tight">
                  {session ? "Confirm your bet" : "Connect wallet to trade"}
                </div>
                <p className="text-[13px] leading-relaxed text-muted">
                  {session
                    ? "Signed in with Bento. Backing your call goes straight to the market."
                    : "One signature signs you into Bento — then back any call in a tap."}
                </p>

                {session ? (
                  <div className="mt-4 space-y-2 rounded-2xl bg-wash px-4 py-3.5 text-[13px]">
                    <Line k="Signed in" v={truncate(session.managedAddress ?? session.address)} />
                    <Line k="Backing" v={`$${amount} · ${buyable.label}`} strong />
                    <Line k="At" v={`${Math.round(price * 100)}¢`} />
                  </div>
                ) : (
                  <ol className="mt-4 space-y-3">
                    <Stepline n={1} title="Connect your wallet" body="Sign once — no seed phrase, no gas." />
                    <Stepline n={2} title="Back your call" body={`$${amount} on ${buyable.label} @ ${Math.round(price * 100)}¢.`} />
                  </ol>
                )}

                <button
                  onClick={placeOrder}
                  disabled={placing}
                  className="mt-6 w-full rounded-2xl bg-ink px-4 py-3.5 text-[15px] font-semibold tracking-tight text-white transition hover:opacity-90 disabled:opacity-70"
                >
                  {placing ? status || "Working…" : session ? "Back it now" : "Connect & back it"}
                </button>
                <button onClick={() => setStep("stake")} className="mt-2 w-full py-2 text-[13px] text-muted hover:text-ink">
                  ← Back
                </button>
              </>
            )}

            {result && (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div
                  className="grid h-11 w-11 place-items-center rounded-full text-[18px] font-bold text-white"
                  style={{ background: result.ok ? "var(--good)" : "var(--ink)" }}
                >
                  {result.ok ? "✓" : "→"}
                </div>
                <div className="text-[15px] font-semibold">{result.ok ? "You're on the board" : "Almost there"}</div>
                <p className="max-w-[300px] text-[13px] leading-relaxed text-muted">{result.msg}</p>
                {result.ok && result.txHash && (
                  <a
                    href={`https://testnet.bscscan.com/tx/${result.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="num text-[12.5px] font-semibold text-brand underline decoration-brand/40 underline-offset-2 hover:text-ink"
                  >
                    View on-chain ↗
                  </a>
                )}
                <div className="mt-1 flex gap-2">
                  {result.ok && (
                    <button
                      onClick={onShare}
                      className="rounded-2xl border border-line-strong px-5 py-3 text-[14px] font-semibold text-ink transition hover:border-ink"
                    >
                      Share
                    </button>
                  )}
                  <button onClick={onClose} className="rounded-2xl bg-ink px-6 py-3 text-[14px] font-semibold text-white hover:opacity-90">
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ShareCard ref={shareRef} fx={fx} buyable={buyable} amount={amount} />
    </div>
  );
}

function truncate(a: string): string {
  return a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

function Line({ k, v, strong, good }: { k: string; v: string; strong?: boolean; good?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{k}</span>
      <span className={`num font-semibold ${good ? "text-good" : strong ? "text-ink" : "text-ink"}`}>{v}</span>
    </div>
  );
}

function Stepline({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="flex gap-3">
      <span className="num grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-soft text-[12px] font-bold text-brand">{n}</span>
      <div>
        <div className="text-[13.5px] font-semibold tracking-tight">{title}</div>
        <div className="text-[12.5px] text-muted">{body}</div>
      </div>
    </li>
  );
}

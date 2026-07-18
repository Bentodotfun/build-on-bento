"use client";

import { useEffect, useState } from "react";
import { track } from "@vercel/analytics";
import {
  connectBento,
  loadBentoSession,
  injectedWalletInstalled,
  clearBentoSession,
  type BentoSession,
} from "@/lib/bentoAuth";

export function ConnectButton() {
  const [session, setSession] = useState<BentoSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSession(loadBentoSession());
  }, []);

  const connect = async () => {
    setErr("");
    if (!injectedWalletInstalled()) {
      window.open("https://metamask.io/download", "_blank");
      return;
    }
    setBusy(true);
    track("connect_start");
    try {
      const s = await connectBento(setStatus);
      setSession(s);
      track("wallet_connected");
    } catch (e: any) {
      console.error("[connect] failed:", e);
      setErr(errLabel(e));
    } finally {
      setBusy(false);
      setStatus("");
    }
  };

  if (session) {
    const address = session.managedAddress ?? session.address;
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => {
            navigator.clipboard.writeText(address).then(() => {
              console.log("[connect] copied address:", address);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          title={copied ? "Copied!" : `Copy ${address}`}
          className="flex items-center gap-2 rounded-xl border border-line bg-white/70 px-3 py-1.5 text-[12.5px] font-semibold text-ink backdrop-blur-md transition hover:border-line-strong"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="num">{copied ? "Copied" : trunc(address)}</span>
        </button>
        <button
          onClick={() => {
            console.log("[connect] disconnecting");
            clearBentoSession();
            setSession(null);
          }}
          title="Disconnect"
          aria-label="Disconnect wallet"
          className="flex h-[30px] w-[30px] items-center justify-center rounded-xl border border-line-strong text-muted transition hover:border-ink hover:text-ink"
        >
          <PowerIcon />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={busy}
      title={err || undefined}
      className="rounded-xl bg-ink px-4 py-1.5 text-[12.5px] font-semibold text-white transition hover:opacity-90 disabled:opacity-70"
    >
      {busy ? status || "…" : err ? "Try again" : "Connect"}
    </button>
  );
}

function trunc(a: string) {
  return a && a.length > 10 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a;
}

function PowerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
      <path d="M12 3v8" />
      <path d="M6.3 6.3a8 8 0 1 0 11.4 0" />
    </svg>
  );
}

function errLabel(e: any): string {
  if (e?.code === 4001) return "cancelled";
  switch (e?.message) {
    case "WALLET_MISSING":
      return "no wallet";
    case "WALLET_REQUEST_FAILED":
      return "wallet blocked the request — check for a stuck wallet popup, or a second wallet extension conflicting with it";
    case "WALLET_NO_ACCOUNT":
      return "no account in wallet";
    case "WALLET_SIGN_FAILED":
      return "signature failed";
    default:
      return e?.message || "failed";
  }
}

"use client";

import { createWalletClient, custom } from "viem";

/**
 * Bento wallet auth: connect an injected EVM wallet (MetaMask, Rabby, etc.),
 * sign the Bento login message, exchange it for a session JWT via
 * /api/auth/bento (server-side — keeps BENTO_BUILDER_API_KEY off the client).
 */

const SESSION_KEY = "pulse_bento_auth";

export type BentoSession = {
  address: string; // the EOA you signed with
  managedAddress: string | null; // Bento's provisioned trading account (funds/positions live here)
  username: string | null;
  token: string; // Bearer JWT for sdk.user calls
  // Bento has no confirmed live balance-read endpoint (checked
  // getAccountDetails and getPositions — neither exposes one, even right
  // after a real bet). This is a LOCAL RUNNING ESTIMATE, seeded from the
  // testnet faucet's known mint amount on login and decremented as bets are
  // placed — not a real on-chain read. Good enough for a demo, not for
  // anything that needs to be authoritative.
  credits: number;
};

type InjectedProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
  providers?: InjectedProvider[];
};

/**
 * With multiple wallet extensions installed (MetaMask + Phantom's EVM mode,
 * Rabby, etc.) they race to claim `window.ethereum`, which throws
 * "Cannot redefine property: ethereum" in the console and can leave it
 * pointing at whichever extension injected last — not necessarily the one
 * the user wants. Well-behaved multi-wallet setups expose every provider on
 * `window.ethereum.providers`; prefer MetaMask there if present, otherwise
 * fall back to whatever `window.ethereum` itself resolved to.
 */
function getInjected(): InjectedProvider | null {
  if (typeof window === "undefined") return null;
  const eth = (window as unknown as { ethereum?: InjectedProvider }).ethereum;
  if (!eth) return null;
  if (Array.isArray(eth.providers) && eth.providers.length) {
    return eth.providers.find((p) => p.isMetaMask) ?? eth.providers[0];
  }
  return eth;
}

export function injectedWalletInstalled(): boolean {
  return !!getInjected();
}

export function loadBentoSession(): BentoSession | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null");
  } catch {
    return null;
  }
}

// Dispatched whenever the session (incl. local credits estimate) changes,
// so header UI (BalancePill, ConnectButton) can react without prop drilling.
const SESSION_EVENT = "pulse:bento-session-changed";

function saveBentoSession(s: BentoSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function onBentoSessionChange(cb: () => void): () => void {
  window.addEventListener(SESSION_EVENT, cb);
  return () => window.removeEventListener(SESSION_EVENT, cb);
}

export function clearBentoSession() {
  localStorage.removeItem(SESSION_KEY);
  clearLocalBets();
  window.dispatchEvent(new Event(SESSION_EVENT));
}

/** Call after a bet is placed to keep the local credits estimate in sync. */
export function spendLocalCredits(amount: number) {
  const s = loadBentoSession();
  if (!s) return;
  s.credits = Math.max(0, s.credits - amount);
  saveBentoSession(s);
}

export type LocalBet = {
  label: string;
  outcome: "YES" | "NO";
  amount: number;
  price: number;
  txHash: string | null;
  ts: number;
};

const BETS_KEY = "pulse_local_bets";

/**
 * Bento has no confirmed positions/history-read endpoint, so "your bets" is
 * a local log recorded at placement time — not a live on-chain read. Cleared
 * on disconnect since it's keyed to whatever wallet is currently signed in.
 */
export function recordLocalBet(bet: LocalBet) {
  if (typeof window === "undefined") return;
  const all = loadLocalBets();
  all.unshift(bet);
  localStorage.setItem(BETS_KEY, JSON.stringify(all.slice(0, 50)));
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function loadLocalBets(): LocalBet[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(BETS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function clearLocalBets() {
  localStorage.removeItem(BETS_KEY);
}

async function callFaucet(managedAddress: string): Promise<number | null> {
  const res = await fetch("/api/auth/fund", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ managedAddress }),
  });
  const data = await res.json();
  console.log("[bentoAuth] faucet response:", data);
  return data.ok ? (data.credits ?? 1000) : null;
}

/**
 * Manually re-syncs the local credits estimate against the faucet — the
 * estimate only updates automatically at login time, so anything that
 * changes balance out-of-band (a manual mint, another device) needs this
 * to show up. The faucet mints a fixed one-time amount per asset, so this
 * resyncs to that known value rather than adding to it.
 */
export async function refreshCredits(): Promise<number | null> {
  const s = loadBentoSession();
  if (!s?.managedAddress) return null;
  console.log("[bentoAuth] refreshing credits for", s.managedAddress);
  const credits = await callFaucet(s.managedAddress);
  if (credits != null) {
    s.credits = credits;
    saveBentoSession(s);
  }
  return credits;
}

/** Full connect → sign → login chain. Returns a ready-to-use session. */
export async function connectBento(onStep?: (s: string) => void): Promise<BentoSession> {
  const injected = getInjected();
  if (!injected) throw new Error("WALLET_MISSING");

  const client = createWalletClient({ transport: custom(injected) });

  onStep?.("Connecting wallet…");
  let address: `0x${string}` | undefined;
  try {
    [address] = await client.requestAddresses();
  } catch (e) {
    console.error("[bentoAuth] requestAddresses failed:", e);
    throw new Error("WALLET_REQUEST_FAILED");
  }
  if (!address) throw new Error("WALLET_NO_ACCOUNT");

  onStep?.("Sign to continue…");
  const timestamp = String(Date.now());
  const message = `Bento.fun Login\nTimestamp: ${timestamp}\nWallet: ${address}`;
  let signature: `0x${string}`;
  try {
    signature = await client.signMessage({ account: address, message });
  } catch (e) {
    console.error("[bentoAuth] signMessage failed:", e);
    throw new Error("WALLET_SIGN_FAILED");
  }

  onStep?.("Signing you in…");
  const res = await fetch("/api/auth/bento", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address, signature, timestamp }),
  });
  const data = await res.json();
  if (!data.ok) {
    console.error("[bentoAuth] /api/auth/bento rejected:", data.message);
    throw new Error(data.message ?? "LOGIN_FAILED");
  }

  const session: BentoSession = {
    address,
    managedAddress: data.managedAddress,
    username: data.username,
    token: data.token,
    credits: 0,
  };

  onStep?.("Funding your account…");
  if (session.managedAddress) {
    try {
      const credits = await callFaucet(session.managedAddress);
      if (credits != null) session.credits = credits;
    } catch (e) {
      console.error("[bentoAuth] faucet call failed (non-fatal):", e);
    }
  }

  saveBentoSession(session);
  return session;
}

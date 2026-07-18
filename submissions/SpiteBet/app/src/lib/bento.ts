import { createBentoSdk, walletAuthProvider, type BentoSdk } from '@bento.fun/sdk';
import type { Market } from '../data/markets';
import { loadAccounts } from '../data/accounts';

/**
 * In the browser we go through the Vite proxy (see vite.config.ts) because
 * Bento's API sends no CORS headers. Server-side scripts hit it directly.
 */
const BASE_URL = import.meta.env.DEV ? '' : 'https://internal-server.bento.fun';
const API_KEY = import.meta.env.VITE_BENTO_BUILDER_API_KEY as string | undefined;

const TOKEN_STORAGE_KEY = 'spitebet.bento.jwt';
const ACTIVE_ACCOUNT_KEY = 'spitebet.bento.activeAccount';

/**
 * Bento has no concept of our goal categories — its `category` is a fixed sports
 * enum. Everything SpiteBet-specific rides along in `tags` and gets parsed back
 * out on read. `Football` is the catch-all the rest of the testnet uses too.
 */
const BENTO_CATEGORY = 'Football';
export const SPITEBET_TAG = 'spitebet';

/** Public markets must start >=31 min out or the on-chain creation reverts. */
export const MIN_START_LEAD_MS = 31 * 60_000;

/** Credits use 18 decimals. Bento wants base units as a string. */
export const CREDIT_DECIMALS = 18;
export function toWei(amount: number): string {
  return (BigInt(Math.round(amount * 1000)) * 10n ** BigInt(CREDIT_DECIMALS - 3)).toString();
}

/** Name of the demo account currently swiping, if the switcher has been used. */
export function getActiveAccountName(): string | null {
  return localStorage.getItem(ACTIVE_ACCOUNT_KEY);
}

export function setActiveAccountName(name: string) {
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, name);
}

/**
 * Resolution order: the account picked in the switcher, then a manually stored
 * token, then the single-token env fallback.
 */
export function getStoredToken(): string | null {
  const active = getActiveAccountName();
  if (active) {
    const match = loadAccounts().find((a) => a.name === active);
    if (match) return match.jwt;
  }

  const accounts = loadAccounts();
  if (accounts.length > 0) return accounts[0].jwt;

  const fromEnv = import.meta.env.VITE_BENTO_JWT as string | undefined;
  return localStorage.getItem(TOKEN_STORAGE_KEY) || fromEnv || null;
}

export function storeToken(token: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

/** Managed account address, decoded from the JWT (no extra round-trip). */
export function getAddressFromToken(token: string): string | null {
  try {
    const claims = JSON.parse(atob(token.split('.')[1]));
    return claims.address ?? null;
  } catch {
    return null;
  }
}

export function isConfigured(): boolean {
  return Boolean(API_KEY);
}

export function makeSdk(token?: string | null): BentoSdk {
  if (!API_KEY) throw new Error('VITE_BENTO_BUILDER_API_KEY is not set');
  return createBentoSdk({
    baseUrl: BASE_URL,
    apiKey: API_KEY,
    // The SDK stores this and calls it unbound, which throws "Illegal
    // invocation" in the browser unless we bind it to window here.
    fetch: (...args: Parameters<typeof fetch>) => window.fetch(...args),
    auth: walletAuthProvider(
      (): Record<string, string> => (token ? { Authorization: `Bearer ${token}` } : {}),
    ),
  });
}

// ---------------------------------------------------------------------------
// Tag encoding — our metadata smuggled through Bento's schema
// ---------------------------------------------------------------------------

type SpiteMeta = {
  handle: string;
  category: string;
  verifiedVia: string;
  oracleHandle?: string;
  /** e.g. 5 commits — what the oracle checks against. */
  target?: number;
};

export function encodeTags(meta: SpiteMeta): string[] {
  const tags = [
    SPITEBET_TAG,
    `by:${meta.handle.replace(/^@/, '')}`,
    `cat:${meta.category}`,
    `oracle:${meta.verifiedVia}`,
  ];
  if (meta.oracleHandle) tags.push(`acct:${meta.oracleHandle}`);
  if (meta.target) tags.push(`target:${meta.target}`);
  return tags;
}

function decodeTags(tags: string[] | null | undefined) {
  const find = (prefix: string) =>
    tags?.find((t) => t.startsWith(prefix))?.slice(prefix.length) ?? '';
  return {
    handle: find('by:'),
    category: find('cat:'),
    verifiedVia: find('oracle:'),
    oracleHandle: find('acct:'),
    target: Number(find('target:')) || 0,
  };
}

// ---------------------------------------------------------------------------
// Normalisation — Bento duel row -> our Market shape
// ---------------------------------------------------------------------------

type DuelRow = {
  duelId: string;
  betString?: string;
  description?: string | null;
  tags?: string[] | null;
  endTime?: number | null;
  startTime?: number | null;
  uniqueParticipants?: number | null;
  liquidityBreakdown?: {
    option0?: { usdcAmount?: number };
    option1?: { usdcAmount?: number };
  } | null;
  totalBetAmount?: number | null;
};

function formatCountdown(endTimeSec?: number | null): string {
  if (!endTimeSec) return '--:--:--';
  const remaining = endTimeSec * 1000 - Date.now();
  if (remaining <= 0) return '00:00:00';
  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  const s = Math.floor((remaining % 60_000) / 1000);
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export function duelToMarket(row: DuelRow): Market {
  const meta = decodeTags(row.tags);
  const handle = meta.handle || 'anon';

  // option0 = YES (believer), option1 = NO (hater)
  const believe = Math.round(row.liquidityBreakdown?.option0?.usdcAmount ?? 0);
  const hate = Math.round(row.liquidityBreakdown?.option1?.usdcAmount ?? 0);

  return {
    id: row.duelId,
    handle: `@${handle}`,
    avatarSeed: handle,
    goal: row.betString ?? 'Untitled trap',
    deadline: formatCountdown(row.endTime),
    streak: 0,
    friendsBetting: row.uniqueParticipants ?? 0,
    poolHate: hate,
    poolBelieve: believe,
    category: meta.category || '🎯 Anything Else',
    verifiedVia: meta.verifiedVia || 'Group vote',
    oracleHandle: meta.oracleHandle || undefined,
    target: meta.target || undefined,
    endTime: row.endTime ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/**
 * The shared testnet catalog is large and growing (156+ markets and climbing as
 * other teams build), and there's no server-side tag filter — so a single small
 * page silently drops our traps off the end. Page through until we've covered
 * the catalog or hit the cap.
 */
export async function fetchSpiteMarkets(maxPages = 4, pageSize = 100): Promise<Market[]> {
  const sdk = makeSdk(getStoredToken());
  const found: DuelRow[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const res = (await sdk.public.listDuels({ page, limit: pageSize })) as {
      data?: DuelRow[];
      pagination?: { hasMore?: boolean };
    };
    const rows = res?.data ?? [];
    found.push(...rows.filter((r) => r.tags?.includes(SPITEBET_TAG)));

    if (rows.length < pageSize || !res?.pagination?.hasMore) break;
  }

  return found.map(duelToMarket);
}

export type Voter = {
  username: string;
  address: string;
  avatarUrl?: string;
  side: 'hate' | 'believe';
  amount: number;
};

export type VoteBreakdown = {
  haters: Voter[];
  believers: Voter[];
};

type RawParticipant = {
  userAddress: string;
  auth0Username?: string;
  auth0ImageUrl?: string;
  positions?: { optionIndex: number; optionText: string; amount: string }[];
};

/**
 * Who actually voted, per side — a headcount of real Bento accounts rather than
 * pool size. Creating a market seeds BOTH options, so a participant holding
 * both sides is classified by whichever side they hold more of.
 */
export async function fetchVotes(duelId: string): Promise<VoteBreakdown> {
  const token = getStoredToken();
  if (!token || !API_KEY) return { haters: [], believers: [] };

  const res = await fetch(`${BASE_URL}/bento/user/duels/participants/${duelId}`, {
    headers: { 'x-builder-api-key': API_KEY, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { haters: [], believers: [] };

  const json = (await res.json()) as { participants?: RawParticipant[] };
  const haters: Voter[] = [];
  const believers: Voter[] = [];

  for (const p of json.participants ?? []) {
    let yes = 0;
    let no = 0;
    for (const pos of p.positions ?? []) {
      const amt = Number(pos.amount ?? 0);
      if (pos.optionIndex === 0) yes += amt;
      else no += amt;
    }
    if (yes === 0 && no === 0) continue;

    const side: 'hate' | 'believe' = no > yes ? 'hate' : 'believe';
    const voter: Voter = {
      username: p.auth0Username?.split('@')[0] ?? p.userAddress.slice(0, 8),
      address: p.userAddress,
      avatarUrl: p.auth0ImageUrl,
      side,
      amount: Math.max(yes, no),
    };
    (side === 'hate' ? haters : believers).push(voter);
  }

  return { haters, believers };
}

export type CreateTrapInput = {
  goal: string;
  handle: string;
  hoursFromNow: number;
  category: string;
  verifiedVia: string;
  oracleHandle?: string;
  target?: number;
};

export async function createTrap(input: CreateTrapInput): Promise<string> {
  const token = getStoredToken();
  if (!token) throw new Error('Not signed in to Bento');

  const sdk = makeSdk(token);
  // Deadline can't be sooner than the minimum start lead time.
  const start = Date.now() + MIN_START_LEAD_MS;
  const end = start + Math.max(0.5, input.hoursFromNow) * 3_600_000;

  const result = await sdk.user.createDuel(
    {
      question: input.goal,
      type: 'prediction',
      category: BENTO_CATEGORY,
      // The docs list `description` as optional, but omitting it makes the
      // on-chain creation revert with "Pre-flight simulation failed" (HTTP 500).
      // Verified by isolation: identical payloads pass with it, fail without.
      description: `SpiteBet trap by @${input.handle}. Verified via ${input.verifiedVia}.`,
      startTime: new Date(start).toISOString(),
      endTime: new Date(end).toISOString(),
      privacyAccess: 'public',
      collateralMode: 'credits',
      tags: encodeTags(input),
    },
    { requestId: `spitebet-create-${Date.now()}` },
  );

  return (result.raw as { duelId: string }).duelId;
}

/** optionIndex 0 = YES (believe), 1 = NO (hate). */
export async function placeSpiteBet(duelId: string, vote: 'hate' | 'believe', amount: number) {
  const token = getStoredToken();
  if (!token) throw new Error('Not signed in to Bento');

  const sdk = makeSdk(token);
  const optionIndex = vote === 'believe' ? 0 : 1;
  const betAmountUsdc = toWei(amount);

  const estimateRes = await sdk.user.estimateBuy({
    duelId,
    optionIndex,
    betAmountUsdc,
    slippageBps: 100,
  });
  // estimateBuy nests the quote one level down.
  const estimate = (estimateRes as { estimate?: unknown }).estimate ?? estimateRes;

  return sdk.user.placeBetFromEstimate(
    {
      estimate,
      duelId,
      duelType: 'PREDICTION',
      bet: vote === 'believe' ? 'YES' : 'NO',
      optionIndex,
      betAmount: betAmountUsdc,
      betAmountUsdc,
      slippageBps: 100,
      tokenDecimals: CREDIT_DECIMALS,
    } as never,
    { idempotencyKey: `spitebet-${duelId}-${Date.now()}` },
  );
}

/** What the testnet faucet grants each account, once. */
export const FAUCET_CREDITS = 1000;

export type Account = {
  totalBets: number;
  totalDuelCreated: number;
  /** Credits currently locked in open positions + created-market liquidity. */
  positionValue: number;
  /**
   * Spendable credits. Bento exposes no balance endpoint (checked every
   * portfolio/withdraw/agent route), so we derive it from the faucet grant
   * minus what Bento says is locked up. Matches the testnet UI exactly today.
   */
  balance: number;
};

export type Position = {
  duelId: string;
  question: string;
  optionLabel: string;
  shares: number;
  costBasis: number;
  currentValue: number;
  unrealizedPnL: number;
  endTime?: number;
};

/** Portfolio routes are POST + `userAddress`, and default to the usdc stack. */
async function portfolioPost(path: string, address: string) {
  const token = getStoredToken();
  if (!token || !API_KEY) throw new Error('Not signed in to Bento');

  const res = await fetch(`${BASE_URL}/bento/user/${path}`, {
    method: 'POST',
    headers: {
      'x-builder-api-key': API_KEY,
      Authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ userAddress: address, collateralStack: 'credits' }),
  });
  if (!res.ok) throw new Error(`Bento ${path} failed (${res.status})`);
  return res.json();
}

export async function fetchAccount(address: string): Promise<Account> {
  const json = await portfolioPost('portfolio/accountDetails', address);
  const d = json?.portfolioData ?? {};
  const positionValue = Number(d.positionValue ?? 0);
  return {
    totalBets: Number(d.totalBets ?? 0),
    totalDuelCreated: Number(d.totalDuelCreated ?? 0),
    positionValue,
    balance: Math.max(0, FAUCET_CREDITS - positionValue),
  };
}

export async function fetchPositions(address: string): Promise<Position[]> {
  const token = getStoredToken();
  if (!token || !API_KEY) return [];

  const res = await fetch(
    `${BASE_URL}/bento/user/portfolio/positions/${address}?collateralStack=credits`,
    {
      headers: { 'x-builder-api-key': API_KEY, Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) return [];
  const json = await res.json();

  type RawPos = {
    duelId: string;
    question: string;
    endTime?: number;
    options?: {
      optionIndex: number;
      optionLabel: string;
      shares: number;
      costBasis: number;
      currentValue: number;
      unrealizedPnL: number;
    }[];
  };

  // One row per option held, flattened from Bento's per-duel grouping.
  return ((json?.positions ?? []) as RawPos[]).flatMap((p) =>
    (p.options ?? [])
      .filter((o) => o.costBasis > 0)
      .map((o) => ({
        duelId: p.duelId,
        question: p.question,
        endTime: p.endTime,
        optionLabel: o.optionLabel,
        shares: o.shares,
        costBasis: o.costBasis,
        currentValue: o.currentValue,
        unrealizedPnL: o.unrealizedPnL,
      })),
  );
}

export async function claimFaucet(): Promise<void> {
  const token = getStoredToken();
  if (!token || !API_KEY) return;
  const address = getAddressFromToken(token);
  if (!address) return;

  await fetch(`${BASE_URL}/bento/auto-mint/mint`, {
    method: 'POST',
    headers: {
      'x-builder-api-key': API_KEY,
      Authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ userAddress: address }),
  });
}

import "server-only";
import { createBentoSdk, walletAuthProvider } from "@bento.fun/sdk";
import { privateKeyToAccount } from "viem/accounts";
import { promises as fs } from "fs";
import path from "path";
import type { DeckCard, CardSubject } from "./types";
import { isoForTeam } from "./flags";
import { mediaFor } from "./media";

// Where pulse/worker writes the markets it creates (sibling project,
// ../pulse/worker relative to this app's directory — see PULSE_STATE_FILE
// to override). Reading this directly avoids needing a network hop between
// the worker and the web app for a hackathon-speed build.
const PULSE_STATE_FILE =
  process.env.PULSE_STATE_FILE ?? path.join(process.cwd(), "..", "pulse", "worker", ".pulse-duels.json");

type TrackedDuel = { duelId: string; question: string; startTime: number; endTime: number; resolved: boolean };

async function loadTrackedDuelIds(): Promise<string[]> {
  try {
    const raw = await fs.readFile(PULSE_STATE_FILE, "utf8");
    const rows: TrackedDuel[] = JSON.parse(raw);
    return rows.map((r) => r.duelId);
  } catch {
    return []; // worker hasn't created anything yet, or state file not reachable — fine, deck falls back to the catalog
  }
}

// Real teams/players with a video entry in src/lib/media.ts's MEDIA manifest.
// Bento's test-market catalog has no real subject to key off, so we rotate
// through these to give every card a real background instead of a flat
// gradient — cosmetic only, doesn't affect the actual market data.
const BACKGROUND_POOL: { name: string; kind: "team" | "player" }[] = [
  { name: "Argentina", kind: "team" },
  { name: "Brazil", kind: "team" },
  { name: "France", kind: "team" },
  { name: "England", kind: "team" },
  { name: "Portugal", kind: "team" },
  { name: "Spain", kind: "team" },
  { name: "Norway", kind: "team" },
  { name: "Switzerland", kind: "team" },
  { name: "Messi", kind: "player" },
  { name: "Haaland", kind: "player" },
  { name: "Mbappe", kind: "player" },
  { name: "Vinicius", kind: "player" },
  { name: "Bellingham", kind: "player" },
  { name: "Odegaard", kind: "player" },
  { name: "Kane", kind: "player" },
  { name: "Saka", kind: "player" },
  { name: "Yamal", kind: "player" },
];

const BENTO_URL = process.env.BENTO_URL ?? "https://internal-server.bento.fun";
const BENTO_BUILDER_API_KEY = process.env.BENTO_BUILDER_API_KEY ?? "";

function bentoSdk() {
  return createBentoSdk({
    baseUrl: BENTO_URL,
    apiKey: BENTO_BUILDER_API_KEY,
    auth: walletAuthProvider(() => ({})), // public reads only — no user JWT needed
  });
}

// Service-account session for fetching real prices (estimateBuy needs a
// Bearer token despite being a pure quote — confirmed live, not documented).
// Deck viewers aren't logged in, so this uses Pulse's own bot identity.
// Cached in-process; a dev-server restart or ~7-day JWT expiry re-logs-in.
const PULSE_BOT_PRIVATE_KEY = process.env.PULSE_BOT_PRIVATE_KEY as `0x${string}` | undefined;
let cachedServiceToken: string | null = null;

async function getServiceToken(): Promise<string | null> {
  if (cachedServiceToken) return cachedServiceToken;
  if (!PULSE_BOT_PRIVATE_KEY) return null;
  try {
    const account = privateKeyToAccount(PULSE_BOT_PRIVATE_KEY);
    const ts = String(Date.now());
    const signature = await account.signMessage({
      message: `Bento.fun Login\nTimestamp: ${ts}\nWallet: ${account.address}`,
    });
    const sdk = bentoSdk();
    let res: any = await sdk.public.auth.eoaLogin({ address: account.address, signature, timestamp: ts });
    if (!res.exists) {
      res = await sdk.public.auth.eoaRegister({
        address: account.address,
        signature,
        timestamp: ts,
        username: `pulse-price-${account.address.slice(2, 8).toLowerCase()}`,
      });
    }
    cachedServiceToken = res.token ?? null;
    return cachedServiceToken;
  } catch (e) {
    console.error("[bento] service account login failed:", e);
    return null;
  }
}

/**
 * Real prices via estimateBuy — the deck list/detail endpoints carry no
 * price field at all, only a rough liquidity-based guess (impliedYes,
 * below), which degenerates to 0%/100% on an unbalanced market. Fetched in
 * parallel per deck load; failures fall back to the liquidity guess rather
 * than breaking the card.
 */
async function fetchRealYesPrices(duelIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const token = await getServiceToken();
  if (!token || !duelIds.length) return out;

  const sdk = createBentoSdk({
    baseUrl: BENTO_URL,
    apiKey: BENTO_BUILDER_API_KEY,
    auth: walletAuthProvider(() => ({ Authorization: `Bearer ${token}` })),
  });

  await Promise.all(
    duelIds.map(async (duelId) => {
      try {
        const est: any = await sdk.user.bets.estimateBuy({
          duelId,
          optionIndex: 0,
          betAmountUsdc: "1000000000000000000", // nominal $1 — current_yes_price is amount-independent
          slippageBps: 100,
        });
        if (est.success && typeof est.estimate?.current_yes_price === "number") {
          out.set(duelId, Math.round(est.estimate.current_yes_price * 1000) / 10);
        }
      } catch (e) {
        console.error(`[bento] real price fetch failed for ${duelId}:`, e);
      }
    }),
  );
  return out;
}

// Bento's shared testnet catalog is full of other builders' throwaway test
// markets (including our own, from earlier SDK exploration) — filter those
// out rather than show them in a real deck.
const JUNK_PATTERNS = [
  /e2e/i,
  /^\[pulse-/i,
  /verify-harness|verify\b/i,
  /\btest(ing)?\b/i,
  /\bsdk\b/i,
  /\bdummy\b|\bplaceholder\b|\bsandbox\b|\bsample\b|\bdemo\b|\bmock\b/i,
  /\bmigration\b/i,
  /\bon-?chain (cycle|live)\b/i,
  /\bbot migration\b/i,
  /\bteam a\b|\bteam b\b/i,
  /\balpha\b.*\bvs\.?\b.*\bbeta\b/i,
  /\bbound \d+m\b/i,
  /\biso times?\b/i,
  /\bfe shape\b/i,
  /\bchain check\b/i,
  /^option [ab]$/i,
  /\d{10,}/, // a Unix-timestamp-sized number embedded in the question — never legit
];

function isJunkMarket(question: string): boolean {
  const q = question.trim();
  if (!q) return true;
  // Real questions are always multi-word ("X vs Y: who wins?", "Will X score?").
  // A single unbroken token — "ABCDEFGHIJ", "fvfdsvdfvdfv" — is always test/gibberish
  // data, however long or short it is.
  if (!/\s/.test(q)) return true;
  return JUNK_PATTERNS.some((re) => re.test(q));
}

/**
 * If a market's own option name is a recognizable real team or player, use
 * it as the card's subject (real flag, real video) instead of the rotating
 * placeholder pool. `isoForTeam` covers teams; anything else that still
 * resolves in the media manifest (Messi, Haaland, …) is treated as a player.
 */
function realSubjectFor(name: string | undefined): CardSubject | null {
  if (!name) return null;
  const iso = isoForTeam(name);
  if (iso) return { kind: "team", name, iso, team: name };
  if (mediaFor([name])) return { kind: "player", name, iso: null, team: null };
  return null;
}

/**
 * Pulse's own generated markets always use options ["Yes", "No"] (see
 * pulse/worker/src/create-one.ts), so realSubjectFor(homeName) never
 * matches — the actual teams are embedded in the question text instead,
 * e.g. "Will there be a goal? (Argentina vs Brazil)". Extract them from
 * there so the card's background is the real match, not a random pick
 * from BACKGROUND_POOL (the bug just fixed — the video used to have
 * nothing to do with the actual bet).
 */
// Alternate which side of the matchup leads the background — otherwise
// every card for the same match (e.g. 3 Argentina-vs-Brazil props) shows
// the identical video, which is exactly the "all look the same" complaint.
function extractSubjectFromQuestion(question: string, preferSecond: boolean): CardSubject | null {
  const m = question.match(/\(([^)]+)\)\s*$/); // trailing "(Team A vs Team B)"
  if (!m) return null;
  const [a, b] = m[1].split(/\s+vs\.?\s+/i);
  const subjA = realSubjectFor(a?.trim());
  const subjB = realSubjectFor(b?.trim());
  return preferSecond ? subjB ?? subjA : subjA ?? subjB;
}

/** Implied YES% from liquidityBreakdown, if present. */
function impliedYes(liquidityBreakdown: any): number | null {
  const a = liquidityBreakdown?.option0?.usdcAmount;
  const b = liquidityBreakdown?.option1?.usdcAmount;
  if (typeof a !== "number" || typeof b !== "number" || a + b <= 0) return null;
  // more money on option1 (the "against" side) implies a higher YES price, and
  // vice versa — this is a rough proxy, not the real pricing-engine output.
  return Math.round((b / (a + b)) * 1000) / 10;
}

/**
 * `allowPlaceholderFallback`: only true for Pulse's own generated markets.
 * Their options are always literally ["Yes", "No"] (see create-one.ts), so
 * the real subject has to come from the question text ("... (Argentina vs
 * Brazil)"), which always resolves for markets we generated ourselves — the
 * placeholder pool is a last-resort safety net, not the normal path. For
 * the general shared catalog, a market with no real, identifiable subject
 * isn't shown at all (see listBentoDeckCards) rather than given a fake
 * background — that's the fix for videos being unrelated to the bet.
 */
function duelToCard(d: any, subjectIndex: number, allowPlaceholderFallback: boolean): DeckCard | null {
  const startMs = d.startTime ? d.startTime * 1000 : 0;
  const options: string[] = d.options ?? [];
  const homeName = options[0] ?? "Yes";
  const awayName = options[1] ?? "No";
  const question = d.betString ?? d.description ?? "Untitled market";

  const realSubject =
    realSubjectFor(homeName) ??
    realSubjectFor(awayName) ??
    extractSubjectFromQuestion(question, subjectIndex % 2 === 1);
  if (!realSubject && !allowPlaceholderFallback) return null;

  const subject: CardSubject =
    realSubject ??
    (() => {
      const bg = BACKGROUND_POOL[subjectIndex % BACKGROUND_POOL.length];
      return {
        kind: bg.kind,
        name: bg.name,
        iso: bg.kind === "team" ? isoForTeam(bg.name) : null,
        team: bg.kind === "team" ? bg.name : null,
      };
    })();

  return {
    key: d.duelId,
    fixtureId: d.duelId,
    competition: d.category ?? "Bento",
    kickoff: startMs,
    home: { name: homeName, iso: isoForTeam(homeName) },
    away: { name: awayName, iso: isoForTeam(awayName) },
    type: "prop",
    question,
    yes: impliedYes(d.liquidityBreakdown),
    // subject drives the card's background video/image (see Reel.tsx's
    // useSubjectMedia + media.ts's MEDIA manifest) — kept separate from
    // home/away, which are the actual bet option labels.
    subject,
    volume: d.totalBetAmountUsdc ?? d.totalBetAmountUSDC ?? 0,
    // Bento's own og.png is a small logo, not a full-bleed hero image —
    // leave edit null so the card falls through to the video manifest.
    edit: null,
    collateralMode: d.collateralMode === "usdc" ? "usdc" : "credits",
  } satisfies DeckCard;
}

/**
 * Pulse's own generated markets (from pulse/worker's generator.ts), read
 * directly by duelId — these are what the whole product is actually about,
 * so they go first in the deck, ahead of the general shared catalog.
 */
async function fetchPulseGeneratedCards(): Promise<DeckCard[]> {
  const duelIds = await loadTrackedDuelIds();
  if (!duelIds.length) return [];
  const sdk = bentoSdk();
  const now = Date.now();
  const results = await Promise.all(
    duelIds.map(async (duelId, i) => {
      try {
        const d: any = await sdk.public.getDuelById({ duelId });
        // Closed markets can't accept bets — showing them just leads to a
        // confusing "why can't I bet on this" in the UI. Filter them out
        // here rather than relying on every caller to check endTime.
        if (d.endTime && d.endTime * 1000 <= now) return null;
        return duelToCard(d, i, true);
      } catch {
        return null; // not yet indexed, or since removed — skip rather than break the deck
      }
    }),
  );
  return results.filter((c): c is DeckCard => c !== null);
}

/**
 * Maps Bento's duel catalog into DeckCards. Pulse's own generated markets
 * (see fetchPulseGeneratedCards) are shown first; the general shared
 * testnet catalog fills any remaining slots, filtered for junk/test data
 * from other builders.
 */
export async function listBentoDeckCards(limit = 20): Promise<DeckCard[]> {
  const pulseCards = await fetchPulseGeneratedCards();
  const seenIds = new Set(pulseCards.map((c) => c.key));
  const remaining = limit - pulseCards.length;
  if (remaining <= 0) return pulseCards.slice(0, limit);

  const sdk = bentoSdk();
  const now = Date.now();
  // Over-fetch since a good chunk of the catalog is filtered out as junk —
  // pull a few pages until we have enough, or run out of pages.
  // Requiring a real subject (below) drops most of the catalog — scan the
  // full page range every time rather than stopping once we hit `remaining`
  // raw rows, since most of those won't survive the real-subject filter.
  const rows: any[] = [];
  const seenQuestions = new Set<string>();
  for (let page = 1; page <= 15; page++) {
    const { data } = await sdk.public.listDuels({ page, limit: 100 });
    const batch = (data ?? []) as any[];
    if (!batch.length) break;
    for (const d of batch) {
      if (seenIds.has(d.duelId)) continue; // already included as a Pulse card
      if (d.endTime && d.endTime * 1000 <= now) continue; // closed — can't bet on it, don't show it
      const q = d.betString ?? d.description ?? "";
      if (isJunkMarket(q)) continue;
      const key = q.trim().toLowerCase();
      if (seenQuestions.has(key)) continue; // same question, different duel — keep the first
      seenQuestions.add(key);
      rows.push(d);
    }
  }

  // Strict mode (allowPlaceholderFallback: false) — markets with no real,
  // identifiable team/player are dropped entirely rather than shown with an
  // unrelated placeholder video (the bug this whole change fixes).
  const catalogCards = rows
    .map((d, i) => duelToCard(d, pulseCards.length + i, false))
    .filter((c): c is DeckCard => c !== null)
    .slice(0, remaining);
  const allCards = [...pulseCards, ...catalogCards];

  // Overlay real prices where estimateBuy succeeds; cards where it fails
  // (or the service account can't log in) keep their liquidity-guess yes.
  const realPrices = await fetchRealYesPrices(allCards.map((c) => c.key));
  for (const card of allCards) {
    const real = realPrices.get(card.key);
    if (real != null) card.yes = real;
  }

  return allCards;
}

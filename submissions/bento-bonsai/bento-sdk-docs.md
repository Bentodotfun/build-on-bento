# @bento.fun/sdk — Reference Docs

Consolidated reference for `@bento.fun/sdk`: quickstart, core concepts, guides, common pitfalls, and the full method index. Intended as context for a coding LLM working with this SDK.

---

## Table of Contents

1. [Quickstart](#quickstart)
2. [TypeScript SDK Overview](#typescript-sdk-overview)
3. [Common Patterns & Pitfalls](#common-patterns--pitfalls)
4. [Guide: Place a Bet](#guide-place-a-bet)
5. [Guide: Create a Market](#guide-create-a-market)
6. [Guide: Create a Tournament](#guide-create-a-tournament)
7. [Guide: Enter a Tournament](#guide-enter-a-tournament)
8. [Testing the SDK](#testing-the-sdk)
9. [Changelog](#changelog)
10. [SDK API Reference (Method Index)](#sdk-api-reference-method-index)

---

## Quickstart

### Install

```bash
npm install @bento.fun/sdk
```

Requires Node.js 18+.

### Get a Builder API key

`createBentoSdk` requires a Builder API key (`apiKey`). Catalog reads are open without it on the wire, but login/register/weblink and authenticated calls need `x-builder-api-key` so your app is attributed.

Generate a testnet key (hackathon / docs form), then:

```bash
export BENTO_BUILDER_API_KEY='bnt_…'   # from the form
export BENTO_URL='https://internal-server.bento.fun'
```

### Your first call

Public reads (catalog, prices, analytics) need no user login. Pass `apiKey` anyway — you'll need it for login next.

```ts
import { createBentoSdk, walletAuthProvider } from '@bento.fun/sdk';

// createBentoSdk requires apiKey + auth; public reads ignore the user JWT slot
const sdk = createBentoSdk({
  baseUrl: 'https://internal-server.bento.fun',
  apiKey: process.env.BENTO_BUILDER_API_KEY!,
  auth: walletAuthProvider(() => ({})),
});

const { data } = await sdk.public.listDuels({ page: 1, limit: 10 });
console.log(`${data.length} live markets`);

// open one: use duelId (the on-chain id), NOT id (the database row id)
const market = await sdk.public.getDuelById({ duelId: data[0].duelId });
```

> `duelId` vs `id` trips up everyone — always pass `duelId`.

### Log in (to act as a user)

Reads need only the Builder key; placing bets, creating markets, entering tournaments also need a user JWT. Sign a short message with your wallet and trade it for a JWT:

```ts
const ts = String(Date.now());
const signature = await account.signMessage({
  message: `Bento.fun Login\nTimestamp: ${ts}\nWallet: ${account.address}`,
});

// new wallet → eoaRegister({ ..., username }); existing wallet → eoaLogin
const { token } = (await sdk.public.auth.eoaLogin({
  address: account.address,
  signature,
  timestamp: ts,
})) as { token: string };

// authenticated client: markets auth is a Bearer JWT
const authed = createBentoSdk({
  baseUrl: 'https://internal-server.bento.fun',
  apiKey: process.env.BENTO_BUILDER_API_KEY!,
  auth: walletAuthProvider(() => ({ Authorization: `Bearer ${token}` })),
});
```

`account` is your wallet (e.g. a viem account). See: Authentication, Accounts & wallets.

### Place a bet

Estimate first, then place. Amounts are wei (18 decimals); `'1000000000000000000'` is 1 unit.

```ts
const duelId = data[0].duelId; // from your first call above
const idempotencyKey = crypto.randomUUID(); // dedupes retries, optional; SDK generates one if omitted

const est = await authed.user.bets.estimateBuy({
  duelId,
  optionIndex: 0, // 0 or 1, not a 'YES' / 'NO' label
  betAmountUsdc: '1000000000000000000',
  slippageBps: 100,
});
if (!est.success) throw new Error('estimate rejected');

await authed.user.placeBet(
  {
    duelId,
    duelType: 'prediction',
    bet: 'optionA',
    optionIndex: 0,
    betAmount: '1000000000000000000',
    betAmountUsdc: '1000000000000000000',
    sharesOut: est.estimate.shares_out,
    minSharesOut: est.estimate.min_shares_out,
    slippageBps: 100,
    quoteId: est.estimate.quote_id,
  },
  { idempotencyKey },
);
```

> A write returns when the server accepted it, not when the chain settled. Poll a read to confirm. See [Place a Bet](#guide-place-a-bet).

### Tournaments (second host)

Bracket tournaments and F1 live on a second host. Add `tournamentsBaseUrl` when you need them:

```ts
import { jwtAuthProvider } from '@bento.fun/sdk';

const sdk = createBentoSdk({
  baseUrl: 'https://internal-server.bento.fun',
  apiKey: process.env.BENTO_BUILDER_API_KEY!,
  tournamentsBaseUrl: process.env.PARLAY_TOURNAMENT_URL, // tournaments host URL
  auth: walletAuthProvider(() => ({ Authorization: `Bearer ${token}` })),
  tournamentsAuth: jwtAuthProvider({ getAccessToken: () => token }),
});

const { tournaments } = (await sdk.tournaments!.tournaments.list({
  limit: 5,
})) as { tournaments: unknown[] };
```

---

## TypeScript SDK Overview

`@bento.fun/sdk` is the core package. It owns domain types, HTTP clients for two API hosts, auth providers, and optional on-chain orchestration. Usable from browser apps, React Native, server jobs, scripts, agents, and tests.

### Integration modes

| Mode | When | Configuration |
|---|---|---|
| Public reads | Catalog, analytics, tournament list | `baseUrl` (+ optional `tournamentsBaseUrl`); `apiKey` still required by the factory |
| User HTTP | Auth, bets, packs, tournament enter | `apiKey` + `auth` + `tournamentsAuth` |
| HTTP + on-chain | Vault deposit, LP | `onchain: { contracts, wallet }` |
| Protocol admin | Gated markets / tournaments admin routes | `createMarketsProtocolAdminClient` / `createTournamentsProtocolAdminClient` |

### Browser wallet setup

```ts
import { createBentoSdk, jwtAuthProvider, walletAuthProvider } from '@bento.fun/sdk';

// `token` is the JWT from public.auth.eoaLogin, see Authentication for the sign → login recipe.
// `apiKey` is required, mint at /concepts/builder-api-key
const sdk = createBentoSdk({
  baseUrl: process.env.BENTO_URL!, // https://internal-server.bento.fun
  apiKey: process.env.BENTO_BUILDER_API_KEY!,
  tournamentsBaseUrl: process.env.PARLAY_TOURNAMENT_URL,
  auth: walletAuthProvider(() => ({ Authorization: `Bearer ${token}` })),
  tournamentsAuth: jwtAuthProvider({ getAccessToken: () => token }),
});
```

### Server prepares calldata, your signer sends

```ts
import { buildVaultDepositCalldata } from '@bento.fun/sdk';

// amountHuman is whole tokens; decimals match the vault collateral (18 for credits)
const data = buildVaultDepositCalldata(tournamentId, 0, '10', 18);
const hash = await backendWallet.sendTransaction({
  to: creditsVault, // your OnchainContractConfig vault
  data,
});
```

Or use `sdk.onchain.depositAndEnterTournament(...)` when `onchain` is configured.

### Read-only setup

```ts
const sdk = createBentoSdk({
  baseUrl: process.env.BENTO_URL!, // https://internal-server.bento.fun
  apiKey: process.env.BENTO_BUILDER_API_KEY!,
  tournamentsBaseUrl: process.env.PARLAY_TOURNAMENT_URL,
  auth: walletAuthProvider(() => ({})),
});

await sdk.public.listDuels({ page: 1 });
await sdk.tournaments?.tournaments.list({ limit: 5 });
```

### Top-level client

`createBentoSdk()` returns:

| Property | Host | Auth |
|---|---|---|
| `public` | Markets | Catalog open; auth/weblink need Builder API key |
| `user` | Markets | Builder API key + Bearer JWT |
| `tournaments?` | Tournaments | Builder API key + optional JWT / wallet |
| `onchain?` | Chain | viem wallet |

`createTournamentsSdk()` is available for tournaments-only integrations.

### `sdk.public` (markets host)

| Namespace | Key methods |
|---|---|
| `duels` / `markets` | `list`, `getById` (alias naming) |
| `packs` | `list`, `getById`, payout/refund proofs |
| `leaderboard` | global reads |
| `parentMarkets` | read, invite validate |
| `portfolio` | account, PnL, positions |
| `analytics` | `getPlatformReport` |
| `protocolStats` | `getSummary`, `getStats` |
| `publicBets` | chart reads |
| `auth` | `eoaLogin`, `eoaRegister`, Auth0 flows |
| `duelInvitations` | create, join, validate |
| `withdrawalRequests` | pre-validate, list, create |

Top-level shortcuts: `listDuels`, `getDuelById`, `listMarkets`, `getMarketById`, `getContests`.

> List rows expose both `id` (database) and `duelId` (on-chain). Pass `duelId` to `getDuelById` / `getMarketById`.

### `sdk.user` (markets host)

| Namespace | Key methods |
|---|---|
| `bets` | `estimateBuy`, `placeBet`, `sellBet`, `getUserShares`, charts |
| `duels` | `createDuel`, `resolve`, `contest`, `participants` |
| `parentMarkets` | create, invite, join, add child |
| `packs` | enter, picks, creator flows |
| `portfolio` | account reads |
| `withdraw` | withdraw, claim winnings/fees |
| `polymarket` | discovery, orders, positions |
| `referralAnalytics` | referral drill-down |

### `sdk.tournaments` (tournaments host)

Present when `tournamentsBaseUrl` is set.

| Namespace | Key methods |
|---|---|
| `tournaments` | list, getById, enter, bracket, claims, disputes |
| `f1` | dashboards, rounds, predictions, leaderboards |
| `lp` | pool, APY, add/remove liquidity |
| `auth` | wallet JWT on tournaments host |

### `sdk.onchain`

Present when `onchain` + `tournamentsBaseUrl` are configured.

```ts
sdk.onchain?.depositAndEnterTournament(tournamentId, { amountUsdc: '100' });
sdk.onchain?.claimTournamentPayout(tournamentId);
sdk.onchain?.addLiquidity(amount);
sdk.onchain?.removeLiquidity(lpAmount);
```

Each `onchain` method resolves to `{ success, txHash?, error? }` and never throws — branch on `result.success`.

Calldata builders are also exported: `buildVaultDepositCalldata`, `buildVaultClaimCalldata`.

### Auth providers

```ts
import {
  walletAuthProvider,
  jwtAuthProvider,
  staticHeadersProvider,
} from '@bento.fun/sdk';
```

| Provider | Headers | Use with |
|---|---|---|
| `walletAuthProvider` | injected headers (`Authorization: Bearer` markets, `x-wallet-*` tournaments) | `auth` |
| `jwtAuthProvider` | `Authorization: Bearer` | `tournamentsAuth` |
| `staticHeadersProvider` | fixed headers you supply | `auth` / `tournamentsAuth` |

### Protocol admin (opt-in)

Separate factories, not part of `createBentoSdk()`:

```ts
import {
  createMarketsProtocolAdminClient,
  createTournamentsProtocolAdminClient,
} from '@bento.fun/sdk';

const marketsAdmin = createMarketsProtocolAdminClient({ baseUrl, auth });
const tournamentsAdmin = createTournamentsProtocolAdminClient({ baseUrl, auth });
```

### HTTP vs on-chain flows

| Action | HTTP | On-chain |
|---|---|---|
| Tournament enter | `tournaments.enter()` | `onchain.depositAndEnterTournament()` |
| Market bet | `user.placeBet()` | Server handles chain via markets host |

### Full API reference

Every SDK HTTP method (routes, auth, mutation snippets) is indexed in the [SDK API Reference](#sdk-api-reference-method-index).

Request/response shapes ship as TypeScript types in `@bento.fun/sdk` (generated from pinned OpenAPI contracts). Public Swagger UI is not exposed.

### Documentation layers

| Layer | Purpose |
|---|---|
| Quickstart + Guides | End-to-end flows: bet, tournament, create market/tournament |
| SDK overview (this doc) | Clients, auth, namespaces, on-chain |
| SDK API reference | Every method + HTTP route |

### Intentionally excluded

Not exposed in the public SDK:

- `/bento/bot/*`
- Inbound webhooks
- `/api/meta/*`, `/api/config/keys`

### Wallet-agnostic design

The SDK depends on viem-compatible wallets for on-chain paths only. Privy, Wagmi, Turnkey, and server signers belong in your app layer.

---

## Common Patterns & Pitfalls

Practical tips for integrating `@bento.fun/sdk` against live APIs — IDs, response shapes, auth, and errors.

### Two hosts, one factory

```ts
const sdk = createBentoSdk({
  baseUrl: process.env.BENTO_URL!,
  tournamentsBaseUrl: process.env.PARLAY_TOURNAMENT_URL,
  auth: walletAuthProvider(() => ({ Authorization: `Bearer ${token}` })),
  tournamentsAuth: jwtAuthProvider({ getAccessToken: () => token }),
});
```

| Client | Host env | Typical auth |
|---|---|---|
| `sdk.public` / `sdk.user` | `BENTO_URL` | Bearer JWT on `user` |
| `sdk.tournaments` | `PARLAY_TOURNAMENT_URL` | JWT on `tournamentsAuth` |

### `id` vs `duelId` on market rows

`listDuels` / `listMarkets` return rows with two identifiers:

| Field | Example | Use for |
|---|---|---|
| `id` | `6a1ef4329676cfd69ceec4f0` | Database row id — do **not** pass to `getDuelById` |
| `duelId` | `94c88855f750…` | On-chain duel id — use this for detail, bets, charts |

```ts
const { data } = await sdk.public.listDuels({ page: 1, limit: 10 });
const row = data[0];

// ✓ Correct
await sdk.public.getDuelById({ duelId: row.duelId });

// ✗ 404: wrong id type
await sdk.public.getDuelById({ duelId: row.id });
```

### Amounts are in wei

`betAmountUsdc` and `betAmount` are base units of the collateral token (wei), not whole tokens. On BSC / credits the collateral is 18 decimals, so 10 units is `'10000000000000000000'`; passing `'10'` means 10 wei — effectively zero.

Scale by the token's decimals (use `collateralDecimals` from your `onchain.contracts`, e.g. viem's `parseUnits('10', 18)`).

### Collateral: credits vs USDC

Markets and bets carry a `collateralMode` of `'usdc'` or `'credits'`:

| Mode | What it is | Geo |
|---|---|---|
| `usdc` | on-chain USDC collateral | geo-gated: restricted regions get 403 with code `GEO_BLOCKED` |
| `credits` | a platform-managed balance | not geo-gated; usable where usdc is blocked |

Either mode needs a funded balance, or writes fail with `400` (`Insufficient Credits` / `insufficient balance`). Fund the managed account before writing; in test environments a faucet seeds test balances.

### Wrapped API responses

Some tournaments endpoints return objects, not bare arrays:

```ts
// Bracket tournaments list
const { tournaments, total } = await sdk.tournaments!.tournaments.list({
  status: 'active',
}) as { tournaments: unknown[]; total: number };
```

Check the Tournaments OpenAPI schema when typing responses.

### HTTP acceptance ≠ on-chain finality

`placeBet`, `sellBet`, `createDuel`, pack picks, and tournament enters return when the server accepted the request, not when the chain finalized.

After mutations:

- Poll reads (`getDuelById`, `getUserShares`, tournament status)
- Use `waitFor*` helpers where provided

### Auth providers by integration

| Your app | Provider | Pass as |
|---|---|---|
| Browser wallet | `walletAuthProvider` | `auth` |
| JWT session (tournaments) | `jwtAuthProvider` | `tournamentsAuth` |

### Idempotency for bets

Always pass an idempotency key when placing bets:

```ts
// Estimate first (see Place a bet), then place with the quote fields:
await sdk.user.placeBet(
  { duelId, duelType, bet: 'optionA', optionIndex: 0, betAmount, betAmountUsdc,
    sharesOut, minSharesOut, slippageBps: 100, quoteId },
  { idempotencyKey }, // caller-stable, not Date.now()
);
```

### Errors

Failed HTTP calls throw `BentoSdkErrorException` with `error.sdkError`:

```ts
import { isGeoblockError } from '@bento.fun/sdk';

try {
  await sdk.user.placeBet(body, { idempotencyKey });
} catch (e) {
  // NB: pass the `.sdkError` record to the guards, not the caught exception
  const err = (e as { sdkError?: { kind: string; status?: number; correlationId?: string } }).sdkError;
  if (isGeoblockError(err)) {
    // geo-blocked: detects the 403 with code GEO_BLOCKED the API actually returns (and 451, defensively)
  } else if (err?.kind === 'auth_error') {
    // 401 / 403: message, status, and code when the body carries one (no correlationId)
  } else if (err?.kind === 'http_error') {
    console.log(err.status, err.correlationId);
  }
}
```

#### Error kinds

Each `sdkError.kind` carries different fields; branch on `kind`, not on `status`:

| kind | HTTP | Fields present |
|---|---|---|
| `http_error` | 404, 451, 5xx | `status`, `correlationId`, `message`, `details` |
| `auth_error` | 401, 403 | `message`, `status`, `code?` (no `correlationId`) |
| `validation_error` | 400, 422 | `status`, `fieldErrors?`, `message` |
| `rate_limited` | 429 | `retryAfterMs?`, `message` |

#### Common errors

| You see | Cause | Fix |
|---|---|---|
| `401` / `403` (`auth_error`) on `sdk.user` | missing or invalid Bearer JWT | log in (`eoaLogin`) and send `Authorization: Bearer`; markets is Bearer, not `x-wallet-*` |
| `400 Insufficient Credits` / `insufficient balance` | managed account unfunded in the chosen `collateralMode` | fund the account (or switch mode; faucet in test) |
| `400 Start time must be in the future` on `createDuel` | `startTime` ≤ now | set `startTime` strictly ahead of wall clock |
| `500 Pre-flight simulation failed` on `createDuel` | on-chain `requestCreateDuel` reverted in the managed (custodial) wallet simulation; often `startTime` only a few minutes ahead | use a larger offset (~31 min ahead public / ~5 min private); see [Create a Market](#guide-create-a-market) |
| `500 Unable to place bet…` after a good estimate | amount below the 5-unit platform / on-chain minimum (`estimateBuy` does not enforce it) | stake ≥ 5 units; pass `tokenDecimals` so the SDK rejects early; see [Place a Bet](#guide-place-a-bet) |
| `400 Paid tournaments require clientTournamentId…` | stage-1 buy-in > 0 without a prior vault deposit | generate 24-hex id → approve + vault deposit → create with `creatorDepositTxHash`; see [Create a Tournament](#guide-create-a-tournament) |
| `404` from `getDuelById` / `getMarketById` | passed the database `id`, not `duelId` | use `duelId` from the list row |
| `403` with code `GEO_BLOCKED` (`auth_error`) | region geo-gated on the `usdc` stack, not a JWT problem | check `isGeoblockError` before treating a 403 as auth; use `collateralMode: 'credits'` |
| `429` (`rate_limited`) | rate limited | back off at least `retryAfterMs` before retrying |
| `sdk.onchain.*` returns `{ success: false }` | on-chain methods never throw | branch on `result.success`; read `result.error` |

### Rate limits

A `429` surfaces as `kind: 'rate_limited'`. The SDK parses `Retry-After` into `retryAfterMs` and honours it in automatic retry backoff (0.5.4+). When handling errors yourself, still wait at least `retryAfterMs` before retrying.

### Security

- Wallet auth on `sdk.user` is a Bearer JWT from `eoaLogin` / `eoaRegister`.
- `collateralMode: 'credits'` bypasses geo-restrictions; the `usdc` stack is geo-gated.
- Never hard-code private keys, API keys, or access codes; keep them in env / secrets.

---

## Guide: Place a Bet

Estimate, place, and reconcile a market bet on the Bento markets host.

**By the end:** you'll have estimated a bet, placed it, and read your position back.

**Prerequisites:**
- Markets host URL (`baseUrl`)
- Wallet auth headers configured on `createBentoSdk`

```ts
import { createBentoSdk, walletAuthProvider } from '@bento.fun/sdk';

const sdk = createBentoSdk({
  baseUrl: process.env.BENTO_URL!,
  // markets auth is a Bearer JWT from eoaLogin (see Authentication)
  auth: walletAuthProvider(() => ({ Authorization: `Bearer ${token}` })),
});

// 1. Estimate (optionIndex is 0|1; amount is collateral wei)
// Platform minimum bet is **5** collateral units, in the collateral's decimals
// (18 for credits / BSC USDC, 6 for Base USDC).
// `estimateBuy` does not enforce the floor: a sub-5 amount can quote then 500 at place.
const stake = '10000000000000000000'; // 10 units
const est = await sdk.user.bets.estimateBuy({
  duelId: 'your-duel-id',
  optionIndex: 0,
  betAmountUsdc: stake,
  slippageBps: 100,
});
if (!est.success) throw new Error('estimate rejected'); // narrows est to the success variant

// 2. Place (HTTP acceptance). Use `placeBetFromEstimate`: it maps the quote's
// fields to the request and derives the slippage floor from `sharesOut`. Do NOT
// hand-build the request from `estimate.min_shares_out`: on larger bets the engine
// returns it ABOVE `sharesOut`, which empties the server's slippage window and 400s
// the bet with "Slippage exceeded".
// `bet` is the option label: `YES` / `NO` for prediction, the `optionA` / `optionB`
// text for versus. Pass `tokenDecimals` so the SDK rejects sub-5 amounts client-side.
await sdk.user.placeBetFromEstimate(
  {
    estimate: est.estimate,
    duelId: 'your-duel-id',
    duelType: 'PREDICTION', // or 'VERSUS'
    bet: 'YES',
    optionIndex: 0,
    betAmount: stake,
    betAmountUsdc: stake,
    slippageBps: 100,
    tokenDecimals: 18, // your collateral's decimals
  },
  { idempotencyKey },
);

// 3. Reconcile (field is `address`, not `walletAddress`)
const shares = await sdk.user.bets.getUserShares({
  duelId: 'your-duel-id',
  address: walletAddress,
});
```

---

## Guide: Create a Market

Submit a new prediction or versus market on the Bento markets host.

**By the end:** you'll have submitted a new market and read it back from the catalog.

**Prerequisites:**
- Markets host URL (`baseUrl`)
- Bearer JWT from `eoaLogin` on `createBentoSdk` (creator wallet)
- Creator wallet authorized on `createBentoSdk` (creation submits an on-chain transaction via your managed wallet)

```ts
import { createBentoSdk, walletAuthProvider } from '@bento.fun/sdk';

const sdk = createBentoSdk({
  baseUrl: process.env.BENTO_URL!,
  // markets auth is a Bearer JWT from eoaLogin (see Authentication)
  auth: walletAuthProvider(() => ({ Authorization: `Bearer ${token}` })),
});

// 1. Create (HTTP 201: on-chain submission accepted)
// startTime must be at least 5 minutes ahead (the on-chain minimum). Public markets
// also need time to bootstrap (reach their liquidity threshold before startTime, or
// they are cancelled), so give them a wider window (~30 min). Private markets skip
// bootstrapping, so ~5 minutes is enough. A value near the floor can pass HTTP
// validation but revert on-chain; the managed wallet's pre-flight simulation surfaces
// that as a 500 ("Pre-flight simulation failed").
const start = Date.now() + 31 * 60_000; // public: bootstrap window; private: ~5 min
const result = await sdk.user.createDuel(
  {
    question: 'Will Team A win?',
    type: 'prediction', // or 'versus' with optionA / optionB
    category: 'Football', // one of: Cricket, Football, Basketball, American Football, Tennis, Baseball, Hockey, Formula 1
    description: 'Optional context for traders',
    // Optional fields you can also send:
    // optionA / optionB (required for versus), coverImageUrl, tags (e.g. ['Premier League'])
    startTime: new Date(start).toISOString(),
    endTime: new Date(start + 2 * 3600_000).toISOString(), // required; must be after startTime
    privacyAccess: 'public',
    collateralMode: 'usdc', // or 'credits'
    tags: ['Premier League'],
  },
  { requestId: `create-${Date.now()}` },
);

// `result.kind` is always 'accepted' when createDuel resolves; real failures THROW a
// BentoSdkErrorException: wrap createDuel in try/catch and inspect err.sdkError instead.
const { duelId, txHash } = result.raw;
console.log({ duelId, txHash });

// 2. Poll until the market appears in catalog (eventual consistency)
let detail;
for (let i = 0; i < 10; i++) {
  try {
    detail = await sdk.public.getDuelById({ duelId });
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 2000));
  }
}
```

Use `duelId` from the response, not the `id` field from list rows. See [Common Patterns](#common-patterns--pitfalls).

### Parent markets (grouped events)

For multi-market events (e.g. a match with several child markets):

```ts
const parentStart = Date.now() + 31 * 60_000; // public: bootstrap window (see above)
const parent = await sdk.user.createParentMarket(
  {
    parentQuestion: 'Match outcome?', category: 'Football',
    startTime: new Date(parentStart).toISOString(),
    endTime: new Date(parentStart + 2 * 3600_000).toISOString(),
    privacyAccess: 'public',
    markets: [/* ParentMarketChildDto[]: child question / type / options */],
  },
  { requestId: `parent-${Date.now()}` },
);

await sdk.user.createParentMarketInvitation({
  parentMarketId: parent.raw.parentMarketId,
});
```

Request bodies are defined in the Markets OpenAPI schema (`CreateDuelDto`, parent-market DTOs).

### After creation

| Task | SDK call |
|---|---|
| Resolve outcome | `sdk.user.duels.resolve` |
| Contest / dispute | `sdk.user.duels.submitContest` |
| Public reads | `sdk.public.getDuelById({ duelId })` |

> HTTP acceptance does not mean the chain has finalized. See "HTTP acceptance ≠ on-chain finality" above.

---

## Guide: Create a Tournament

Check creator eligibility, fund the stage-1 buy-in on-chain, then author a bracket tournament.

**By the end:** you'll know the full paid create flow: eligibility, vault deposit, then admin create, plus optional protocol-admin ops.

**Prerequisites:**
- `tournamentsBaseUrl` and `tournamentsAuth` (JWT from markets `eoaLogin`)
- Markets-host JWT that can call `POST /bento/user/wallet/send-transaction` (managed smart wallet)
- Credits or USDC balance for the stage-1 buy-in (testnet: faucet via `POST /bento/auto-mint/mint`)
- Tournament vault + collateral token addresses for the chain (credits vault for `stakeAsset: 'credits'`)

### Important: create is not a single POST

The host enforces a minimum stage-1 buy-in of 5 USDC or 5 credits. Free (`buyinUsdc: '0'`) is rejected.

For any stage-1 buy-in greater than 0, the API requires:

| Field | Meaning |
|---|---|
| `clientTournamentId` | 24-character hex id you generate before create |
| `creatorDepositTxHash` | Vault deposit tx for that id, stage 1, buy-in amount |

Skipping the vault step returns HTTP 400: `Paid tournaments require clientTournamentId … deposit to the vault … creatorDepositTxHash.`

Fund the vault, then `POST /api/tournaments/admin/tournaments`. Create persists the tournament as `LIVE` and registers the creator entry. There is no separate activate call in the create path.

### Check eligibility

```ts
import { createBentoSdk, jwtAuthProvider, walletAuthProvider } from '@bento.fun/sdk';

const token = process.env.BENTO_JWT!;
const sdk = createBentoSdk({
  baseUrl: process.env.BENTO_URL!, // https://internal-server.bento.fun
  apiKey: process.env.BENTO_BUILDER_API_KEY!,
  tournamentsBaseUrl: process.env.PARLAY_TOURNAMENT_URL,
  auth: walletAuthProvider(() => ({ Authorization: `Bearer ${token}` })),
  tournamentsAuth: jwtAuthProvider({ getAccessToken: () => token }),
});

const stage1BuyinRaw = '5000000000000000000'; // 5 credits (18 decimals)
const eligibility = await sdk.tournaments!.tournaments.getCreatorCreateFlowEligibility({
  wallet: managedWalletAddress,
  stakeAsset: 'credits',
  stage1BuyinRaw,
  minEntriesToActivate: 2,
});
// Inspect eligibility.canProceed before funding
```

### Fund creator buy-in (on-chain), then create

Admin create is not wrapped on `createBentoSdk().tournaments`. Call the tournaments host admin route with a Bearer JWT.

```ts
import { buildVaultDepositCalldata } from '@bento.fun/sdk';
import { encodeFunctionData, erc20Abi, maxUint256 } from 'viem';

const stage1BuyinRaw = '5000000000000000000'; // 5 units

// 12 random bytes as a 24-character hex id.
const clientTournamentId = Array.from(
  crypto.getRandomValues(new Uint8Array(12)),
  (b) => b.toString(16).padStart(2, '0'),
).join('');

const creditsToken = process.env.CREDITS_TOKEN!; // ERC-20
const creditsVault = process.env.TOURNAMENT_VAULT_CREDITS!;

// 1) Approve vault to pull credits (via managed wallet relay)
await fetch(`${process.env.BENTO_URL}/bento/user/wallet/send-transaction`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: creditsToken,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [creditsVault, maxUint256],
    }),
    value: '0x0',
  }),
});

// 2) Vault deposit for stage 1 (binds clientTournamentId on-chain)
const depositRes = await fetch(`${process.env.BENTO_URL}/bento/user/wallet/send-transaction`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: creditsVault,
    data: buildVaultDepositCalldata(clientTournamentId, 1, '5', 18),
    value: '0x0',
  }),
});
const { txHash: creatorDepositTxHash } = await depositRes.json();

// 3) Author the tournament (tournaments admin route, your Bearer JWT)
const created = await fetch(
  `${process.env.PARLAY_TOURNAMENT_URL}/api/tournaments/admin/tournaments`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ownerWallet: managedWalletAddress,
      name: 'My bracket',
      type: 'PROTOCOL',
      sport: 'Football',
      stakeAsset: 'credits',
      vaultStack: 'credits',
      clientTournamentId,
      creatorDepositTxHash,
      totalStages: 2,
      stages: [
        { stageIndex: 1, buyinUsdc: stage1BuyinRaw, multiplier: 1, isFinal: false },
        { stageIndex: 2, buyinUsdc: stage1BuyinRaw, multiplier: 2, isFinal: true },
      ],
      config: { minEntriesToActivate: 2, stakeAsset: 'credits' },
    }),
  },
);
const { tournament } = await created.json();
// tournament.id === clientTournamentId when paid create succeeds
```

> `buyinUsdc` is always the raw amount string (the field name is historical). Credits and BSC-testnet USDC use 18 decimals; Base USDC uses 6 decimals.

### Optional follow-ups (not required for create)

- Stage builder / markets: admin stage endpoints
- `POST .../admin/tournaments/:id/activate`: exists, but create already lands `LIVE`

Exact body fields vary by format — see OpenAPI or `tournamentsAdmin` in the SDK API reference.

### Participant flow

Once live, other players use the [Enter a Tournament](#guide-enter-a-tournament) guide (`depositAndEnterTournament`, claims). That path deposits against an existing tournament id; creator create deposits *before* the tournament exists, using `clientTournamentId`.

### Protocol-admin lifecycle

Settlement, disputes, automation, and cancellation run through the gated `createTournamentsProtocolAdminClient`, a separate opt-in client, not part of `createBentoSdk()`:

```ts
import { createTournamentsProtocolAdminClient, jwtAuthProvider } from '@bento.fun/sdk';

const admin = createTournamentsProtocolAdminClient({
  baseUrl: process.env.PARLAY_TOURNAMENT_URL!,
  auth: jwtAuthProvider({ getAccessToken: () => process.env.TOURNAMENTS_ADMIN_JWT! }),
});

await admin.protocol.runAutomation();
await admin.protocol.settleReadyStages();
await admin.protocol.setPayoutRootOnchain(tournamentId);
```

| Phase | `admin.protocol` methods |
|---|---|
| Automation | `runAutomation`, `settleReadyStages`, `processTimeouts`, `getAutomationStatus` |
| Settle | `forceSettleStage`, `getPayoutRoot`, `prepareSetRoot`, `setPayoutRootOnchain`, `setRefundRootOnchain` |
| Disputes | `listOpenDisputes`, `getDisputeStats`, `resolveDispute`, `processExpiredDisputes` |
| Cancel | `cancelTournament`, `discardTournament`, `listCancelRequests`, `rejectCancelRequest` |

Full method list: [SDK API Reference → tournamentsAdmin.protocol](#tournamentsadminprotocol).

---

## Guide: Enter a Tournament

Deposit, enter a bracket tournament, and claim payouts.

**By the end:** you'll have deposited into a tournament, entered, and claimed your payout.

**Prerequisites:**
- `tournamentsBaseUrl` and `tournamentsAuth` (JWT)
- Optional `onchain` for vault deposit

### HTTP enter (with tx hash)

```ts
const tournament = await sdk.tournaments!.tournaments.getById('tournament-id');

// After on-chain deposit (see below)
await sdk.tournaments!.tournaments.enter('tournament-id', {
  depositTxHash: '0x…',
});
```

### On-chain deposit + enter

```ts
import { waitForTournamentEntry } from '@bento.fun/sdk';

const res = await sdk.onchain!.depositAndEnterTournament(
  'tournament-id',
  { amountUsdc: '100' }, // body object, not a bare string
);
if (!res.success) throw new Error(res.error);

await waitForTournamentEntry(() => sdk.tournaments!.tournaments.getMyStatus('tournament-id'));
```

### Claims

```ts
// Claim via the orchestrator (getClaimProof -> on-chain claim -> confirmClaim):
await sdk.onchain!.claimTournamentPayout('tournament-id');

// There is no tournaments.claim(); the explicit REST path is getClaimProof + confirmClaim:
// const proof = await sdk.tournaments!.tournaments.getClaimProof('tournament-id');
// ...submit the vault claim tx... then sdk.tournaments!.tournaments.confirmClaim('tournament-id', { wallet, txHash });
```

---

## Testing the SDK

Verify `@bento.fun/sdk` from npm with the integration sandbox before shipping your app.

Use the `sdk-sandbox` repo, a standalone project that installs `@bento.fun/sdk` from npm rather than a local link. This catches publish issues, broken exports, and live API mismatches early.

**By the end:** you'll have run the published SDK against the live API in a clean project.

### Setup

```bash
git clone https://github.com/Bentodotfun/sdk-sandbox.git
cd sdk-sandbox
cp .env.example .env
# BENTO_URL=https://internal-server.bento.fun
# BENTO_BUILDER_API_KEY=bnt_…   # mint at docs /concepts/builder-api-key
# PARLAY_TOURNAMENT_URL=https://your-tournaments-host
npm install
npm run test:import   # start here: no network
npm test              # full live public API checks
```

### What `npm test` runs

| Step | Checks |
|---|---|
| `import-smoke` | Package imports, `createBentoSdk()` factory |
| `markets-public` | `listDuels`, `protocolStats`, `getDuelById` (with `duelId`) |
| `tournaments-public` | `tournaments.list` |

Individual scripts:

```bash
npm run test:import
npm run test:markets
npm run test:tournaments
```

### Environment

| Variable | Purpose |
|---|---|
| `BENTO_URL` | Markets host (`https://internal-server.bento.fun`) |
| `BENTO_BUILDER_API_KEY` | Builder API key (`createBentoSdk` requires it) |
| `PARLAY_TOURNAMENT_URL` | Tournaments host |

Omit `PARLAY_TOURNAMENT_URL` to skip tournaments checks.

### When to run

- After publishing a new `@bento.fun/sdk` version to npm
- Before updating docs examples or integration guides
- When debugging "works locally but not from npm"
- Onboarding new developers or interns testing the SDK

### Where a mismatch comes from

| Symptom | What it means, and what to do |
|---|---|
| A route or method the SDK calls is wrong or missing | An SDK bug. Pin your last working `@bento.fun/sdk` version, report it to the Bento team; the fix ships in a new release. |
| A code example in these docs is wrong | A docs bug. Report it; check the changelog for a corrected pattern. |
| A gap in your test coverage | Add a case to your `sdk-sandbox` clone. |
| A response shape or field changed | Upgrade to the latest `@bento.fun/sdk`; its types track the API. See the changelog. |
| A response shape you did not expect | Confirm you are on the latest SDK, then see [Common Patterns](#common-patterns--pitfalls) (duelId, wrapped responses, auth). |

---

## Changelog

SDK version history for `@bento.fun/sdk`, newest first.

### 0.7.0
- Trimmed the public client surface to the intended integrator API (internal telegram / wallet / sports / proxy namespaces removed)

### 0.6.0
- `placeBetFromEstimate`: quote-to-bet helper
- Tournament enter: typed request body; credits deposit approve at 18 decimals; wallet injection; `waitForTournamentEntry` resolves on `hasEntry`
- Create market/tournament: no auto-retry on non-idempotent POSTs; validation field errors; geoblock detection fix
- Agent action: `accessCode` in body/header (not query string)
- Referral analytics: typed `ReferralAnalyticsApi`; refreshed mainnet OpenAPI snapshot
- Docs: onboarding revamp, create market/tournament guides, Bearer JWT auth alignment

### 0.5.5
- npm README: Bearer JWT auth for markets (synced with Authentication)
- Docs: place-parlay auth snippet, `Retry-After` note for 0.5.4+
- Referral analytics: typed SDK interfaces

### 0.5.4
- On-chain: fix double-scaled collateral approval on parlay / LP flows
- Retry/errors: honor `Retry-After` on 429; preserve `network_error` cause; reconnect JSDoc fix

### 0.5.3
- `PublicDuelSummary` type JSDoc: `id` vs `duelId` — use `duelId` for `getDuelById`
- npm README rewritten for integrators; homepage, bugs, and keywords on `package.json`
- Docs site: auto-generated SDK API reference, common patterns, test the SDK guide
- Integration sandbox at `github.com/Bentodotfun/sdk-sandbox`

### 0.5.2
- Docs examples use `BENTO_URL` and `PARLAY_TOURNAMENT_URL` env vars
- npm README cleanup (docs.bento.fun link only)

### 0.5.1
- Legacy notification routes (`registerLegacyDevice`, `unregisterLegacyDevice`)
- Auth header helpers (`bulkRegisterAuthProvider`, `agentV1AuthProvider`, …)
- Tournaments OpenAPI pin + generated types

### 0.5.0
- Complete integrator surface audit closure
- Agent modules, social feeds, protocol admin clients
- Fixed `getContests` path

### 0.4.0
- On-chain orchestration, feeds/proxies, social layer
- Protocol admin opt-in clients

---

## SDK API Reference (Method Index)

Auto-generated index of every `@bento.fun/sdk` HTTP method with routes, auth, and code snippets.

**355 methods across 30 namespaces.**

Use this section to find the SDK call for an endpoint; use OpenAPI for request/response JSON schemas.

### Setup

```ts
import { createBentoSdk, walletAuthProvider, jwtAuthProvider } from '@bento.fun/sdk';

const sdk = createBentoSdk({
  baseUrl: process.env.BENTO_URL!,
  tournamentsBaseUrl: process.env.PARLAY_TOURNAMENT_URL,
  auth: walletAuthProvider(() => ({ /* x-wallet-* */ })),
  tournamentsAuth: jwtAuthProvider({ getAccessToken: () => token }),
});
```

### Jump to

**Markets protocol admin:** `marketsAdmin.admin` (37), `marketsAdmin.invite` (7), `marketsAdmin.packs` (16), `marketsAdmin.reports` (13)

**Markets, public:** `sdk.public.analytics` (1), `sdk.public.auth` (7), `sdk.public.duels` (3), `sdk.public.leaderboard` (8), `sdk.public.packs` (8), `sdk.public.parentMarkets` (4), `sdk.public.protocolStats` (3), `sdk.public.publicBets` (4), `sdk.public.withdrawalRequests` (4)

**Markets, user (wallet):** `sdk.user.bets` (10), `sdk.user.duelInvitations` (12), `sdk.user.duels` (8), `sdk.user.packs` (11), `sdk.user.parentMarkets` (9), `sdk.user.polymarket` (31), `sdk.user.portfolio` (6), `sdk.user.referralAnalytics` (1), `sdk.user.withdraw` (4)

**Tournaments host:** `sdk.tournaments.auth` (2), `sdk.tournaments.f1` (31), `sdk.tournaments.lp` (8), `sdk.tournaments.parlay` (28), `sdk.tournaments.tournaments` (47)

**Tournaments protocol admin:** `tournamentsAdmin.bridge` (5), `tournamentsAdmin.notifications` (5), `tournamentsAdmin.protocol` (22)

---

### `marketsAdmin.admin`

37 methods. Example:

```ts
await marketsAdmin.admin.autoDistribute({ /* body */ });
```

| Method | HTTP | Path | Auth |
|---|---|---|---|
| `autoDistribute` | POST | `/bento/admin/bento/auto-distribute` | Admin JWT |
| `cancelExpired` | POST | `/bento/admin/bento/cancel-expired` | Admin JWT |
| `cancelParlayTournament` | POST | `/bento/admin/parlay-tournaments/tournaments/:param/cancel` | Admin JWT |
| `continueRefunds` | POST | `/bento/admin/bento/continue-refunds/:param` | Admin JWT |
| `decideWithdrawalRequest` | POST | `/bento/admin/withdrawal-requests/:param/decision` | Admin JWT |
| `disable2fa` | POST | `/bento/admin/auth/2fa/disable` | Admin JWT |
| `discardDuels` | POST | `/bento/admin/bento/discard` | Admin JWT |
| `discardParlayTournament` | POST | `/bento/admin/parlay-tournaments/tournaments/:param/discard` | Admin JWT |
| `finalizeContest` | POST | `/bento/admin/bento/finalize-contest` | Admin JWT |
| `getBootstrappingLive` | GET | `/bento/admin/bootstrapping-live` | Admin JWT |
| `getCancelledDuels` | GET | `/bento/admin/bento/cancelled` | Admin JWT |
| `getCount` | GET | `/bento/admin/count` | Admin JWT |
| `getDiscardStatus` | GET | `/bento/admin/bento/discard-status/:param` | Admin JWT |
| `getDuelContests` | GET | `/bento/admin/bento/duel/:param/contests` | Admin JWT |
| `getDuelParticipants` | GET | `/bento/admin/bento/duel/:param/participants` | Admin JWT |
| `getExpiredDuels` | GET | `/bento/admin/bento/expired` | Admin JWT |
| `getMe` | GET | `/bento/admin/auth/me` | Admin JWT |
| `getParlayConfigStatus` | GET | `/bento/admin/parlay-tournaments/config-status` | Admin JWT |
| `getPendingDuels` | GET | `/bento/admin/pendingDuels` | Admin JWT |
| `getReferralAnalytics` | GET | `/bento/admin/referral-analytics` | Admin JWT |
| `getReferralSummary` | GET | `/bento/admin/referral-analytics/summary` | Admin JWT |
| `getReferrerAnalytics` | GET | `/bento/admin/referral-analytics/referrer/:param` | Admin JWT |
| `getReferrerMarketCreation` | GET | `/bento/admin/referral-analytics/market-creation/:param` | Admin JWT |
| `listAdminContests` | GET | `/bento/admin/bento/contests` | Admin JWT |
| `listParlayCancelRequests` | GET | `/bento/admin/parlay-tournaments/cancel-requests` | Admin JWT |
| `listParlayTournaments` | GET | `/bento/admin/parlay-tournaments/tournaments` | Admin JWT |
| `listRemovableParlayTournaments` | GET | `/bento/admin/parlay-tournaments/tournaments/removable` | Admin JWT |
| `listWithdrawalRequests` | GET | `/bento/admin/withdrawal-requests` | Admin JWT |
| `login` | POST | `/bento/admin/auth/login` | Admin JWT |
| `logout` | DELETE | `/bento/admin/auth/logout` | Admin JWT |
| `regenerate2faBackupCodes` | POST | `/bento/admin/auth/2fa/backup-codes/regenerate` | Admin JWT |
| `rejectParlayCancelRequest` | PATCH | `/bento/admin/parlay-tournaments/cancel-requests/:param/reject` | Admin JWT |
| `setDuelDuration` | POST | `/bento/admin/bento/duration` | Admin JWT |
| `setup2fa` | POST | `/bento/admin/auth/2fa/setup` | Admin JWT |
| `verify2fa` | POST | `/bento/admin/auth/2fa/verify` | Admin JWT |
| `verify2faSetup` | POST | `/bento/admin/auth/2fa/verify-setup` | Admin JWT |
| `verifyAuth` | GET | `/bento/admin/auth/verify` | Admin JWT |

### `marketsAdmin.invite`

7 methods. Example:

```ts
await marketsAdmin.invite.create({ /* body */ });
```

| Method | HTTP | Path | Auth |
|---|---|---|---|
| `create` | POST | `/bento/admin/invite/create` | Admin JWT |
| `createBulk` | POST | `/bento/admin/invite/create-bulk` | Admin JWT |
| `deactivate` | PATCH | `/bento/admin/invite/:param/deactivate` | Admin JWT |
| `getDetails` | GET | `/bento/admin/invite/:param/details` | Admin JWT |
| `invalidateUser` | PATCH | `/bento/admin/invite/user/:param/invalidate` | Admin JWT |
| `list` | GET | `/bento/admin/invite/list` | Admin JWT |
| `listAll` | GET | `/bento/admin/invite/all` | Admin JWT |

### `marketsAdmin.packs`

16 methods. Example:

```ts
await marketsAdmin.packs.addMarket({ /* body */ });
```

| Method | HTTP | Path | Auth |
|---|---|---|---|
| `addMarket` | POST | `/bento/packs/admin/packs/:param/markets` | Admin JWT |
| `autoClaimPayouts` | POST | `/bento/packs/admin/packs/:param/onchain/auto-claim-payouts` | Admin JWT |
| `autoClaimRefunds` | POST | `/bento/packs/admin/packs/:param/onchain/auto-claim-refunds` | Admin JWT |
| `cancelRefund` | POST | `/bento/packs/admin/packs/:param/cancel-refund` | Admin JWT |
| `createPack` | POST | `/bento/packs/admin/packs` | Admin JWT |
| `getPayoutClaimStatus` | GET | `/bento/packs/admin/packs/:param/payout-claim-status` | Admin JWT |
| `getRefundClaimStatus` | GET | `/bento/packs/admin/packs/:param/refund-claim-status` | Admin JWT |
| `getSettlementPreview` | GET | `/bento/packs/admin/packs/:param/settlement-preview` | Admin JWT |
| `lock` | POST | `/bento/packs/admin/packs/:param/lock` | Admin JWT |
| `publish` | POST | `/bento/packs/admin/packs/:param/publish` | Admin JWT |
| `resolveMarket` | POST | `/bento/packs/admin/packs/:param/markets/:param/resolve` | Admin JWT |
| `scheduleTick` | POST | `/bento/packs/admin/packs/schedule-tick` | Admin JWT |
| `settle` | POST | `/bento/packs/admin/packs/:param/settle` | Admin JWT |
| `submitPayoutRoot` | POST | `/bento/packs/admin/packs/:param/onchain/submit-payout-root` | Admin JWT |
| `submitRefundRoot` | POST | `/bento/packs/admin/packs/:param/onchain/submit-refund-root` | Admin JWT |
| `voidMarket` | POST | `/bento/packs/admin/packs/:param/markets/:param/void` | Admin JWT |

### `marketsAdmin.reports`

13 methods. Example:

```ts
await marketsAdmin.reports.getBets(/* args */);
```

| Method | HTTP | Path | Auth |
|---|---|---|---|
| `getBets` | GET | `/bento/admin/reports/bets` | Admin JWT |
| `getContests` | GET | `/bento/admin/reports/contests` | Admin JWT |
| `getCreatorRequests` | GET | `/bento/admin/reports/creator-requests` | Admin JWT |
| `getDuelMemberships` | GET | `/bento/admin/reports/duel-memberships` | Admin JWT |
| `getDuels` | GET | `/bento/admin/reports/duels` | Admin JWT |
| `getInvitationUsage` | GET | `/bento/admin/reports/invitation-usage` | Admin JWT |
| `getLaunchedTokens` | GET | `/bento/admin/reports/launched-tokens` | Admin JWT |
| `getLeagueMemberships` | GET | `/bento/admin/reports/league-memberships` | Admin JWT |
| `getLeagueRequests` | GET | `/bento/admin/reports/league-requests` | Admin JWT |
| `getPnlSnapshots` | GET | `/bento/admin/reports/pnl-snapshots` | Admin JWT |
| `getTokenRequests` | GET | `/bento/admin/reports/token-requests` | Admin JWT |
| `getUsers` | GET | `/bento/admin/reports/users` | Admin JWT |
| `getWithdrawals` | GET | `/bento/admin/reports/withdrawals` | Admin JWT |

### `sdk.public.analytics`

1 method.

| Method | HTTP | Path | Auth |
|---|---|---|---|
| `getPlatformReport` | GET | `/bento/analytics/platform` | Public |

### `sdk.public.auth`

7 methods. Example:

```ts
await sdk.public.auth.auth0Login({ /* body */ });
```

| Method | HTTP | Path | Auth |
|---|---|---|---|
| `auth0Login` | POST | `/bento/user/auth/auth0/login` | Public* |
| `auth0Migrate` | POST | `/bento/user/auth/auth0/migrate` | Public* |
| `auth0Register` | POST | `/bento/user/auth/auth0/register` | Public* |
| `checkUsername` | GET | `/bento/user/auth/check-username` | Public |
| `eoaLogin` | POST | `/bento/user/auth/eoa/login` | Public* |
| `eoaRegister` | POST | `/bento/user/auth/eoa/register` | Public* |
| `uploadProfileImage` | POST | `/bento/user/auth/profile-image` | Public* |

> `uploadProfileImage` — multipart profile image upload (`image` field). Requires wallet auth.

### `sdk.public.duels`

3 methods. Example:

```ts
await sdk.public.duels.getById(/* args */);
```

| Method | HTTP | Path | Auth |
|---|---|---|---|
| `getById` | GET | `/bento/public/duels/get-duel-by-id/:duelId` | Public |
| `getContests` | GET | `/bento/user/duels/contest/:duelId` | Public |
| `list` | GET | `/bento/public/duels/all` | Public |

### `sdk.public.leaderboard`

8 methods. Example:

```ts
await sdk.public.leaderboard.getCreatorsCount(/* args */);
```

| Method | HTTP | Path | Auth |
|---|---|---|---|
| `getCreatorsCount` | GET | `/bento/leaderboard/creators/count` | Public |
| `getCreatorsPnl` | GET | `/bento/leaderboard/creators/pnl` | Public |
| `getGlobalAggregate` | GET | `/bento/leaderboard/global-aggregate` | Public |
| `getParticipantsChart` | GET | `/bento/leaderboard/chart/participants` | Public |
| `getTradersPnl` | GET | `/bento/leaderboard/traders/pnl` | Public |
| `getVolumeChart` | GET | `/bento/leaderboard/chart/volume` | Public |
| `listCreators` | GET | `/bento/leaderboard/creators` | Public |
| `listTraders` | GET | `/bento/leaderboard/traders` | Public |

### `sdk.public.packs`

8 methods. Example:

```ts
await sdk.public.packs.getById(/* args */);
```

| Method | HTTP | Path | Auth |
|---|---|---|---|
| `getById` | GET | `/bento/packs/:param` | Public |
| `getLeaderboard` | GET | `/bento/packs/:param/leaderboard` | Public |
| `getPayoutProof` | GET | `/bento/packs/:param/payout-proof` | Public |
| `getPayoutSummary` | GET | `/bento/packs/:param/payout-summary` | Public |
| `getPriceHistory` | GET | `/bento/packs/:param/price-history-snapshots` | Public |
| `getRefundProof` | GET | `/bento/packs/:param/refund-proof` | Public |
| `getRefundSummary` | GET | `/bento/packs/:param/refund-summary` | Public |
| `list` | GET | `/bento/packs` | Public |

### `sdk.public.parentMarkets`

4 methods. Example:

```ts
await sdk.public.parentMarkets.getById(/* args */);
```

| Method | HTTP | Path | Auth |
|---|---|---|---|
| `getById` | GET | `/bento/user/parent-markets/:param` | Public |
| `listAccessible` | GET | `/bento/user/parent-markets/accessible` | Public |
| `listMembers` | GET | `/bento/user/parent-markets/:param/members` | Public |
| `validateInvite` | POST | `/bento/user/parent-markets/validate-invite` | Public* |

### `sdk.public.protocolStats`

3 methods. Example:

```ts
await sdk.public.protocolStats.getStats(/* args */);
```

| Method | HTTP | Path | Auth |
|---|---|---|---|
| `getStats` | GET | `/bento/protocol-stats` | Public |
| `getSummary` | GET | `/bento/protocol-stats/summary` | Public |
| `refresh` | POST | `/bento/protocol-stats/refresh` | Public* |

### `sdk.public.publicBets`

4 methods. Example:

```ts
await sdk.public.publicBets.estimatedWin({ /* body */ });
```

| Method | HTTP | Path | Auth |
|---|---|---|---|
| `estimatedWin` | POST | `/bento/public/bets/estimated-win` | Public* |
| `estimateSell` | POST | `/bento/public/bets/estimate-sell` | Public* |
| `getSellUnlockLiquidity` | GET | `/bento/public/bets/sell-unlock-liquidity/:param` | Public |
| `getYesPercentageSnapshots` | GET | `/bento/public/bets/yes-percentage-snapshots/:param` | Public |

### `sdk.public.withdrawalRequests`

4 methods. Example:

```ts
await sdk.public.withdrawalRequests.create({ /* body */ });
```

| Method | HTTP | Path | Auth |
|---|---|---|---|
| `create` | POST | `/bento/user/withdrawal-requests` | Public* |
| `getDailyLimit` | GET | `/bento/user/withdrawal-requests/daily-limit` | Public |
| `list` | GET | `/bento/user/withdrawal-requests` | Public |
| `preValidate` | POST | `/bento/user/withdrawal-requests/pre-validate` | Public* |

### `sdk.tournaments.auth`

2 methods. Example:

```ts
await sdk.tournaments.auth.check(/* args */);
```

| Method | HTTP | Path | Auth |
|---|---|---|---|
| `check` | GET | `/user/auth/check` | Public / JWT |
| `login` | POST | `/user/auth/login` | JWT / Wallet |

### `sdk.tournaments.f1`

31 methods. Example:

```ts
await sdk.tournaments.f1.create({ /* body */ });
```

| Method | HTTP | Path | Auth |
|---|---|---|---|
| `create` | POST | `/api/tournaments/f1/create` | JWT / Wallet |
| `deletePrediction` | DELETE | `/api/tournaments/f1/:param/predictions/:param` | JWT / Wallet |
| `enter` | POST | `/api/tournaments/f1/:param/enter` | JWT / Wallet |
| `getClaimProof` | GET | `/api/tournaments/f1/:param/claim-proof` | Public / JWT |
| `getDashboard` | GET | `/api/tournaments/f1/:param/dashboard` | Public / JWT |
| `getDashboardExternal` | GET | `/api/tournaments/f1/dashboard/external` | Public / JWT |
| `getDashboardExternalFull` | GET | `/api/tournaments/f1/dashboard/external/full` | Public / JWT |
| `getEligibility` | GET | `/api/tournaments/f1/:param/eligibility/:param` | Public / JWT |
| `getEloLeaderboard` | GET | `/api/tournaments/f1/:param/leaderboard/elo` | Public / JWT |
| `getHeatmap` | GET | `/api/tournaments/f1/:param/heatmap/:param` | Public / JWT |
| `getMyPayout` | GET | `/api/tournaments/f1/:param/my-payout` | Public / JWT |
| `getMyPicks` | GET | `/api/tournaments/f1/:param/user/:param/my-picks` | Public / JWT |
| `getPayouts` | GET | `/api/tournaments/f1/:param/payouts` | Public / JWT |
| `getRaceAnalytics` | GET | `/api/tournaments/f1/:param/race-analytics/:param` | Public / JWT |
| `getResults` | GET | `/api/tournaments/f1/:param/results/:param` | Public / JWT |
| `getRound` | GET | `/api/tournaments/f1/:param/rounds/:param` | Public / JWT |
| `getRoundMatchups` | GET | `/api/tournaments/f1/:param/rounds/:param/matchups` | Public / JWT |
| `getRoundSideBetHeatmap` | GET | `/api/tournaments/f1/:param/rounds/:param/side-bet-heatmap` | Public / JWT |
| `getSeasonLeaderboard` | GET | `/api/tournaments/f1/:param/leaderboard/season` | Public / JWT |
| `getTournament` | GET | `/api/tournaments/f1/:param` | Public / JWT |
| `getUserPredictions` | GET | `/api/tournaments/f1/:param/user/:param/predictions/:param` | Public / JWT |
| `getUserStats` | GET | `/api/tournaments/f1/:param/user/:param/stats` | Public / JWT |
| `getWeekendLeaderboard` | GET | `/api/tournaments/f1/:param/leaderboard/weekend/:param` | Public / JWT |
| `listDrivers` | GET | `/api/tournaments/f1/:param/drivers` | Public / JWT |
| `listRounds` | GET | `/api/tournaments/f1/:param/rounds` | Public / JWT |
| `listRoundSideBets` | GET | `/api/tournaments/f1/:param/rounds/:param/side-bets` | Public / JWT |
| `lockMyPredictions` | POST | `/api/tournaments/f1/:param/events/:param/lock-my-predictions` | JWT / Wallet |
| `postRoundSideBets` | POST | `/api/tournaments/f1/:param/rounds/:param/side-bets` | JWT / Wallet |
| `predict` | POST | `/api/tournaments/f1/:param/events/:param/predict` | JWT / Wallet |
| `reenter` | POST | `/api/tournaments/f1/:param/reenter` | JWT / Wallet |
| `updatePrediction` | PUT | `/api/tournaments/f1/:param/predictions/:param` | JWT / Wallet |

### `sdk.tournaments.lp`

8 methods. Example:

```ts
await sdk.tournaments.lp.getApy(/* args */);
```

| Method | HTTP | Path | Auth |
|---|---|---|---|
| `getApy` | GET | `/api/lp/apy` | Public / JWT |
| `getBettorExposure` | GET | `/api/lp/bettor/:param/exposure` | Public / JWT |
| `getCompartments` | GET | `/api/lp/compartments` | Public / JWT |
| `getExposureBreakdown` | GET | `/api/lp/exposure-breakdown` | Public / JWT |
| `getPool` | GET | `/api/lp/pool` | Public / JWT |
| `getPosition` | GET | `/api/lp/position/:param` | Public / JWT |
| `quoteAddLiquidity` | POST | `/api/lp/add-liquidity/quote` | JWT / Wallet |
| `quoteRemoveLiquidity` | POST | `/api/lp/remove-liquidity/quote` | JWT / Wallet |

### `sdk.tournaments.parlay`

28 methods. Example:

```ts
await sdk.tournaments.parlay.claim({ /* body */ });
```

| Method | HTTP | Path | Auth |
|---|---|---|---|
| `claim` | POST | `/api/parlay/claim/:param` | JWT / Wallet |
| `createQuote` | POST | `/api/parlay/quote` | JWT / Wallet |
| `getBettor` | GET | `/api/parlay/bettor/:param` | Public / JWT |
| `getEuropeanSaturdayBuilder` | GET | `/api/parlay/builders/european-saturday` | Public / JWT |
| `getFeesConfig` | GET | `/api/parlay/fees/config` | Public / JWT |
| `getFeesStats` | GET | `/api/parlay/fees/stats` | Public / JWT |
| `getHistory` | GET | `/api/parlay/history` | Public / JWT |
| `getMarket` | GET | `/api/parlay/markets/:param` | Public / JWT |
| `getOdds` | GET | `/api/parlay/odds/:param` | Public / JWT |
| `getParlay` | GET | `/api/parlay/:param` | Public / JWT |
| `getPlayerProps` | GET | `/api/parlay/markets/:param/player-props` | Public / JWT |
| `getQuote` | GET | `/api/parlay/quote/:param` | Public / JWT |
| `getSameTeamRunBuilder` | GET | `/api/parlay/builders/same-team-run` | Public / JWT |
| `getSgpMenu` | GET | `/api/parlay/markets/:param/sgp-menu` | Public / JWT |
| `getStatus` | GET | `/api/parlay/status/:param` | Public / JWT |
| `getTicket` | GET | `/api/parlay/ticket/:param` | Public / JWT |
| `getTickets` | GET | `/api/parlay/tickets` | Public / JWT |
| `getUserNonce` | GET | `/api/parlay/users/:param/nonce` | Public / JWT |
| `getUserStats` | GET | `/api/parlay/users/:param/stats` | Public / JWT |
| `getWinnings` | GET | `/api/parlay/winnings` | Public / JWT |
| `health` | GET | `/api/parlay/health` | Public / JWT |
| `healthLive` | GET | `/api/parlay/health/live` | Public / JWT |
| `healthReady` | GET | `/api/parlay/health/ready` | Public / JWT |
| `listConditions` | GET | `/api/parlay/conditions` | Public / JWT |
| `listMarkets` | GET | `/api/parlay/markets` | Public / JWT |
| `previewFees` | GET | `/api/parlay/fees/preview/:param` | Public / JWT |
| `validateLegs` | POST | `/api/parlay/legs/validate` | JWT / Wallet |
| `validateQuote` | POST | `/api/parlay/quote/validate` | JWT / Wallet |

> `createQuote` — creates a signed parlay quote. Pads each leg's `conditionId` to bytes32 and requires a real bettor (see `prepareParlayQuoteBody`); leg-count/stake problems surface as typed SDK `validation_error`s rather than opaque 400s.

### `sdk.tournaments.tournaments`

47 methods. Example:

```ts
await sdk.tournaments.tournaments.confirmClaim({ /* body */ });
```

| Method | HTTP | Path | Auth |
|---|---|---|---|
| `confirmClaim` | POST | `/api/tournaments/:param/confirm-claim` | JWT / Wallet |
| `deletePick` | DELETE | `/api/tournaments/:param/picks/:param` | JWT / Wallet |
| `depositCreatorBond` | POST | `/api/tournaments/creator/deposit-bond` | JWT / Wallet |
| `enter` | POST | `/api/tournaments/:param/enter` | JWT / Wallet |
| `estimatePayout` | POST | `/api/tournaments/:param/estimate-payout` | JWT / Wallet |
| `fileMarketDispute` | POST | `/api/tournaments/:param/markets/:param/dispute` | JWT / Wallet |
| `fileStageDispute` | POST | `/api/tournaments/:param/stages/:param/markets/:param/dispute` | JWT / Wallet |
| `getAllDisputes` | GET | `/api/tournaments/:param/disputes` | Public / JWT |
| `getBracket` | GET | `/api/tournaments/:param/bracket` | Public / JWT |
| `getBracketStatus` | GET | `/api/tournaments/:param/bracket/status` | Public / JWT |
| `getById` | GET | `/api/tournaments/:param` | Public / JWT |
| `getCancelRequest` | GET | `/api/tournaments/:param/cancel-request` | Public / JWT |
| `getClaimProof` | GET | `/api/tournaments/:param/claim-proof` | Public / JWT |
| `getCreatorBondRequirement` | GET | `/api/tournaments/creator/bond-requirement` | Public / JWT |
| `getCreatorCreateFlowEligibility` | GET | `/api/tournaments/creator/create-flow-eligibility` | Public / JWT |
| `getCreatorEligibility` | GET | `/api/tournaments/creator/eligibility` | Public / JWT |
| `getCreatorWalletStats` | GET | `/api/tournaments/creator/:param/stats` | Public / JWT |
| `getDepositInstructions` | POST | `/api/tournaments/:param/deposit` | JWT / Wallet |
| `getDisputeWindows` | GET | `/api/tournaments/:param/dispute-windows` | Public / JWT |
| `getEligibility` | GET | `/api/tournaments/:param/eligibility` | Public / JWT |
| `getFormatInfo` | GET | `/api/tournaments/:param/format-info` | Public / JWT |
| `getGlobalLeaderboard` | GET | `/api/tournaments/global-leaderboard` | Public / JWT |
| `getLeaderboard` | GET | `/api/tournaments/:param/leaderboard` | Public / JWT |
| `getMarketDisputes` | GET | `/api/tournaments/:param/markets/:param/disputes` | Public / JWT |
| `getMarketDisputeWindow` | GET | `/api/tournaments/:param/markets/:param/dispute-window` | Public / JWT |
| `getMyStatus` | GET | `/api/tournaments/:param/my-status` | Public / JWT |
| `getPayouts` | GET | `/api/tournaments/:param/payouts` | Public / JWT |
| `getPayoutStatus` | GET | `/api/tournaments/:param/payout-status` | Public / JWT |
| `getPicks` | GET | `/api/tournaments/:param/stages/:param/picks` | Public / JWT |
| `getPlatformAggregate` | GET | `/api/tournaments/platform-leaderboard-aggregate` | Public / JWT |
| `getPrizePool` | GET | `/api/tournaments/:param/prize-pool` | Public / JWT |
| `getRefundProof` | GET | `/api/tournaments/:param/refund-proof` | Public / JWT |
| `getStageDisputeableMarkets` | GET | `/api/tournaments/:param/stages/:param/disputeable-markets` | Public / JWT |
| `getStageDisputes` | GET | `/api/tournaments/:param/stages/:param/disputes` | Public / JWT |
| `getStageDisputeWindow` | GET | `/api/tournaments/:param/stages/:param/dispute-window` | Public / JWT |
| `getStageFixtures` | GET | `/api/tournaments/:param/stages/:param/fixtures` | Public / JWT |
| `getStageGroups` | GET | `/api/tournaments/:param/stages/:param/groups` | Public / JWT |
| `getStageOdds` | GET | `/api/tournaments/:param/stages/:param/odds` | Public / JWT |
| `getStageStandings` | GET | `/api/tournaments/:param/stages/:param/standings` | Public / JWT |
| `getUserWalletStats` | GET | `/api/tournaments/user/:param/stats` | Public / JWT |
| `health` | GET | `/api/tournaments/health` | Public / JWT |
| `list` | GET | `/api/tournaments` | Public / JWT |
| `listByWallet` | GET | `/bento/tournaments/by-wallet/:param` | Public / JWT |
| `submitCancelRequest` | POST | `/api/tournaments/:param/cancel-request` | JWT / Wallet |
| `submitPicks` | POST | `/api/tournaments/:param/stages/:param/picks` | JWT / Wallet |
| `withdraw` | POST | `/api/tournaments/:param/withdraw` | JWT / Wallet |
| `withdrawCreatorBond` | POST | `/api/tournaments/creator/withdraw-bond` | JWT / Wallet |

### `sdk.user.bets`

10 methods. Example:

```ts
await sdk.user.bets.estimateBuy({ /* body */ });
```

| Method | HTTP | Path | Auth |
|---|---|---|---|
| `estimateBuy` | POST | `/bento/user/bets/estimate-buy` | Wallet |
| `estimatedWin` | POST | `/bento/user/bets/estimated-win` | Wallet |
| `estimateSell` | POST | `/bento/user/bets/estimate-sell` | Wallet |
| `getParentYesPercentageSnapshots` | GET | `/bento/user/bets/yes-percentage-snapshots/parent/:parentMarketId` | Wallet |
| `getSellUnlockLiquidity` | GET | `/bento/user/bets/sell-unlock-liquidity/:duelId` | Wallet |
| `getUserBetLimit` | GET | `/bento/user/bets/user-bet-limit/:address` | Wallet |
| `getUserShares` | GET | `/bento/user/bets/user-shares/:duelId/:address` | Wallet |
| `getYesPercentageSnapshots` | GET | `/bento/user/bets/yes-percentage-snapshots/:duelId` | Wallet |
| `placeBet` | POST | `/bento/user/bets/create` | Wallet |
| `sellBet` | POST | `/bento/user/bets/sell` | Wallet |

Notes:
- `estimateBuy` — immediate pricing-engine buy quote (wallet auth required).
- `placeBet` — platform minimum bet: 5 collateral units per option (enforced on-chain via `minBets`).
- `sellBet` — accepted / eventual only.

### `sdk.user.duelInvitations`

12 methods. Example:

```ts
await sdk.user.duelInvitations.addMember({ /* body */ });
```

| Method | HTTP | Path | Auth |
|---|---|---|---|
| `addMember` | POST | `/bento/user/duel-invitations/add-member` | Wallet |
| `checkMembership` | GET | `/bento/user/duel-invitations/membership/:param/:param` | Wallet |
| `create` | POST | `/bento/user/duel-invitations/create` | Wallet |
| `getByInviteCode` | GET | `/bento/user/duel-invitations/:param` | Wallet |
| `join` | POST | `/bento/user/duel-invitations/join` | Wallet |
| `listForDuel` | GET | `/bento/user/duel-invitations/duel/:param` | Wallet |
| `listMemberships` | GET | `/bento/user/duel-invitations/memberships/:param` | Wallet |
| `removeMember` | POST | `/bento/user/duel-invitations/remove-member` | Wallet |
| `revoke` | POST | `/bento/user/duel-invitations/revoke` | Wallet |
| `syncJoinSuccess` | POST | `/bento/user/duel-invitations/sync-join-success` | Wallet |
| `userJoin` | POST | `/bento/user/duel-invitations/user-join` | Wallet |
| `validateInvite` | POST | `/bento/user/duel-invitations/validate-invite` | Wallet |

### `sdk.user.duels`

8 methods. Example:

```ts
await sdk.user.duels.createDuel({ /* body */ });
```

| Method | HTTP | Path | Auth |
|---|---|---|---|
| `createDuel` | POST | `/bento/user/duels/create` | Wallet |
| `finalizeContest` | POST | `/bento/user/duels/finalize-contest` | Wallet |
| `getContests` | GET | `/bento/user/duels/contest/:param` | Wallet |
| `getCreatorContests` | GET | `/bento/user/duels/:param/contests` | Wallet |
| `getMyContest` | GET | `/bento/user/duels/contest/:param/my-contest` | Wallet |
| `getParticipants` | GET | `/bento/user/duels/participants/:param` | Wallet |
| `resolve` | POST | `/bento/user/duels/resolve` | Wallet |
| `submitContest` | POST | `/bento/user/duels/contest` | Wallet |

> `createDuel` — submits on-chain market creation. HTTP 201 returns `duelId` + `txHash` but full catalog visibility is still eventual — poll `PublicClient.getDuelById`.

### `sdk.user.packs`

11 methods. Example:

```ts
await sdk.user.packs.addMarket({ /* body */ });
```

| Method | HTTP | Path | Auth |
|---|---|---|---|
| `addMarket` | POST | `/bento/packs/creator/packs/:param/markets` | Wallet |
| `createPack` | POST | `/bento/packs/creator/packs` | Wallet |
| `enter` | POST | `/bento/packs/:param/enter` | Wallet |
| `estimatePick` | POST | `/bento/packs/:param/picks/estimate` | Wallet |
| `getMyEntry` | GET | `/bento/packs/:param/me` | Wallet |
| `getPayoutProof` | GET | `/bento/packs/:param/payout-proof` | Wallet |
| `getPayoutSummary` | GET | `/bento/packs/:param/payout-summary` | Wallet |
| `getRefundProof` | GET | `/bento/packs/:param/refund-proof` | Wallet |
| `getRefundSummary` | GET | `/bento/packs/:param/refund-summary` | Wallet |
| `placePick` | POST | `/bento/packs/:param/picks` | Wallet |
| `publish` | POST | `/bento/packs/creator/packs/:param/publish` | Wallet |

### `sdk.user.parentMarkets`

9 methods. Example:

```ts
await sdk.user.parentMarkets.addChildDuel({ /* body */ });
```

| Method | HTTP | Path | Auth |
|---|---|---|---|
| `addChildDuel` | POST | `/bento/user/parent-markets/:param/add-duel` | Wallet |
| `createInvitation` | POST | `/bento/user/parent-markets/create-invitation` | Wallet |
| `createParentMarket` | POST | `/bento/user/parent-markets/create` | Wallet |
| `getById` | GET | `/bento/user/parent-markets/:param` | Wallet |
| `join` | POST | `/bento/user/parent-markets/join` | Wallet |
| `listAccessible` | GET | `/bento/user/parent-markets/accessible` | Wallet |
| `listInvitations` | GET | `/bento/user/parent-markets/:param/invitations` | Wallet |
| `listMembers` | GET | `/bento/user/parent-markets/:param/members` | Wallet |
| `validateInvite` | POST | `/bento/user/parent-markets/validate-invite` | Wallet |

### `sdk.user.polymarket`

31 methods. Example:

```ts
await sdk.user.polymarket.approveTrading({ /* body */ });
```

| Method | HTTP | Path | Auth |
|---|---|---|---|
| `approveTrading` | POST | `/bento/user/polymarket/approve-trading` | Wallet |
| `cancelAll` | DELETE | `/bento/user/polymarket/cancel-all` | Wallet |
| `cancelOrder` | DELETE | `/bento/user/polymarket/cancel-order/:param` | Wallet |
| `deploySafe` | POST | `/bento/user/polymarket/deploy-safe` | Wallet |
| `deployWallet` | POST | `/bento/user/polymarket/deploy-wallet` | Wallet |
| `deposit` | POST | `/bento/user/polymarket/deposit` | Wallet |
| `deriveCredentials` | POST | `/bento/user/polymarket/derive-credentials` | Wallet |
| `getApprovalStatus` | GET | `/bento/user/polymarket/approval-status` | Wallet |
| `getAuthStatus` | GET | `/bento/user/polymarket/auth-status` | Wallet |
| `getBalance` | GET | `/bento/user/polymarket/balance` | Wallet |
| `getCardPrices` | POST | `/bento/user/polymarket/discovery/card-prices` | Wallet |
| `getDepositStatus` | GET | `/bento/user/polymarket/deposit-status/:param` | Wallet |
| `getEventsByTags` | GET | `/bento/user/polymarket/discovery/events-by-tags` | Wallet |
| `getLiveScores` | GET | `/bento/user/polymarket/discovery/live-scores` | Wallet |
| `getOrders` | GET | `/bento/user/polymarket/orders` | Wallet |
| `getPolygonBalances` | GET | `/bento/user/polymarket/polygon-balances` | Wallet |
| `getPositions` | GET | `/bento/user/polymarket/positions` | Wallet |
| `getRelayerTx` | GET | `/bento/user/polymarket/relayer-tx/:param` | Wallet |
| `getSafeStatus` | GET | `/bento/user/polymarket/safe-status` | Wallet |
| `getSportsMap` | GET | `/bento/user/polymarket/discovery/sports-map` | Wallet |
| `getTickSize` | GET | `/bento/user/polymarket/tick-size` | Wallet |
| `getTrades` | GET | `/bento/user/polymarket/trades` | Wallet |
| `getWalletStatus` | GET | `/bento/user/polymarket/wallet-status` | Wallet |
| `placeOrder` | POST | `/bento/user/polymarket/place-order` | Wallet |
| `publicSearch` | GET | `/bento/user/polymarket/discovery/public-search` | Wallet |
| `recoverFunds` | POST | `/bento/user/polymarket/recover-funds` | Wallet |
| `redeem` | POST | `/bento/user/polymarket/redeem` | Wallet |
| `refreshCredentials` | POST | `/bento/user/polymarket/refresh-credentials` | Wallet |
| `withdraw` | POST | `/bento/user/polymarket/withdraw` | Wallet |
| `withdrawClob` | POST | `/bento/user/polymarket/withdraw-clob` | Wallet |
| `wrapLegacyCollateral` | POST | `/bento/user/polymarket/wrap-legacy-collateral` | Wallet |

### `sdk.user.portfolio`

6 methods. Example:

```ts
await sdk.user.portfolio.getAccountDetails({ /* body */ });
```

| Method | HTTP | Path | Auth |
|---|---|---|---|
| `getAccountDetails` | POST | `/bento/user/portfolio/accountDetails` | Wallet |
| `getDuels` | POST | `/bento/user/portfolio/duels` | Wallet |
| `getDuelsTable` | POST | `/bento/user/portfolio/table/duels` | Wallet |
| `getHistoryTable` | POST | `/bento/user/portfolio/table/history` | Wallet |
| `getPnlChart` | POST | `/bento/user/portfolio/pnl-chart` | Wallet |
| `getPositions` | GET | `/bento/user/portfolio/positions/:param` | Wallet |

### `sdk.user.referralAnalytics`

1 method.

| Method | HTTP | Path | Auth |
|---|---|---|---|
| `getMine` | GET | `/bento/user/referral-analytics` | Wallet |

### `sdk.user.withdraw`

4 methods. Example:

```ts
await sdk.user.withdraw.claimFees({ /* body */ });
```

| Method | HTTP | Path | Auth |
|---|---|---|---|
| `claimFees` | POST | `/bento/user/withdraw/claim-fees` | Wallet |
| `claimWinnings` | POST | `/bento/user/withdraw/claim-winnings` | Wallet |
| `getCreatorFees` | GET | `/bento/user/withdraw/creator-fees` | Wallet |
| `withdraw` | POST | `/bento/user/withdraw` | Wallet |

### `tournamentsAdmin.bridge`

5 methods. Example:

```ts
await tournamentsAdmin.bridge.exportStreamMigration({ /* body */ });
```

| Method | HTTP | Path | Auth |
|---|---|---|---|
| `exportStreamMigration` | POST | `/bento/admin/stream-migration/export` | Admin JWT |
| `getStreamMigrationStatus` | GET | `/bento/admin/stream-migration/status` | Admin JWT |
| `importStreamMigration` | POST | `/bento/admin/stream-migration/import` | Admin JWT |
| `listStreamMigrationJobs` | GET | `/bento/admin/stream-migration/jobs` | Admin JWT |
| `testCommentary` | POST | `/bento/admin/commentary/test` | Admin JWT |

### `tournamentsAdmin.notifications`

5 methods. Example:

```ts
await tournamentsAdmin.notifications.getPushDiagnostic(/* args */);
```

| Method | HTTP | Path | Auth |
|---|---|---|---|
| `getPushDiagnostic` | GET | `/bento/admin/push/diagnostic` | Admin JWT |
| `getUserNotificationDiagnostics` | GET | `/bento/user/admin/notifications/diagnostics` | Admin JWT |
| `runPrematchCycle` | POST | `/bento/user/admin/notifications/run-prematch-cycle` | Admin JWT |
| `sendTestPush` | POST | `/bento/admin/push/test` | Admin JWT |
| `sendUserTestPush` | POST | `/bento/user/admin/notifications/test-push` | Admin JWT |

### `tournamentsAdmin.protocol`

22 methods. Example:

```ts
await tournamentsAdmin.protocol.cancelTournament({ /* body */ });
```

| Method | HTTP | Path | Auth |
|---|---|---|---|
| `cancelTournament` | POST | `/api/tournaments/admin/tournaments/:param/cancel` | Admin JWT |
| `discardTournament` | POST | `/api/tournaments/admin/tournaments/:param/discard` | Admin JWT |
| `forceSettleStage` | POST | `/api/tournaments/admin/stages/:param/force-settle` | Admin JWT |
| `getAutomationStatus` | GET | `/api/tournaments/admin/automation/status/:param` | Admin JWT |
| `getDisputeStats` | GET | `/api/tournaments/admin/disputes/stats` | Admin JWT |
| `getPayoutRoot` | GET | `/api/tournaments/admin/tournaments/:param/payout-root` | Admin JWT |
| `getStageCanProceed` | GET | `/api/tournaments/admin/stages/:param/can-proceed` | Admin JWT |
| `getStageDisputes` | GET | `/api/tournaments/admin/disputes/stage/:param` | Admin JWT |
| `getTournamentDisputes` | GET | `/api/tournaments/admin/disputes/tournament/:param` | Admin JWT |
| `listCancelRequests` | GET | `/api/tournaments/admin/cancel-requests` | Admin JWT |
| `listOpenDisputes` | GET | `/api/tournaments/admin/disputes` | Admin JWT |
| `prepareSetRoot` | POST | `/api/tournaments/admin/tournaments/:param/set-root` | Admin JWT |
| `processExpiredDisputes` | POST | `/api/tournaments/admin/disputes/process-expired` | Admin JWT |
| `processTimeouts` | POST | `/api/tournaments/admin/automation/process-timeouts` | Admin JWT |
| `rejectCancelRequest` | PATCH | `/api/tournaments/admin/cancel-requests/:param/reject` | Admin JWT |
| `resolveDispute` | POST | `/api/tournaments/admin/disputes/:param/resolve` | Admin JWT |
| `runAutomation` | POST | `/api/tournaments/admin/automation/run` | Admin JWT |
| `setFinalDisputeWindow` | POST | `/api/tournaments/admin/tournaments/:param/final-dispute-window/set` | Admin JWT |
| `setPayoutRootOnchain` | POST | `/api/tournaments/admin/tournaments/:param/set-payout-root-onchain` | Admin JWT |
| `setRefundRootOnchain` | POST | `/api/tournaments/admin/tournaments/:param/set-refund-root-onchain` | Admin JWT |
| `setStageDisputeWindow` | POST | `/api/tournaments/admin/stages/:param/dispute-window/set` | Admin JWT |
| `settleReadyStages` | POST | `/api/tournaments/admin/automation/settle-ready` | Admin JWT |

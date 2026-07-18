# Pulse — Bento SDK Integration Notes

Package: `@bento.fun/sdk@0.7.0`. Docs: https://docs.bento.fun. Source: `github.com/Bentodotfun/bento.fun` (`packages/sdk`).

## Auth model (confirmed from README + package inspection)

Two independent layers, both required:

1. **Builder API key** (`apiKey` → `x-builder-api-key` header) — identifies Pulse as an app. Required on every `createBentoSdk()` call, including public reads.
2. **User JWT** (`auth`) — identifies the acting account. Obtained via wallet-sign → `eoaLogin`/`eoaRegister`.

For Pulse, the "user" placing creates/resolves is **the worker's own bot account** — not a human. Provision one wallet (viem) at setup time, register it once via `eoaRegister`, cache the resulting JWT (refresh on expiry), and use that identity for every `createDuel`/`resolve` call.

```ts
import { createBentoSdk, walletAuthProvider } from '@bento.fun/sdk';
import { privateKeyToAccount } from 'viem/accounts';

const account = privateKeyToAccount(process.env.PULSE_BOT_PRIVATE_KEY!);

async function getBotToken(sdkPublic: ReturnType<typeof createBentoSdk>) {
  const ts = String(Date.now());
  const signature = await account.signMessage({
    message: `Bento.fun Login\nTimestamp: ${ts}\nWallet: ${account.address}`,
  });
  let res = await sdkPublic.public.auth.eoaLogin({ address: account.address, signature, timestamp: ts });
  if (!res.exists) {
    res = await sdkPublic.public.auth.eoaRegister({
      address: account.address, signature, timestamp: ts, username: 'pulse-bot',
      // mainnet also requires inviteCode — check testnet vs mainnet target before demo day
    });
  }
  return res.token as string;
}
```

## Confirmed exact shapes (from the pinned OpenAPI schema, not just the `.d.ts` re-exports)

The `.d.ts` convenience exports are loosely typed (`JsonRecord` in places), but the real schema lives in
`node_modules/@bento.fun/sdk/dist/openapi/bento.openapi.d.ts` (10k+ lines, pinned snapshot). Pulled directly from it:

```ts
// CreateDuelDto — POST /bento/user/duels/create
{
  question: string;
  type: "prediction" | "versus";
  category: string;           // e.g. "Football"
  description?: string;
  optionA?: string;
  optionB?: string;
  coverImageUrl?: string;
  startTime: string;          // ISO 8601 UTC
  endTime: string;            // ISO 8601 UTC
  privacyAccess: "public" | "private";  // default "public"
  tags?: string[];
  collateralMode: "usdc" | "credits";   // default "usdc" — MUST set "credits" explicitly
  leagueId?: string;
  ruleSpec?: Record<string, unknown>;
}

// CreateParentMarketDto — POST /bento/user/parent-markets/create
{
  parentQuestion: string;
  description?: string;
  category: string;
  tags?: string[];
  coverImageUrl?: string;
  startTime: string;
  endTime: string;
  privacyAccess: "public" | "private";
  markets: ParentMarketChildDto[];      // can seed children at creation time
  collateralMode?: "usdc" | "credits";
  groupKind?: "multi" | "pack";         // <-- see note below
}

// AddChildDuelDto — POST /bento/user/parent-markets/{id}/add-child (path confirmed via addChildDuel(path, body))
{
  question: string;
  type: "prediction" | "versus";
  category?: string;
  description?: string;
  optionA?: string;
  optionB?: string;
  coverImageUrl?: string;
  privacyAccess?: "public" | "private";
  tags?: string[];
  collateralMode?: "usdc" | "credits";
  startTime: string;
  endTime: string;
}
```

**Open question #1, revised (correcting an earlier pass at this doc):** `CreateParentMarketDto.groupKind: "multi" | "pack"` does confirm packs and parent/child duels share one underlying resource. But **`PacksAdminApi` (lock/resolveMarket/voidMarket/settle) is only reachable via a separate, opt-in `MarketsProtocolAdminClient`** (`createMarketsProtocolAdminClient`, its own `AuthProvider`), structurally distinct from the `sdk.user` client `createDuel` lives on (`dist/client/markets-protocol-admin-client.d.ts`). That's a strong signal it needs a privileged/ops credential, not just "the wallet that created the duel."

**Decision: do NOT depend on `groupKind: "pack"` or `PacksAdminApi`.** Create the per-fixture parent market as a plain `groupKind: "multi"` (or omitted), and resolve each child duel individually via `sdk.user.duels.resolve()` — which lives on the same ordinary `UserClient` as `createDuel`, no separate admin client required. This is the path that only depends on one testable permission (does our own account's JWT let it resolve what it created), not on being granted an ops role we likely don't have.

**Consequence — voiding is not cleanly available without admin access.** The pinned schema has no void endpoint for plain duels, only `VoidPackMarketDto` under `/bento/packs/admin/.../void` (same gated admin client). Practical mitigations, in order of preference:
1. Ask Bento's engineers in the hackathon support channel directly whether plain-duel voiding exists outside this pinned snapshot, or whether hackathon builder keys can get scoped admin/pack access for the day — this is a 30-second question worth asking early rather than assuming.
2. Design the generator to avoid ever needing to void: bias heavily toward Sportmonks-backed templated props (near-certain resolution), and for Anakin-sourced novel props, allow one extra resolver tick past `endTime` before giving up, rather than building a void path that may not exist.
3. Worst case, an unresolved prop just sits open — bad UX (a stuck card) but not a broken demo, since it's credits with no real-money exposure.

No explicit "lock time" field exists separately from `startTime`/`endTime` — for a 5-minute prop, set `startTime = now`, `endTime = now + 5min`, and treat `endTime` as the lock/resolve trigger.

## Resolving a prop — confirmed

```ts
// ResolveDuelDto — POST /bento/user/duels/resolve  (routes.js: DUELS + '/resolve')
{
  duelIds: [
    { duelId: string, winningOptionIndex: number, userId?: string }
  ]
}
```

Batchable — resolve several props in one call. Confirmed route is `/bento/user/duels/resolve`, a peer of `/bento/user/duels/create`, **not** under the separately-documented `/bento/resolution/resolve-duel/{duelId}` endpoint (`ResolutionController_resolveDuel`), which is explicitly labeled *"Resolve one duel via the automated resolver (internal)"* in the schema — that one is Bento's own ops-only path, not ours.

The fact that `resolve` sits on the same `/user/...` router as `create`, with the same request/response shape pattern, is a strong structural signal that the creating account can resolve its own duels without a special role. The OpenAPI types don't expose per-operation auth scopes (stripped from the generated spec), so this is **still not 100% certain — it remains the #1 live check for Hour 0** — but it's now a "verify," not a "coin flip."

Use `sdk.user.duels.resolve()` for every prop — see the revised decision above. Do not build against `PacksAdminApi` unless Bento's team confirms hackathon builder keys get admin scope.

## Voiding a prop (never resolve without a source)

See the mitigation list above — there is no confirmed void path for plain duels. Design the generator/resolver to make voiding rare rather than relying on an endpoint that may not be reachable (see BUILD_PLAN.md Hour 0 checklist).

## Reading the deck's data (web side)

```ts
const { data } = await sdk.public.listDuels({
  // filter by parentMarketId / packId once the packs-vs-duels decision above is made
  page: 1,
  limit: 20,
});
```

Realtime (optional, v2): `sdk.realtime.subscribeToDuel({ duelId })` — WS, no auth required for reads per the SDK's realtime client comment ("Browser-safe WebSocket clients. No credentials required today.").

## Rate limits / operational notes

- Docs reference a "Common patterns & pitfalls" page (`docs.bento.fun/reference/common-patterns`) covering IDs, errors, and rate limits — **read this in full before finalizing the worker's polling/creation cadence**, not summarized here because it wasn't fetched in detail during research.
- `duelId` vs `id`: list rows have both; always use `duelId` for `getDuelById` / bets / resolve. This has already bitten the SDK's own authors enough to call out twice in their README — treat it as a certain bug source.
- Amounts are wei-format base units even for credits (18 decimals) — the generator/resolver code never touches amounts directly, but the deck's bet-placement code (reused from the earlier migration plan) does; keep that conversion in one shared helper, not duplicated.

## Live findings (confirmed against real testnet, not static analysis)

Ran a real create → wait → resolve round trip against `internal-server.bento.fun` with a fresh bot wallet. Findings:

1. ~~Packs vs. parent/child duels~~ — **resolved**: use plain `groupKind: "multi"`/omitted, resolve via `sdk.user.duels.resolve()`, see above.
2. ~~Exact request/response shapes~~ — **confirmed live**, not just from the schema: `createDuel`'s accepted response is `{ kind: 'accepted', raw: { success, duelId, txHash, message }, receivedAt, serverAcknowledgement }` — **`duelId` is nested under `.raw`**, not top-level (the `.d.ts` types don't make this obvious).
3. **`resolve()` is NOT gated by a role/permission wall.** No 401/403 anywhere in testing. It's gated by **market status** instead: `"Duel ... cannot be resolved. Current status: -1. Only closed markets (status 0) can be resolved."` This is the best possible outcome for Pulse's design — self-resolution works for the account that created the duel, it just has to wait for the market to actually close first, which is correct/expected behavior, not a blocker.
4. **`startTime` has a real minimum lead time, and it's bigger than it looks from validation errors alone.** HTTP validation only checks "is it in the future" — the actual constraint is enforced later, on-chain, as a `500 Pre-flight simulation failed`. Confirmed via binary search on testnet:
   - Public markets: 31 minutes (matches the docs exactly — `web app uses ~31 minutes for public markets`)
   - Private markets: the docs say "~5 minutes," but live testing found **exactly 5 minutes still fails**; **6 minutes reliably succeeds**. Use 6 minutes as the practical minimum for private markets, not the documented 5.
5. **This directly constrains Pulse's core cadence.** A public market cannot open in under 31 minutes — full stop, confirmed live. A private market opened reliably at 6–10 minutes lead + 30 minute window in the first several tests. **Pulse must use `privacyAccess: 'private'` markets, not public**, to have any chance at a fast cadence — which also means props need an invitation/join step for other users to bet on them (see the open question at the end of this doc).

6. **Revised a third time — this is a tight rate limit on `createDuel`, not a one-time block or a parameter boundary.** Full observed sequence:
   - Long stretch of universal failures (every wallet, including brand-new ones) — see the earlier trail in this section.
   - Recovered on its own; `status-probe-5v6.ts` got two clean calls through: 5min lead failed (real boundary), 6min lead succeeded.
   - Within ~2 minutes, `generator.ts` fired 2 more create calls (7min lead, 5min window) — both failed.
   - Immediately after, `status-probe-window.ts` fired 5 more calls (7min lead, windows 5/10/15/20/30min, 2s apart) — **all 5 failed, including the 30-minute window that has succeeded reliably many times before.**

   Pattern so far looked like a small burst of calls succeeds, then locks up — but two follow-up tests broke even that theory:
   - A single isolated call (30min window, same params as many past successes) → succeeded.
   - ~1 minute later, two more isolated calls (25min window, then 30min window, 2s apart) → **both failed, including the exact 30-minute window that had just succeeded.**
   - Retried a single isolated call again, no other calls nearby → succeeded.
   - Tested call-spacing directly: two calls 10 seconds apart, nothing else running → **both failed, including the first, fully isolated one.**

7. **Final characterization: this does not fit any single discoverable client-side rule.** Not lead time alone (correct values fail intermittently), not window length alone (30min has succeeded many times and failed many times), not burst/rate-limiting alone (isolated single calls have both succeeded and failed with no other calls nearby). The most defensible read: **this is flaky, non-deterministic infrastructure** — plausibly shared testnet congestion (the catalog is full of *other* hackathon teams' test markets too, so this is a shared resource under load from everyone building today, not just us), a Turnkey wallet-simulation queue, or similar shared-capacity issue on Bento's side. **Stopped live-testing for good at this point** — there is no parameter combination or pacing strategy we can determine from outside that reliably avoids this; further testing only adds noise to their logs without adding information for us. Every correlation ID from every attempt in this document is available if useful for Bento's team to correlate against server-side load at those exact timestamps.

8. **Confirmed: the markets that did succeed are real, but private markets are unreadable without an invite — even by their own creator.** Verified live against two duels that `createDuel` reported success for: `getDuelById` returns `"Access denied. This is a private market. Provide a valid invite code or connect as an authorized member."` — tried both as an unauthenticated public read *and* with the creator's own Bearer JWT. Both denied identically. This means:
   - Creation succeeding doesn't mean the market is usable yet — there's an invite/membership step needed before *anyone*, including the creator, can read or presumably bet on it.
   - **This breaks the planned architecture** ("create private markets for speed, show them in a public swipe UI"). As designed, a private market is invite-walled at the read level, not just gated for outside bettors — so the web deck's `listBentoDeckCards()` would never be able to show these even if creation were reliable.
   - Untested: whether the creator can self-grant access via `duelInvitations`/`createParentMarketInvitation` (see `DuelInvitationsApi`/`ParentMarketsUserApi` in the SDK) as a required extra step after creation, which might unlock creator-side reading/resolving even if bettor access still needs individual invites. Worth testing once creation stabilizes — but the "public swipe UI showing private fast markets" premise cannot be assumed to work until that's confirmed.
   - **Practical fallback if invites can't be made frictionless**: use public markets (confirmed accessible to everyone, no invite friction) and accept the ~31-minute lead time instead of the 6-minute one — trading cadence speed for a design that's actually confirmed to work end-to-end.

9. **Revised, final: `placeBet` failures were partly a real bug in our own filter, not purely platform flakiness.** `seed.ts`'s original due-market filter was `startTime <= now` — which backwards-selects the *old, already-closed* markets (their `startTime` is in the past) instead of the *new* ones (whose `startTime` is still ahead but which are already bettable — see finding #10, pre-start betting works). Every "placeBet keeps failing" observation on seed markets was Bento correctly rejecting bets on closed markets, not an outage. Fixed the filter to `!seeded && !resolved && endTime > now`. Confirmed live immediately after the fix: **6/6 seed bets succeeded** (50 credits YES + 50 credits NO on 3 markets, one retry, zero failures). Genuine `createDuel` flakiness (findings #6-7) is still real and separately confirmed — this specific finding only walks back the `placeBet`-is-also-flaky claim, since every clean, correctly-targeted `placeBet` test has now succeeded.

10. **Confirmed live: betting works before a market's `startTime`.** A fresh wallet (never used before, faucet-funded in the same session) successfully placed a bet on a market ~30 minutes before its `startTime`. `startTime` appears to mean something like "official kickoff / display time," not "betting opens here" — markets are bettable from creation. This directly informed the finding #9 fix above.

## Real bug found and fixed: unbalanced markets break the price display

Every seed/test bet placed on our own markets happened to land on the YES side (optionIndex 0) — nothing was ever placed on NO. `bento.ts`'s `impliedYes()` derives displayed odds from `liquidityBreakdown.option0/option1.usdcAmount`; with all volume on one side, the formula degenerates to 0% or 100%, which is exactly what showed as "0¢" in the app. Two-part fix, both now confirmed working:
- **Display side**: `BuySheet` fetches a real price from `estimateBuy` (`/api/bet/estimate`) at confirm time instead of trusting the deck list's liquidity-based guess. `/api/deck` also now overlays real `estimateBuy` prices per card (`bento.ts`'s `fetchRealYesPrices`, using a service-account login) so the list view is correct too, not just the confirm step.
- **Root-cause side**: `pulse/worker/src/seed.ts` places a 50-credit bet on *both* sides of every open, unseeded market. Fixed two real bugs along the way: (1) originally marked `seeded: true` unconditionally regardless of success, which would have silently broken all future retries; (2) the due-market filter bug in finding #9. **Confirmed live and working** — 3 fresh markets, 6/6 seed bets succeeded, deck now shows balanced ~50% odds and real volume on all three.

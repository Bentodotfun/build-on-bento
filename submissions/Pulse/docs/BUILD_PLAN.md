# Pulse — Build Plan

Read [PRD.md](./PRD.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [BENTO_INTEGRATION.md](./BENTO_INTEGRATION.md), [ANAKIN_INTEGRATION.md](./ANAKIN_INTEGRATION.md) first — this is the execution order, not the design.

## Hour 0 — de-risk before writing product code

These are pass/fail checks. Do not start the generator/resolver/UI until these are answered — every one of them can change the design.

1. ~~Packs vs. parent/child duels~~ — **resolved via static schema analysis**: use plain `groupKind: "multi"` parent markets + child duels, resolved individually via `sdk.user.duels.resolve()`. `PacksAdminApi` needs a separate, likely-gated admin client — don't depend on it. See BENTO_INTEGRATION.md.
2. ~~Can the bot's own account call `resolve()`~~ — **confirmed live: yes, no permission wall.** `resolve()` is gated by market status ("Only closed markets (status 0) can be resolved"), not by role. This was the single biggest risk and it's resolved in our favor.
3. ~~Minimum lead time before a market can open~~ — **confirmed live**: public ~31min (matches docs exactly), private ~6min (docs say 5, actual tested minimum is 6). Pulse must use private markets. See BENTO_INTEGRATION.md finding #5.
4. **Revised: not a one-time block — `createDuel` has a tight, undocumented rate limit.** A stretch of universal failures cleared on its own; a clean 2-call test then confirmed the lead-time boundary (5min fails, 6min succeeds). But within minutes, both `generator.ts` (2 calls) and a window-length test (5 calls) failed entirely, including parameter combinations that have succeeded many times before. Pattern: small bursts succeed, then it locks up again. This is a rate limit, not a parameter issue — see BENTO_INTEGRATION.md finding #6 (third revision) for the full sequence. **Stopped live-testing to avoid extending the cooldown further.** The generator cannot run unattended until we have a real number from Bento (creates allowed per minute/hour) to pace against — right now `generator.ts`'s 3-creates-per-2-minutes default is a guess, not a confirmed-safe rate.
5. **Ask Bento's engineers, now including the rate limit question:**
   - What's the actual rate limit on `createDuel` (creates per minute/hour)? This is now blocking, not a nice-to-have — the generator can't be paced correctly without it.
   - Does plain-duel voiding exist beyond the pinned OpenAPI snapshot?
   - ~~Is there a way to auto-join / open-invite a private market~~ — **answered, and it's bad news for the current design.** Verified live: `getDuelById` on a private duel returns `"Access denied. This is a private market. Provide a valid invite code or connect as an authorized member."` — **even for the creator's own authenticated session**, not just for other users. Private markets are locked behind an invite/membership check at the read level, not just the bet level, and creating one doesn't automatically grant the creator read access back. This breaks the "fast private markets behind a public swipe UI" design as originally planned — see BENTO_INTEGRATION.md finding #8 for what needs to change. Still worth asking Bento directly whether there's an invite/membership call we're missing (e.g., does the creator need to explicitly join their own market via `duelInvitations`?), but don't assume there's an easy answer.
3. **Anakin `search` latency** — time a handful of real calls. If consistently slow, downgrade novel props to a periodic enrichment instead of per-tick.
4. **Sportmonks fixture snapshot coverage** — confirm it actually reports corners/cards for a real or historical fixture you can test against, not just goals.
5. Read `docs.bento.fun/reference/common-patterns` (rate limits, error shapes) and Anakin's rate-limit/pricing docs in full.

## Build order (after hour 0)

1. **Bento auth + read path** — provision the bot's wallet, get a working JWT, `sdk.public.listDuels()` returns something. Proves the whole auth chain before anything depends on it.
2. **Create one duel manually** (hardcoded question, hardcoded lock time) and confirm it appears via a read call. Proves the write path.
3. **Resolve that one duel manually** and confirm the state changes. Proves the resolve path — the riskiest call in the whole product, get it working standalone before building the loop around it.
4. **Generator loop**: templated questions only first (no Anakin yet), ticking on a timer, creating real duels. Get this stable and boring before adding novelty.
5. **Resolver loop**: Sportmonks-driven resolution for templated props, ticking and closing duels automatically. Once 4 + 5 run unattended for one full replayed match, the core product exists.
6. **Web deck repoint**: `txodds.fun`'s `backend.ts` swapped to read Pulse's open child duels; countdown ring on cards; bet placement wired to `estimateBuy`/`placeBet` with credits.
7. **Telegram alerts**: worker posts new-prop/resolved events into the bot's chat; add the Mini App launch button.
8. **Anakin novel props**: layer in job 1 (sourcing) then job 2 (resolving) from ANAKIN_INTEGRATION.md — additive, don't let this block the core loop.
9. **Demo polish**: replay mode using a recorded fixture (reuse `txoddsfunbot/src/replay/`) so the live demo doesn't depend on a real match being on at judging time.

## Demo script (draft)

1. Open with the web deck already running against a replayed/live match — a card is mid-countdown.
2. Swipe, bet, show the bet accepted.
3. Let the countdown hit zero on stage — the prop resolves visibly, win/loss shown.
4. Point at the Telegram group — the same prop appeared there the moment it was created, and the resolution posted there too.
5. Highlight one Anakin-sourced novel prop specifically ("this one wasn't templated — it came from live commentary") to make the dual-SDK story explicit, since a judge skimming the deck won't otherwise know which calls are Bento vs Anakin.
6. Close on the "why this and not another swipe-bet clone" line: markets that create and close themselves, at match tempo, is a different product category, not a UI variant.

## Risk register

| Risk | Mitigation |
|---|---|
| `resolve()` gated to an ops role | Hour 0 check #2; fallback = human tap-to-approve in Telegram |
| No void endpoint for plain duels (confirmed absent from pinned schema) | Bias generator toward high-confidence resolvable props; ask Bento support for a void path or admin scope (check #2b); worst case, an unresolved prop is a stuck card, not a broken demo |
| No real live match during judging | Replay engine (build order #9) — non-negotiable, build it even if a live match seems likely |
| Anakin latency/rate limits mid-demo | Templated-only props are a complete fallback (ANAKIN_INTEGRATION.md) |
| Sportmonks missing corner/card granularity for the demo fixture | Test against the actual demo fixture in hour 0, not a random one |
| Packs-vs-duels decision made wrong, costly to reverse mid-build | Spend real time on hour-0 check #1 before any generator code exists |
| Credits collateral / finality lag inside a 5-min window | Confirm credits settlement doesn't have the same on-chain finality lag as USDC — check "Acceptance vs finality" doc page explicitly for credits, not just USDC |

## Explicitly out of scope for hackathon day

- Multi-fixture concurrency (one match at a time is enough for a demo)
- The signal engine / CONVICTION mechanic from `txoddsfunbot` (different cadence, different product moment — candidate for a v2 pitch slide, not v1 code)
- USDC collateral, real custody, mainnet
- General user-facing market creation (Pulse's bot account is the only creator)

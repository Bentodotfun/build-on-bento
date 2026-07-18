# Pulse — Anakin Integration Notes

Base URL: `https://api.anakin.io/v1`. Auth: `X-API-Key` header. Docs: https://anakin.io/docs.

## Confirmed live (this section is real, tested — everything below it was written before ever calling the API and had the wrong field name)

```ts
// POST https://api.anakin.io/v1/search
// headers: { "X-API-Key": ... }
{ prompt: string }   // NOT `query` — confirmed 400 "Prompt is required" otherwise
// -> { id: string, results: [{ title, snippet, url, date?, last_updated? }] }
```

**Measured latency**: ~1.1–1.4s per call, 1180ms average across 3 real calls (`npm run hour0:anakin` in `pulse/worker`). Fast enough to call once per due market per resolver tick with no batching/caching needed at this scale.

Implemented in `pulse/worker/src/anakin.ts` (client) and `pulse/worker/src/resolve-logic.ts` (keyword-based classification, wired into `resolver.ts`, replacing the earlier random placeholder). See BENTO_INTEGRATION.md / BUILD_PLAN.md for the broader resolver design — this section covers what Anakin itself actually returns.

**Resolution asymmetry, by design**: only "goal" props resolve confidently both ways (YES *and* NO) — a real match summary reliably reports the score either way. Every other prop type (corner/card/foul/penalty/free kick) only resolves YES when the keyword is found in a snippet; absence just leaves it `null` (inconclusive, retried next tick) rather than guessing NO. A general web search snippet not mentioning a corner is weak evidence it didn't happen — it's not a structured event feed. Confirmed live: dry-run against our real markets (`npm run resolve:dry-run`) correctly resolved "Will there be a goal?" to YES (found a real 4-1 historical match) while "corner"/"card" correctly stayed inconclusive rather than false-resolving to NO.

Anakin has two intended jobs in Pulse. Only Job 2 (resolution) is actually built; Job 1 (novel question sourcing) is still the aspirational design below, not implemented.

## Job 1 — source novel prop questions (NOT YET BUILT — design only)

Once per generator tick (~every 4–5 min), attempt one Anakin-sourced question alongside the templated ones.

```ts
const results = await anakinSearch(`live text commentary ${home} vs ${away} last 5 minutes`);
// see anakin.ts — uses `prompt`, not `query`
```

Feed the returned snippets into a small LLM classification step (reuse `txoddsfunbot/src/llm.ts`'s `askLLM` pattern) that either:
- extracts a genuinely bettable yes/no claim ("commentator flagged a possible VAR check"), or
- returns nothing, in which case that tick just runs templated props only — **never force a novel prop if the source is thin.**

## Job 2 — resolve props at lock time (BUILT, this is the real implementation)

`resolve-logic.ts`'s `resolveViaAnakin(question)` — not an LLM classification step, a plain keyword match against `search` results (see "Confirmed live" above for why, and the asymmetric YES/NO confidence rule). If inconclusive, **stays open, retried next resolver tick** — not voided, since there's still no confirmed void endpoint for plain duels (see BENTO_INTEGRATION.md). Never resolve without a clear signal; a wrong auto-resolution during a live demo is much worse than staying open one extra tick.

```ts
const { outcome, evidence } = await resolveViaAnakin(duel.question);
// outcome: 0 (YES) | 1 (NO) | null (inconclusive — leave open)
```

## Which endpoint: `search` vs `agentic_search`

- `search` — synchronous, single-pass, citations included. Use this for both jobs above; a 5-minute window doesn't leave room for `agentic_search`'s multi-stage async pipeline (`submit-search` → poll `get-search-result`) unless the tick interval is generous. Confirm actual `search` latency against the sandbox early — if it's consistently under ~5–10s, it's safe inside both the generation and resolution ticks; if not, fall back to templated-only props and treat Anakin as a periodic (not per-tick) enrichment pass instead.
- `agentic_search` — reserve for a v2 "match recap" feature (post-match summary card), not the live loop.

## Rate limits / cost

Anakin's pricing/rate-limit docs are referenced but weren't fetched in detail — **read `docs/documentation/rate-limits` and `docs/documentation/pricing` before locking the polling cadence.** At a ~90-minute match with one novel-prop attempt every ~5 minutes, that's ~18 generation calls + up to 18 resolution calls per fixture — cheap in absolute terms, but confirm the plan/key you're demoing with actually supports that before hackathon day, not during it.

## Fallback if Anakin is flaky or rate-limited during the actual demo

Templated props alone (Sportmonks-resolved) are still a complete, demoable product — the "will Ronaldo score" / "next corner" loop works with zero Anakin involvement. Anakin adds the "wow, that's not templated" moment but is not load-bearing for the core loop. Treat it as a progressive enhancement, and say so explicitly in the demo script (BUILD_PLAN.md) so a live hiccup doesn't derail the pitch.

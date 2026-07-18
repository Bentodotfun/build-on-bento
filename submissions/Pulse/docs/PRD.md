# Pulse — Product Spec

**One-liner:** Live micro-prop markets that spin up during a match and resolve themselves, swiped like a card deck.

**⚠️ Cadence revised from the original "every 5 minutes" pitch — see BENTO_INTEGRATION.md findings #5 and #8.** Public Bento markets need a confirmed ~31-minute minimum lead time before they can open, and the private markets that would allow a faster ~6-minute cadence turned out to be invite-walled at the read level — even for their own creator — which breaks a public swipe UI showing them. Current design runs on **public markets, ~32min lead, ~30min window** — real props with real resolution, just on a match-half tempo rather than a 5-minute one. Revisit the private-market path only if Bento confirms a way to grant creator/bettor access without per-user manual invites.

**Hackathon:** Bento SDK hackathon (₹50,000 pool). Built on `@bento.fun/sdk`, enriched with Anakin.

## Problem

Prediction markets are browse-and-research products. During a live match, that's the wrong tempo — fans want a decision every few minutes, not a catalog to search. Nobody at this hackathon will build for that tempo; everyone will build "another way to browse Bento markets."

## Core loop (revised for confirmed platform constraints)

1. A match is live (or about to be). Pulse generates a batch of props ~32 minutes ahead of each window: "Will there be a goal in this half?", "Will Messi score?", "Will a card be shown?" — covering the *next half-hour* of play, not the next 5 minutes.
2. User swipes the deck. Right = bet (credits, one tap, no research). Card shows a countdown to lock.
3. ~30 minutes later the prop resolves itself.
4. Repeat for each half. Still a materially faster tempo than a static pre-match catalog, just not the original 5-minute vision.

## Users / demo audience

Primary demo audience is hackathon judges + Bento engineers watching a live or replayed match. Secondary: casual fans who want a low-effort, high-frequency way to engage with a match they're half-watching.

## Non-goals (v1 / hackathon scope)

- No USDC / real money — credits collateral only.
- No general market creation UI for users — Pulse's own bot account creates and resolves every prop.
- No coverage beyond one sport (football) and a small hardcoded fixture list for the demo.
- No mobile app — web (existing `txodds.fun` deck) + Telegram Mini App wrapper only.

## Success criteria for the demo

- A live (or replayed) match visibly produces a *new* market on stage, unprompted, inside the 5-minute window.
- At least one prop resolves on stage while the judge is watching, closing the loop visibly.
- At least one prop is clearly not templated — sourced from Anakin, so it's obviously not just "if goal then resolve."
- Telegram bot pushes the same prop as an alert in parallel with the web card appearing.

## Prop types (v1)

| Type | Source | Resolver |
|---|---|---|
| Player to score in next 5 | Templated question, live player list | Sportmonks fixture snapshot (structured) |
| Next corner (home/away/none) | Templated | Sportmonks fixture snapshot |
| Card shown in next 5 | Templated | Sportmonks fixture snapshot |
| Novel / commentary-driven (e.g. "will VAR be mentioned", "will the manager react") | Anakin `search`/`agentic_search` over live text commentary | Anakin `search` (fallback: void/refund if inconclusive at lock) |

See [BENTO_INTEGRATION.md](./BENTO_INTEGRATION.md) and [ANAKIN_INTEGRATION.md](./ANAKIN_INTEGRATION.md) for exact calls.

## Reused assets

- Swipe deck UI: `~/Desktop/bento/txodds.fun` (`DeckFlow.tsx`, `Reel.tsx`, `BuySheet.tsx`) — points at a new data source, UI mostly unchanged.
- Telegram distribution shell: `~/Desktop/bento/txoddsfunbot` (`src/bot/bot.ts`, `telegraf` WebApp button) — repointed to push Pulse alerts instead of its own chat UI.
- Signal engine (`src/pundit/signals.ts` in the bot repo) is **not** in v1 scope — it's a slower-odds-timeseries mechanic, orthogonal to 5-minute resolution. Candidate for v2 if time remains (see BUILD_PLAN.md).

## Open product questions

- What happens to a bet if a prop is still open when the match itself ends (extra time / early finish)? → void + refund, simplest safe default.
- What happens if Anakin can't confirm a novel prop by lock time? → void + refund, same default. Never resolve without a source.
- How many concurrent open props per user at once? → cap the deck at last 3 open + queue the rest, avoid overwhelming the swipe UX.

# Pulse — Architecture

## Services

```mermaid
flowchart TD
    subgraph Worker["pulse-worker (new, Node/TS)"]
        GEN[Generator loop\nevery ~60s tick]
        RES[Resolver loop\npolls open props]
        SM[Sportmonks poller]
        AK[Anakin client]
    end

    subgraph Bento["Bento SDK (@bento.fun/sdk)"]
        PM[ParentMarketsUserApi]
        DU[DuelsUserApi]
        RT[RealtimeClient]
    end

    subgraph Web["txodds.fun (existing, repointed)"]
        DECK[Swipe deck]
    end

    subgraph Bot["txoddsfunbot (existing, repointed)"]
        TG[Telegram alerts + Mini App launcher]
    end

    GEN -->|createDuel / addChildDuel| DU
    GEN -->|createParentMarket (once per fixture)| PM
    SM --> RES
    AK --> RES
    RES -->|resolve| DU
    Web -->|listDuels / subscribeToDuel| Bento
    DECK --> Web
    GEN -->|new prop event| TG
    RES -->|resolved event| TG
```

## Components

### 1. `pulse-worker` (new service — the only genuinely new backend)

A small long-running Node/TS process (or a cron-style loop if simpler for the demo). Two responsibilities, both driven off one fixture at a time:

- **Generator loop** (~every 60s, but only *creates* a new prop batch every ~4–5 min per fixture): picks 2–3 questions from the templated pool + attempts 1 Anakin-sourced novel question, calls Bento to create the duel(s), locks them 5 minutes out, emits a "new prop" event.
- **Resolver loop** (runs continuously, ~every 20–30s): for every open prop nearing or past its lock time, checks the appropriate resolver (Sportmonks snapshot for structured props, Anakin search for novel props), calls `resolve()`, emits a "resolved" event.

Both loops are single-fixture-scoped for the demo — no need to generalize to N concurrent matches on day one.

### 2. Bento layer

- One `createParentMarket` call per fixture at kickoff (or demo start) — every 5-minute prop is a **child duel** under it (`addChildDuel`), which keeps the deck query simple ("give me all open child duels of this parent") and keeps admin/resolution scoped per match.
- `resolve()` is called by the same account that created the duel (the worker's own Bento identity/API key) — see BENTO_INTEGRATION.md for the exact auth model and the risk flag around this.
- Credits collateral only (`collateralMode: 'credits'`) — no USDC path in v1.

### 3. Web (`txodds.fun`, repointed not rewritten)

- `src/lib/backend.ts` gets a new function, `listOpenPulseProps(parentMarketId)`, replacing the current Polymarket-clone calls.
- `DeckFlow.tsx`/`Reel.tsx` keep their existing swipe mechanics; each card gains a countdown-to-lock ring driven by the duel's lock timestamp.
- Realtime: either poll every 15–20s (simplest, safest for a demo) or wire `sdk.realtime.subscribeToDuel` if time allows — start with polling, upgrade only if the core loop is solid early.

### 4. Bot (`txoddsfunbot`, repointed not rewritten)

- Drop the custodial wallet + in-chat trading entirely (see prior migration notes — this was already flagged as the biggest scope cut).
- Keep `telegraf`, add a `Markup.button.webApp` pointing at the web deck (Telegram Mini App).
- Subscribe to the worker's "new prop" / "resolved" events (simplest: worker posts directly to the bot's chat via the Telegram Bot API, no need for a message queue at hackathon scale).

## Data flow for one prop, start to finish

1. Worker generator tick → builds question → `sdk.user.duels.createDuel({ parentMarketId, question, lockAt: now+5min, collateralMode: 'credits' })`
2. Worker posts to Telegram: "⚡ NEW: <question> — closes in 5:00"
3. Web deck's next poll picks up the new open child duel, renders a card with a countdown ring
4. User swipes right → `estimateBuy` → `placeBet` (existing Bento flow, unchanged from prior migration plan)
5. At lock time, resolver loop checks Sportmonks (or Anakin for novel props) → `resolve({ duelId, outcome })`
6. Worker posts to Telegram: "✅ RESOLVED: <question> — YES" ; web deck's next poll reflects settled state, card shows result

## Why a separate worker instead of cramming this into the Next.js app

Next.js serverless functions are request-driven, not long-running loops. A generator/resolver that needs to tick every 20–60s regardless of traffic is a natural fit for a small standalone process (even a single `setInterval` script deployed as a Render/Railway worker, matching the existing bot's `render.yaml` deploy pattern). Keep it dumb and single-purpose — this is the piece most likely to need debugging live during the hackathon, so simplicity beats elegance here.

## Tech stack decisions

| Concern | Choice | Why |
|---|---|---|
| Worker runtime | Node/TS, same toolchain as the bot repo | Reuse `viem`, `axios`, `dotenv` deps already in `txoddsfunbot/package.json` |
| Worker deploy | Same Render pattern as `txoddsfunbot` (`render.yaml`, `Dockerfile`) | Already proven to work for this team |
| Web realtime | Polling first, WS upgrade optional | De-risk — polling is boring but never surprises you mid-demo |
| Collateral | Credits only | No custody risk, no finality-lag risk, matches hackathon's free-play requirement |

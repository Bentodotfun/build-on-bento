# Pulse

## Project

| Field | Your answer |
|-------|-------------|
| **Project name** | Pulse — Swipe Sports |
| **Tagline** | Swipe sports. See what the smart money bet. Back it in one tap. |
| **Team name** | Pulse |
| **Team members** | Zeel (zeel991) |
| **Contact email** | darjizeel587@gmail.com |
| **Track** (if applicable) | Consumer & Fan Experiences |

### Links

| | URL |
|---|-----|
| **Live demo** | https://pulse-web-brown.vercel.app |
| **Demo video** (≤2 min) or slide deck | <!-- add link --> |
| **Pitch deck** (optional) | |

---

## What you built

Pulse is a swipeable, video-first sports prediction deck built on the Bento SDK. Every card is
a live Bento market — a real fixture prop ("Will there be a penalty?", "Red card before
half-time?", "Next substitution?") shown over a full-bleed video of the actual teams involved —
and a swipe or a tap takes you straight into YES/NO, one wallet signature away from a real
on-chain bet. It's built for fans who want the immediacy of a match-day social feed with the
stakes of a real market, without ever leaving the deck to hunt through an orderbook.

A companion worker (`./worker`) keeps the deck alive: it researches real fixtures and match
events live via the Anakin search API, generates fresh micro-prop markets directly on Bento
around them, and resolves them once the underlying event is confirmed — so the deck is never
just a static list of markets someone seeded once, it's continuously topped up around what's
actually happening.

### Screenshots

Add 2-4 screenshots or GIFs under `./assets/` and embed them here.

```
<!-- ![Deck](./assets/deck.png) -->
```

---

## Bento integration

| Surface | Yes / No | Describe (if Yes) |
|---------|----------|-------------------|
| Markets / duels (browse, bet, create) | Yes | `sdk.public.listDuels` / `sdk.public.getDuelById` power the deck (`web/src/lib/bento.ts`); `sdk.user.bets.estimateBuy` + `sdk.user.bets.placeBet` power the buy sheet (`web/src/app/api/bet/*`); the worker creates and resolves markets directly (`worker/src/generator.ts`, `worker/src/resolver.ts`, `worker/src/create-one.ts`) |
| Multi-outcome / parent markets | No | |
| Parlays | No | |
| Tournaments / F1 / fantasy | No | |
| Packs | No | |
| Polymarket bridge | No | |
| Agents | No | |
| Realtime / social | Yes | Every card and every placed bet generates a shareable, unfurling link (`web/src/app/s/[data]`) with a dynamically rendered OG image |
| Others | Yes | EOA wallet auth via `sdk.public.auth.eoaLogin`/`eoaRegister` with a signed-message challenge (`web/src/app/api/auth/bento`), plus testnet faucet funding on first connect (`web/src/app/api/auth/fund`) |

**Builder API key:** minted from [docs.bento.fun - Builder API key](https://docs.bento.fun/concepts/builder-api-key) (testnet). Not committed — see `.env.example` in each folder.

---

## How to run

This submission ships the actual project source in two folders:

- `./web` — the Next.js app (the deck, wallet auth, betting, share cards)
- `./worker` — the standalone script that generates and resolves markets on Bento, researched via Anakin

```bash
# web app
cd web
cp .env.example .env   # fill BENTO_URL + BENTO_BUILDER_API_KEY at minimum
npm install
npm run dev

# market-generating worker (optional, run alongside the app)
cd worker
cp .env.example .env
npm install
npm run generator      # creates markets on Bento from live fixture research
npm run resolver       # resolves them once the underlying event is confirmed
```

| Env var | Required | Description |
|---------|----------|-------------|
| `BENTO_BUILDER_API_KEY` | yes | Testnet builder key |
| `BENTO_URL` | yes | Markets host (`https://internal-server.bento.fun`) |
| `PULSE_BOT_PRIVATE_KEY` | yes (web) | Server wallet used by `/api/auth/fund` to top up new users from the testnet faucet |

---

## Architecture (short)

- **Stack:** Next.js 16 (App Router, Turbopack) on Vercel, Bento SDK (`@bento.fun/sdk`), viem for wallet signing; a standalone Node/TypeScript worker for market generation and resolution.
- **Repo layout:** `web/` (the deck, all user-facing UI + API routes) and `worker/` (market lifecycle — generation researched via Anakin, resolution) share the Bento testnet catalog; the worker writes tracked-duel state that `web` reads to prioritize Pulse's own generated markets in the deck.
- **Auth:** EOA wallet connect → sign a login message → exchanged server-side for a Bento session JWT. No seed phrases, no separate custodial account.
- **What's on-chain vs off-chain:** Markets, bets, and settlement are all on Bento (on-chain). Fixture research (Anakin) and the credits-balance estimate shown in the UI (Bento has no live balance-read endpoint yet) are off-chain/local conveniences layered on top.

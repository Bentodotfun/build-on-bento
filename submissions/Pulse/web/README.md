# Pulse — Swipe Sports

A swipeable, video-first sports prediction deck, built on the **Bento SDK**. Swipe through
live markets, see the real odds, tap **YES / NO**, and back it in one signature — no seed
phrase, no gas.

## What it does

- **Video deck** — every card is a live Bento market over a full-bleed team/player video
  background, with real odds and "$X in play".
- **One-tap trading** — connect an EVM wallet, sign once, back any call.
- **Credits balance** — funded from the Bento testnet faucet on first connect.
- **Portfolio** — your credits balance and a local record of the bets you've placed this
  session, each linking to its on-chain transaction.
- **Shareable cards** — every card and every bet you place generates a shareable image with
  an unfurling link (`/s/[data]`) for X / iMessage / Telegram.
- **Self-generating markets** — a companion worker (`../pulse/worker`) creates and resolves
  micro-prop markets (penalty? red card? substitution?) around real fixtures, researched live
  via the Anakin search API, and creates them directly on Bento.

## Stack

- **Next.js 16 (App Router, Turbopack)** on **Vercel**
- **Bento SDK** (`@bento.fun/sdk`) — market catalog, auth, and bet placement
  - `src/lib/bento.ts` → `/api/deck` — reads live markets, overlays real prices
  - `src/lib/bentoAuth.ts` — client-side wallet connect + Bento session
  - `src/app/api/auth/bento`, `/api/auth/fund`, `/api/bet/estimate`, `/api/bet/place` — server
    routes that keep the builder API key off the client
- **viem** for EOA wallet signing
- Next.js `ImageResponse` (Satori) for the favicon, app icons, and OG share cards

## Local dev

```bash
cp .env.example .env   # fill in BENTO_URL + BENTO_BUILDER_API_KEY at minimum
npm install
npm run dev
```

To also see Pulse's own generated markets in the deck (rather than just the shared Bento
testnet catalog), run the worker in `../pulse/worker` alongside this app — see its own
README for `generator`/`resolver`/`seed` scripts.

## Config

All backend base URLs and tokens are **server-side env vars** (see `.env.example`). Nothing
sensitive is shipped to the client; API routes proxy everything. Bento has no confirmed
live balance-read endpoint, so the credits shown in the header/portfolio are a local running
estimate seeded from the testnet faucet, not an on-chain read.

## Deploy

```bash
vercel --prod
```

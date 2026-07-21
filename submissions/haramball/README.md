# haramball.xyz

## Project

| Field | Your answer |
|-------|-------------|
| **Project name** | haramball.xyz |
| **Tagline** | A mobile-first World Cup prediction-market client for Bento. |
| **Team name** | haramball |
| **Team members** | dinxsh |
| **Contact email** | Submitted via the official BLR Edition form |
| **Track** (if applicable) | Bento markets / sports prediction markets |

### Links

| | URL |
|---|-----|
| **Live demo** | https://minutestriker.vercel.app |
| **Source repo** | https://github.com/dinxsh/mineets |
| **Demo video** (<=2 min) or slide deck | [Slide deck](./SLIDES.md) |
| **Pitch deck** (optional) | |

---

## What you built

haramball.xyz is a mobile-first World Cup prediction-market client designed to make Bento markets feel fast, social, and matchday-native. It turns a Bento market into a fan workflow: browse live match markets, pick a YES/NO side, preview the expected shares and slippage, place the bet, then see the ticket and portfolio reconciliation state update after acceptance. The app is built for fans who want a cleaner matchday loop than a raw trading screen, with lightweight profile onboarding, leaderboard identity, and compact market tickets. Bento powers the public market catalog, market detail reads, wallet-signed authentication, quote estimation, bet placement, and post-acceptance portfolio polling.

Key product surfaces:

- **Match market feed:** Bento public market discovery is presented as a mobile-first World Cup board.
- **YES/NO ticket drawer:** Users choose an outcome, enter stake, preview the quote, and confirm the position.
- **Wallet and account state:** The UI separates the signing wallet from the Bento market account so users can understand what is connected.
- **Fan profile and leaderboard:** A lightweight social layer makes repeated market participation feel like a game-day identity.
- **Portfolio reconciliation:** Accepted bets are followed by account/position polling so the user can verify the result.
- **Backend readiness:** The app exposes a readiness check for Builder API key and Bento host configuration without leaking secrets to the browser.

### Screenshots

The live demo is available at https://minutestriker.vercel.app. The app is optimized for mobile-width matchday use, with the market feed, ticket drawer, profile, leaderboard, and portfolio states available in the deployed build.

---

## Bento integration

For each surface: put **Yes** or **No**. If Yes, briefly describe how (SDK methods, feature, etc.).

| Surface | Yes / No | Describe (if Yes) |
|---------|----------|-------------------|
| Markets / duels (browse, bet, create) | Yes | Public market discovery, market detail by `duelId`, quote estimation, and bet placement via Bento SDK-backed API routes. |
| Multi-outcome / parent markets | No | Current scope focuses on binary YES/NO World Cup markets. |
| Parlays | No | Not in the initial submission scope. |
| Tournaments / F1 / fantasy | No | Not in the initial submission scope, though the app is themed around sports events. |
| Packs | No | Not in the initial submission scope. |
| Polymarket bridge | No | Not in the initial submission scope. |
| Agents | No | Not in the initial submission scope. |
| Realtime / social | Yes | Profiles, leaderboard identity, match tickets, and portfolio polling create a social matchday loop around Bento markets. |
| Others | Yes | Server-side readiness checks keep Builder API key configuration out of the browser bundle. |

**Builder API key:** minted from [docs.bento.fun - Builder API key](https://docs.bento.fun/concepts/builder-api-key) (testnet). Do **not** commit keys.

---

## How to run

Use the source repository:

```bash
git clone https://github.com/dinxsh/mineets.git
cd mineets
npm install
copy .env.example .env.local
npm run dev
```

Open `http://127.0.0.1:5173` and check `http://127.0.0.1:5173/api/bento-readiness`.

| Env var | Required | Description |
|---------|----------|-------------|
| `BENTO_BUILDER_API_KEY` | yes | Testnet builder key used server-side. |
| `BENTO_URL` | yes | Markets host (`https://internal-server.bento.fun`). |
| `BUILDER_API_KEY` | optional | Hackathon-note alias accepted by the app. |
| `PARLAY_TOURNMENT_URL` | if needed | `https://bento-fun-tournaments-backend-3nku.onrender.com`. |

Verification:

```bash
npm test
npm run build
```

---

## Architecture (short)

- **Stack:** React 19, Vite 6, `@bento.fun/sdk`, serverless API routes, Node test runner.
- **Repo layout:** `src/` contains the client experience, `api/` contains Bento-facing server routes, `server/` contains shared backend helpers, and `scripts/` contains setup utilities.
- **Auth:** Browser wallet signs Bento's EOA login message; the backend keeps the Builder API key server-side and user actions use Bento JWT auth.
- **What's on-chain vs off-chain:** Bento markets and positions settle through Bento's market infrastructure; haramball.xyz handles the frontend, profiles, leaderboard identity, tickets, readiness checks, and reconciliation UI.

# Dibs — Detailed Project Documentation

## Overview

Dibs is a Chrome extension that transforms any tweet on X/Twitter into a prediction market in one click. It bridges the gap between casual social media browsing and on-chain betting by removing every piece of crypto friction — no wallet setup, no seed phrases, no token purchases. Users sign in with just their X handle, and the backend handles everything else: wallet creation, Bento authentication, and credit management.

The core loop is simple: see a claim on X → click ⚡ → confirm the AI-generated question → the market goes live on Bento testnet → others see odds and bet.

---

## Problem Statement

Prediction markets are powerful information aggregation tools, but they suffer from two adoption barriers:

1. **Crypto UX friction** — Wallet setup, gas fees, bridge tokens. Most people never get past this.
2. **Empty context** — Traditional markets just show odds. Bettors have to do their own research to decide whether to bet.

Dibs solves both: custodial wallets eliminate the crypto learning curve, and Anakin-powered research delivers context alongside every market so users bet informed.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   X/Twitter (DOM)                    │
│  ┌──────────────────────────────────────────────┐   │
│  │  Content Script (content-script.js)           │   │
│  │  - Scans tweets via MutationObserver          │   │
│  │  - Extracts tweet text, author, ID, timestamp │   │
│  │  - Injects ⚡ Create button / odds badge      │   │
│  │  - Shows confirmation card + range slider     │   │
│  └──────────────┬───────────────────────────────┘   │
│                 │ chrome.runtime.sendMessage         │
└─────────────────┼───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│           Background Worker (background.js)          │
│  - Proxies all API calls (keeps keys server-side)   │
│  - 25s timeout cap per request                      │
│  - Message types: CHECK_MARKET, DRAFT_MARKET,       │
│    CREATE_MARKET, PLACE_BET, GET_USER_STATS         │
└─────────────────┬───────────────────────────────────┘
                  │ fetch() to localhost:3000
                  │
┌─────────────────▼───────────────────────────────────┐
│              Express Backend (server.js)              │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  routes/     │  │  lib/        │  │  models/   │ │
│  │  ─────────── │  │  ─────────── │  │  ─────────  │ │
│  │  markets.js  │  │  bento.js    │  │  Market.js │ │
│  │  users.js    │  │  ai.js       │  │  User.js   │ │
│  │  bets.js     │  │  anakin.js   │  │  Bet.js    │ │
│  │  pools.js    │  │  bento-auth  │  │            │ │
│  │  leaderboard │  │  xApi.js     │  │            │ │
│  └──────┬───────┘  └──────┬───────┘  └────────────┘ │
└─────────┼──────────────────┼─────────────────────────┘
          │                  │
          ▼                  ▼
   ┌──────────┐      ┌──────────────┐
   │  Bento   │      │   MongoDB    │
   │ Testnet  │      │   (Atlas)    │
   │ - duels  │      │ - markets    │
   │ - bets   │      │ - users      │
   │ - auth   │      │ - bets       │
   └──────────┘      └──────────────┘
```

---

## Backend Components

### Routes

#### markets.js — Market lifecycle

- **POST /markets/draft** — Receives tweet text + author. Calls `ai.buildQuestionFromTweet()` (OpenRouter) to convert the tweet into a structured yes/no question with resolution criteria. Then calls `anakin.searchClaim()` for web research, and `ai.generateHookLine()` for the one-liner. Returns the draft for user review.
- **POST /markets** — User confirms the draft. Validates the question, creates a Bento managed account for the user if needed, creates a claim duel on Bento with `createClaimDuel()`, saves to MongoDB. Accepts custom `resolvesBy` deadline (6-48 hours).
- **GET /markets/by-tweet/:tweetId** — Quick lookup to check if a tweet already has a market. Used by the extension on page load.
- **GET /markets/:id/ai-analysis-predict** — POST endpoint that takes a question + resolution criteria, researches it via Anakin, then asks OpenRouter to predict YES/NO with confidence.
- **POST /markets/:id/resolve** — Creator-only resolution. Verifies ownership, resolves on Bento, settles bets, updates user stats.

#### users.js — User management

- **POST /users** — Creates user by X handle. Automatically provisions a Bento managed account (`sdk.public.managedAccount.create`), storing the address and JWT. This gives every user a custodial wallet from the moment they sign up — no extra steps.
- **GET /users/:id** — Returns user stats (wins, losses, streak) and refreshes the Bento managed account balance with 5-minute cache.
- **POST /users/:id/mint** — Mints testnet credits to the user's managed wallet for betting.

#### pools.js — Read-only pool views

- **GET /pools** — Lists markets with live odds, volume, and AI sentiment. Optionally refreshes Bento odds inline (`?refresh=true`). Returns `PoolSummary[]` with `bentoMarketId` for direct testnet linking.
- **GET /pools/:id** — Single pool detail with full Anakin research context, participant count, vote breakdown, and live odds.

#### bets.js — Bet placement

- **POST /bet** — Two-step flow: estimates the bet via `sdk.user.bets.estimateBuy`, then places via `sdk.user.bets.placeBet`. Records the bet in MongoDB for stat tracking.

### Libraries

#### lib/ai.js — OpenRouter integration

All AI calls go through OpenRouter (`tencent/hy3:free` model) with a retry mechanism:

- `buildQuestionFromTweet()` — Converts tweet to structured market question per PROMPT.md spec. Handles subjective claims by converting opinions into measurable outcomes.
- `extractClaim()` — Strips the core factual claim from a tweet for research.
- `generateHookLine()` — Creates a punchy 12-word-max hook from claim + research.
- `predictOutcome()` — Based on Anakin research, predicts YES/NO with confidence and analysis.
- `assessResolution()` — Evaluates evidence to determine if a claim resolved true/false.
- `diagnosePreflightFailure()` — Best-effort debugging for Bento on-chain failures.

Retry logic: 2 retries with exponential backoff (1.5s → 3s) for transient errors (429, 503, rate limits, timeouts).

#### lib/anakin.js — Web research

- `searchClaim()` — Takes a market question, performs agentic search via Anakin API. Returns structured research with summary, source URLs, and context snippets.
- Used in: market draft creation, AI prediction, resolution assessment.

#### lib/bento.js — Bento SDK wrapper

- `createBentoSdk()` — Initializes the SDK with Builder API key and custom JWT (user-scoped).
- `createClaimDuel()` — Creates a 2-option binary market on Bento with custom `resolvesBy` date.
- `getUserManagedAccountBalance()` — Reads user wallet balance.
- `estimateBet()` / `placeBet()` / `getDuel()` / `resolveDuel()` — Standard Bento operations.

### Database Models

#### Market (MongoDB)

| Field | Type | Description |
|-------|------|-------------|
| `tweetId` | String | Source tweet ID |
| `tweetText` | String | Original tweet content |
| `tweetAuthorHandle` | String | @handle |
| `bentoMarketId` | String | Bento duel ID |
| `question` | String | Market question |
| `resolutionCriteria` | String | How truth is determined |
| `resolvesBy` | Date | Deadline |
| `hookLine` | String | One-liner summary |
| `category` | String | Sport category |
| `contextSnippets` | [String] | Anakin research excerpts |
| `sourceUrls` | [String] | Research source URLs |
| `creatorUserId` | ObjectId | Market creator |
| `status` | String | open / resolved_true / resolved_false |
| `oddsTrue` / `oddsFalse` | Number | Cached odds (0-1) |
| `volume` | Number | Total volume in credits |

#### User (MongoDB)

| Field | Type | Description |
|-------|------|-------------|
| `xHandle` | String | Unique X handle |
| `bentoManagedAccountAddress` | String | Bento managed wallet address |
| `bentoJwt` | String | Cached Bento auth JWT |
| `bentoManagedAccountBalance` | String | Cached balance (wei) |
| `stats.wins` / `stats.losses` | Number | Betting record |
| `stats.currentStreak` / `bestStreak` | Number | Streak data |

#### Bet (MongoDB)

| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId | Better |
| `marketId` | ObjectId | Market reference |
| `pick` | Boolean | true (YES) or false (NO) |
| `amount` | Number | Stake in credits |
| `resolved` | Boolean | Settlement status |

---

## Extension Components

### content-script.js

The main injection script that runs on X/Twitter. Key responsibilities:

1. **Tweet scanning** — `MutationObserver` on `document.body` detects new tweets. Each `article[data-testid="tweet"]` is processed once.
2. **Data extraction** — Reads `time` element for timestamp, `tweetText` for content, href for tweet ID and author handle.
3. **Market check** — Sends `CHECK_MARKET` message to background worker. If a market exists, shows a color-coded odds badge. If not, shows a ⚡ button.
4. **Market creation flow** — Clicking ⚡ triggers the draft → confirmation card → create flow:
   - Draft: `ai.buildQuestionFromTweet()` generates question + criteria
   - Confirmation card: shows editable question, category selector, deadline slider (6-48h), hook line
   - Create: sends to backend, which deploys on Bento
5. **Pool details modal** — Clicking an odds badge opens a summary with participant count, votes, volume, AI analysis button, and link to Bento testnet.

### background.js

Service worker that mediates all communication between content script and backend:

- Proxies all API calls (API keys stay on the server)
- 25-second timeout per request (critical for Manifest V3 — longer hangs cause "message channel closed" errors)
- Handles 5 message types: `CHECK_MARKET`, `DRAFT_MARKET`, `CREATE_MARKET`, `PLACE_BET`, `GET_USER_STATS`

### Popup (popup.js / popup.html)

The extension icon popup showing:

- **Stats strip** — Wins, losses, current streak, credit balance (with count-up animation)
- **Recent markets** — Clickable list of recent markets with odds dots
- **Betting modal** — YES/NO selection, stake input, Place Bet button, AI Analysis button, Bento testnet link
- **First-run setup** — X handle input for onboarding

### Flow Chart

```
User sees tweet on X
        │
        ▼
Content script injects ⚡ button
        │
        ▼
User clicks ⚡
        │
        ▼
Background sends DRAFT_MARKET → Backend calls OpenRouter + Anakin
        │
        ▼
Confirmation card appears with:
  - Auto-generated question (editable)
  - Category selector
  - Deadline slider (6-48h)
  - AI hook line
        │
        ▼
User confirms → Backend creates Bento duel → Pool badge appears
        │
        ▼
Other users see the badge with live odds
        │
        ▼
Click badge → Pool summary → AI Analysis → Bet on Bento
```

---

## Key Design Decisions

### 1. Custodial wallets (no MetaMask)

Users never see a wallet. The backend generates EVM wallets using `viem` and stores the encrypted private key in MongoDB. On the user's first market creation, the backend also creates a Bento managed account (`sdk.public.managedAccount.create`). This means:
- Zero onboarding friction
- No gas fees for users
- Server can sign Bento auth messages on behalf of the user
- Credits (testnet money) can be fauceted directly to the managed wallet

### 2. DOM scraping over X API

The content script reads tweet data directly from the page DOM instead of calling the X API. This removes the need for a paid X developer account for core functionality. The X API is only needed for the optional auto-reply feature (posting a reply to the original tweet with a market link).

### 3. AI-first claim validation

Instead of letting users type arbitrary questions, the AI layer converts tweets into structured, resolvable binary questions. The prompt is strict about:
- Converting subjective claims ("great weekend" → "Will Piastri finish top 5?")
- Time-bounding every question
- Outputting machine-parseable JSON
- Only rejecting pure spam or gibberish

### 4. Two-phase market creation

Markets go through a draft phase (AI generates question + research) and a confirmation phase (user edits + deadline picker). This prevents junk markets while still being fast (under 10 seconds end-to-end).

---

## API Endpoints Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/markets/draft` | Extension | AI validates tweet → question + criteria |
| POST | `/markets` | Extension | Create Bento duel |
| GET | `/markets/by-tweet/:tweetId` | Public | Check existing market |
| GET | `/markets/:id` | Public | Market details |
| POST | `/markets/:id/ai-analysis-predict` | Public | AI prediction |
| POST | `/markets/:id/resolve` | Creator | Resolve market |
| GET | `/markets/:id/suggestion` | Public | AI resolution suggestion |
| GET | `/pools` | Public | List pools with odds |
| GET | `/pools/:id` | Public | Pool detail |
| POST | `/bet` | Extension | Place bet |
| POST | `/users` | Public | Create/get user |
| GET | `/users/:id` | Public | User stats + balance |
| POST | `/users/:id/mint` | User | Mint testnet credits |
| GET | `/leaderboard` | Public | Top players |

---

## Setup & Deployment

### Prerequisites
- MongoDB Atlas cluster
- Bento testnet Builder API key
- Anakin API key
- OpenRouter API key

### Backend
```bash
cd backend
cp .env.example .env
# Fill in: BENTO_BUILDER_API_KEY, BENTO_URL, ANAKIN_API_KEY, 
#          OPENROUTER_API_KEY, MONGODB_URI, PORT=3000
npm install
npm start
```

### Extension
1. Open `chrome://extensions/`
2. Enable Developer mode
3. Click "Load unpacked" → select `extension/` folder
4. Pin the extension, navigate to X.com

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | Yes | `3000` | Server port |
| `MONGODB_URI` | Yes | — | MongoDB Atlas connection string |
| `BENTO_BUILDER_API_KEY` | Yes | — | Bento testnet builder API key |
| `BENTO_URL` | Yes | — | Bento markets host |
| `ANAKIN_API_KEY` | Yes | — | Anakin agentic search API key |
| `OPENROUTER_API_KEY` | Yes | — | OpenRouter API key |
| `OPENROUTER_MODEL` | No | `tencent/hy3:free` | AI model |
| `ENCRYPTION_KEY` | Yes | — | Wallet private key encryption |
| `X_API_ENABLED` | No | `false` | Enable auto-reply posting |

---

## Testing Notes

- Markets use `collateralMode: 'credits'` (testnet money, no geo-gating)
- Bento duels have a 31-minute bootstrap window for public markets
- Bet placement is a two-step flow: `estimateBuy` → `placeBet`
- Bento writes return "accepted" (not "settled") — poll with `getDuelById` to confirm
- All amounts are in wei (18 decimals) — use the `toWei()` helper

---

## File Tree (relevant paths)

```
backend/
├── server.js                  # Express entry point
├── lib/
│   ├── ai.js                  # OpenRouter integration, retry logic
│   ├── anakin.js              # Anakin search API
│   ├── bento.js               # Bento SDK wrapper
│   └── bento-auth.js          # Bento auth utilities
├── routes/
│   ├── markets.js             # Market CRUD + AI prediction
│   ├── users.js               # User management + wallet creation
│   ├── bets.js                # Bet placement
│   ├── pools.js               # Public pool views
│   └── leaderboard.js         # Leaderboard
├── models/
│   ├── Market.js              # Market schema
│   ├── User.js                # User schema
│   └── Bet.js                 # Bet schema
└── .env.example               # Env template

extension/
├── manifest.json              # Manifest V3
├── content-script.js          # Tweet scanner, button injection
├── background.js              # API proxy, message handler
├── content-styles.css         # Injected styles (badges, cards)
├── popup/
│   ├── popup.html             # Extension popup
│   ├── popup.js               # Popup logic + betting modal
│   └── popup.css              # Popup styles
└── icons/                     # Extension icons

frontend/
├── src/
│   ├── routes/
│   │   ├── index.tsx          # Landing page
│   │   ├── pools.tsx          # Live pools list
│   │   ├── pools.$id.tsx      # Pool detail page
│   │   └── api/               # API proxy routes
│   ├── components/
│   │   ├── PoolCard.tsx       # Pool card
│   │   ├── SiteHeader.tsx     # Header with brand
│   │   └── ...
│   └── styles.css             # Tailwind + brand tokens

screenshots/
├── landingpage.png
└── poolspage.png
```

# Project name

> Copy this folder to `submissions/YourTeamName/` and fill every section below.

## Project

| Field | Your answer |
|-------|-------------|
| **Project name** | |
| **Tagline** | |
| **Team name** | |
| **Team members** | |
| **Contact email** | |
| **Track** (if applicable) | |

### Links

| | URL |
|---|-----|
| **Live demo** | |
| **Demo video** (≤2 min) or slide deck | |
| **Pitch deck** (optional) | |

---

## What you built

Describe the product in 3-6 sentences: who it is for, what problem it solves, and how it uses Bento.

```
<!-- Write here -->
```

### Screenshots

Add 2-4 screenshots or GIFs under `./assets/` and embed them here.

```
<!-- ![Home](./assets/home.png) -->
```

---

## Bento integration

For each surface: put **Yes** or **No**. If Yes, briefly describe how (SDK methods, feature, etc.).

| Surface | Yes / No | Describe (if Yes) |
|---------|----------|-------------------|
| Markets / duels (browse, bet, create) | | e.g. `sdk.public.listDuels`, `sdk.user.placeBet` |
| Multi-outcome / parent markets | | |
| Parlays | | |
| Tournaments / F1 / fantasy | | |
| Packs | | |
| Polymarket bridge | | |
| Agents | | |
| Realtime / social | | |
| Others | | |

**Builder API key:** minted from [docs.bento.fun - Builder API key](https://docs.bento.fun/concepts/builder-api-key) (testnet). Do **not** commit keys.

---

## How to run

```bash
# from this folder, or link to your external repo
cp .env.example .env   # fill env vars
npm install            # or pnpm / yarn
npm run dev
```

| Env var | Required | Description |
|---------|----------|-------------|
| `BENTO_BUILDER_API_KEY` | yes | Testnet builder key |
| `BENTO_URL` | yes | Markets host (`https://internal-server.bento.fun`) |
| `PARLAY_TOURNMENT_URL` | if needed | `https://bento-fun-tournaments-backend-3nku.onrender.com` |

---

## Architecture (short)

- **Stack:**
- **Repo layout:**
- **Auth:**
- **What's on-chain vs off-chain:**

Optional: drop a simple diagram in `./assets/architecture.png`.

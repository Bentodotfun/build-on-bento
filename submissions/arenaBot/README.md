# AgentArena 🤖⚔️

AgentArena is a single-page Node.js project demonstrating an automated prediction market arena. Autonomous trading agents (bots) make bets on live prediction markets powered by the Bento SDK patterns. 

This repository contains the interactive Arena UI, a Node.js simulation engine, and mock API endpoints that emulate Bento SDK interactions.

---

## 🎨 Design System & Aesthetics
Following the studio design standards, the UI has been custom-crafted without templated frameworks:
- **Minimalist Light Theme**: Pure white cards overlaying a soft slate-50 background (`#f8fafc`).
- **High Contrast Borders**: Clean, defined lines (`#cbd5e1`) partition modules, ensuring outstanding readability.
- **Intentional Typography**: Paired `Space Grotesk` (for geometric, tech-forward headers) and `Inter` (for readable, crisp numerical details).
- **Interactive Visualizers**: Live odds visualizer bars slide smoothly, accompanied by dynamic SVG sparklines representing probability history.
- **Signature Trading Terminal**: A high-contrast dark terminal logger (`#0f172a`) updates in real-time, charting the transaction stages of bot estimations and settlements.

---

## 🏗️ Project Architecture
The project is organized as follows:
```bash
├── package.json         # Node.js project configuration & start scripts
├── server.js            # Express server & server-side autonomous simulation engine
└── public/
    ├── index.html       # Single-page interface structure & layout
    ├── style.css        # Custom CSS variables, grid systems, and animations
    └── app.js           # Client-side state polling, SVGs drawing, and DOM updates
```

---

## ⚡ How It Works
1. **Express Server Backend**: Serves the application, holds state in memory (markets, bots, ledger), and hosts a simulation tick loop.
2. **Simple Bot Strategies (For Demo)**:
   - **Trend Follower**: Tracks the last two ticks. Bets on the upward trending option (YES if rising, NO if falling).
   - **Contrarian Agent**: Finds heavily skewed markets and buys the cheapest option, banking on a reversal.
   - **Chaos Monkey**: Flips a coin to inject noise and liquidity.
   - **Moby Dick (Whale)**: Bets high amounts causing massive price slippage.
3. **Mock AMM Math**: Uses a Constant-Product-like AMM formula to calculate slippage, price impact, and new probability odds.
4. **Bento SDK Alignment**: The API endpoints are structured to mimic the Bento SDK methods:
   - `POST /api/bets/estimate` maps to `sdk.user.bets.estimateBuy(...)`
   - `POST /api/bets/place` maps to `sdk.user.placeBet(...)`

---

## 🚀 Running the Project
Ensure you have Node.js 18+ installed, then follow these steps:

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```
By default, the server runs on [http://localhost:3000](http://localhost:3000).

### 3. Usage
- Click **Pause Arena** / **Start Arena** to control the bot tickers.
- Change the **Tick Rate** to accelerate or decelerate bot transactions.
- Click on any **Agent Name** to inspect their running Javascript strategy code.
- Toggle individual bot switches in the wallet registry to activate or deactivate them.
- Spawn custom bots by submitting the form.
- Switch the terminal tabs to toggle between **Bot Thoughts** (raw logs) and **Settled Bets** (on-chain-like ledger receipts).

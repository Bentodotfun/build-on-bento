// Settlement Monitor — detects when positions resolve and calculates outcomes

import { settleConvergence } from "./strategies/convergence.js";
import { settleArbitrage } from "./strategies/arbitrage.js";

/**
 * Check all open positions and settle any that have expired.
 * In paper trading mode, we simulate settlement when expiryTime is reached.
 * @param {import('./vault.js').Vault} vault
 */
export function checkSettlements(vault) {
  const now = Date.now();
  const openPositions = vault.positions.filter((p) => p.status === "open");

  let settledCount = 0;

  for (const pos of openPositions) {
    const expiryTime = pos.expectedSettlement?.getTime() || pos.enteredAt + 3600000;

    // Check if position has expired
    if (now < expiryTime) continue;

    // Settle based on strategy
    let result;
    if (pos.strategy === "convergence") {
      result = settleConvergence(pos);
    } else if (pos.strategy === "arbitrage") {
      result = settleArbitrage(pos);
    } else {
      continue;
    }

    // Record settlement in vault
    vault.settlePosition(pos.id, result);
    settledCount++;

    const outcome = result.won ? "WIN" : "LOSS";
    const pnlStr = result.pnl >= 0 ? `+$${result.pnl.toFixed(2)}` : `-$${Math.abs(result.pnl).toFixed(2)}`;
    
    console.log(
      `  ✓ Settled ${pos.id} [${pos.strategy.toUpperCase()}] → ${outcome} ${pnlStr}`
    );
  }

  return settledCount;
}

/**
 * Simulate some positions settling immediately for demo purposes.
 * Creates realistic historical data to show in the dashboard.
 * @param {import('./vault.js').Vault} vault
 */
export function seedHistoricalSettlements(vault) {
  const demoPositions = [
    // Convergence wins
    {
      id: "C-hist-1",
      strategy: "convergence",
      market: {
        id: "demo-1",
        platform: "polymarket",
        title: "Water is wet?",
        yesPrice: 0.995,
      },
      entryPrice: 0.995,
      capital: 800,
      enteredAt: Date.now() - 8 * 3600000,
      expectedSettlement: new Date(Date.now() - 1 * 3600000),
      status: "open",
    },
    {
      id: "C-hist-2",
      strategy: "convergence",
      market: {
        id: "demo-2",
        platform: "polymarket",
        title: "2026 ends this year?",
        yesPrice: 0.991,
      },
      entryPrice: 0.991,
      capital: 700,
      enteredAt: Date.now() - 22 * 3600000,
      expectedSettlement: new Date(Date.now() - 4 * 3600000),
      status: "open",
    },
    {
      id: "C-hist-3",
      strategy: "convergence",
      market: {
        id: "demo-3",
        platform: "polymarket",
        title: "BTC > $0 today?",
        yesPrice: 0.993,
      },
      entryPrice: 0.993,
      capital: 850,
      enteredAt: Date.now() - 6 * 3600000,
      expectedSettlement: new Date(Date.now() - 2 * 3600000),
      status: "open",
    },
    // Arbitrage wins
    {
      id: "A-hist-1",
      strategy: "arbitrage",
      pair: {
        poly: { id: "demo-4", title: "ETH price pair", yesPrice: 0.54, noPrice: 0.44 },
        bento: { id: "demo-5", title: "ETH price pair", yesPrice: 0.51, noPrice: 0.47 },
      },
      totalCost: 0.97,
      capital: 1050,
      enteredAt: Date.now() - 2 * 3600000,
      expectedSettlement: new Date(Date.now() - 500000),
      expectedProfit: 31.5,
      status: "open",
    },
    {
      id: "A-hist-2",
      strategy: "arbitrage",
      pair: {
        poly: { id: "demo-6", title: "BTC $100k", yesPrice: 0.68, noPrice: 0.32 },
        bento: { id: "demo-7", title: "BTC $100k", yesPrice: 0.65, noPrice: 0.34 },
      },
      totalCost: 0.97,
      capital: 900,
      enteredAt: Date.now() - 4 * 3600000,
      expectedSettlement: new Date(Date.now() - 800000),
      expectedProfit: 27,
      status: "open",
    },
  ];

  // Add to vault and immediately settle
  for (const pos of demoPositions) {
    vault.positions.push(pos);
    
    let result;
    if (pos.strategy === "convergence") {
      result = settleConvergence(pos);
    } else {
      result = settleArbitrage(pos);
    }
    
    vault.settlePosition(pos.id, result);
  }

  console.log(`  📊 Seeded ${demoPositions.length} historical settlements for demo\n`);
}

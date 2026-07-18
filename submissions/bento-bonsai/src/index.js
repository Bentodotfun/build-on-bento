#!/usr/bin/env node
// Ben-Spread — Main orchestration loop
// Scans markets, finds opportunities, allocates capital, executes positions, monitors settlements

import "dotenv/config";
import { scanAllMarkets } from "./scanner.js";
import { findConvergenceOpportunities, executeConvergence } from "./strategies/convergence.js";
import { findArbitrageOpportunities, executeArbitrage } from "./strategies/arbitrage.js";
import { Vault } from "./vault.js";
import { checkSettlements, seedHistoricalSettlements } from "./settlement.js";
import { renderDashboard } from "./dashboard.js";

// ─── Configuration ────────────────────────────────────────────────────
const INITIAL_CAPITAL = 10000; // $10,000 starting capital
const CONVERGENCE_RATIO = 0.6; // 60% to convergence, 40% to arbitrage
const REFRESH_INTERVAL_MS = 30000; // 30 seconds

// ─── Main Loop ────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Starting Ben-Spread...\n");
  console.log(`  Initial Capital:    $${INITIAL_CAPITAL}`);
  console.log(`  Strategy Split:     ${CONVERGENCE_RATIO * 100}% Convergence / ${(1 - CONVERGENCE_RATIO) * 100}% Arbitrage`);
  console.log(`  Refresh Interval:   ${REFRESH_INTERVAL_MS / 1000}s\n`);

  // Initialize vault
  const vault = new Vault(INITIAL_CAPITAL, CONVERGENCE_RATIO);

  // Seed some historical data for demo purposes
  console.log("📊 Seeding demo data...");
  seedHistoricalSettlements(vault);

  // Main loop
  let cycleCount = 0;
  while (true) {
    cycleCount++;
    console.log(`\n━━━ Cycle ${cycleCount} ━━━`);

    try {
      // 1. Check settlements first (free up capital)
      console.log("⏳ Checking settlements...");
      const settledCount = checkSettlements(vault);
      if (settledCount > 0) {
        console.log(`  ✓ Settled ${settledCount} position(s)`);
      }

      // 2. Scan markets
      console.log("🔍 Scanning markets...");
      const { bentoMarkets, polyMarkets, allMarkets } = await scanAllMarkets();

      // 3. Find opportunities
      console.log("🎯 Finding opportunities...");
      const convergenceOpps = findConvergenceOpportunities(allMarkets);
      const arbitrageOpps = findArbitrageOpportunities();

      console.log(`  Convergence: ${convergenceOpps.length} found`);
      console.log(`  Arbitrage:   ${arbitrageOpps.length} found`);

      // 4. Allocate to convergence strategy
      const convCapital = vault.allocateToStrategy("convergence");
      if (convCapital > 100 && convergenceOpps.length > 0) {
        const opp = convergenceOpps[0]; // Take best opportunity
        const position = executeConvergence(opp, convCapital);
        vault.recordPosition(position);
      }

      // 5. Allocate to arbitrage strategy
      const arbCapital = vault.allocateToStrategy("arbitrage");
      if (arbCapital > 100 && arbitrageOpps.length > 0) {
        const arb = arbitrageOpps[0]; // Take best arbitrage
        const position = executeArbitrage(arb, arbCapital);
        vault.recordPosition(position);
      }

      // 6. Render dashboard
      renderDashboard(vault, {
        convergence: convergenceOpps,
        arbitrage: arbitrageOpps,
      });
    } catch (err) {
      console.error(`❌ Error in cycle ${cycleCount}: ${err.message}`);
      console.error(err.stack);
    }

    // Wait before next cycle
    await new Promise((resolve) => setTimeout(resolve, REFRESH_INTERVAL_MS));
  }
}

// ─── Error Handling ───────────────────────────────────────────────────

process.on("uncaughtException", (err) => {
  console.error("\n❌ Uncaught Exception:", err.message);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("\n❌ Unhandled Rejection:", err);
  process.exit(1);
});

process.on("SIGINT", () => {
  console.log("\n\n👋 Shutting down Ben-Spread...\n");
  process.exit(0);
});

// ─── Start ────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});

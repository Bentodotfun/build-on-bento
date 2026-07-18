#!/usr/bin/env node
// Quick test to verify all components work before running the full demo

import "dotenv/config";
import { scanAllMarkets } from "./src/scanner.js";
import { findConvergenceOpportunities } from "./src/strategies/convergence.js";
import { findArbitrageOpportunities } from "./src/strategies/arbitrage.js";
import { Vault } from "./src/vault.js";

async function test() {
  console.log("🧪 Running Ben-Spread component tests...\n");

  // Test 1: Scanner
  console.log("1️⃣ Testing scanner...");
  const { bentoMarkets, polyMarkets, allMarkets } = await scanAllMarkets();
  console.log(`   ✓ Bento: ${bentoMarkets.length} markets`);
  console.log(`   ✓ Poly:  ${polyMarkets.length} markets`);
  console.log(`   ✓ Total: ${allMarkets.length} markets\n`);

  // Test 2: Convergence strategy
  console.log("2️⃣ Testing convergence strategy...");
  const convOpps = findConvergenceOpportunities(allMarkets);
  console.log(`   ✓ Found ${convOpps.length} convergence opportunities`);
  if (convOpps.length > 0) {
    const top = convOpps[0];
    console.log(`   ✓ Best: "${top.market.title.slice(0, 50)}" — ${top.estimatedYield}% yield\n`);
  }

  // Test 3: Arbitrage strategy
  console.log("3️⃣ Testing arbitrage strategy...");
  const arbOpps = findArbitrageOpportunities();
  console.log(`   ✓ Found ${arbOpps.length} arbitrage opportunities`);
  if (arbOpps.length > 0) {
    const top = arbOpps[0];
    console.log(`   ✓ Best: "${top.name}" — ${top.profitPct}% profit\n`);
  }

  // Test 4: Vault
  console.log("4️⃣ Testing vault...");
  const vault = new Vault(10000, 0.6);
  console.log(`   ✓ Initial capital: $${vault.totalCapital}`);
  console.log(`   ✓ Convergence allocation: $${vault.convergenceCapital}`);
  console.log(`   ✓ Arbitrage allocation: $${vault.arbitrageCapital}`);
  console.log(`   ✓ Available capital: $${vault.availableCash}\n`);

  // Test 5: Position recording
  console.log("5️⃣ Testing position recording...");
  const demoPosition = {
    id: "TEST-1",
    strategy: "convergence",
    market: allMarkets[0],
    entryPrice: 0.99,
    capital: 500,
    enteredAt: Date.now(),
    status: "open",
  };
  vault.recordPosition(demoPosition);
  console.log(`   ✓ Position recorded: ${demoPosition.id}`);
  console.log(`   ✓ Open positions: ${vault.positions.length}`);
  console.log(`   ✓ Available cash: $${vault.availableCash}\n`);

  // Test 6: Metrics
  console.log("6️⃣ Testing metrics calculation...");
  const metrics = vault.getMetrics();
  console.log(`   ✓ Total value: $${metrics.totalValue}`);
  console.log(`   ✓ Allocated: $${metrics.allocatedCapital}`);
  console.log(`   ✓ Open positions: ${metrics.openPositions}\n`);

  console.log("✅ All tests passed! Ready to run the demo.\n");
  console.log("Run: npm start\n");
}

test().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});

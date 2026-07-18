// CLI Dashboard — displays vault metrics, opportunities, and positions

/**
 * Render the complete Ben-Spread dashboard to the console.
 * @param {import('./vault.js').Vault} vault
 * @param {Object} opportunities
 * @param {import('./models.js').ConvergenceOpportunity[]} opportunities.convergence
 * @param {import('./models.js').ArbOpportunity[]} opportunities.arbitrage
 */
export function renderDashboard(vault, opportunities) {
  console.clear();

  const metrics = vault.getMetrics();

  // ─── Header ───────────────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════════════════════════════════");
  console.log("                           BEN-SPREAD DASHBOARD");
  console.log("              Automated Dual-Strategy Prediction Market Vault");
  console.log("═══════════════════════════════════════════════════════════════════════════\n");

  // ─── Vault Metrics ────────────────────────────────────────────────────
  console.log("📊 VAULT METRICS:");
  console.log(`  Total Value:           $${metrics.totalValue.toFixed(2)}`);
  console.log(
    `  Total Return:          ${metrics.totalReturnPct >= 0 ? "+" : ""}${metrics.totalReturnPct.toFixed(2)}% ($${metrics.totalReturn.toFixed(2)})`
  );
  console.log(`  Available Cash:        $${metrics.availableCash.toFixed(2)}`);
  console.log(`  Allocated Capital:     $${metrics.allocatedCapital.toFixed(2)}`);
  console.log(`  Open Positions:        ${metrics.openPositions}`);
  console.log(`  Settled Positions:     ${metrics.settledPositions}`);
  console.log(`  Win Rate:              ${metrics.winRate.toFixed(1)}%`);
  console.log(`  Avg Holding Time:      ${metrics.avgHoldingTimeHours.toFixed(1)} hours`);

  // Estimated APY (annualized from avg holding time)
  if (metrics.settledPositions > 0 && metrics.avgHoldingTimeHours > 0) {
    const avgReturnPct = (metrics.totalPnl / metrics.allocatedCapital) * 100;
    const positionsPerYear = (365 * 24) / metrics.avgHoldingTimeHours;
    const estimatedAPY = avgReturnPct * positionsPerYear;
    console.log(`  Estimated APY:         ~${estimatedAPY.toFixed(0)}%`);
  }

  console.log("\n");

  // ─── Strategy Breakdown ───────────────────────────────────────────────
  console.log("📈 STRATEGY BREAKDOWN:");
  console.log(
    `  Convergence (${(vault.convergenceRatio * 100).toFixed(0)}%):    ` +
      `$${metrics.convergence.allocated.toFixed(0)} allocated | ` +
      `${metrics.convergence.positions} open | ` +
      `${metrics.convergence.settled} settled | ` +
      `${metrics.convergence.avgReturn >= 0 ? "+" : ""}${metrics.convergence.avgReturn.toFixed(2)}% avg`
  );
  console.log(
    `  Arbitrage (${(vault.arbitrageRatio * 100).toFixed(0)}%):       ` +
      `$${metrics.arbitrage.allocated.toFixed(0)} allocated | ` +
      `${metrics.arbitrage.positions} open | ` +
      `${metrics.arbitrage.settled} settled | ` +
      `${metrics.arbitrage.avgReturn >= 0 ? "+" : ""}${metrics.arbitrage.avgReturn.toFixed(2)}% avg`
  );

  console.log("\n");

  // ─── Convergence Opportunities ────────────────────────────────────────
  console.log("🎯 TOP CONVERGENCE OPPORTUNITIES:");
  if (opportunities.convergence.length === 0) {
    console.log("  No opportunities found (adjust filters or wait for new markets)\n");
  } else {
    const topConv = opportunities.convergence.slice(0, 5);
    for (const opp of topConv) {
      const title = opp.market.title.slice(0, 55).padEnd(55);
      const platform = opp.market.platform === "polymarket" ? "Poly" : "Bento";
      console.log(
        `  ${title} | ${platform} | ${opp.market.yesPrice.toFixed(3)} | ` +
          `${opp.holdingTimeHours.toFixed(1)}h | ${opp.estimatedYield.toFixed(2)}% yield`
      );
    }
    console.log("");
  }

  // ─── Arbitrage Opportunities ──────────────────────────────────────────
  console.log("⚡ TOP ARBITRAGE OPPORTUNITIES:");
  if (opportunities.arbitrage.length === 0) {
    console.log("  No arbitrage pairs found\n");
  } else {
    const topArb = opportunities.arbitrage.slice(0, 5);
    for (const arb of topArb) {
      const name = (arb.name || arb.pair.poly.title.slice(0, 40)).padEnd(40);
      console.log(
        `  ${name} | Cost: $${arb.totalCost.toFixed(4)} | Profit: ${arb.profitPct.toFixed(2)}% | ` +
          `YES on ${arb.buyYesOn} / NO on ${arb.buyNoOn}`
      );
    }
    console.log("");
  }

  // ─── Open Positions ───────────────────────────────────────────────────
  console.log("📋 OPEN POSITIONS:");
  const openPositions = vault.positions.filter((p) => p.status === "open");
  if (openPositions.length === 0) {
    console.log("  No open positions\n");
  } else {
    for (const pos of openPositions.slice(0, 8)) {
      const strategy = pos.strategy === "convergence" ? "CONV" : "ARB ";
      let title;
      if (pos.strategy === "convergence") {
        title = pos.market?.title?.slice(0, 45).padEnd(45) || "Unknown";
      } else {
        title = (pos.pair?.poly?.title?.slice(0, 45) || "Arb pair").padEnd(45);
      }

      const timeLeft = pos.expectedSettlement
        ? Math.max(0, (pos.expectedSettlement.getTime() - Date.now()) / 3600000).toFixed(1)
        : "?";

      console.log(
        `  [${strategy}] ${pos.id.padEnd(12)} | ${title} | $${pos.capital.toFixed(0).padStart(6)} | ${timeLeft}h left`
      );
    }
    if (openPositions.length > 8) {
      console.log(`  ... and ${openPositions.length - 8} more`);
    }
    console.log("");
  }

  // ─── Recent Settlements ───────────────────────────────────────────────
  console.log("✅ RECENT SETTLEMENTS:");
  const settledPositions = vault.positions
    .filter((p) => p.status === "settled")
    .sort((a, b) => (b.settledAt || 0) - (a.settledAt || 0));

  if (settledPositions.length === 0) {
    console.log("  No settled positions yet\n");
  } else {
    for (const pos of settledPositions.slice(0, 5)) {
      const strategy = pos.strategy === "convergence" ? "CONV" : "ARB ";
      let title;
      if (pos.strategy === "convergence") {
        title = pos.market?.title?.slice(0, 40).padEnd(40) || "Unknown";
      } else {
        title = (pos.pair?.poly?.title?.slice(0, 40) || "Arb pair").padEnd(40);
      }

      const outcome = pos.outcome === "win" ? "WIN " : "LOSS";
      const pnl = pos.realizedPnl || 0;
      const pnlStr = pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`;
      const duration = pos.settledAt
        ? ((pos.settledAt - pos.enteredAt) / 3600000).toFixed(1)
        : "?";

      console.log(
        `  [${strategy}] ${title} | ${outcome} | ${pnlStr.padStart(10)} | ${duration}h`
      );
    }
    console.log("");
  }

  // ─── Footer ───────────────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════════════════════════════════");
  console.log("  Refreshing every 30 seconds... Press Ctrl+C to exit");
  console.log("═══════════════════════════════════════════════════════════════════════════\n");
}

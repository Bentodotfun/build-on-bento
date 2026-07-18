// Vault Manager — capital tracking, allocation, position lifecycle, metrics

export class Vault {
  /** @type {import('./models.js').Position[]} */
  positions = [];

  /**
   * @param {number} initialCapital
   * @param {number} convergenceRatio - 0.0 to 1.0 (remainder goes to arbitrage)
   */
  constructor(initialCapital, convergenceRatio = 0.6) {
    this.totalCapital = initialCapital;
    this.initialCapital = initialCapital;
    this.convergenceRatio = convergenceRatio;
    this.arbitrageRatio = 1 - convergenceRatio;
  }

  // ─── Capital queries ──────────────────────────────────────────────────

  get availableCash() {
    const allocated = this.positions
      .filter((p) => p.status === "open")
      .reduce((sum, p) => sum + p.capital, 0);
    return Math.max(0, this.totalCapital - allocated);
  }

  get allocatedCapital() {
    return this.positions
      .filter((p) => p.status === "open")
      .reduce((sum, p) => sum + p.capital, 0);
  }

  get convergenceCapital() {
    return this.totalCapital * this.convergenceRatio;
  }

  get arbitrageCapital() {
    return this.totalCapital * this.arbitrageRatio;
  }

  // ─── Allocation ───────────────────────────────────────────────────────

  /**
   * How much capital is available for a given strategy right now.
   * Respects the user's ratio and position limits.
   */
  allocateToStrategy(strategy) {
    const openPositions = this.positions.filter(
      (p) => p.strategy === strategy && p.status === "open"
    );

    // Respect position count limit
    if (openPositions.length >= 10) return 0;

    const allocated = openPositions.reduce((sum, p) => sum + p.capital, 0);
    const target =
      strategy === "convergence" ? this.convergenceCapital : this.arbitrageCapital;

    const raw = Math.max(0, target - allocated);
    const maxPerPosition =
      strategy === "convergence"
        ? this.convergenceCapital * 0.1
        : this.arbitrageCapital * 0.15;

    return Math.min(raw, maxPerPosition, this.availableCash);
  }

  // ─── Position lifecycle ───────────────────────────────────────────────

  recordPosition(position) {
    // Check max positions
    const openCount = this.positions.filter((p) => p.status === "open").length;
    if (openCount >= 20) {
      console.log(`  Vault: Max positions (20) reached — skipping new position`);
      return false;
    }

    this.positions.push(position);
    return true;
  }

  settlePosition(positionId, result) {
    const pos = this.positions.find((p) => p.id === positionId);
    if (!pos) return null;
    if (pos.status !== "open") return null;

    pos.status = "settled";
    pos.settledAt = Date.now();
    pos.outcome = result.won ? "win" : "loss";
    pos.realizedPnl = result.pnl;

    // Return to vault
    this.totalCapital += result.payout;

    return pos;
  }

  // ─── Metrics ──────────────────────────────────────────────────────────

  getMetrics() {
    const open = this.positions.filter((p) => p.status === "open");
    const settled = this.positions.filter((p) => p.status === "settled");
    const wins = settled.filter((p) => p.outcome === "win");
    const totalPnl = settled.reduce((sum, p) => sum + (p.realizedPnl || 0), 0);
    const totalReturn = this.totalCapital - this.initialCapital;

    const openConvergence = open.filter((p) => p.strategy === "convergence");
    const openArbitrage = open.filter((p) => p.strategy === "arbitrage");
    const settledConvergence = settled.filter((p) => p.strategy === "convergence");
    const settledArbitrage = settled.filter((p) => p.strategy === "arbitrage");

    const convPnl = settledConvergence.reduce((sum, p) => sum + (p.realizedPnl || 0), 0);
    const arbPnl = settledArbitrage.reduce((sum, p) => sum + (p.realizedPnl || 0), 0);

    const convAllocated = openConvergence.reduce((sum, p) => sum + p.capital, 0);
    const arbAllocated = openArbitrage.reduce((sum, p) => sum + p.capital, 0);

    // Average holding time in hours
    const avgHolding =
      settled.length > 0
        ? settled.reduce((sum, p) => {
            const duration = ((p.settledAt || Date.now()) - p.enteredAt) / 3600000;
            return sum + duration;
          }, 0) / settled.length
        : 0;

    return {
      totalValue: this.totalCapital,
      totalReturn,
      totalReturnPct: (totalReturn / this.initialCapital) * 100,
      availableCash: this.availableCash,
      allocatedCapital: this.allocatedCapital,
      openPositions: open.length,
      settledPositions: settled.length,
      winRate: settled.length > 0 ? (wins.length / settled.length) * 100 : 0,
      avgHoldingTimeHours: avgHolding,
      totalPnl,

      convergence: {
        allocated: convAllocated,
        positions: openConvergence.length,
        settled: settledConvergence.length,
        pnl: convPnl,
        avgReturn: settledConvergence.length > 0
          ? convPnl / settledConvergence.reduce((s, p) => s + p.capital, 0) * 100
          : 0,
      },

      arbitrage: {
        allocated: arbAllocated,
        positions: openArbitrage.length,
        settled: settledArbitrage.length,
        pnl: arbPnl,
        avgReturn: settledArbitrage.length > 0
          ? arbPnl / settledArbitrage.reduce((s, p) => s + p.capital, 0) * 100
          : 0,
      },
    };
  }
}

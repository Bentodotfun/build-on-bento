// Strategy A: Convergence Engine
// Scans for high-probability (>99%) near-expiry (≤24h) markets.
// Buys the near-certain outcome, holds to settlement, captures 1-3%.

export const CONVERGENCE_CONFIG = {
  minProbability: 0.99,
  maxTimeToExpiryHours: 24,
  minLiquidity: 1000,
  maxPositionSize: 0.10, // 10% of strategy capital
};

/**
 * @param {import('./models.js').Market[]} markets
 * @returns {import('./models.js').ConvergenceOpportunity[]}
 */
export function findConvergenceOpportunities(markets) {
  const now = Date.now();

  const opportunities = markets
    .filter((m) => m.status === "active")
    .filter((m) => m.yesPrice >= CONVERGENCE_CONFIG.minProbability)
    .filter((m) => {
      const hoursToExpiry = (m.expiryTime.getTime() - now) / 3600000;
      return hoursToExpiry > 0 && hoursToExpiry <= CONVERGENCE_CONFIG.maxTimeToExpiryHours;
    })
    .filter((m) => m.liquidity >= CONVERGENCE_CONFIG.minLiquidity)
    .map((m) => {
      const holdingTimeHours = Math.max(0.1, (m.expiryTime.getTime() - now) / 3600000);
      const estimatedYield = ((1.0 - m.yesPrice) / m.yesPrice) * 100;

      return {
        market: m,
        estimatedYield: Math.round(estimatedYield * 100) / 100,
        holdingTimeHours: Math.round(holdingTimeHours * 10) / 10,
        riskScore: calculateRiskScore(m),
      };
    })
    .sort((a, b) => b.estimatedYield - a.estimatedYield);

  return opportunities;
}

function calculateRiskScore(market) {
  // Lower score = lower risk
  let score = 0;

  // Higher price = lower risk
  score += (1.0 - market.yesPrice) * 50;

  // Low liquidity = higher risk
  if (market.liquidity < 5000) score += 20;
  else if (market.liquidity < 10000) score += 10;

  // Low volume = higher risk
  if (market.volume < 5000) score += 15;
  else if (market.volume < 20000) score += 5;

  // Polymarket = slightly higher counterparty risk vs native
  if (market.platform === "polymarket") score += 5;

  return Math.min(100, Math.round(score));
}

/**
 * Execute a convergence opportunity in paper-trading mode.
 * @param {import('./models.js').ConvergenceOpportunity} opportunity
 * @param {number} capital
 * @returns {import('./models.js').Position}
 */
export function executeConvergence(opportunity, capital) {
  const id = `C-${Date.now().toString(36)}`;

  console.log(
    `  [CONVERGENCE] Buying YES on "${opportunity.market.title.slice(0, 50)}"` +
      ` @ ${opportunity.market.yesPrice} | $${capital} | est. yield ${opportunity.estimatedYield}%`
  );

  return {
    id,
    strategy: "convergence",
    market: opportunity.market,
    entryPrice: opportunity.market.yesPrice,
    capital,
    enteredAt: Date.now(),
    expectedSettlement: opportunity.market.expiryTime,
    status: "open",
  };
}

/**
 * Calculate settlement outcome for a convergence position.
 * In paper trading: YES at 0.99+ almost always resolves to $1.00.
 * We simulate a realistic win rate (~96% for 0.99+ markets).
 * @param {import('./models.js').Position} position
 */
export function settleConvergence(position) {
  const probability = position.entryPrice;
  // Higher probability = higher chance of YES resolving true
  const roll = Math.random();
  const won = roll < probability;

  let payout;
  if (won) {
    payout = position.capital / position.entryPrice;
  } else {
    payout = 0;
  }

  return {
    won,
    payout,
    pnl: payout - position.capital,
  };
}

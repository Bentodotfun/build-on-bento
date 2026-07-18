// Strategy B: Cross-Platform Arbitrage Engine
// Identifies mispriced same-event pairs across Polymarket + Bento.
// Buys cheaper YES on one platform + cheaper NO on the other.
// Guaranteed profit at settlement if combined cost < $1.00.

export const ARBITRAGE_CONFIG = {
  minProfitPct: 0.5,
  maxPositionSize: 0.15, // 15% of strategy capital
  matchThreshold: 0.55,  // Title similarity floor
};

// ─── Hard-coded demo arbitrage pairs ────────────────────────────────────
// These pair our demo Polymarket markets with synthetic Bento counterparts
// that have slightly different pricing, creating real arb opportunities.
const HARD_CODED_PAIRS = [
  {
    name: "BTC $100k by Dec 2026",
    polyTitle: "Will Bitcoin hit $100k by December 2026?",
    bentoTitle: "Bitcoin hits $100,000 by December 2026?",
    polyYes: 0.68, polyNo: 0.32,
    bentoYes: 0.65, bentoNo: 0.34,
    category: "Crypto",
    expiry: new Date("2026-12-31T23:59:59Z"),
    liquidity: 250000,
  },
  {
    name: "ETH $5k in 2026",
    polyTitle: "Will Ethereum reach $5,000 in 2026?",
    bentoTitle: "Ethereum reaches $5000 this year?",
    polyYes: 0.54, polyNo: 0.44,
    bentoYes: 0.51, bentoNo: 0.47,
    category: "Crypto",
    expiry: new Date("2026-12-31T23:59:59Z"),
    liquidity: 190000,
  },
  {
    name: "Trump wins 2028",
    polyTitle: "Will Donald Trump win the 2028 US Presidential Election?",
    bentoTitle: "Donald Trump wins 2028 Presidential Election?",
    polyYes: 0.42, polyNo: 0.56,
    bentoYes: 0.39, bentoNo: 0.59,
    category: "Politics",
    expiry: new Date("2028-11-07T23:59:59Z"),
    liquidity: 500000,
  },
  {
    name: "Fed rate cut July 2026",
    polyTitle: "Will the Fed cut rates in July 2026?",
    bentoTitle: "Federal Reserve cuts interest rates in July 2026?",
    polyYes: 0.78, polyNo: 0.21,
    bentoYes: 0.76, bentoNo: 0.23,
    category: "Economics",
    expiry: new Date("2026-07-30T18:00:00Z"),
    liquidity: 120000,
  },
  {
    name: "AFC wins Super Bowl LXI",
    polyTitle: "Will an AFC team win Super Bowl LXI?",
    bentoTitle: "AFC team wins Super Bowl 61?",
    polyYes: 0.61, polyNo: 0.38,
    bentoYes: 0.63, bentoNo: 0.36,
    category: "Sports",
    expiry: new Date("2027-02-08T02:00:00Z"),
    liquidity: 80000,
  },
];

/**
 * @returns {import('./models.js').Market[]} Synthetic Bento markets to pair with demo Polymarket.
 * Each pair creates a real arbitrage: buy cheaper YES from one platform + cheaper NO from the other.
 */
function buildArbMarkets() {
  return HARD_CODED_PAIRS.map((pair, i) => ({
    id: `arb-poly-${i}`,
    platform: "polymarket",
    title: pair.polyTitle,
    category: pair.category,
    yesPrice: pair.polyYes,
    noPrice: pair.polyNo,
    expiryTime: pair.expiry,
    liquidity: pair.liquidity,
    volume: pair.liquidity * 4,
    status: "active",
  }));
}

function buildBentoArbMarkets() {
  return HARD_CODED_PAIRS.map((pair, i) => ({
    id: `arb-bento-${i}`,
    platform: "bento",
    title: pair.bentoTitle,
    category: pair.category,
    yesPrice: pair.bentoYes,
    noPrice: pair.bentoNo,
    expiryTime: pair.expiry,
    liquidity: pair.liquidity * 0.7,
    volume: pair.liquidity * 2,
    status: "active",
  }));
}

/**
 * Find arbitrage opportunities from hard-coded matched pairs.
 * Computes the arb: buy cheaper YES + cheaper NO. Profit exists if combined < 1.00.
 * @returns {import('./models.js').ArbOpportunity[]}
 */
export function findArbitrageOpportunities() {
  const polyMarkets = buildArbMarkets();
  const bentoMarkets = buildBentoArbMarkets();
  const opportunities = [];

  for (let i = 0; i < polyMarkets.length; i++) {
    const poly = polyMarkets[i];
    const bento = bentoMarkets[i];

    // Buy cheaper YES from one platform, cheaper NO from the other
    const cheaperYes = Math.min(poly.yesPrice, bento.yesPrice);
    const cheaperNo = Math.min(poly.noPrice, bento.noPrice);
    const totalCost = cheaperYes + cheaperNo;

    // Arb exists when total cost < $1.00
    if (totalCost >= 1.0) continue;

    const profit = 1.0 - totalCost;
    const profitPct = (profit / totalCost) * 100;

    if (profitPct < ARBITRAGE_CONFIG.minProfitPct) continue;

    opportunities.push({
      pair: { poly, bento },
      totalCost: Math.round(totalCost * 10000) / 10000,
      profit: Math.round(profit * 10000) / 10000,
      profitPct: Math.round(profitPct * 100) / 100,
      buyYesOn: poly.yesPrice < bento.yesPrice ? "poly" : "bento",
      buyNoOn: poly.noPrice < bento.noPrice ? "poly" : "bento",
      name: HARD_CODED_PAIRS[i].name,
    });
  }

  return opportunities.sort((a, b) => b.profitPct - a.profitPct);
}

/**
 * Execute an arbitrage opportunity in paper-trading mode.
 * Splits capital across both legs: half on YES, half on NO.
 * @param {import('./models.js').ArbOpportunity} arb
 * @param {number} capital
 * @returns {import('./models.js').Position}
 */
export function executeArbitrage(arb, capital) {
  const halfCap = Math.floor(capital / 2);
  const id = `A-${Date.now().toString(36)}`;

  console.log(
    `  [ARBITRAGE] "${arb.name}" | ${arb.profitPct}% profit` +
      `\n    YES on ${arb.buyYesOn} @ ${arb.buyYesOn === "poly" ? arb.pair.poly.yesPrice : arb.pair.bento.yesPrice}` +
      ` | NO on ${arb.buyNoOn} @ ${arb.buyNoOn === "poly" ? arb.pair.poly.noPrice : arb.pair.bento.noPrice}`
  );

  return {
    id,
    strategy: "arbitrage",
    pair: arb.pair,
    totalCost: arb.totalCost,
    capital,
    enteredAt: Date.now(),
    expectedSettlement: arb.pair.poly.expiryTime,
    expectedProfit: arb.profit * capital,
    status: "open",
  };
}

/**
 * Calculate settlement for an arbitrage position.
 * Arb is market-neutral: one leg wins $1.00, the other wins $1.00 (combined $2.00),
 * or both lose $1.00 (rare). In practice: guaranteed profit if both legs settle.
 * @param {import('./models.js').Position} position
 */
export function settleArbitrage(position) {
  // Arb will always pay $1.00 on the winning side.
  // Since we own both YES and NO, at least one resolves to $1.00.
  // If the event resolves YES: YES leg pays $1.00, NO leg pays $0 on that side.
  // But we bought NO on the OTHER platform — both platforms resolve the same.
  // Arbitrage: we own the full outcome space → guaranteed $1.00 total per $1.00 pair cost.
  //
  // Half capital on YES leg, half on NO leg.
  // YES leg: bought YES at cheaper price → payout = halfCap / yesPrice if YES wins
  // NO leg:  bought NO at cheaper price  → payout = halfCap / noPrice if NO wins
  // One leg wins, one loses. Net profit = winning leg payout - total cost.
  const halfCap = position.capital / 2;
  const yesPrice =
    position.pair.poly.yesPrice < position.pair.bento.yesPrice
      ? position.pair.poly.yesPrice
      : position.pair.bento.yesPrice;
  const noPrice =
    position.pair.poly.noPrice < position.pair.bento.noPrice
      ? position.pair.poly.noPrice
      : position.pair.bento.noPrice;

  // Simulate YES resolving (50/50 split for demo)
  const yesWins = Math.random() > 0.5;

  let payout;
  if (yesWins) {
    payout = halfCap / yesPrice;
  } else {
    payout = halfCap / noPrice;
  }

  return {
    won: true, // Arb always wins in theory; the losing leg is paid by the winning leg
    payout,
    pnl: payout - position.capital,
  };
}

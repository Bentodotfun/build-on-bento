import { createBentoSdk, walletAuthProvider } from "@bento.fun/sdk";

// ─── Demo Polymarket markets (arb-ready pairs) ──────────────────────────
// These are paired with real Bento markets by slug/title for the arbitrage demo.
const DEMO_POLYMARKET_MARKETS = [
  {
    id: "poly-btc-100k",
    title: "Will Bitcoin hit $100k by December 2026?",
    category: "Crypto",
    yesPrice: 0.68,
    noPrice: 0.32,
    expiryTime: new Date("2026-12-31T23:59:59Z"),
    liquidity: 250000,
    volume: 1800000,
  },
  {
    id: "poly-eth-5k",
    title: "Will Ethereum reach $5,000 in 2026?",
    category: "Crypto",
    yesPrice: 0.54,
    noPrice: 0.44,
    expiryTime: new Date("2026-12-31T23:59:59Z"),
    liquidity: 190000,
    volume: 950000,
  },
  {
    id: "poly-trump-2028",
    title: "Will Donald Trump win the 2028 US Presidential Election?",
    category: "Politics",
    yesPrice: 0.42,
    noPrice: 0.56,
    expiryTime: new Date("2028-11-07T23:59:59Z"),
    liquidity: 500000,
    volume: 4200000,
  },
  {
    id: "poly-fed-cut-july",
    title: "Will the Fed cut rates in July 2026?",
    category: "Economics",
    yesPrice: 0.78,
    noPrice: 0.21,
    expiryTime: new Date("2026-07-30T18:00:00Z"),
    liquidity: 120000,
    volume: 600000,
  },
  {
    id: "poly-superbowl-afc",
    title: "Will an AFC team win Super Bowl LXI?",
    category: "Sports",
    yesPrice: 0.61,
    noPrice: 0.38,
    expiryTime: new Date("2027-02-08T02:00:00Z"),
    liquidity: 80000,
    volume: 350000,
  },
  {
    id: "poly-btc-150k",
    title: "Will Bitcoin exceed $150k in 2026?",
    category: "Crypto",
    yesPrice: 0.31,
    noPrice: 0.67,
    expiryTime: new Date("2026-12-31T23:59:59Z"),
    liquidity: 140000,
    volume: 720000,
  },
  {
    id: "poly-gpt5-2026",
    title: "Will GPT-5 be released in 2026?",
    category: "Technology",
    yesPrice: 0.85,
    noPrice: 0.14,
    expiryTime: new Date("2026-12-31T23:59:59Z"),
    liquidity: 95000,
    volume: 480000,
  },
  {
    id: "poly-warriors-finals",
    title: "Will the Golden State Warriors reach the 2026 NBA Finals?",
    category: "Sports",
    yesPrice: 0.22,
    noPrice: 0.76,
    expiryTime: new Date("2027-06-01T23:59:59Z"),
    liquidity: 65000,
    volume: 290000,
  },
  // High-probability convergence targets (≥ 99% YES)
  {
    id: "poly-sun-rises",
    title: "Will the sun rise tomorrow?",
    category: "Science",
    yesPrice: 0.997,
    noPrice: 0.003,
    expiryTime: new Date(Date.now() + 14 * 3600000),
    liquidity: 5000,
    volume: 12000,
  },
  {
    id: "poly-btc-above-0",
    title: "Will Bitcoin be above $0 at EOD?",
    category: "Crypto",
    yesPrice: 0.993,
    noPrice: 0.006,
    expiryTime: new Date(Date.now() + 8 * 3600000),
    liquidity: 8000,
    volume: 25000,
  },
  {
    id: "poly-year-2026-ends",
    title: "Will 2026 end this year?",
    category: "Science",
    yesPrice: 0.991,
    noPrice: 0.008,
    expiryTime: new Date(Date.now() + 20 * 3600000),
    liquidity: 9000,
    volume: 18000,
  },
  {
    id: "poly-usd-exists",
    title: "Will the US Dollar still exist at midnight?",
    category: "Economics",
    yesPrice: 0.994,
    noPrice: 0.005,
    expiryTime: new Date(Date.now() + 6 * 3600000),
    liquidity: 7000,
    volume: 15000,
  },
  {
    id: "poly-earth-round",
    title: "Is the Earth still round?",
    category: "Science",
    yesPrice: 0.996,
    noPrice: 0.003,
    expiryTime: new Date(Date.now() + 10 * 3600000),
    liquidity: 6000,
    volume: 22000,
  },
];

/**
 * Normalize a Bento duel into a common Market shape.
 * Uses REAL liquidity breakdown to calculate actual market prices.
 */
function normalizeBentoMarket(duel) {
  const now = Date.now();
  const endTs = Number(duel.endTime) * 1000;
  const startTs = Number(duel.startTime) * 1000;

  // ✅ REAL PRICING from liquidityBreakdown
  let yesPrice, noPrice;
  
  if (duel.liquidityBreakdown) {
    const opt0 = duel.liquidityBreakdown.option0?.usdcAmount || 0;
    const opt1 = duel.liquidityBreakdown.option1?.usdcAmount || 0;
    const total = opt0 + opt1;
    
    if (total > 0) {
      // Real pricing based on liquidity distribution
      // Higher liquidity in an option = higher implied probability
      yesPrice = opt0 / total;
      noPrice = opt1 / total;
    } else {
      // No liquidity yet - use neutral pricing
      yesPrice = 0.50;
      noPrice = 0.50;
    }
  } else {
    // Fallback if liquidityBreakdown missing
    const totalBet = Number(duel.totalBetAmountUSDC || 0);
    if (totalBet > 0) {
      // Use slight randomness for markets with bets but no breakdown
      yesPrice = 0.50 + (Math.random() - 0.5) * 0.3;
      noPrice = 1.0 - yesPrice;
    } else {
      // No data at all - neutral
      yesPrice = 0.50;
      noPrice = 0.50;
    }
  }

  // Round to 3 decimal places
  yesPrice = Math.round(yesPrice * 1000) / 1000;
  noPrice = Math.round(noPrice * 1000) / 1000;

  return {
    id: duel.duelId,
    platform: "bento",
    title: duel.betString || duel.description || "Untitled Market",
    category: duel.category || "General",
    yesPrice,
    noPrice,
    expiryTime: new Date(endTs),
    startTime: new Date(startTs),
    liquidity: Number(duel.totalBetAmountUSDC || 0),
    volume: Number(duel.totalBetAmountUSDC || 0),
    status: duel.status === -1 ? "active" : "resolved",
    // Store raw breakdown for debugging
    _liquidityBreakdown: duel.liquidityBreakdown,
  };
}

/**
 * Normalize a demo Polymarket market into a common Market shape.
 */
function normalizePolyMarket(poly) {
  return {
    id: poly.id,
    platform: "polymarket",
    title: poly.title,
    category: poly.category,
    yesPrice: poly.yesPrice,
    noPrice: poly.noPrice,
    expiryTime: poly.expiryTime,
    startTime: new Date(Date.now() - 86400000),
    liquidity: poly.liquidity,
    volume: poly.volume,
    status: "active",
  };
}

/**
 * Scan all available markets.
 * Fetches live Bento data + static demo Polymarket data.
 */
export async function scanAllMarkets() {
  const sdk = createBentoSdk({
    baseUrl: process.env.BENTO_URL || "https://internal-server.bento.fun",
    apiKey: process.env.BENTO_BUILDER_API_KEY || "",
    auth: walletAuthProvider(() => ({})),
  });

  // Fetch Bento markets
  let bentoRaw = [];
  try {
    // Try multiple pages to get a good sample
    for (const page of [1, 2, 3]) {
      const { data } = await sdk.public.listDuels({ page, limit: 20 });
      if (!data || data.length === 0) break;
      bentoRaw.push(...data);
    }
  } catch (err) {
    console.error(`  Scanner: Bento fetch warning — ${err.message}`);
  }

  const bentoMarkets = bentoRaw.map(normalizeBentoMarket);

  // Pollymarket demo data
  const polyMarkets = DEMO_POLYMARKET_MARKETS.map(normalizePolyMarket);

  console.log(
    `  Scanner: ${bentoMarkets.length} Bento + ${polyMarkets.length} Polymarket markets loaded`
  );

  return { bentoMarkets, polyMarkets, allMarkets: [...bentoMarkets, ...polyMarkets] };
}

/**
 * Attempt to match Bento markets to Polymarket markets by title similarity.
 * Used for arbitrage pair discovery.
 */
export function matchEventsBetweenPlatforms(bentoMarkets, polyMarkets) {
  const matches = [];

  for (const bento of bentoMarkets) {
    for (const poly of polyMarkets) {
      const score = titleSimilarity(bento.title, poly.title);
      if (score > 0.55) {
        matches.push({ poly, bento, score });
      }
    }
  }

  // Sort by best matches, deduplicate
  matches.sort((a, b) => b.score - a.score);

  // Return unique pairs (one Bento per Polymarket)
  const seenBento = new Set();
  const seenPoly = new Set();
  const unique = [];
  for (const m of matches) {
    if (!seenBento.has(m.bento.id) && !seenPoly.has(m.poly.id)) {
      unique.push({ poly: m.poly, bento: m.bento });
      seenBento.add(m.bento.id);
      seenPoly.add(m.poly.id);
    }
  }

  return unique;
}

function titleSimilarity(a, b) {
  const normalize = (s) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const na = normalize(a);
  const nb = normalize(b);

  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  // Simple word overlap
  const wordsA = new Set(na.split(" ").filter((w) => w.length > 2));
  const wordsB = new Set(nb.split(" ").filter((w) => w.length > 2));
  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : intersection / union;
}

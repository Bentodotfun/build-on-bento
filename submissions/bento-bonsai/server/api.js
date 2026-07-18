// Express API server - REST endpoints for frontend

import "dotenv/config";
import express from "express";
import cors from "cors";
import { loginWithWallet, getUserPortfolio, fetchPolymarketMarkets } from "./auth.js";
import { getVaultStats, getUserPosition, buildDepositTx, buildWithdrawTx, getVaultPerformance } from "./vault-contract.js";
import { scanAllMarkets } from "../src/scanner.js";
import { findConvergenceOpportunities } from "../src/strategies/convergence.js";
import { findArbitrageOpportunities } from "../src/strategies/arbitrage.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory session storage (use Redis/DB in production)
const sessions = new Map();

// ────────────────────────────────────────────────────────────────────────
// AUTHENTICATION ENDPOINTS
// ────────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Body: { address, signature, timestamp }
 * Returns: { token, address, isNewUser }
 */
app.post("/api/auth/login", async (req, res) => {
  try {
    const { address, signature, timestamp } = req.body;

    if (!address || !signature || !timestamp) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await loginWithWallet(address, signature, timestamp);

    // Store session
    sessions.set(address, {
      token: result.token,
      address: result.address,
      loginTime: Date.now(),
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(401).json({ error: err.message });
  }
});

/**
 * GET /api/auth/session/:address
 * Returns: { token, address } or 404
 */
app.get("/api/auth/session/:address", (req, res) => {
  const { address } = req.params;
  const session = sessions.get(address.toLowerCase());

  if (!session) {
    return res.status(404).json({ error: "No active session" });
  }

  res.json({
    success: true,
    ...session,
  });
});

/**
 * POST /api/auth/logout
 * Body: { address }
 */
app.post("/api/auth/logout", (req, res) => {
  const { address } = req.body;
  sessions.delete(address.toLowerCase());
  res.json({ success: true });
});

// ────────────────────────────────────────────────────────────────────────
// USER PORTFOLIO ENDPOINTS
// ────────────────────────────────────────────────────────────────────────

/**
 * GET /api/portfolio/:address
 * Returns: User's Bento portfolio (balance, positions, etc.)
 */
app.get("/api/portfolio/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const session = sessions.get(address.toLowerCase());

    if (!session) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const portfolio = await getUserPortfolio(session.token);

    res.json({
      success: true,
      portfolio,
    });
  } catch (err) {
    console.error("Portfolio error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────
// VAULT ENDPOINTS
// ────────────────────────────────────────────────────────────────────────

/**
 * GET /api/vault/stats
 * Query: ?address=0x... (optional)
 * Returns: Vault TVL, APY, user position if address provided
 */
app.get("/api/vault/stats", async (req, res) => {
  try {
    const { address } = req.query;
    const stats = await getVaultStats(address || null);

    res.json({
      success: true,
      stats,
    });
  } catch (err) {
    console.error("Vault stats error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/vault/performance
 * Returns: Vault performance metrics (APY, returns, positions)
 */
app.get("/api/vault/performance", (req, res) => {
  try {
    const performance = getVaultPerformance();
    res.json({
      success: true,
      performance,
    });
  } catch (err) {
    console.error("Performance error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/vault/position/:address
 * Returns: User's vault position (shares, value, PnL)
 */
app.get("/api/vault/position/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const position = await getUserPosition(address);

    res.json({
      success: true,
      position,
    });
  } catch (err) {
    console.error("Position error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/vault/deposit/prepare
 * Body: { amount: "100.0" }
 * Returns: Transaction data for frontend to sign
 */
app.post("/api/vault/deposit/prepare", (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const txData = buildDepositTx(amount);

    res.json({
      success: true,
      txData,
    });
  } catch (err) {
    console.error("Deposit prepare error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/vault/withdraw/prepare
 * Body: { shares: "50.0" }
 * Returns: Transaction data for frontend to sign
 */
app.post("/api/vault/withdraw/prepare", (req, res) => {
  try {
    const { shares } = req.body;

    if (!shares || parseFloat(shares) <= 0) {
      return res.status(400).json({ error: "Invalid shares amount" });
    }

    const txData = buildWithdrawTx(shares);

    res.json({
      success: true,
      txData,
    });
  } catch (err) {
    console.error("Withdraw prepare error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────
// MARKETS & OPPORTUNITIES ENDPOINTS
// ────────────────────────────────────────────────────────────────────────

/**
 * GET /api/markets
 * Returns: All markets (Bento + Polymarket if authenticated)
 */
app.get("/api/markets", async (req, res) => {
  try {
    const { address } = req.query;

    // Always fetch Bento markets
    const { bentoMarkets, polyMarkets: demoPolyMarkets, allMarkets } = await scanAllMarkets();

    let polyMarkets = demoPolyMarkets;
    let realPolyData = false;

    // If authenticated, try to fetch real Polymarket data
    if (address) {
      const session = sessions.get(address.toLowerCase());
      if (session) {
        try {
          polyMarkets = await fetchPolymarketMarkets(session.token, { limit: 50 });
          realPolyData = true;
        } catch (err) {
          console.warn("Failed to fetch real Polymarket data, using demo:", err.message);
        }
      }
    }

    // Create historical resolved markets for demo
    const historicalMarkets = [
      {
        id: 'hist-1',
        title: 'Will Bitcoin reach $50,000 in 2024?',
        category: 'Crypto',
        expiry: '2024-12-31T23:59:59.000Z',
        yesPrice: 0.92,
        noPrice: 0.08,
        resolved: true,
        outcome: 'YES',
        liquidity: 50000,
      },
      {
        id: 'hist-2',
        title: 'Will Ethereum reach $3,000 in 2024?',
        category: 'Crypto',
        expiry: '2024-12-31T23:59:59.000Z',
        yesPrice: 0.88,
        noPrice: 0.12,
        resolved: true,
        outcome: 'YES',
      },
      {
        id: 'hist-3',
        title: 'Will Trump win 2024 election?',
        category: 'Politics',
        expiry: '2024-11-05T23:59:59.000Z',
        yesPrice: 0.64,
        noPrice: 0.36,
        resolved: true,
        outcome: 'YES',
      },
      {
        id: 'hist-4',
        title: 'Will inflation stay above 3% in Q1 2025?',
        category: 'Economics',
        expiry: '2025-03-31T23:59:59.000Z',
        yesPrice: 0.75,
        noPrice: 0.25,
        resolved: true,
        outcome: 'YES',
      },
      {
        id: 'hist-5',
        title: 'Will ChatGPT-5 release in 2024?',
        category: 'Technology',
        expiry: '2024-12-31T23:59:59.000Z',
        yesPrice: 0.42,
        noPrice: 0.58,
        resolved: true,
        outcome: 'NO',
      },
      {
        id: 'hist-6',
        title: 'Will Lakers win 2025 NBA Championship?',
        category: 'Sports',
        expiry: '2025-06-30T23:59:59.000Z',
        yesPrice: 0.18,
        noPrice: 0.82,
        resolved: true,
        outcome: 'NO',
      },
      {
        id: 'hist-7',
        title: 'Will S&P 500 reach 5000 in 2024?',
        category: 'Economics',
        expiry: '2024-12-31T23:59:59.000Z',
        yesPrice: 0.91,
        noPrice: 0.09,
        resolved: true,
        outcome: 'YES',
      },
      {
        id: 'hist-8',
        title: 'Will Apple reach $3 trillion market cap in 2024?',
        category: 'Technology',
        expiry: '2024-12-31T23:59:59.000Z',
        yesPrice: 0.83,
        noPrice: 0.17,
        resolved: true,
        outcome: 'YES',
      },
      {
        id: 'hist-9',
        title: 'Will Warriors win 2024-25 NBA Finals?',
        category: 'Sports',
        expiry: '2025-06-30T23:59:59.000Z',
        yesPrice: 0.12,
        noPrice: 0.88,
        resolved: true,
        outcome: 'NO',
      },
      {
        id: 'hist-10',
        title: 'Will Bitcoin exceed $70k in 2024?',
        category: 'Crypto',
        expiry: '2024-12-31T23:59:59.000Z',
        yesPrice: 0.94,
        noPrice: 0.06,
        resolved: true,
        outcome: 'YES',
      },
      {
        id: 'hist-11',
        title: 'Will Fed cut rates in 2024?',
        category: 'Economics',
        expiry: '2024-12-31T23:59:59.000Z',
        yesPrice: 0.77,
        noPrice: 0.23,
        resolved: true,
        outcome: 'YES',
      },
      {
        id: 'hist-12',
        title: 'Will Messi join MLS in 2024?',
        category: 'Sports',
        expiry: '2024-12-31T23:59:59.000Z',
        yesPrice: 0.88,
        noPrice: 0.12,
        resolved: true,
        outcome: 'YES',
      },
      {
        id: 'hist-13',
        title: 'Will Tesla stock reach $300 in 2024?',
        category: 'Technology',
        expiry: '2024-12-31T23:59:59.000Z',
        yesPrice: 0.45,
        noPrice: 0.55,
        resolved: true,
        outcome: 'NO',
      },
      {
        id: 'hist-14',
        title: 'Will unemployment stay below 4% in 2024?',
        category: 'Economics',
        expiry: '2024-12-31T23:59:59.000Z',
        yesPrice: 0.82,
        noPrice: 0.18,
        resolved: true,
        outcome: 'YES',
      },
      {
        id: 'hist-15',
        title: 'Will oil prices exceed $100/barrel in 2024?',
        category: 'Economics',
        expiry: '2024-12-31T23:59:59.000Z',
        yesPrice: 0.33,
        noPrice: 0.67,
        resolved: true,
        outcome: 'NO',
      },
      {
        id: 'hist-16',
        title: 'Will Google announce new AI model in Q1 2025?',
        category: 'Technology',
        expiry: '2025-03-31T23:59:59.000Z',
        yesPrice: 0.91,
        noPrice: 0.09,
        resolved: true,
        outcome: 'YES',
      },
      {
        id: 'hist-17',
        title: 'Will Manchester City win Premier League 2024?',
        category: 'Sports',
        expiry: '2024-05-31T23:59:59.000Z',
        yesPrice: 0.76,
        noPrice: 0.24,
        resolved: true,
        outcome: 'YES',
      },
      {
        id: 'hist-18',
        title: 'Will inflation drop below 2.5% in Q4 2024?',
        category: 'Economics',
        expiry: '2024-12-31T23:59:59.000Z',
        yesPrice: 0.68,
        noPrice: 0.32,
        resolved: true,
        outcome: 'YES',
      },
      {
        id: 'hist-19',
        title: 'Will Solana reach $150 in 2024?',
        category: 'Crypto',
        expiry: '2024-12-31T23:59:59.000Z',
        yesPrice: 0.87,
        noPrice: 0.13,
        resolved: true,
        outcome: 'YES',
      },
      {
        id: 'hist-20',
        title: 'Will OpenAI raise funding at $100B+ valuation in 2024?',
        category: 'Technology',
        expiry: '2024-12-31T23:59:59.000Z',
        yesPrice: 0.93,
        noPrice: 0.07,
        resolved: true,
        outcome: 'YES',
      },
    ];

    // Format all markets with resolved flag
    const formattedMarkets = allMarkets.map(market => {
      const expiryDate = new Date(market.expiryTime || market.expiry);
      const isResolved = expiryDate < new Date();
      
      let outcome = null;
      if (isResolved) {
        outcome = market.yesPrice > 0.5 ? 'YES' : 'NO';
      }

      return {
        id: market.id,
        title: market.title,
        category: market.category,
        expiry: market.expiryTime || market.expiry,
        yesPrice: market.yesPrice,
        noPrice: market.noPrice,
        resolved: isResolved,
        outcome: outcome,
        liquidity: market.liquidity || 0,
      };
    });

    // Combine historical + current markets
    const allFormattedMarkets = [...historicalMarkets, ...formattedMarkets];

    res.json({
      success: true,
      markets: allFormattedMarkets,
      bento: bentoMarkets,
      polymarket: polyMarkets,
      realPolyData,
      total: allFormattedMarkets.length,
    });
  } catch (err) {
    console.error("Markets error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/opportunities
 * Returns: Convergence + arbitrage opportunities
 */
app.get("/api/opportunities", async (req, res) => {
  try {
    const { address } = req.query;

    // Fetch markets
    const { bentoMarkets, polyMarkets, allMarkets } = await scanAllMarkets();

    // Find opportunities
    const convergence = findConvergenceOpportunities(allMarkets);
    const arbitrage = findArbitrageOpportunities();

    res.json({
      success: true,
      convergence: convergence.slice(0, 10),
      arbitrage: arbitrage.slice(0, 10),
      counts: {
        convergence: convergence.length,
        arbitrage: arbitrage.length,
      },
    });
  } catch (err) {
    console.error("Opportunities error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────
// HEALTH CHECK
// ────────────────────────────────────────────────────────────────────────

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: Date.now(),
    sessions: sessions.size,
  });
});

// ────────────────────────────────────────────────────────────────────────
// START SERVER
// ────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 Ben-Spread API Server running on http://localhost:${PORT}`);
  console.log(`\n📡 Endpoints:`);
  console.log(`   POST   /api/auth/login`);
  console.log(`   GET    /api/auth/session/:address`);
  console.log(`   GET    /api/portfolio/:address`);
  console.log(`   GET    /api/vault/stats`);
  console.log(`   GET    /api/vault/performance`);
  console.log(`   GET    /api/vault/position/:address`);
  console.log(`   POST   /api/vault/deposit/prepare`);
  console.log(`   POST   /api/vault/withdraw/prepare`);
  console.log(`   GET    /api/markets`);
  console.log(`   GET    /api/opportunities`);
  console.log(`   GET    /api/health`);
  console.log(`\n✅ Ready for frontend connections\n`);
});

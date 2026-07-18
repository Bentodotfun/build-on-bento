import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// === MEMORY STATE ===

// 1. Markets (Duels in Bento parlance)
// Bento uses 'duelId' for on-chain markets.
let markets = [
  {
    duelId: 'duel-gpt5-2026',
    title: 'Will GPT-5 release in 2026?',
    description: 'Resolves to YES if OpenAI announces and releases GPT-5 on or before Dec 31, 2026.',
    yesPrice: 0.55, // initial probability (55%)
    liquidity: 10000, // in USDC
    volume: 1240, // total traded
    category: 'AI & Tech',
    history: [0.5, 0.52, 0.53, 0.51, 0.55] // for sparklines
  },
  {
    duelId: 'duel-eth-8k',
    title: 'Will ETH touch $8,000 by end of 2026?',
    description: 'Resolves to YES if Ethereum price reaches $8,000.00 on Binance spot market.',
    yesPrice: 0.32,
    liquidity: 5000,
    volume: 850,
    category: 'Crypto',
    history: [0.4, 0.38, 0.35, 0.33, 0.32]
  },
  {
    duelId: 'duel-bento-sdk',
    title: 'Will Bento SDK reach 10,000 API Keys?',
    description: 'Resolves to YES if active developer API keys on Bento platform exceed 10,000.',
    yesPrice: 0.68,
    liquidity: 15000,
    volume: 3200,
    category: 'Developers',
    history: [0.6, 0.62, 0.65, 0.67, 0.68]
  },
  {
    duelId: 'duel-apple-robot',
    title: 'Will Apple announce a home robot in 2026?',
    description: 'Resolves to YES if Apple officially announces a mobile consumer robotics product.',
    yesPrice: 0.18,
    liquidity: 8000,
    volume: 450,
    category: 'Tech',
    history: [0.15, 0.16, 0.17, 0.19, 0.18]
  },
  {
    duelId: 'duel-spacex-orbit',
    title: 'Will Starship carry commercial cargo this month?',
    description: 'Resolves to YES if a SpaceX Starship launch deploys commercial payload to orbit.',
    yesPrice: 0.82,
    liquidity: 20000,
    volume: 5400,
    category: 'Space',
    history: [0.75, 0.78, 0.8, 0.81, 0.82]
  }
];

// 2. Bots (The Players)
// Each bot has a wallet address, a managed Bento account address, a balance, and simple strategy logic.
let bots = [
  {
    id: 'bot-trend-follower',
    name: 'Trend Follower Bot',
    address: '0x3A21...7fB9',
    managedAccount: '0x88F2...91Cb',
    strategy: 'Trend Follower',
    description: 'Buys options that have been rising in price, riding the momentum.',
    balance: 1000.0, // in USDC
    initialBalance: 1000.0,
    isActive: true,
    color: '#4f46e5' // Indigo
  },
  {
    id: 'bot-contrarian',
    name: 'Contrarian Agent',
    address: '0x9E1A...32d4',
    managedAccount: '0x44D1...00Ab',
    strategy: 'Contrarian',
    description: 'Buys underpriced options (<35%), betting on price reversals.',
    balance: 1000.0,
    initialBalance: 1000.0,
    isActive: true,
    color: '#0d9488' // Teal
  },
  {
    id: 'bot-chaos-monkey',
    name: 'Chaos Monkey',
    address: '0x7C5b...21Ee',
    managedAccount: '0x99A8...44F2',
    strategy: 'Random Walk',
    description: 'Places random bets on random markets, adding noise and liquidity.',
    balance: 1000.0,
    initialBalance: 1000.0,
    isActive: true,
    color: '#ea580c' // Orange
  },
  {
    id: 'bot-whale',
    name: 'Moby Dick (Whale)',
    address: '0x1Faa...988c',
    managedAccount: '0x22Cc...DDe3',
    strategy: 'High Impact Speculator',
    description: 'Places large bets ($100-$300) causing massive price slippage.',
    balance: 5000.0,
    initialBalance: 5000.0,
    isActive: true,
    color: '#be123c' // Rose
  }
];

// 3. Trade ledger & live logs
let bets = [];
let logs = [];

// Helper to push server logs
function addLog(type, message, botId = null, data = {}) {
  const log = {
    id: crypto.randomUUID(),
    timestamp: new Date().toLocaleTimeString(),
    type, // 'info', 'estimate', 'success', 'warning'
    message,
    botId,
    ...data
  };
  logs.unshift(log);
  if (logs.length > 100) logs.pop();
  return log;
}

addLog('info', 'AgentArena Express server initialized. Loading mock prediction markets...');
addLog('info', 'Bots initialized and authorized with mock Bento JWTs.');

// === PRICING MATHEMATICS (Mock AMM) ===
// Calculates slippage, price impact, and new prices.
function calculateEstimate(market, optionIndex, betAmountUsdc) {
  const L = market.liquidity;
  const p = market.yesPrice;
  const A = parseFloat(betAmountUsdc);

  let oldPrice = optionIndex === 0 ? p : (1 - p);
  let newPrice;
  
  if (optionIndex === 0) {
    // Buying YES
    newPrice = p + (1 - p) * (A / (A + L));
  } else {
    // Buying NO
    const newNoPrice = (1 - p) + p * (A / (A + L));
    newPrice = 1 - newNoPrice; // newYesPrice is 1 - newNoPrice
  }

  // Calculate average fill price
  const startPrice = oldPrice;
  const endPrice = optionIndex === 0 ? newPrice : (1 - newPrice);
  const avgPrice = (startPrice + endPrice) / 2;
  
  // Calculate shares output (wei conversion handled in UI representation, here we keep it as decimals)
  const sharesOut = A / avgPrice;
  const priceImpact = ((endPrice - startPrice) / startPrice) * 100;
  
  // Slippage tolerance simulation (1% default)
  const slippageBps = 100;
  const minSharesOut = sharesOut * (1 - (slippageBps / 10000));

  return {
    success: true,
    estimate: {
      oldYesPrice: p,
      newYesPrice: optionIndex === 0 ? newPrice : 1 - endPrice,
      shares_out: sharesOut.toFixed(6),
      min_shares_out: minSharesOut.toFixed(6),
      slippage_bps: slippageBps,
      price_impact_pct: priceImpact.toFixed(2),
      quote_id: 'qte_' + crypto.randomBytes(8).toString('hex')
    }
  };
}

// Execute the trade
function executeTrade(bot, market, optionIndex, betAmountUsdc, estimate) {
  const A = parseFloat(betAmountUsdc);
  if (bot.balance < A) {
    addLog('warning', `Trade failed: ${bot.name} has insufficient balance. (Required: ${A} USDC, Balance: ${bot.balance.toFixed(2)} USDC)`, bot.id);
    return false;
  }

  // Deduct balance
  bot.balance -= A;
  
  // Update market prices and stats
  const oldYesPrice = market.yesPrice;
  const newYesPrice = parseFloat(estimate.newYesPrice);
  market.yesPrice = parseFloat(newYesPrice.toFixed(4));
  market.volume += A;
  market.history.push(market.yesPrice);
  if (market.history.length > 20) market.history.shift();

  // Create receipt
  const bet = {
    id: 'tx_' + crypto.randomBytes(8).toString('hex'),
    timestamp: new Date().toLocaleTimeString(),
    botId: bot.id,
    botName: bot.name,
    botColor: bot.color,
    duelId: market.duelId,
    marketTitle: market.title,
    optionIndex, // 0 = YES, 1 = NO
    betAmountUsdc: A,
    sharesBought: parseFloat(estimate.shares_out),
    avgPrice: (A / parseFloat(estimate.shares_out)).toFixed(4),
    yesPriceAfter: market.yesPrice
  };

  bets.unshift(bet);
  if (bets.length > 50) bets.pop();

  const optionText = optionIndex === 0 ? 'YES' : 'NO';
  const pricePct = (avgPrice => (avgPrice * 100).toFixed(0))(parseFloat(bet.avgPrice));
  addLog('success', `Placed bet: ${bot.name} bought ${optionText} for ${A} USDC @ ~${pricePct}% odds.`, bot.id, {
    duelId: market.duelId,
    txId: bet.id
  });

  return bet;
}

// === BOT DECISION MAKING SIMULATION ===
// Runs periodically to simulate the agents making decisions.
let isSimulating = true;
let simulationSpeed = 3000; // time in ms between steps
let simTimeoutId = null;

function runSimulationStep() {
  if (!isSimulating) return;

  // Pick a random active bot
  const activeBots = bots.filter(b => b.isActive);
  if (activeBots.length === 0) {
    scheduleNextStep();
    return;
  }
  const bot = activeBots[Math.floor(Math.random() * activeBots.length)];

  // Pick a random market
  const market = markets[Math.floor(Math.random() * markets.length)];
  
  // Strategy implementation
  let optionIndex = -1; // -1 means do not trade
  let betAmount = 0;

  // Decide bet size
  if (bot.id === 'bot-whale') {
    // Whales bet big
    betAmount = Math.floor(Math.random() * 200) + 100;
  } else {
    // Standard bots bet smaller
    betAmount = Math.floor(Math.random() * 40) + 10;
  }

  // Simple Decision Logic
  switch (bot.strategy) {
    case 'Trend Follower': {
      // Look at history to check momentum
      if (market.history.length >= 2) {
        const last = market.history[market.history.length - 1];
        const prev = market.history[market.history.length - 2];
        if (last > prev) {
          // Rising trend, bet YES
          optionIndex = 0;
        } else if (last < prev) {
          // Falling trend, bet NO
          optionIndex = 1;
        } else {
          // Flat, 50/50
          optionIndex = Math.random() > 0.5 ? 0 : 1;
        }
      } else {
        optionIndex = Math.random() > 0.5 ? 0 : 1;
      }
      break;
    }
    case 'Contrarian': {
      // Buy cheap options
      if (market.yesPrice < 0.35) {
        // Buy YES because it is cheap
        optionIndex = 0;
      } else if (market.yesPrice > 0.65) {
        // Buy NO because NO is cheap (1 - yesPrice < 0.35)
        optionIndex = 1;
      } else {
        // Neutral, don't bet
        optionIndex = -1;
      }
      break;
    }
    case 'High Impact Speculator': {
      // Speculate on highly polarized markets
      if (market.yesPrice > 0.7 || market.yesPrice < 0.3) {
        // Bet against the majority (feeling it's overbought)
        optionIndex = market.yesPrice > 0.7 ? 1 : 0;
      } else {
        // Bet randomly
        optionIndex = Math.random() > 0.5 ? 0 : 1;
      }
      break;
    }
    case 'Random Walk':
    default: {
      // Just flip a coin
      optionIndex = Math.random() > 0.5 ? 0 : 1;
      break;
    }
  }

  // Execute trade if decided
  if (optionIndex !== -1 && bot.balance >= betAmount) {
    addLog('estimate', `${bot.name} is querying Bento buy estimate for ${market.title} (${optionIndex === 0 ? 'YES' : 'NO'})...`, bot.id);
    const est = calculateEstimate(market, optionIndex, betAmount);
    
    // Simulate a brief delay representing block times / SDK roundtrip
    setTimeout(() => {
      executeTrade(bot, market, optionIndex, betAmount, est.estimate);
    }, 400);
  }

  scheduleNextStep();
}

function scheduleNextStep() {
  if (simTimeoutId) clearTimeout(simTimeoutId);
  simTimeoutId = setTimeout(runSimulationStep, simulationSpeed);
}

// Start simulation
scheduleNextStep();


// === API ROUTING ===

// Get current state
app.get('/api/state', (req, res) => {
  res.json({
    markets,
    bots,
    recentBets: bets.slice(0, 15),
    logs: logs.slice(0, 30),
    isSimulating,
    simulationSpeed
  });
});

// Control simulation
app.post('/api/simulation/toggle', (req, res) => {
  isSimulating = !isSimulating;
  addLog('info', `Simulation ${isSimulating ? 'started' : 'paused'} by user.`);
  if (isSimulating) {
    scheduleNextStep();
  } else if (simTimeoutId) {
    clearTimeout(simTimeoutId);
    simTimeoutId = null;
  }
  res.json({ isSimulating });
});

// Change speed
app.post('/api/simulation/speed', (req, res) => {
  const { speed } = req.body;
  if (speed && speed >= 500 && speed <= 10000) {
    simulationSpeed = speed;
    addLog('info', `Simulation tick interval updated to ${speed}ms.`);
    if (isSimulating) scheduleNextStep();
    res.json({ success: true, speed });
  } else {
    res.status(400).json({ error: 'Speed must be between 500 and 10000 ms.' });
  }
});

// Add custom bot
app.post('/api/bots', (req, res) => {
  const { name, strategy, balance, color } = req.body;
  if (!name || !strategy || !balance) {
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  const newBot = {
    id: 'bot-' + crypto.randomBytes(4).toString('hex'),
    name,
    address: '0x' + crypto.randomBytes(20).toString('hex').substring(0, 8) + '...' + crypto.randomBytes(20).toString('hex').substring(32, 36),
    managedAccount: '0x' + crypto.randomBytes(20).toString('hex').substring(0, 8) + '...' + crypto.randomBytes(20).toString('hex').substring(32, 36),
    strategy,
    description: `User-defined agent utilizing ${strategy} logic.`,
    balance: parseFloat(balance),
    initialBalance: parseFloat(balance),
    isActive: true,
    color: color || '#4f46e5'
  };

  bots.push(newBot);
  addLog('info', `New autonomous bot registered: "${newBot.name}" running strategy "${newBot.strategy}".`);
  res.json(newBot);
});

// Toggle bot active state
app.post('/api/bots/:id/toggle', (req, res) => {
  const bot = bots.find(b => b.id === req.params.id);
  if (!bot) return res.status(404).json({ error: 'Bot not found.' });

  bot.isActive = !bot.isActive;
  addLog('info', `Bot "${bot.name}" has been ${bot.isActive ? 'activated' : 'deactivated'}.`);
  res.json(bot);
});

// Bento SDK Mock Estimation endpoint
app.post('/api/bets/estimate', (req, res) => {
  const { duelId, optionIndex, betAmountUsdc } = req.body;
  const market = markets.find(m => m.duelId === duelId);
  if (!market) return res.status(404).json({ error: 'Market not found.' });

  const est = calculateEstimate(market, optionIndex, betAmountUsdc);
  res.json(est);
});

// Bento SDK Mock Trade placement endpoint
app.post('/api/bets/place', (req, res) => {
  const { botId, duelId, optionIndex, betAmountUsdc, estimate } = req.body;
  const bot = bots.find(b => b.id === botId);
  const market = markets.find(m => m.duelId === duelId);

  if (!bot || !market) return res.status(404).json({ error: 'Bot or market not found.' });

  const bet = executeTrade(bot, market, optionIndex, betAmountUsdc, estimate);
  if (bet) {
    res.json({ success: true, txReceipt: bet });
  } else {
    res.status(400).json({ error: 'Trade execution failed.' });
  }
});

// Wildcard fallback to serve index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 AgentArena running on http://localhost:${PORT}`);
  console.log(`💻 Local simulation running every ${simulationSpeed}ms`);
  console.log(`======================================================\n`);
});

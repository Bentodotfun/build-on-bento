// === GLOBAL APPLICATION STATE ===
let currentTab = 'logs'; // 'logs' or 'bets'
let isModalOpen = false;
let selectedBotId = null;
let pollInterval = null;

// Bot strategy code blocks for visual inspection modal
const strategyCodes = {
  'Trend Follower': `// Trend Follower Momentum Strategy
async function executeTrendStrategy(market, sdk) {
  const history = market.history;
  
  if (history.length >= 2) {
    const lastPrice = history[history.length - 1];
    const prevPrice = history[history.length - 2];
    
    if (lastPrice > prevPrice) {
      // Momentum is upward, buy YES option (optionA)
      const est = await sdk.user.bets.estimateBuy({
        duelId: market.duelId,
        optionIndex: 0,
        betAmountUsdc: '25000000000000000000' // 25 USDC (in wei)
      });
      if (est.success) {
        return await sdk.user.placeBet({
          duelId: market.duelId,
          duelType: 'prediction',
          bet: 'optionA',
          optionIndex: 0,
          betAmount: est.estimate.shares_out
        });
      }
    } else if (lastPrice < prevPrice) {
      // Momentum is downward, buy NO option (optionB)
      const est = await sdk.user.bets.estimateBuy({
        duelId: market.duelId,
        optionIndex: 1,
        betAmountUsdc: '25000000000000000000'
      });
      if (est.success) {
        return await sdk.user.placeBet({
          duelId: market.duelId,
          duelType: 'prediction',
          bet: 'optionB',
          optionIndex: 1,
          betAmount: est.estimate.shares_out
        });
      }
    }
  }
  return null; // Skip trading this tick
}`,
  'Contrarian': `// Contrarian Reversal Strategy
async function executeContrarianStrategy(market, sdk) {
  const currentYesPrice = market.yesPrice;
  
  // Look for heavily skewed markets to buy underpriced options
  if (currentYesPrice < 0.35) {
    // YES option is cheap, buy YES (optionA)
    const est = await sdk.user.bets.estimateBuy({
      duelId: market.duelId,
      optionIndex: 0,
      betAmountUsdc: '30000000000000000000' // 30 USDC
    });
    if (est.success) {
      return await sdk.user.placeBet({
        duelId: market.duelId,
        duelType: 'prediction',
        bet: 'optionA',
        optionIndex: 0,
        betAmount: est.estimate.shares_out
      });
    }
  } else if (currentYesPrice > 0.65) {
    // NO option is cheap (YES > 65% means NO < 35%), buy NO (optionB)
    const est = await sdk.user.bets.estimateBuy({
      duelId: market.duelId,
      optionIndex: 1,
      betAmountUsdc: '30000000000000000000'
    });
    if (est.success) {
      return await sdk.user.placeBet({
        duelId: market.duelId,
        duelType: 'prediction',
        bet: 'optionB',
        optionIndex: 1,
        betAmount: est.estimate.shares_out
      });
    }
  }
  return null;
}`,
  'Random Walk': `// Chaos Monkey Random Coinflip Strategy
async function executeRandomWalk(market, sdk) {
  // Pure noise generation. Randomly flip a coin to buy YES or NO.
  const optionIndex = Math.random() > 0.5 ? 0 : 1;
  const option = optionIndex === 0 ? 'optionA' : 'optionB';
  const amount = Math.floor(Math.random() * 30) + 10; // 10-40 USDC
  
  const est = await sdk.user.bets.estimateBuy({
    duelId: market.duelId,
    optionIndex,
    betAmountUsdc: (amount * 1e18).toString()
  });
  
  if (est.success) {
    return await sdk.user.placeBet({
      duelId: market.duelId,
      duelType: 'prediction',
      bet: option,
      optionIndex,
      betAmount: est.estimate.shares_out
    });
  }
  return null;
}`,
  'High Impact Speculator': `// High Impact Whale Speculator
async function executeWhaleSpeculator(market, sdk) {
  const currentYesPrice = market.yesPrice;
  
  // Whales seek high-risk, high-payout options or look to push markets
  if (currentYesPrice > 0.70 || currentYesPrice < 0.30) {
    // Bet against the crowd with deep capital stakes
    const optionIndex = currentYesPrice > 0.70 ? 1 : 0;
    const option = optionIndex === 0 ? 'optionA' : 'optionB';
    const amount = Math.floor(Math.random() * 200) + 100; // 100-300 USDC
    
    const est = await sdk.user.bets.estimateBuy({
      duelId: market.duelId,
      optionIndex,
      betAmountUsdc: (amount * 1e18).toString()
    });
    
    if (est.success) {
      return await sdk.user.placeBet({
        duelId: market.duelId,
        duelType: 'prediction',
        bet: option,
        optionIndex,
        betAmount: est.estimate.shares_out
      });
    }
  }
  return null;
}`
};

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', () => {
  fetchState();
  startPolling();
  setupEventHandlers();
});

// Setup click/submit bindings
function setupEventHandlers() {
  // Toggle simulation
  document.getElementById('toggle-sim-btn').addEventListener('click', toggleSimulation);

  // Speed selection
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const speed = parseInt(e.target.dataset.speed);
      changeSimSpeed(speed);
    });
  });

  // Tab switching
  document.getElementById('tab-logs').addEventListener('click', () => switchTab('logs'));
  document.getElementById('tab-bets').addEventListener('click', () => switchTab('bets'));

  // Custom bot form submission
  document.getElementById('add-bot-form').addEventListener('submit', handleAddBot);

  // Modal actions
  document.getElementById('close-modal-btn').addEventListener('click', closeModal);
  document.getElementById('bot-modal').addEventListener('click', (e) => {
    if (e.target.id === 'bot-modal') closeModal();
  });
}

// === API CALLS ===

async function fetchState() {
  try {
    const res = await fetch('/api/state');
    if (!res.ok) throw new Error('API offline');
    const state = await res.json();
    renderUI(state);
  } catch (err) {
    console.error('Error fetching state:', err);
    // Show offline in terminal
    const terminal = document.getElementById('terminal-content');
    if (terminal) {
      terminal.innerHTML = `<div class="terminal-line log-type-warning">[ERROR] Disconnected from AgentArena backend. Server may be offline.</div>`;
    }
  }
}

function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  // Poll every 1 second to keep UI snappy
  pollInterval = setInterval(fetchState, 1000);
}

async function toggleSimulation() {
  try {
    const res = await fetch('/api/simulation/toggle', { method: 'POST' });
    const data = await res.json();
    updateSimButton(data.isSimulating);
  } catch (err) {
    console.error('Failed to toggle simulation:', err);
  }
}

async function changeSimSpeed(speed) {
  try {
    const res = await fetch('/api/simulation/speed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speed })
    });
    const data = await res.json();
    if (data.success) {
      document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.speed) === speed);
      });
    }
  } catch (err) {
    console.error('Failed to update simulation speed:', err);
  }
}

async function handleAddBot(e) {
  e.preventDefault();
  const name = document.getElementById('bot-name').value;
  const strategy = document.getElementById('bot-strategy').value;
  const balance = document.getElementById('bot-balance').value;
  
  // Read color radio
  const colorEl = document.querySelector('input[name="bot-color"]:checked');
  const color = colorEl ? colorEl.value : '#4f46e5';

  try {
    const res = await fetch('/api/bots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, strategy, balance, color })
    });
    if (res.ok) {
      // Clear form
      document.getElementById('bot-name').value = '';
      document.getElementById('bot-balance').value = '1000';
      fetchState();
    } else {
      const err = await res.json();
      alert('Error creating bot: ' + err.error);
    }
  } catch (err) {
    console.error('Failed to add bot:', err);
  }
}

async function toggleBotActive(botId) {
  try {
    await fetch(`/api/bots/${botId}/toggle`, { method: 'POST' });
    fetchState();
  } catch (err) {
    console.error('Failed to toggle bot active state:', err);
  }
}

// === RENDERING ENGINE ===

function renderUI(state) {
  renderMarkets(state.markets);
  renderBots(state.bots);
  renderTerminal(state.logs, state.recentBets);
  renderStats(state);
  updateSimButton(state.isSimulating);
}

function updateSimButton(isSimulating) {
  const btn = document.getElementById('toggle-sim-btn');
  const btnText = document.getElementById('toggle-sim-text');
  const dot = document.getElementById('status-dot');
  const statusTxt = document.getElementById('status-text');

  if (isSimulating) {
    btn.className = 'primary-btn pause';
    btnText.textContent = 'Pause Arena';
    dot.className = 'status-dot active';
    statusTxt.textContent = 'Simulating';
  } else {
    btn.className = 'primary-btn play';
    btnText.textContent = 'Start Arena';
    dot.className = 'status-dot';
    statusTxt.textContent = 'Paused';
  }
}

function renderStats(state) {
  // Volume sum
  const totalVolume = state.markets.reduce((acc, m) => acc + m.volume, 0);
  document.getElementById('stat-volume').textContent = `$${totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
  
  // Total bots
  document.getElementById('stat-agents').textContent = state.bots.length;
  
  // Total bets (count logs of success)
  const totalBets = state.recentBets.length; 
  document.getElementById('stat-bets').textContent = totalBets > 0 ? totalBets : state.recentBets.length;
}

function renderMarkets(markets) {
  const list = document.getElementById('markets-list');
  document.getElementById('market-count').textContent = `${markets.length} Markets`;
  
  let html = '';
  markets.forEach(m => {
    const yesPct = Math.round(m.yesPrice * 100);
    const noPct = 100 - yesPct;
    
    // Sparkline points calculation
    const sparklinePoints = makeSparklinePoints(m.history);

    html += `
      <div class="market-item">
        <div class="market-item-top">
          <div>
            <span class="market-category">${m.category}</span>
            <h3 class="market-title">${m.title}</h3>
          </div>
          <div class="sparkline-box">
            <span class="market-category">Odds Trend</span>
            <svg class="sparkline-svg" width="60" height="20" viewBox="0 0 60 20">
              <path d="${sparklinePoints}" />
            </svg>
          </div>
        </div>
        <p class="market-desc">${m.description}</p>
        
        <div class="market-odds-container">
          <div class="odds-labels">
            <span class="odds-yes">YES optionA &nbsp; ${yesPct}%</span>
            <span class="odds-no">${noPct}% &nbsp; NO optionB</span>
          </div>
          <div class="odds-bar-track">
            <div class="odds-bar-fill odds-bar-yes" style="width: ${yesPct}%"></div>
            <div class="odds-bar-fill odds-bar-no" style="width: ${noPct}%"></div>
          </div>
        </div>

        <div class="market-footer-stats">
          <span>Market Pool: <strong>$${m.liquidity.toLocaleString()} USDC</strong></span>
          <span>Volume: <strong>$${m.volume.toLocaleString(undefined, { maximumFractionDigits: 0 })} USDC</strong></span>
          <span>Bento ID: <code style="font-family: monospace;">${m.duelId}</code></span>
        </div>
      </div>
    `;
  });
  list.innerHTML = html;
}

// Computes SVG path coordinates from history floats
function makeSparklinePoints(history) {
  if (!history || history.length < 2) return 'M 0 10 L 60 10';
  const width = 60;
  const height = 18;
  const step = width / (history.length - 1);
  
  // Find ranges
  let min = Math.min(...history);
  let max = Math.max(...history);
  if (max === min) {
    min -= 0.1;
    max += 0.1;
  }
  
  const points = history.map((val, idx) => {
    const x = idx * step;
    // Map value to y space (higher probability is at top of graph, meaning smaller Y index)
    const norm = (val - min) / (max - min);
    const y = height - (norm * height) + 1; // pad 1px
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  
  return 'M ' + points.join(' L ');
}

function renderBots(bots) {
  const list = document.getElementById('bots-list');
  document.getElementById('bot-count').textContent = `${bots.length} Active`;
  
  let html = '';
  bots.forEach(b => {
    // calculate PnL
    const pnl = b.balance - b.initialBalance;
    const pnlPct = ((pnl / b.initialBalance) * 100).toFixed(1);
    const pnlClass = pnl >= 0 ? 'pnl-positive' : 'pnl-negative';
    const pnlSign = pnl >= 0 ? '+' : '';
    const initial = b.name.substring(0, 2).toUpperCase();

    html += `
      <div class="bot-card" style="border-left: 4px solid ${b.color}">
        <div class="bot-info">
          <div class="bot-avatar" style="background: ${b.color}">
            ${initial}
          </div>
          <div class="bot-details">
            <div class="bot-name-container">
              <span class="bot-name" onclick="openBotModal('${b.id}')">${b.name}</span>
              <span class="badge" style="background: ${b.color}15; color: ${b.color}; font-size: 0.65rem; border: 1px solid ${b.color}30;">
                ${b.strategy}
              </span>
            </div>
            <div class="bot-wallets">
              Wallet: <span>${b.address}</span> &nbsp;|&nbsp; Bento: <span>${b.managedAccount}</span>
            </div>
          </div>
        </div>

        <div class="bot-stats">
          <span class="bot-balance">$${b.balance.toFixed(2)} USDC</span>
          <span class="bot-pnl ${pnlClass}">${pnlSign}$${pnl.toFixed(2)} (${pnlSign}${pnlPct}%)</span>
        </div>

        <div class="bot-actions">
          <label class="switch">
            <input type="checkbox" ${b.isActive ? 'checked' : ''} onchange="toggleBotActive('${b.id}')">
            <span class="slider"></span>
          </label>
        </div>
      </div>
    `;
  });
  list.innerHTML = html;
}

function switchTab(tab) {
  currentTab = tab;
  document.getElementById('tab-logs').classList.toggle('active', tab === 'logs');
  document.getElementById('tab-bets').classList.toggle('active', tab === 'bets');
  fetchState(); // force re-render instantly
}

function renderTerminal(logs, bets) {
  const terminal = document.getElementById('terminal-content');
  if (!terminal) return;

  if (currentTab === 'logs') {
    if (logs.length === 0) {
      terminal.innerHTML = `<div class="terminal-line log-type-info">Awaiting bot interactions...</div>`;
      return;
    }
    
    let html = '';
    logs.forEach(l => {
      let severityClass = 'log-type-info';
      if (l.type === 'estimate') severityClass = 'log-type-estimate';
      if (l.type === 'success') severityClass = 'log-type-success';
      if (l.type === 'warning') severityClass = 'log-type-warning';

      html += `<div class="terminal-line"><span class="log-time">[${l.timestamp}]</span> <span class="${severityClass}">${l.message}</span></div>`;
    });
    terminal.innerHTML = html;
  } else {
    // tab === 'bets'
    if (bets.length === 0) {
      terminal.innerHTML = `<div class="terminal-line log-type-info">No bets settled in this arena session yet.</div>`;
      return;
    }

    let html = '';
    bets.forEach(b => {
      const optionText = b.optionIndex === 0 ? 'YES' : 'NO';
      const pct = (b.avgPrice * 100).toFixed(0);
      
      html += `
        <div class="terminal-line">
          <span class="log-time">[${b.timestamp}]</span> 
          <span style="color: ${b.botColor}; font-weight: bold;">${b.botName}</span> 
          <span>settled buy: <strong>${optionText}</strong> on </span>
          <span style="color: #e2e8f0; font-weight: 500;">"${b.marketTitle}"</span> 
          <span>for <strong>$${b.betAmountUsdc} USDC</strong> @ odds ~${pct}% (Tx: ${b.id})</span>
        </div>
      `;
    });
    terminal.innerHTML = html;
  }
}

// === DETAIL MODAL ENGINE ===

async function openBotModal(botId) {
  try {
    const res = await fetch('/api/state');
    const state = await res.json();
    const bot = state.bots.find(b => b.id === botId);
    if (!bot) return;

    selectedBotId = botId;
    isModalOpen = true;

    // Fill elements
    document.getElementById('modal-bot-name').textContent = bot.name;
    document.getElementById('modal-bot-strategy').textContent = bot.strategy;
    document.getElementById('modal-bot-strategy').style.background = `${bot.color}15`;
    document.getElementById('modal-bot-strategy').style.color = bot.color;
    document.getElementById('modal-bot-strategy').style.borderColor = `${bot.color}30`;
    
    const avatar = document.getElementById('modal-bot-avatar');
    avatar.textContent = bot.name.substring(0, 2).toUpperCase();
    avatar.style.background = bot.color;

    document.getElementById('modal-bot-balance').textContent = `$${bot.balance.toFixed(2)} USDC`;
    document.getElementById('modal-bot-initial').textContent = `$${bot.initialBalance.toFixed(2)} USDC`;
    
    const pnl = bot.balance - bot.initialBalance;
    const pnlPct = ((pnl / bot.initialBalance) * 100).toFixed(1);
    const pnlEl = document.getElementById('modal-bot-pnl');
    pnlEl.textContent = `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnl >= 0 ? '+' : ''}${pnlPct}%)`;
    pnlEl.className = `stat-val ${pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}`;

    // Fill code logic
    const codeBlock = document.getElementById('modal-bot-code');
    codeBlock.textContent = strategyCodes[bot.strategy] || '// Standard strategy logic';

    // Show overlay
    document.getElementById('bot-modal').classList.add('open');
  } catch (err) {
    console.error('Error opening modal:', err);
  }
}

function closeModal() {
  isModalOpen = false;
  selectedBotId = null;
  document.getElementById('bot-modal').classList.remove('open');
}

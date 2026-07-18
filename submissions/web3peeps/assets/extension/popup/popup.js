const API_BASE = 'http://localhost:3000';

async function apiRequest(endpoint, method = 'GET', body = null) {
  const options = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(`${API_BASE}${endpoint}`, options);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json();
}

/* ───── Count-up animation ───── */
function animateCountUp(el, target, duration = 600) {
  const start = performance.now();
  const from = 0;
  const step = (now) => {
    const t = Math.min((now - start) / duration, 1);
    // ease-out cubic
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(from + (target - from) * eased);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ───── Stats ───── */
async function loadUserStats(userId) {
  try {
    const user = await apiRequest(`/users/${userId}`);
    const stats = user.stats || {};
    const wins = stats.wins || 0;
    const losses = stats.losses || 0;
    const streak = stats.currentStreak || 0;

    // Convert balance from wei to readable format (divide by 10^18)
    const balanceWei = user.bentoManagedAccountBalance || '0';
    const balance = Math.floor(parseInt(balanceWei) / 1e18);

    animateCountUp(document.getElementById('stat-wins').querySelector('.tm-stat-value'), wins);
    animateCountUp(document.getElementById('stat-losses').querySelector('.tm-stat-value'), losses);
    animateCountUp(document.getElementById('stat-streak').querySelector('.tm-stat-value'), streak);
    animateCountUp(document.getElementById('stat-credit').querySelector('.tm-stat-value'), balance);
  } catch (error) {
    console.error('Failed to load user stats:', error);
  }
}

/* ───── Markets list (click to open betting modal) ───── */
async function loadRecentMarkets(userId) {
  const container = document.getElementById('markets-list');
  try {
    let markets;
    try {
      markets = await apiRequest(`/markets?userId=${userId}&limit=5&sort=-createdAt`);
    } catch {
      markets = await apiRequest('/markets?limit=5&sort=-createdAt');
    }

    if (!markets || markets.length === 0) {
      container.innerHTML = '<div class="tm-empty">No markets yet. Find a tweet and create one!</div>';
      return;
    }

    container.innerHTML = '';
    markets.forEach((market, i) => {
      const odds = market.currentOdds ? Math.round(market.currentOdds * 100) : 50;

      let dotClass = 'tm-dot-pending';
      if (odds > 50) dotClass = 'tm-dot-true';
      else if (odds < 50) dotClass = 'tm-dot-false';

      const row = document.createElement('div');
      row.className = 'tm-market-row';
      row.style.animationDelay = `${i * 60}ms`;
      row.innerHTML = `
        <span class="tm-market-status-dot ${dotClass}"></span>
        <span class="tm-market-claim">${escapeHtml(market.hookLine || market.claimSummary || market.question)}</span>
        <span class="tm-market-odds">${odds}%</span>
      `;

      row.addEventListener('click', () => {
        openBettingModal(market, userId);
      });

      container.appendChild(row);
    });
  } catch (error) {
    console.error('Failed to load markets:', error);
    container.innerHTML = '<div class="tm-error">Failed to load markets</div>';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ───── Betting Modal ───── */

let currentMarket = null;
let selectedPick = null;

function openBettingModal(market, userId) {
  currentMarket = { ...market, userId };
  selectedPick = null;

  const modal = document.getElementById('betting-modal');
  const question = document.getElementById('betting-question');
  const oddsYes = document.getElementById('odds-yes');
  const oddsNo = document.getElementById('odds-no');

  question.textContent = market.question || market.claimSummary;

  const yesOdds = market.currentOdds ? Math.round(market.currentOdds * 100) : 50;
  const noOdds = 100 - yesOdds;

  oddsYes.textContent = `${yesOdds}%`;
  oddsNo.textContent = `${noOdds}%`;

  // Set Bento testnet link
  if (market.bentoMarketId) {
    document.getElementById('betting-bento-link').href = `https://testnet.bento.fun/market/${market.bentoMarketId}`;
  }

  // Reset inputs
  document.getElementById('stake-input').value = '10';
  document.getElementById('betting-error').textContent = '';
  document.querySelectorAll('.tm-bet-option').forEach(btn => btn.classList.remove('active'));
  document.getElementById('place-bet-btn').disabled = true;

  modal.style.display = 'flex';
}

function closeBettingModal() {
  document.getElementById('betting-modal').style.display = 'none';
  currentMarket = null;
  selectedPick = null;
}

document.getElementById('betting-close-btn')?.addEventListener('click', closeBettingModal);

document.getElementById('betting-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'betting-modal') closeBettingModal();
});

document.querySelectorAll('.tm-bet-option').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tm-bet-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedPick = btn.dataset.pick;
    document.getElementById('place-bet-btn').disabled = false;
  });
});

document.getElementById('place-bet-btn')?.addEventListener('click', async () => {
  if (!currentMarket || !selectedPick) return;

  const stakeInput = document.getElementById('stake-input');
  const stake = parseInt(stakeInput.value);
  const errorDiv = document.getElementById('betting-error');

  if (!stake || stake < 1) {
    errorDiv.textContent = 'Stake must be at least 1 credit';
    return;
  }

  const placeBtn = document.getElementById('place-bet-btn');
  placeBtn.disabled = true;
  placeBtn.textContent = 'Placing bet…';
  errorDiv.textContent = '';

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'PLACE_BET',
      userId: currentMarket.userId,
      marketId: currentMarket._id,
      pick: selectedPick,
      stake,
    });

    if (!response || response.error) {
      throw new Error(response?.error || 'Failed to place bet');
    }

    errorDiv.textContent = '';
    placeBtn.textContent = '✓ Bet placed!';
    setTimeout(async () => {
      closeBettingModal();
      const { userId } = await chrome.storage.local.get(['userId']);
      await loadUserStats(userId);
      await loadRecentMarkets(userId);
    }, 1000);
  } catch (error) {
    console.error('Betting error:', error);
    errorDiv.textContent = error.message || 'Failed to place bet';
    placeBtn.disabled = false;
    placeBtn.textContent = 'Place Bet';
  }
});

document.getElementById('betting-ai-btn')?.addEventListener('click', async () => {
  if (!currentMarket) return;

  const aiBtn = document.getElementById('betting-ai-btn');
  aiBtn.disabled = true;
  aiBtn.textContent = '⏳ Analyzing...';

  try {
    const response = await fetch(`http://localhost:3000/markets/${currentMarket._id}/ai-analysis-predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: currentMarket.question || currentMarket.claimSummary,
        resolutionCriteria: currentMarket.resolutionCriteria,
      })
    });

    if (response.ok) {
      const data = await response.json();
      const aiSection = document.getElementById('betting-ai-section');
      const aiAnalysis = document.getElementById('betting-ai-analysis');
      const aiConfidence = document.getElementById('betting-ai-confidence');
      const aiPrediction = document.getElementById('betting-ai-prediction');

      aiAnalysis.textContent = data.analysis;
      aiConfidence.textContent = data.confidence;
      aiPrediction.textContent = data.prediction === 'YES' ? '✅ YES' : '❌ NO';
      aiPrediction.style.color = data.prediction === 'YES' ? '#00E676' : '#FF3D57';
      aiSection.style.display = 'block';
      aiBtn.textContent = '✓ Done';
    } else {
      aiBtn.textContent = '❌ Failed';
    }
  } catch (err) {
    console.error('[tm] AI prediction error:', err);
    aiBtn.textContent = '❌ Error';
  }
});

/* ───── Init user (X handle first-run) ───── */
async function initializeUser(xHandle) {
  const cleanHandle = xHandle.replace('@', '').trim();
  if (!cleanHandle) throw new Error('Please enter a valid handle');
  const user = await apiRequest('/users', 'POST', {
    xHandle: cleanHandle,
    displayName: cleanHandle,
  });
  await chrome.storage.local.set({
    userId: user._id,
    xHandle: cleanHandle,
    bentoManagedAccountAddress: user.bentoManagedAccountAddress
  });
  return user._id;
}

/* ───── Handle setup ───── */
document.getElementById('save-handle-btn')?.addEventListener('click', async () => {
  const input = document.getElementById('x-handle-input');
  const btn = document.getElementById('save-handle-btn');
  btn.disabled = true;
  btn.textContent = 'Setting up…';

  try {
    await initializeUser(input.value);
    // Reload to show main view
    document.getElementById('setup-view').style.display = 'none';
    document.getElementById('main-view').style.display = 'block';
    const { userId } = await chrome.storage.local.get(['userId']);
    await loadUserStats(userId);
    await loadRecentMarkets(userId);
  } catch (error) {
    btn.disabled = false;
    btn.textContent = 'Confirm';
    // Simple inline feedback instead of alert
    const note = document.querySelector('.tm-setup-note');
    note.textContent = error.message;
    note.style.color = 'var(--verdict-red)';
  }
});

/* ───── Init ───── */
(async function init() {
  const { userId } = await chrome.storage.local.get(['userId']);
  if (!userId) {
    document.getElementById('setup-view').style.display = 'block';
  } else {
    document.getElementById('main-view').style.display = 'block';
    await loadUserStats(userId);
    await loadRecentMarkets(userId);
  }
})();

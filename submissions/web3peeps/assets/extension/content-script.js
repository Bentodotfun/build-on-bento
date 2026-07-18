const VALID_CATEGORIES = [
  'Cricket', 'Football', 'Basketball', 'American Football',
  'Tennis', 'Baseball', 'Hockey', 'Formula 1',
];

function extractTweetData(tweetElement) {
  const timeElement = tweetElement.querySelector('time');
  if (!timeElement) return null;

  const permalinkAnchor = timeElement.parentElement;
  if (!permalinkAnchor || !permalinkAnchor.href) return null;

  const tweetIdMatch = permalinkAnchor.href.match(/\/status\/(\d+)/);
  if (!tweetIdMatch) return null;

  const tweetTextElement = tweetElement.querySelector('[data-testid="tweetText"]');
  const tweetText = tweetTextElement ? tweetTextElement.textContent.trim() : '';

  const authorLinkElement = tweetElement.querySelector('a[role="link"][href*="/"]');
  const authorHandle = authorLinkElement
    ? authorLinkElement.href.match(/(?:x\.com|twitter\.com)\/([^\/\?]+)/)?.[1] || 'unknown'
    : 'unknown';

  return {
    tweetId: tweetIdMatch[1],
    tweetText,
    authorHandle,
  };
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ───── Odds badge (tweets with a market) ───── */

function createMarketBadge(market) {
  const odds = market.odds ? Math.round(market.odds * 100) : 50;

  let dotClass = 'tm-dot-pending';
  let oddsClass = '';
  if (odds > 50) {
    dotClass = 'tm-dot-true';
    oddsClass = 'tm-odds-true';
  } else if (odds < 50) {
    dotClass = 'tm-dot-false';
    oddsClass = 'tm-odds-false';
  }

  const badge = document.createElement('div');
  badge.className = 'tm-badge';
  badge.innerHTML = `
    <span class="tm-badge-dot ${dotClass}"></span>
    <span class="tm-badge-odds ${oddsClass}">${odds}% true</span>
    <span class="tm-badge-hook">${escapeHtml(market.hookLine || '')}</span>
  `;

  badge.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Show pool details summary with AI analysis
    const summary = document.createElement('div');
    summary.className = 'tm-pool-summary';
    summary.innerHTML = `
      <div class="tm-pool-summary-content">
        <h3>Pool Details</h3>
        <div class="tm-pool-grid">
          <div class="tm-pool-stat">
            <p class="tm-pool-label">Participants</p>
            <p class="tm-pool-value">${market.participants ?? 0}</p>
          </div>
          <div class="tm-pool-stat">
            <p class="tm-pool-label">Yes Votes</p>
            <p class="tm-pool-value tm-pool-yes">${market.yesVotes ?? 0}</p>
          </div>
          <div class="tm-pool-stat">
            <p class="tm-pool-label">No Votes</p>
            <p class="tm-pool-value tm-pool-no">${market.noVotes ?? 0}</p>
          </div>
          <div class="tm-pool-stat">
            <p class="tm-pool-label">Volume</p>
            <p class="tm-pool-value">$${(market.totalVolume ?? 0).toLocaleString()}</p>
          </div>
        </div>
        <div class="tm-pool-actions">
          <button class="tm-pool-ai-btn" id="tm-ai-analysis-btn">🤖 Get AI Analysis</button>
        </div>
        <div class="tm-pool-ai-section" id="tm-ai-section" style="display: none; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.1);">
          <h4 style="font-size: 12px; font-weight: 600; margin: 0 0 8px 0;">AI Prediction</h4>
          <p class="tm-pool-ai-analysis" id="tm-ai-analysis"></p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; font-size: 11px;">
            <div>
              <span style="color: rgba(0,0,0,0.6);">Predict: </span>
              <span id="tm-ai-prediction" style="font-weight: 600; font-size: 13px;"></span>
            </div>
            <div>
              <span style="color: rgba(0,0,0,0.6);">Confidence: </span>
              <span id="tm-ai-confidence" style="font-weight: 600;">-</span>%
            </div>
          </div>
        </div>
        <a href="https://testnet.bento.fun/market/${market.bentoMarketId}" target="_blank" class="tm-pool-link">
          Open on Bento Testnet →
        </a>
      </div>
    `;

    document.body.appendChild(summary);
    setTimeout(() => summary.classList.add('tm-pool-summary-show'), 10);

    // Handle AI Analysis button click
    const aiBtn = document.getElementById('tm-ai-analysis-btn');
    if (aiBtn) {
      aiBtn.addEventListener('click', async () => {
        aiBtn.disabled = true;
        aiBtn.textContent = '⏳ Analyzing...';

        try {
          if (market._id) {
            const response = await fetch(`http://localhost:3000/markets/${market._id}/ai-analysis-predict`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                question: market.question || market.claimSummary,
                resolutionCriteria: market.resolutionCriteria,
              })
            });

            if (response.ok) {
              const data = await response.json();
              const aiSection = document.getElementById('tm-ai-section');
              const aiAnalysis = document.getElementById('tm-ai-analysis');
              const aiConfidence = document.getElementById('tm-ai-confidence');
              const aiPrediction = document.getElementById('tm-ai-prediction');

              aiAnalysis.textContent = data.analysis;
              aiConfidence.textContent = data.confidence;
              aiPrediction.textContent = data.prediction === 'YES' ? '✅ YES' : '❌ NO';
              aiPrediction.style.color = data.prediction === 'YES' ? '#00E676' : '#FF3D57';
              aiSection.style.display = 'block';
              aiBtn.textContent = '✓ Done';
            } else {
              aiBtn.textContent = '❌ Failed';
            }
          }
        } catch (err) {
          console.error('[tm] AI prediction error:', err);
          aiBtn.textContent = '❌ Error';
        }
      });
    }

    setTimeout(() => {
      summary.classList.remove('tm-pool-summary-show');
      setTimeout(() => summary.remove(), 300);
    }, 8000);
  });

  return badge;
}

/* ───── Create Market button (tweets without a market) ───── */

function createCreateButton(tweetData) {
  const btn = document.createElement('button');
  btn.className = 'tm-create-btn';
  btn.innerHTML = '⚡';
  btn.setAttribute('aria-label', 'Create a truth market');

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    btn.disabled = true;
    btn.innerHTML = '<span class="tm-spinner"></span>';

    const timeElement = tweetData._tweetElement.querySelector('time');
    const tweetTimestamp = timeElement ? timeElement.getAttribute('datetime') : new Date().toISOString();

    try {
      chrome.runtime.sendMessage({
        type: 'DRAFT_MARKET',
        tweetText: tweetData.tweetText,
        authorHandle: tweetData.authorHandle,
        tweetTimestamp,
      }, (draftResponse) => {
        if (chrome.runtime.lastError) {
          console.warn('Draft error:', chrome.runtime.lastError.message);
          btn.disabled = false;
          btn.innerHTML = '⚡';
          return;
        }

        if (!draftResponse) {
          btn.disabled = false;
          btn.innerHTML = '⚡';
          return;
        }

        if (draftResponse.error) {
          btn.disabled = false;
          btn.innerHTML = '⚡';
          console.error('Draft failed:', draftResponse.error);
          return;
        }

        btn.remove();
        showConfirmationCard(tweetData, draftResponse);
      });
    } catch (err) {
      console.warn('Failed to send draft message:', err.message);
      btn.disabled = false;
      btn.innerHTML = '⚡';
    }
  });

  return btn;
}

/* ───── Confirmation card (draft → edit → confirm) ───── */

function showConfirmationCard(tweetData, draft) {
  const existing = document.querySelector('.tm-confirm-card');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.className = 'tm-confirm-container';

  container.innerHTML = `
    <div class="tm-confirm-card">
      <div class="tm-confirm-header">⚡ Create Dibs</div>
      <label class="tm-confirm-label">Question (Bento market)</label>
      <input class="tm-confirm-input" id="tm-question-input" value="${escapeHtml(draft.question)}" maxlength="140" />
      <label class="tm-confirm-label">Category</label>
      <select class="tm-confirm-select" id="tm-category-select">
        ${VALID_CATEGORIES.map(c => `<option value="${c}"${c === draft.category ? ' selected' : ''}>${c}</option>`).join('')}
      </select>
      <label class="tm-confirm-label">Resolution Deadline</label>
      <input class="tm-confirm-input" id="tm-deadline-input" type="range" min="6" max="48" value="24" step="1" />
      <div class="tm-deadline-display" id="tm-deadline-display">24 hours from now</div>
      <div class="tm-confirm-hook">${escapeHtml(draft.hookLine)}</div>
      <div class="tm-confirm-actions">
        <button class="tm-confirm-cancel" id="tm-confirm-cancel">Cancel</button>
        <button class="tm-confirm-submit" id="tm-confirm-submit">Confirm & Create</button>
      </div>
    </div>
  `;

  // Insert after the action bar
  const actionsRow = tweetData._tweetElement.querySelector('[data-testid="reply"]')?.parentElement;
  if (actionsRow) {
    actionsRow.parentElement.insertBefore(container, actionsRow.nextSibling);
  } else {
    const tweetTextEl = tweetData._tweetElement.querySelector('[data-testid="tweetText"]');
    if (tweetTextEl) {
      tweetTextEl.parentElement.appendChild(container);
    } else {
      tweetData._tweetElement.appendChild(container);
    }
  }

  const questionInput = container.querySelector('#tm-question-input');
  const categorySelect = container.querySelector('#tm-category-select');
  const deadlineInput = container.querySelector('#tm-deadline-input');
  const deadlineDisplay = container.querySelector('#tm-deadline-display');
  const submitBtn = container.querySelector('#tm-confirm-submit');
  const cancelBtn = container.querySelector('#tm-confirm-cancel');

  questionInput.addEventListener('click', (e) => e.stopPropagation());
  categorySelect.addEventListener('click', (e) => e.stopPropagation());
  deadlineInput.addEventListener('click', (e) => e.stopPropagation());

  deadlineInput.addEventListener('input', (e) => {
    const hours = parseInt(e.target.value);
    deadlineDisplay.textContent = `${hours} hour${hours !== 1 ? 's' : ''} from now`;
  });

  cancelBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    container.remove();
    const btn = createCreateButton(tweetData);
    const parent = actionsRow ? actionsRow.parentElement : tweetData._tweetElement;
    if (actionsRow) {
      parent.insertBefore(btn, actionsRow.nextSibling);
    } else {
      parent.appendChild(btn);
    }
    // Wrap in container for consistent layout
    const wrapper = document.createElement('div');
    wrapper.className = 'tm-container';
    btn.parentElement.insertBefore(wrapper, btn);
    wrapper.appendChild(btn);
  });

  submitBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating…';

    const hours = parseInt(deadlineInput.value);
    const resolvesBy = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

    try {
      chrome.runtime.sendMessage({
        type: 'CREATE_MARKET',
        tweetId: tweetData.tweetId,
        tweetText: tweetData.tweetText,
        authorHandle: tweetData.authorHandle,
        question: questionInput.value.trim(),
        category: categorySelect.value,
        resolvesBy,
        resolutionCriteria: draft.resolutionCriteria,
        hookLine: draft.hookLine,
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('Create error:', chrome.runtime.lastError.message);
          submitBtn.disabled = false;
          submitBtn.textContent = '❌ Extension error — try again';
          return;
        }

        if (!response) {
          submitBtn.disabled = false;
          submitBtn.textContent = '❌ No response — try again';
          return;
        }

        if (response.error) {
          submitBtn.disabled = false;
          const label = response.error.length > 60
            ? response.error.slice(0, 57) + '…'
            : response.error;
          submitBtn.textContent = `❌ ${label}`;
          submitBtn.title = response.error;
          console.error('Market creation failed:', response.error);
          return;
        }

        const badge = createMarketBadge(response);
        const wrapper = container.querySelector('.tm-confirm-card');
        if (wrapper) {
          wrapper.style.transition = 'transform 0.2s ease, opacity 0.15s ease';
          wrapper.style.transform = 'scale(0.92)';
          wrapper.style.opacity = '0';
        }
        setTimeout(() => {
          container.innerHTML = '';
          container.appendChild(badge);
          badge.style.transform = 'scale(0.92)';
          badge.style.opacity = '0';
          requestAnimationFrame(() => {
            badge.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
            badge.style.transform = 'scale(1)';
            badge.style.opacity = '1';
          });
        }, 200);
      });
    } catch (err) {
      console.warn('Failed to send create market message:', err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = '❌ Extension error — try again';
    }
  });
}

/* ───── Tweet scanner ───── */

function processTweet(tweetElement) {
  if (tweetElement.dataset.tmProcessed) return;
  tweetElement.dataset.tmProcessed = 'true';

  const tweetData = extractTweetData(tweetElement);
  if (!tweetData || !tweetData.tweetText) return;

  tweetData._tweetElement = tweetElement;

  try {
    chrome.runtime.sendMessage(
      { type: 'CHECK_MARKET', tweetId: tweetData.tweetId },
      (market) => {
        if (chrome.runtime.lastError) {
          console.warn('Extension context error, skipping market check:', chrome.runtime.lastError.message);
          return;
        }

        const replyBtn = tweetElement.querySelector('[data-testid="reply"]');
        if (!replyBtn) return;

        const actionsRow = replyBtn.parentElement;
        if (!actionsRow) return;

        const container = document.createElement('div');
        container.className = 'tm-container';

        if (market && market.bentoMarketId) {
          container.appendChild(createMarketBadge(market));
        } else {
          container.appendChild(createCreateButton(tweetData));
        }

        if (actionsRow.parentElement) {
          actionsRow.parentElement.insertBefore(container, actionsRow.nextSibling);
        } else {
          tweetElement.appendChild(container);
        }
      }
    );
  } catch (error) {
    console.warn('Failed to check market:', error.message);
  }
}

function scanTweets() {
  document
    .querySelectorAll('article[data-testid="tweet"]:not([data-tm-processed])')
    .forEach(processTweet);
}

const observer = new MutationObserver(() => {
  scanTweets();
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Initial scan after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scanTweets);
} else {
  setTimeout(scanTweets, 100);
}

const BACKEND_URL = 'http://localhost:3000';

// Hard cap on the time we'll wait for the backend. Bento retries can take
// ~10–20 s, but a Manifest V3 service worker fetch that hangs longer than
// this will cause the content-script callback to fire after the message
// channel has already closed (the dreaded "A listener indicated an
// asynchronous response by returning true, but the message channel closed"
// error). Keep this in sync with backend/lib/bento.js MAX_TOTAL_MS.
const REQUEST_TIMEOUT_MS = 25_000;

function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

function sendJson(sendResponse, response, ok) {
  if (!ok) {
    sendResponse({ error: response?.error || `HTTP ${response?.status || 'unknown'}` });
  } else {
    sendResponse(response);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'CHECK_MARKET':
      fetchWithTimeout(`${BACKEND_URL}/markets/by-tweet/${message.tweetId}`, {}, 10_000)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && data.bentoMarketId) {
            // Enrich with pool data
            fetchWithTimeout(`${BACKEND_URL}/pools/${data._id}`, {}, 10_000)
              .then(r => r.ok ? r.json() : null)
              .then(poolData => {
                if (poolData) {
                  data.participants = poolData.participants || 0;
                  data.yesVotes = poolData.yesVotes || 0;
                  data.noVotes = poolData.noVotes || 0;
                  data.totalVolume = poolData.totalVolume || 0;
                }
                sendResponse(data);
              })
              .catch(() => sendResponse(data));
          } else {
            sendResponse(data);
          }
        })
        .catch(err => sendResponse({ error: `Backend unreachable: ${err.message}` }));
      return true;

    case 'DRAFT_MARKET':
      chrome.storage.local.get(['userId'], ({ userId }) => {
        if (!userId) {
          sendResponse({ error: 'No userId found. Please set up your account in the popup.' });
          return;
        }

        fetchWithTimeout(`${BACKEND_URL}/markets/draft`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tweetText: message.tweetText,
            authorHandle: message.authorHandle,
            tweetTimestamp: message.tweetTimestamp,
            defaultWindowDays: message.defaultWindowDays || 30,
          })
        }, 15_000)
          .then(async r => {
            const data = await r.json().catch(() => ({}));
            return { ok: r.ok, status: r.status, data };
          })
          .then(({ ok, status, data }) => {
            sendJson(sendResponse, data || { status }, ok);
          })
          .catch(err => {
            const isTimeout = err.name === 'AbortError';
            sendResponse({
              error: isTimeout
                ? 'Draft request timed out. Please try again.'
                : `Backend unreachable: ${err.message}`
            });
          });
      });
      return true;

    case 'CREATE_MARKET':
      chrome.storage.local.get(['userId'], ({ userId }) => {
        if (!userId) {
          sendResponse({ error: 'No userId found. Please set up your account in the popup.' });
          return;
        }

        fetchWithTimeout(`${BACKEND_URL}/markets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tweetId: message.tweetId,
            tweetText: message.tweetText,
            authorHandle: message.authorHandle,
            userId,
            question: message.question,
            category: message.category,
            resolvesBy: message.resolvesBy,
            resolutionCriteria: message.resolutionCriteria,
            hookLine: message.hookLine,
          })
        }, REQUEST_TIMEOUT_MS)
          .then(async r => {
            const data = await r.json().catch(() => ({}));
            return { ok: r.ok, status: r.status, data };
          })
          .then(({ ok, status, data }) => {
            sendJson(sendResponse, data || { status }, ok);
          })
          .catch(err => {
            const isTimeout = err.name === 'AbortError';
            sendResponse({
              error: isTimeout
                ? 'Request timed out. Bento is slow right now — please try again in a moment.'
                : `Backend unreachable: ${err.message}`
            });
          });
      });
      return true;

    case 'PLACE_BET':
      chrome.storage.local.get(['userId'], ({ userId }) => {
        if (!userId) {
          sendResponse({ error: 'No userId found' });
          return;
        }

        fetchWithTimeout(`${BACKEND_URL}/bet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            marketId: message.marketId,
            pick: message.pick,
            stake: message.stake
          })
        }, REQUEST_TIMEOUT_MS)
          .then(async r => {
            const data = await r.json().catch(() => ({}));
            return { ok: r.ok, status: r.status, data };
          })
          .then(({ ok, status, data }) => {
            sendJson(sendResponse, data || { status }, ok);
          })
          .catch(err => {
            const isTimeout = err.name === 'AbortError';
            sendResponse({
              error: isTimeout
                ? 'Bet request timed out. Please try again.'
                : `Backend unreachable: ${err.message}`
            });
          });
      });
      return true;

    case 'GET_USER_STATS':
      chrome.storage.local.get(['userId'], ({ userId }) => {
        if (!userId) {
          sendResponse(null);
          return;
        }

        fetchWithTimeout(`${BACKEND_URL}/users/${userId}`, {}, 10_000)
          .then(r => r.ok ? r.json() : null)
          .then(sendResponse)
          .catch(() => sendResponse(null));
      });
      return true;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

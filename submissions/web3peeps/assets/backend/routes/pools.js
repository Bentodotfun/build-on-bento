import express from 'express';
import Market from '../models/Market.js';
import * as bento from '../lib/bento.js';

const router = express.Router();

/* ───── helpers ───── */

function deriveSentiment(oddsTrue) {
  if (oddsTrue > 0.55) return 'leaning_true';
  if (oddsTrue < 0.45) return 'leaning_false';
  return 'too_early';
}

function deriveConfidence(oddsTrue) {
  // Confidence is how far odds are from 50/50 — the more extreme, the higher
  return Math.round(Math.abs(oddsTrue - 0.5) * 2 * 100) / 100;
}

function toPoolSummary(market) {
  const oddsTrue = market.oddsTrue ?? 0.5;
  return {
    id: market._id.toString(),
    claim: market.claimSummary || market.question,
    status: market.status,
    oddsTrue,
    oddsFalse: market.oddsFalse ?? (1 - oddsTrue),
    hookLine: market.hookLine || '',
    sentiment: deriveSentiment(oddsTrue),
    confidence: deriveConfidence(oddsTrue),
    sourceTweetUrl: market.tweetUrl,
    sourceAuthor: `@${market.tweetAuthorHandle}`,
    createdAt: market.createdAt?.toISOString?.() ?? market.createdAt,
    volume: market.volume ?? 0,
    bentoMarketId: market.bentoMarketId,
  };
}

function toPoolDetail(market) {
  const oddsTrue = market.oddsTrue ?? 0.5;
  const summary = toPoolSummary(market);
  return {
    ...summary,
    tweetText: market.tweetText,
    context: (market.contextSnippets || []).map((snippet, i) => ({
      title: `Source ${i + 1}`,
      body: snippet,
      sourceUrl: market.sourceUrls?.[i] || undefined,
      sourceName: market.sourceUrls?.[i] || undefined,
    })),
  };
}

/**
 * Refresh cached odds from Bento for a single market.
 * Swallows errors so stale cached odds are better than 500s.
 */
async function refreshOdds(market) {
  try {
    if (!market.bentoMarketId) return;
    const duel = await bento.getDuel(market.bentoMarketId);
    if (duel?.options?.length >= 2) {
      market.oddsTrue = (duel.options[0].probability ?? 50) / 100;
      market.oddsFalse = (duel.options[1].probability ?? 50) / 100;
      // Rough volume estimate from Bento duel totalVolume, if available
      if (duel.totalVolume != null) {
        market.volume = Math.round(Number(duel.totalVolume));
      }
    }
  } catch (err) {
    console.warn(`[pools] Failed to refresh odds for market ${market._id}: ${err.message}`);
  }
}

/**
 * Fetch detailed Bento pool data including participant count and vote breakdown
 */
async function getDetailedPoolData(bentoMarketId) {
  try {
    const duel = await bento.getDuel(bentoMarketId);
    if (!duel) return null;

    return {
      bentoMarketId,
      participants: duel.totalParticipants || duel.participantCount || 0,
      yesVotes: duel.options?.[0]?.amount ? Math.round(Number(duel.options[0].amount)) : 0,
      noVotes: duel.options?.[1]?.amount ? Math.round(Number(duel.options[1].amount)) : 0,
      totalVolume: duel.totalVolume ? Math.round(Number(duel.totalVolume)) : 0,
      yesOdds: (duel.options?.[0]?.probability ?? 50) / 100,
      noOdds: (duel.options?.[1]?.probability ?? 50) / 100,
    };
  } catch (err) {
    console.warn(`[pools] Failed to fetch pool data for ${bentoMarketId}:`, err.message);
    return null;
  }
}

/* ───── Routes ───── */

/**
 * GET /pools?status=all|open|resolved&refresh=true
 *
 * Returns a list of PoolSummary objects. Optionally refreshes Bento odds
 * inline when `refresh=true` (slower but guaranteed current).
 */
router.get('/', async (req, res) => {
  try {
    const { status, refresh, limit: limitStr, sort } = req.query;
    const parsedLimit = Math.min(Math.max(parseInt(limitStr) || 50, 1), 100);

    // Build filter
    let filter = {};
    if (status && status !== 'all') {
      if (status === 'open') filter.status = 'open';
      else if (status === 'resolved') filter.status = { $in: ['resolved_true', 'resolved_false', 'resolved_unclear'] };
    }

    // Build sort
    let sortOption = {};
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    else if (sort === 'volume') sortOption = { volume: -1 };
    else sortOption = { createdAt: -1 }; // default: newest first

    const markets = await Market.find(filter)
      .sort(sortOption)
      .limit(parsedLimit);

    // Optionally refresh odds from Bento
    if (refresh === 'true') {
      await Promise.allSettled(markets.map(refreshOdds));
    }

    const summaries = markets.map(toPoolSummary);
    res.json(summaries);
  } catch (error) {
    console.error('[pools] Error listing pools:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /pools/:id
 *
 * Returns a single PoolDetail with full context. This also refreshes
 * the cached odds from Bento on every read so the detail page always
 * shows current numbers, including participant count and vote breakdown.
 */
router.get('/:id', async (req, res) => {
  try {
    console.log(`[pools] Fetching pool detail for ID: ${req.params.id}`);

    let market;
    try {
      market = await Market.findById(req.params.id);
    } catch (err) {
      console.warn(`[pools] Invalid MongoDB ID format: ${req.params.id}`, err.message);
      return res.status(400).json({ error: 'Invalid pool ID format' });
    }

    if (!market) {
      console.warn(`[pools] Pool not found for ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Pool not found' });
    }

    console.log(`[pools] Found market: ${market._id}, refreshing odds...`);

    // Refresh odds from Bento on detail view so the user always sees live data
    await refreshOdds(market);

    // Fetch detailed pool data including participant count and vote breakdown
    const poolData = await getDetailedPoolData(market.bentoMarketId);

    const detail = toPoolDetail(market);

    // Enrich with Bento pool data
    if (poolData) {
      detail.bentoMarketId = market.bentoMarketId;
      detail.participants = poolData.participants;
      detail.yesVotes = poolData.yesVotes;
      detail.noVotes = poolData.noVotes;
      detail.totalVolume = poolData.totalVolume;
    }

    console.log(`[pools] Returning pool detail for ${market._id}`);
    res.json(detail);
  } catch (error) {
    console.error('[pools] Error fetching pool:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

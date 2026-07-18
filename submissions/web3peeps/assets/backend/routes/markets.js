import express from 'express';
import Market from '../models/Market.js';
import User from '../models/User.js';
import Bet from '../models/Bet.js';
import * as bento from '../lib/bento.js';
import * as bentoAuth from '../lib/bento-auth.js';
import * as anakin from '../lib/anakin.js';
import * as ai from '../lib/ai.js';

const router = express.Router();

/**
 * Bento's accepted sport categories (from the API's enum).
 */
const VALID_CATEGORIES = [
  'Cricket', 'Football', 'Basketball', 'American Football',
  'Tennis', 'Baseball', 'Hockey', 'Formula 1',
];

/**
 * POST /markets/draft
 *
 * AI-only: converts tweet to structured market question using PROMPT.md spec.
 * Returns validation result + draft question + research.
 * The user sees this, can edit the deadline, then confirms creation.
 */
router.post('/draft', async (req, res) => {
  try {
    console.log('[DRAFT] Received request:', { tweetText: req.body.tweetText?.slice(0, 50), authorHandle: req.body.authorHandle });
    const { tweetText, authorHandle, tweetTimestamp, defaultWindowDays = 30 } = req.body;
    if (!tweetText || !authorHandle) {
      console.error('[DRAFT] Missing required fields:', { tweetText: !!tweetText, authorHandle: !!authorHandle });
      return res.status(400).json({ error: 'tweetText and authorHandle required' });
    }

    console.log('[DRAFT] Calling buildQuestionFromTweet...');
    const questionResult = await ai.buildQuestionFromTweet(
      tweetText,
      authorHandle,
      tweetTimestamp,
      defaultWindowDays
    );
    console.log('[DRAFT] buildQuestionFromTweet result:', { isValidClaim: questionResult.isValidClaim, question: questionResult.question?.slice(0, 50) });

    if (!questionResult.isValidClaim) {
      console.log('[DRAFT] Invalid claim:', questionResult.rejectionReason);
      return res.json({
        isValidClaim: false,
        rejectionReason: questionResult.rejectionReason,
      });
    }

    console.log('[DRAFT] Calling anakin.searchClaim for:', questionResult.question?.slice(0, 50));
    const searchResult = await anakin.searchClaim(questionResult.question);
    console.log('[DRAFT] Anakin search complete');

    const hookLine = await ai.generateHookLine(questionResult.question, searchResult.summary);
    console.log('[DRAFT] Hook line generated');

    res.json({
      isValidClaim: true,
      question: questionResult.question,
      resolutionCriteria: questionResult.resolutionCriteria,
      resolvesBy: questionResult.resolvesBy,
      hookLine,
      contextSnippets: [searchResult.summary],
      sourceUrls: searchResult.sourceUrls,
      categories: VALID_CATEGORIES,
    });
  } catch (error) {
    console.error('[DRAFT] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /markets
 *
 * Create a market from user-confirmed params (question + category + deadline).
 *
 * Body: { tweetId, tweetText, authorHandle, userId, question, resolvesBy, category, hookLine, resolutionCriteria }
 */
router.post('/', async (req, res) => {
  try {
    console.log('[POST /markets] Received body:', JSON.stringify(req.body));
    const {
      tweetId, tweetText, authorHandle, userId,
      question, resolvesBy, category, hookLine, resolutionCriteria,
    } = req.body;

    // Core tweet fields
    if (!tweetId || !tweetText || !authorHandle || !userId) {
      return res.status(400).json({
        error: 'tweetId, tweetText, authorHandle, and userId required',
        received: req.body,
      });
    }

    // User-confirmed market fields
    if (!question || !category || !resolvesBy) {
      return res.status(400).json({
        error: 'question, category, and resolvesBy are required. Use /markets/draft first to generate a draft.',
      });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: `category must be one of: ${VALID_CATEGORIES.join(', ')}`,
      });
    }

    const existingMarket = await Market.findOne({ tweetId });
    if (existingMarket) {
      return res.json(existingMarket);
    }

    // Ensure user wallet + JWT are ready
    await bentoAuth.getOrCreateUserWallet(userId);
    await bentoAuth.getValidJwt(userId);

    // Create the duel on Bento with the user-approved question
    const { duelId, txHash } = await bento.createClaimDuel(userId, {
      question,
      category,
      description: tweetText,
      resolvesBy,
    });

    const market = new Market({
      tweetId,
      tweetUrl: `https://twitter.com/i/status/${tweetId}`,
      tweetAuthorHandle: authorHandle,
      tweetText,
      claimSummary: question,
      bentoMarketId: duelId,
      question,
      resolutionCriteria,
      hookLine,
      contextSnippets: [],
      sourceUrls: [],
      resolvesBy: new Date(resolvesBy),
      createdByUserId: userId,
      lastEnrichedAt: new Date(),
    });

    await market.save();

    // Optional: X API auto-reply
    if (process.env.X_API_ENABLED === 'true') {
      try {
        const xApi = await import('../lib/xApi.js');
        const shortLink = `https://bento.fun/duel/${duelId}`;
        const replyText = `🔴 Live market: bet on whether this is true → ${shortLink}`;

        const { replyId } = await xApi.postReply(tweetId, replyText);
        if (replyId) {
          market.xReplyId = replyId;
          await market.save();
        }
      } catch (error) {
        console.error('X API reply failed (optional feature):', error);
      }
    }

    res.status(201).json(market);
  } catch (error) {
    console.error('Error creating market:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /markets
 * List markets with detailed pool info, optionally filtered by userId
 */
router.get('/', async (req, res) => {
  try {
    const { userId, limit = 10, sort = '-createdAt' } = req.query;
    const query = userId ? { createdByUserId: userId } : {};
    const markets = await Market.find(query)
      .sort(sort)
      .limit(parseInt(limit) || 10)
      .lean();

    // Enrich with Bento pool data for each market
    const enriched = await Promise.all(
      markets.map(async (market) => {
        try {
          const duel = await bento.getDuel(market.bentoMarketId);
          const enrichedMarket = {
            ...market,
            pools: duel?.pools || [],
            currentOdds: duel?.oddsForYes || market.oddsTrue,
            volume: duel?.volume || market.volume,
            options: duel?.options || [],
            participants: duel?.totalParticipants || duel?.participantCount || 0,
            yesVotes: duel?.options?.[0]?.amount ? Math.round(Number(duel.options[0].amount)) : 0,
            noVotes: duel?.options?.[1]?.amount ? Math.round(Number(duel.options[1].amount)) : 0,
          };
          return enrichedMarket;
        } catch (error) {
          console.warn(`Failed to fetch pool data for duel ${market.bentoMarketId}:`, error.message);
          return {
            ...market,
            pools: [],
            currentOdds: market.oddsTrue,
            volume: market.volume,
            participants: 0,
            yesVotes: 0,
            noVotes: 0,
          };
        }
      })
    );

    res.json(enriched);
  } catch (error) {
    console.error('Error fetching markets:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /markets/by-tweet/:tweetId
 */
router.get('/by-tweet/:tweetId', async (req, res) => {
  try {
    const market = await Market.findOne({ tweetId: req.params.tweetId });
    if (!market) {
      return res.status(404).json({ error: 'Market not found' });
    }

    // Enrich with Bento pool data
    let enrichedMarket = market.toObject ? market.toObject() : market;
    try {
      if (market.bentoMarketId) {
        const duel = await bento.getDuel(market.bentoMarketId);
        if (duel) {
          enrichedMarket.participants = duel.totalParticipants || duel.participantCount || 0;
          enrichedMarket.yesVotes = duel.options?.[0]?.amount ? Math.round(Number(duel.options[0].amount)) : 0;
          enrichedMarket.noVotes = duel.options?.[1]?.amount ? Math.round(Number(duel.options[1].amount)) : 0;
          enrichedMarket.totalVolume = duel.totalVolume ? Math.round(Number(duel.totalVolume)) : 0;
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch pool data for duel ${market.bentoMarketId}:`, error.message);
    }

    res.json(enrichedMarket);
  } catch (error) {
    console.error('Error fetching market:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/resolve', async (req, res) => {
  try {
    const { userId, outcome } = req.body;

    if (!userId || !outcome || !['true', 'false'].includes(outcome)) {
      return res.status(400).json({ error: 'userId and outcome (true/false) required' });
    }

    const market = await Market.findById(req.params.id);
    if (!market) {
      return res.status(404).json({ error: 'Market not found' });
    }

    if (!market.createdByUserId.equals(userId)) {
      return res.status(403).json({ error: 'Only market creator can resolve' });
    }

    if (market.status !== 'open') {
      return res.status(400).json({ error: 'Market already resolved' });
    }

    const winningOptionIndex = outcome === 'true' ? 0 : 1;

    await bento.resolveDuel(userId, market.bentoMarketId, winningOptionIndex);

    market.status = outcome === 'true' ? 'resolved_true' : 'resolved_false';
    market.resolvedAt = new Date();
    await market.save();

    const bets = await Bet.find({ marketId: market._id, status: 'pending' });

    for (const bet of bets) {
      const won = bet.pick === outcome;
      bet.status = won ? 'won' : 'lost';
      bet.settledAt = new Date();
      await bet.save();

      const user = await User.findById(bet.userId);
      if (user) {
        user.stats.totalBets = (user.stats.totalBets || 0) + 1;

        if (won) {
          user.stats.wins = (user.stats.wins || 0) + 1;
          user.stats.currentStreak = (user.stats.currentStreak || 0) + 1;
          user.stats.bestStreak = Math.max(
            user.stats.bestStreak || 0,
            user.stats.currentStreak
          );
        } else {
          user.stats.losses = (user.stats.losses || 0) + 1;
          user.stats.currentStreak = 0;
        }

        await user.save();
      }
    }

    res.json({ market, settledBets: bets.length });
  } catch (error) {
    console.error('Error resolving market:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/suggestion', async (req, res) => {
  try {
    const market = await Market.findById(req.params.id);
    if (!market) {
      return res.status(404).json({ error: 'Market not found' });
    }

    const assessment = await ai.assessResolution(
      market.claimSummary,
      market.contextSnippets || []
    );

    res.json(assessment);
  } catch (error) {
    console.error('Error generating resolution suggestion:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /markets/:id/ai-analysis-predict
 * Get AI prediction (YES/NO) based on Anakin research
 */
router.post('/:id/ai-analysis-predict', async (req, res) => {
  try {
    const market = await Market.findById(req.params.id);
    if (!market) {
      return res.status(404).json({ error: 'Market not found' });
    }

    const { question, resolutionCriteria } = req.body;
    const queryQuestion = question || market.question;
    const criteria = resolutionCriteria || market.resolutionCriteria || 'Resolves based on available public information';

    console.log('[AI-PREDICT] Fetching research for:', queryQuestion?.slice(0, 50));

    // Fetch Anakin research
    let searchResult = null;
    if (market.contextSnippets && market.contextSnippets.length > 0) {
      searchResult = {
        summary: market.contextSnippets.join('\n\n'),
        sourceUrls: market.sourceUrls || [],
      };
    } else {
      searchResult = await anakin.searchClaim(queryQuestion);
      // Cache for next time
      market.contextSnippets = [searchResult.summary];
      market.sourceUrls = searchResult.sourceUrls || [];
      await market.save();
    }

    console.log('[AI-PREDICT] Got research, calling AI for prediction');

    const prediction = await ai.predictOutcome(
      queryQuestion,
      criteria,
      searchResult.summary
    );

    console.log('[AI-PREDICT] Got prediction:', prediction);
    return res.json(prediction);
  } catch (error) {
    console.error('[AI-PREDICT] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /markets/:id/ai-analysis
 * Get Anakin research and analysis for a market
 */
router.get('/:id/analysis', async (req, res) => {
  try {
    const market = await Market.findById(req.params.id);
    if (!market) {
      return res.status(404).json({ error: 'Market not found' });
    }

    // If we have cached research, return it
    if (market.contextSnippets && market.contextSnippets.length > 0) {
      return res.json({
        question: market.question,
        resolutionCriteria: market.resolutionCriteria,
        analysis: market.contextSnippets.join('\n\n'),
        sourceUrls: market.sourceUrls || [],
        lastUpdated: market.lastEnrichedAt,
      });
    }

    // Otherwise, run fresh research on the question
    const searchResult = await anakin.searchClaim(market.question);

    market.contextSnippets = [searchResult.summary];
    market.sourceUrls = searchResult.sourceUrls || [];
    market.lastEnrichedAt = new Date();
    await market.save();

    res.json({
      question: market.question,
      resolutionCriteria: market.resolutionCriteria,
      analysis: searchResult.summary,
      sourceUrls: searchResult.sourceUrls || [],
      lastUpdated: market.lastEnrichedAt,
    });
  } catch (error) {
    console.error('Error fetching market analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /markets/:id/ai-analysis
 * Get AI-powered analysis for a market prediction based on Anakin research
 */
router.get('/:id/ai-analysis', async (req, res) => {
  try {
    const market = await Market.findById(req.params.id);
    if (!market) {
      return res.status(404).json({ error: 'Market not found' });
    }

    // Generate analysis using Anakin if we have research data
    let analysis = null;
    if (market.contextSnippets && market.contextSnippets.length > 0) {
      analysis = await anakin.generateMarketAnalysis(
        market.question,
        market.resolutionCriteria || 'Market resolves based on available evidence',
        market.contextSnippets.join('\n\n'),
        market.sourceUrls || []
      );
    }

    if (!analysis) {
      // Fallback: run fresh research
      const searchResult = await anakin.searchClaim(market.question);
      analysis = await anakin.generateMarketAnalysis(
        market.question,
        market.resolutionCriteria || 'Market resolves based on available evidence',
        searchResult.summary,
        searchResult.sourceUrls || []
      );
    }

    res.json({
      marketId: market._id,
      question: market.question,
      analysis: analysis?.analysis || '',
      confidence: analysis?.confidence || 50,
      riskLevel: analysis?.riskLevel || 'medium',
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error generating AI analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /markets/:id/resolution-suggestion
 */
router.get('/:id/resolution-suggestion', async (req, res) => {
  try {
    const market = await Market.findById(req.params.id);
    if (!market) {
      return res.status(404).json({ error: 'Market not found' });
    }

    if (market.resolvesBy > new Date()) {
      return res.json({ available: false, message: 'Market deadline has not passed yet' });
    }

    if (!market.resolutionSuggestion || !market.resolutionSuggestion.verdict) {
      return res.json({ available: false, message: 'Resolution suggestion not yet generated' });
    }

    res.json({
      available: true,
      verdict: market.resolutionSuggestion.verdict,
      confidence: market.resolutionSuggestion.confidence,
      reasoning: market.resolutionSuggestion.reasoning,
      generatedAt: market.resolutionSuggestion.generatedAt,
    });
  } catch (error) {
    console.error('Error fetching resolution suggestion:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

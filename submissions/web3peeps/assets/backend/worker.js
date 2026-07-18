import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Market from './models/Market.js';
import Bet from './models/Bet.js';
import User from './models/User.js';
import * as anakin from './lib/anakin.js';
import * as ai from './lib/ai.js';
import * as bento from './lib/bento.js';

/**
 * Refresh the cached Bento odds for a market so the pools list is always warm.
 * Swallows errors — stale odds are better than crashing the worker cycle.
 */
async function refreshCachedOdds(market) {
  try {
    if (!market.bentoMarketId) return;
    const duel = await bento.getDuel(market.bentoMarketId);
    if (duel?.options?.length >= 2) {
      market.oddsTrue = (duel.options[0].probability ?? 50) / 100;
      market.oddsFalse = (duel.options[1].probability ?? 50) / 100;
      if (duel.totalVolume != null) {
        market.volume = Math.round(Number(duel.totalVolume));
      }
    }
  } catch {
    // non-fatal — cached odds stay as-is
  }
}

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Worker: MongoDB connected'))
  .catch(err => {
    console.error('Worker: MongoDB connection error:', err);
    process.exit(1);
  });

async function refreshAgingMarkets() {
  try {
    const staleThreshold = new Date(Date.now() - 15 * 60 * 1000);

    const markets = await Market.find({
      status: 'open',
      $or: [
        { lastEnrichedAt: { $lt: staleThreshold } },
        { lastEnrichedAt: { $exists: false } }
      ]
    }).limit(5);

    console.log(`Worker: Found ${markets.length} markets to enrich`);

    for (const market of markets) {
      try {
        console.log(`Worker: Enriching market ${market._id} (${market.claimSummary})`);

        const research = await anakin.deepResearchClaim(market.claimSummary);

        const newHookLine = await ai.generateHookLine(
          market.claimSummary,
          research.summary
        );

        const assessment = await ai.assessResolution(
          market.claimSummary,
          [research.summary]
        );

        market.hookLine = newHookLine;
        market.contextSnippets = [research.summary];
        market.lastEnrichedAt = new Date();

        // Also refresh the Bento odds while we're here
        await refreshCachedOdds(market);

        await market.save();

        console.log(`Worker: Enriched market ${market._id}, assessment: ${assessment.verdict} (confidence: ${assessment.confidence}%)`);

        if (assessment.confidence >= 85) {
          console.log(`Worker: High-confidence resolution suggested for market ${market._id}: ${assessment.verdict}`);
        }
      } catch (error) {
        console.error(`Worker: Error enriching market ${market._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Worker: Error in refreshAgingMarkets:', error);
  }
}

async function generateResolutionSuggestions() {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const markets = await Market.find({
      status: 'open',
      resolvesBy: { $lt: now },
      $or: [
        { 'resolutionSuggestion.generatedAt': { $lt: oneHourAgo } },
        { 'resolutionSuggestion.generatedAt': { $exists: false } }
      ]
    }).limit(3);

    console.log(`Worker: Found ${markets.length} markets needing resolution suggestions`);

    for (const market of markets) {
      try {
        console.log(`Worker: Generating resolution suggestion for market ${market._id}`);

        const research = market.contextSnippets && market.contextSnippets.length > 0
          ? market.contextSnippets
          : await anakin.deepResearchClaim(market.claimSummary).then(r => [r.summary]);

        const assessment = await ai.assessResolution(
          market.claimSummary,
          research
        );

        market.resolutionSuggestion = {
          verdict: assessment.verdict,
          confidence: Math.round(assessment.confidence),
          reasoning: assessment.reasoning || `Based on available evidence: ${assessment.verdict}`,
          generatedAt: new Date(),
        };

        await market.save();

        console.log(`Worker: Generated suggestion for market ${market._id}: ${assessment.verdict} (${Math.round(assessment.confidence)}% confidence)`);
      } catch (error) {
        console.error(`Worker: Error generating suggestion for market ${market._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Worker: Error in generateResolutionSuggestions:', error);
  }
}

async function pollSettlements() {
  try {
    const recentlyResolved = await Market.find({
      status: { $in: ['resolved_true', 'resolved_false'] },
      resolvedAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) }
    });

    for (const market of recentlyResolved) {
      try {
        const duelStatus = await bento.getDuelStatus(market.bentoMarketId);

        if (duelStatus.status === 'settled' || duelStatus.status === 'resolved') {
          const bets = await Bet.find({
            marketId: market._id,
            status: 'pending'
          });

          if (bets.length > 0) {
            console.log(`Worker: Settling ${bets.length} bets for market ${market._id}`);

            const winningOutcome = market.status === 'resolved_true' ? 'true' : 'false';

            for (const bet of bets) {
              const won = bet.pick === winningOutcome;
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
          }
        }
      } catch (error) {
        console.error(`Worker: Error polling settlement for market ${market._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Worker: Error in pollSettlements:', error);
  }
}

console.log('Worker: Starting background worker');
setInterval(refreshAgingMarkets, 5 * 60 * 1000);
setInterval(generateResolutionSuggestions, 3 * 60 * 1000);
setInterval(pollSettlements, 60 * 1000);

refreshAgingMarkets();
generateResolutionSuggestions();
pollSettlements();

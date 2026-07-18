import express from 'express';
import Bet from '../models/Bet.js';
import Market from '../models/Market.js';
import * as bento from '../lib/bento.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { userId, marketId, pick, stake } = req.body;

    if (!userId || !marketId || !pick || !stake) {
      return res.status(400).json({
        error: 'userId, marketId, pick, and stake required'
      });
    }

    if (!['true', 'false'].includes(pick)) {
      return res.status(400).json({ error: 'pick must be "true" or "false"' });
    }

    const market = await Market.findById(marketId);
    if (!market) {
      return res.status(404).json({ error: 'Market not found' });
    }

    if (market.status !== 'open') {
      return res.status(400).json({ error: 'Market is not open for betting' });
    }

    const optionIndex = pick === 'true' ? 0 : 1;

    const duel = await bento.getDuel(market.bentoMarketId);
    const currentOdds = optionIndex === 0
      ? duel.options?.[0]?.probability || 50
      : duel.options?.[1]?.probability || 50;

    await bento.placeBet(userId, market.bentoMarketId, optionIndex, stake);

    const bet = new Bet({
      userId,
      marketId,
      pick,
      oddsAtBet: currentOdds,
      creditsStaked: stake,
      status: 'pending'
    });

    await bet.save();

    const updatedDuel = await bento.getDuel(market.bentoMarketId);

    res.status(201).json({
      bet,
      updatedOdds: {
        true: updatedDuel.options?.[0]?.probability || 50,
        false: updatedDuel.options?.[1]?.probability || 50
      }
    });
  } catch (error) {
    console.error('Error placing bet:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

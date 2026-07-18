import express from 'express';
import User from '../models/User.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { sortBy = 'bestStreak', limit = 50 } = req.query;
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

    let users;

    if (sortBy === 'bestStreak') {
      users = await User.find({})
        .sort({ 'stats.bestStreak': -1 })
        .limit(parsedLimit)
        .select('xHandle displayName stats');
    } else if (sortBy === 'winRate') {
      // Use aggregation to calculate actual win rate and sort by it.
      // Only include users with at least 3 total bets.
      users = await User.aggregate([
        { $match: { 'stats.totalBets': { $gte: 3 } } },
        {
          $addFields: {
            winRate: {
              $cond: [
                { $gt: ['$stats.totalBets', 0] },
                { $divide: ['$stats.wins', '$stats.totalBets'] },
                0,
              ],
            },
          },
        },
        { $sort: { winRate: -1 } },
        { $limit: parsedLimit },
        {
          $project: {
            _id: 1,
            xHandle: 1,
            displayName: 1,
            stats: 1,
            winRate: 1,
          },
        },
      ]);
    } else {
      return res.status(400).json({ error: 'sortBy must be "bestStreak" or "winRate"' });
    }

    const leaderboard = users.map((user) => {
      const winRate =
        user.stats.totalBets > 0
          ? ((user.stats.wins / user.stats.totalBets) * 100).toFixed(1)
          : '0.0';

      return {
        xHandle: user.xHandle,
        displayName: user.displayName,
        wins: user.stats.wins || 0,
        losses: user.stats.losses || 0,
        totalBets: user.stats.totalBets || 0,
        winRate: parseFloat(winRate),
        currentStreak: user.stats.currentStreak || 0,
        bestStreak: user.stats.bestStreak || 0,
      };
    });

    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

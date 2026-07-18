import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { setupTestDb, teardownTestDb, clearTestDb } from './helpers.js';
import User from '../models/User.js';
import leaderboardRoutes from '../routes/leaderboard.js';

const app = express();
app.use(express.json());
app.use('/leaderboard', leaderboardRoutes);

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

describe('GET /leaderboard', () => {
  beforeEach(async () => {
    await User.create([
      {
        xHandle: 'user1',
        displayName: 'User One',
        stats: { wins: 10, losses: 2, totalBets: 12, currentStreak: 5, bestStreak: 8 }
      },
      {
        xHandle: 'user2',
        displayName: 'User Two',
        stats: { wins: 8, losses: 4, totalBets: 12, currentStreak: 2, bestStreak: 5 }
      },
      {
        xHandle: 'user3',
        displayName: 'User Three',
        stats: { wins: 15, losses: 5, totalBets: 20, currentStreak: 3, bestStreak: 10 }
      },
      {
        xHandle: 'newbie',
        displayName: 'Newbie',
        stats: { wins: 1, losses: 0, totalBets: 1, currentStreak: 1, bestStreak: 1 }
      }
    ]);
  });

  test('returns leaderboard sorted by bestStreak', async () => {
    const response = await request(app).get('/leaderboard?sortBy=bestStreak');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(4);
    expect(response.body[0].xHandle).toBe('user3');
    expect(response.body[0].bestStreak).toBe(10);
    expect(response.body[1].bestStreak).toBe(8);
    expect(response.body[2].bestStreak).toBe(5);
  });

  test('returns leaderboard sorted by winRate with minimum bets filter', async () => {
    const response = await request(app).get('/leaderboard?sortBy=winRate');

    expect(response.status).toBe(200);
    expect(response.body.length).toBeLessThanOrEqual(3);

    const newbieInResults = response.body.find(u => u.xHandle === 'newbie');
    expect(newbieInResults).toBeUndefined();

    for (let i = 0; i < response.body.length - 1; i++) {
      expect(response.body[i].winRate).toBeGreaterThanOrEqual(response.body[i + 1].winRate);
    }
  });

  test('limits results to specified limit', async () => {
    const response = await request(app).get('/leaderboard?sortBy=bestStreak&limit=2');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  test('returns 400 for invalid sortBy parameter', async () => {
    const response = await request(app).get('/leaderboard?sortBy=invalid');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('sortBy');
  });
});

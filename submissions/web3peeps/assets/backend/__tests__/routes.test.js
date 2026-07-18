import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { setupTestDb, teardownTestDb, clearTestDb } from './helpers.js';
import { setupMocks } from './mocks.js';

setupMocks();

const request = (await import('supertest')).default;
const express = (await import('express')).default;
const userRoutes = (await import('../routes/users.js')).default;
const leaderboardRoutes = (await import('../routes/leaderboard.js')).default;
const marketRoutes = (await import('../routes/markets.js')).default;
const betRoutes = (await import('../routes/bets.js')).default;

const app = express();
app.use(express.json());
app.use('/users', userRoutes);
app.use('/leaderboard', leaderboardRoutes);
app.use('/markets', marketRoutes);
app.use('/bet', betRoutes);

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

describe('POST /users', () => {
  test('creates a new user', async () => {
    const res = await request(app)
      .post('/users')
      .send({ xHandle: 'testuser', displayName: 'Test User' });

    expect(res.status).toBe(201);
    expect(res.body.xHandle).toBe('testuser');
    expect(res.body.displayName).toBe('Test User');
    expect(res.body.stats.wins).toBe(0);
    expect(res.body.stats.losses).toBe(0);
  });

  test('returns existing user for duplicate xHandle', async () => {
    await request(app).post('/users').send({ xHandle: 'dupe', displayName: 'User 1' });
    const res = await request(app).post('/users').send({ xHandle: 'dupe', displayName: 'User 2' });

    expect(res.status).toBe(200);
    expect(res.body.displayName).toBe('User 1');
  });

  test('returns 400 if xHandle missing', async () => {
    const res = await request(app).post('/users').send({ displayName: 'No Handle' });
    expect(res.status).toBe(400);
  });

  test('returns 400 if displayName missing', async () => {
    const res = await request(app).post('/users').send({ xHandle: 'nohandle' });
    expect(res.status).toBe(400);
  });
});

describe('GET /users/:id', () => {
  test('returns user by id', async () => {
    const created = await request(app).post('/users').send({ xHandle: 'findme', displayName: 'Find Me' });
    const res = await request(app).get(`/users/${created.body._id}`);

    expect(res.status).toBe(200);
    expect(res.body.xHandle).toBe('findme');
  });

  test('returns 404 for non-existent user', async () => {
    const res = await request(app).get('/users/507f1f77bcf86cd799439011');
    expect(res.status).toBe(404);
  });
});

describe('GET /leaderboard', () => {
  beforeEach(async () => {
    const { default: User } = await import('../models/User.js');
    await User.create([
      { xHandle: 'top', displayName: 'Top', stats: { wins: 10, losses: 2, totalBets: 12, currentStreak: 5, bestStreak: 10 } },
      { xHandle: 'mid', displayName: 'Mid', stats: { wins: 5, losses: 5, totalBets: 10, currentStreak: 0, bestStreak: 3 } },
      { xHandle: 'newbie', displayName: 'Newbie', stats: { wins: 1, losses: 0, totalBets: 1, currentStreak: 1, bestStreak: 1 } }
    ]);
  });

  test('returns leaderboard sorted by bestStreak', async () => {
    const res = await request(app).get('/leaderboard?sortBy=bestStreak');

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(3);
    expect(res.body[0].xHandle).toBe('top');
    expect(res.body[0].bestStreak).toBe(10);
  });

  test('filters users with less than 3 bets for winRate sort', async () => {
    const res = await request(app).get('/leaderboard?sortBy=winRate');

    expect(res.status).toBe(200);
    const newbieInResults = res.body.find(u => u.xHandle === 'newbie');
    expect(newbieInResults).toBeUndefined();
  });

  test('respects limit parameter', async () => {
    const res = await request(app).get('/leaderboard?sortBy=bestStreak&limit=1');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

  test('returns 400 for invalid sortBy', async () => {
    const res = await request(app).get('/leaderboard?sortBy=invalid');
    expect(res.status).toBe(400);
  });
});

describe('POST /markets', () => {
  test('creates a market successfully', async () => {
    const userRes = await request(app).post('/users').send({ xHandle: 'creator', displayName: 'Creator' });
    const userId = userRes.body._id;

    const res = await request(app)
      .post('/markets')
      .send({
        tweetId: '1234567890',
        tweetText: 'Apple is acquiring Perplexity for $5 billion',
        authorHandle: 'techcrunch',
        userId,
        question: 'Does Apple acquire Perplexity AI before 2026-08-17?',
        category: 'Football',
        hookLine: 'No official statement yet, sources report early-stage talks',
        claimSummary: 'Apple is acquiring Perplexity AI for $5 billion'
      });

    expect(res.status).toBe(201);
    expect(res.body.tweetId).toBe('1234567890');
    expect(res.body.bentoMarketId).toBe('test-duel-id');
    expect(res.body.hookLine).toBeDefined();
    expect(res.body.claimSummary).toBeDefined();
  });

  test('returns existing market for duplicate tweetId', async () => {
    const userRes = await request(app).post('/users').send({ xHandle: 'creator', displayName: 'Creator' });
    const userId = userRes.body._id;

    const first = await request(app)
      .post('/markets')
      .send({
        tweetId: '999', tweetText: 'Test', authorHandle: 'user', userId,
        question: 'Test question?', category: 'Football', hookLine: 'Test hook', claimSummary: 'Test'
      });

    const second = await request(app)
      .post('/markets')
      .send({
        tweetId: '999', tweetText: 'Different', authorHandle: 'other', userId,
        question: 'Test question?', category: 'Football', hookLine: 'Test hook', claimSummary: 'Test'
      });

    expect(second.status).toBe(200);
    expect(second.body._id).toBe(first.body._id);
  });

  test('returns 400 if required fields missing', async () => {
    const res = await request(app).post('/markets').send({ tweetId: '123' });
    expect(res.status).toBe(400);
  });
});

describe('GET /markets/by-tweet/:tweetId', () => {
  test('returns market by tweet id', async () => {
    const userRes = await request(app).post('/users').send({ xHandle: 'creator', displayName: 'Creator' });
    await request(app)
      .post('/markets')
      .send({
        tweetId: '777', tweetText: 'Test tweet', authorHandle: 'user', userId: userRes.body._id,
        question: 'Test question?', category: 'Football', hookLine: 'Test hook', claimSummary: 'Test'
      });

    const res = await request(app).get('/markets/by-tweet/777');

    expect(res.status).toBe(200);
    expect(res.body.tweetId).toBe('777');
  });

  test('returns 404 if market not found', async () => {
    const res = await request(app).get('/markets/by-tweet/nonexistent');
    expect(res.status).toBe(404);
  });
});

describe('POST /bet', () => {
  test('places a bet successfully', async () => {
    const userRes = await request(app).post('/users').send({ xHandle: 'bettor', displayName: 'Bettor' });
    const creatorRes = await request(app).post('/users').send({ xHandle: 'creator', displayName: 'Creator' });

    const marketRes = await request(app)
      .post('/markets')
      .send({
        tweetId: '555', tweetText: 'Test', authorHandle: 'user', userId: creatorRes.body._id,
        question: 'Test question?', category: 'Football', hookLine: 'Test hook', claimSummary: 'Test'
      });

    const res = await request(app)
      .post('/bet')
      .send({ userId: userRes.body._id, marketId: marketRes.body._id, pick: 'true', stake: 10 });

    expect(res.status).toBe(201);
    expect(res.body.bet.pick).toBe('true');
    expect(res.body.bet.creditsStaked).toBe(10);
    expect(res.body.updatedOdds).toBeDefined();
  });

  test('returns 400 for invalid pick value', async () => {
    const userRes = await request(app).post('/users').send({ xHandle: 'bettor', displayName: 'Bettor' });
    const creatorRes = await request(app).post('/users').send({ xHandle: 'creator', displayName: 'Creator' });

    const marketRes = await request(app)
      .post('/markets')
      .send({
        tweetId: '555', tweetText: 'Test', authorHandle: 'user', userId: creatorRes.body._id,
        question: 'Test question?', category: 'Football', hookLine: 'Test hook', claimSummary: 'Test'
      });

    const res = await request(app)
      .post('/bet')
      .send({ userId: userRes.body._id, marketId: marketRes.body._id, pick: 'invalid', stake: 10 });

    expect(res.status).toBe(400);
  });
});

describe('POST /markets/:id/resolve', () => {
  test('resolves market as true', async () => {
    const creatorRes = await request(app).post('/users').send({ xHandle: 'creator', displayName: 'Creator' });

    const marketRes = await request(app)
      .post('/markets')
      .send({
        tweetId: '111', tweetText: 'Test', authorHandle: 'user', userId: creatorRes.body._id,
        question: 'Test question?', category: 'Football', hookLine: 'Test hook', claimSummary: 'Test'
      });

    const res = await request(app)
      .post(`/markets/${marketRes.body._id}/resolve`)
      .send({ userId: creatorRes.body._id, outcome: 'true' });

    expect(res.status).toBe(200);
    expect(res.body.market.status).toBe('resolved_true');
  });

  test('rejects non-creator from resolving', async () => {
    const creatorRes = await request(app).post('/users').send({ xHandle: 'creator', displayName: 'Creator' });
    const otherRes = await request(app).post('/users').send({ xHandle: 'other', displayName: 'Other' });

    const marketRes = await request(app)
      .post('/markets')
      .send({
        tweetId: '222', tweetText: 'Test', authorHandle: 'user', userId: creatorRes.body._id,
        question: 'Test question?', category: 'Football', hookLine: 'Test hook', claimSummary: 'Test'
      });

    const res = await request(app)
      .post(`/markets/${marketRes.body._id}/resolve`)
      .send({ userId: otherRes.body._id, outcome: 'true' });

    expect(res.status).toBe(403);
  });
});

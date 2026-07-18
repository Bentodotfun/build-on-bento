import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { setupTestDb, teardownTestDb, clearTestDb } from './helpers.js';
import User from '../models/User.js';
import Market from '../models/Market.js';
import Bet from '../models/Bet.js';

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

describe('User model', () => {
  test('creates user with default stats', async () => {
    const user = await User.create({
      xHandle: 'testuser',
      displayName: 'Test User'
    });

    expect(user.stats.wins).toBe(0);
    expect(user.stats.losses).toBe(0);
    expect(user.stats.totalBets).toBe(0);
    expect(user.stats.currentStreak).toBe(0);
    expect(user.stats.bestStreak).toBe(0);
  });

  test('enforces unique xHandle', async () => {
    await User.create({ xHandle: 'testuser', displayName: 'User 1' });

    await expect(
      User.create({ xHandle: 'testuser', displayName: 'User 2' })
    ).rejects.toThrow();
  });
});

describe('Market model', () => {
  test('creates market with required fields', async () => {
    const user = await User.create({ xHandle: 'creator', displayName: 'Creator' });

    const market = await Market.create({
      tweetId: '1234567890',
      tweetUrl: 'https://twitter.com/user/status/1234567890',
      tweetAuthorHandle: 'author',
      tweetText: 'Test tweet',
      claimSummary: 'Test claim',
      bentoMarketId: 'bento-market-id',
      question: 'Is this true?',
      createdByUserId: user._id
    });

    expect(market.status).toBe('open');
    expect(market.tweetId).toBe('1234567890');
  });

  test('enforces unique tweetId', async () => {
    const user = await User.create({ xHandle: 'creator', displayName: 'Creator' });

    await Market.create({
      tweetId: '1234567890',
      tweetUrl: 'https://twitter.com/user/status/1234567890',
      tweetAuthorHandle: 'author',
      tweetText: 'Test tweet',
      claimSummary: 'Test claim',
      bentoMarketId: 'bento-market-id-1',
      question: 'Is this true?',
      createdByUserId: user._id
    });

    await expect(
      Market.create({
        tweetId: '1234567890',
        tweetUrl: 'https://twitter.com/user/status/1234567890',
        tweetAuthorHandle: 'author',
        tweetText: 'Different tweet',
        claimSummary: 'Different claim',
        bentoMarketId: 'bento-market-id-2',
        question: 'Different question?',
        createdByUserId: user._id
      })
    ).rejects.toThrow();
  });
});

describe('Bet model', () => {
  test('creates bet with required fields', async () => {
    const user = await User.create({ xHandle: 'bettor', displayName: 'Bettor' });
    const creator = await User.create({ xHandle: 'creator', displayName: 'Creator' });

    const market = await Market.create({
      tweetId: '1234567890',
      tweetUrl: 'https://twitter.com/user/status/1234567890',
      tweetAuthorHandle: 'author',
      tweetText: 'Test tweet',
      claimSummary: 'Test claim',
      bentoMarketId: 'bento-market-id',
      question: 'Is this true?',
      createdByUserId: creator._id
    });

    const bet = await Bet.create({
      userId: user._id,
      marketId: market._id,
      pick: 'true',
      oddsAtBet: 60,
      creditsStaked: 10
    });

    expect(bet.status).toBe('pending');
    expect(bet.pick).toBe('true');
    expect(bet.creditsStaked).toBe(10);
  });

  test('validates pick values', async () => {
    const user = await User.create({ xHandle: 'bettor', displayName: 'Bettor' });
    const creator = await User.create({ xHandle: 'creator', displayName: 'Creator' });

    const market = await Market.create({
      tweetId: '1234567890',
      tweetUrl: 'https://twitter.com/user/status/1234567890',
      tweetAuthorHandle: 'author',
      tweetText: 'Test tweet',
      claimSummary: 'Test claim',
      bentoMarketId: 'bento-market-id',
      question: 'Is this true?',
      createdByUserId: creator._id
    });

    await expect(
      Bet.create({
        userId: user._id,
        marketId: market._id,
        pick: 'invalid',
        oddsAtBet: 60,
        creditsStaked: 10
      })
    ).rejects.toThrow();
  });
});

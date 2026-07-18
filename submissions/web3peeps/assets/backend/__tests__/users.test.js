import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { setupTestDb, teardownTestDb, clearTestDb } from './helpers.js';
import User from '../models/User.js';
import userRoutes from '../routes/users.js';

const app = express();
app.use(express.json());
app.use('/users', userRoutes);

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
    const response = await request(app)
      .post('/users')
      .send({
        xHandle: 'testuser',
        displayName: 'Test User'
      });

    expect(response.status).toBe(201);
    expect(response.body.xHandle).toBe('testuser');
    expect(response.body.displayName).toBe('Test User');
    expect(response.body.stats).toMatchObject({
      wins: 0,
      losses: 0,
      totalBets: 0,
      currentStreak: 0,
      bestStreak: 0
    });
  });

  test('returns existing user if xHandle already exists', async () => {
    await User.create({
      xHandle: 'existinguser',
      displayName: 'Existing User',
      stats: { wins: 5, losses: 2, totalBets: 7, currentStreak: 3, bestStreak: 5 }
    });

    const response = await request(app)
      .post('/users')
      .send({
        xHandle: 'existinguser',
        displayName: 'Different Name'
      });

    expect(response.status).toBe(200);
    expect(response.body.xHandle).toBe('existinguser');
    expect(response.body.displayName).toBe('Existing User');
    expect(response.body.stats.wins).toBe(5);
  });

  test('returns 400 if xHandle is missing', async () => {
    const response = await request(app)
      .post('/users')
      .send({ displayName: 'Test User' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('xHandle');
  });
});

describe('GET /users/:id', () => {
  test('returns user by id', async () => {
    const user = await User.create({
      xHandle: 'testuser',
      displayName: 'Test User',
      stats: { wins: 10, losses: 5, totalBets: 15, currentStreak: 2, bestStreak: 5 }
    });

    const response = await request(app).get(`/users/${user._id}`);

    expect(response.status).toBe(200);
    expect(response.body.xHandle).toBe('testuser');
    expect(response.body.stats.wins).toBe(10);
  });

  test('returns 404 if user not found', async () => {
    const response = await request(app).get('/users/507f1f77bcf86cd799439011');

    expect(response.status).toBe(404);
    expect(response.body.error).toContain('not found');
  });
});

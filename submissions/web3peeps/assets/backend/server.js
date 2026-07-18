import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import marketRoutes from './routes/markets.js';
import betRoutes from './routes/bets.js';
import leaderboardRoutes from './routes/leaderboard.js';
import userRoutes from './routes/users.js';
import poolRoutes from './routes/pools.js';

const REQUIRED_ENV = [
  'BENTO_BUILDER_API_KEY',
  'BENTO_URL',
  'ANAKIN_API_KEY',
  'OPENROUTER_API_KEY',
  'MONGODB_URI',
  'ENCRYPTION_KEY',
];

const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(
    `Missing required environment variables:\n  ${missing.join('\n  ')}\n\n` +
      `Copy backend/.env.example to backend/.env and fill in the values.`
  );
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

app.use('/markets', marketRoutes);
app.use('/bet', betRoutes);
app.use('/leaderboard', leaderboardRoutes);
app.use('/users', userRoutes);
app.use('/pools', poolRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Dibs backend running on port ${PORT}`);
});

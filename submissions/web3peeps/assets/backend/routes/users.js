import express from 'express';
import User from '../models/User.js';
import * as bento from '../lib/bento.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { xHandle, displayName } = req.body;

    if (!xHandle || !displayName) {
      return res.status(400).json({ error: 'xHandle and displayName required' });
    }

    let user = await User.findOne({ xHandle });

    if (user) {
      return res.json(user);
    }

    user = new User({
      xHandle,
      displayName,
      stats: {
        wins: 0,
        losses: 0,
        totalBets: 0,
        currentStreak: 0,
        bestStreak: 0
      }
    });

    // Create Bento managed account for the user
    try {
      const { createBentoSdk } = await import('@bento.fun/sdk');
      const publicSdk = createBentoSdk({
        baseUrl: process.env.BENTO_URL,
        headers: {
          'x-builder-api-key': process.env.BENTO_BUILDER_API_KEY,
        },
      });

      const managedAccount = await publicSdk.public.managedAccount.create({});
      user.bentoManagedAccountAddress = managedAccount.address;
      user.bentoJwt = managedAccount.jwt;
      user.bentoJwtExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      user.bentoManagedAccountBalance = '0';
      user.bentoManagedAccountBalanceUpdatedAt = new Date();

      console.log(`[users] Created managed account for ${xHandle}: ${managedAccount.address}`);
    } catch (err) {
      console.warn(`[users] Failed to create Bento managed account for ${xHandle}:`, err?.message);
      // Continue without managed account; user can still use the app
    }

    await user.save();
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Refresh balance from Bento (cache for 5 minutes)
    const now = new Date();
    const lastUpdate = user.bentoManagedAccountBalanceUpdatedAt || new Date(0);
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    if (lastUpdate < fiveMinutesAgo && user.bentoManagedAccountAddress) {
      try {
        const balance = await bento.getUserManagedAccountBalance(user.bentoManagedAccountAddress);
        user.bentoManagedAccountBalance = balance;
        user.bentoManagedAccountBalanceUpdatedAt = now;
        await user.save();
      } catch (err) {
        console.warn(`Failed to refresh Bento balance for user ${req.params.id}:`, err?.message);
        // Continue with cached balance
      }
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /users/:id/mint
 * Trigger testnet credit minting for user's managed wallet
 */
router.post('/:id/mint', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.bentoManagedAccountAddress) {
      return res.status(400).json({ error: 'User wallet not initialized' });
    }

    console.log(`[users] Minting testnet credits for ${user.bentoManagedAccountAddress}`);

    const { createBentoSdk } = await import('@bento.fun/sdk');
    const publicSdk = createBentoSdk({
      baseUrl: process.env.BENTO_URL,
      headers: {
        'x-builder-api-key': process.env.BENTO_BUILDER_API_KEY,
      },
    });

    const mintResult = await publicSdk.public.autoMint.mint({
      userAddress: user.bentoManagedAccountAddress
    });
    console.log(`[users] Mint accepted for ${user.bentoManagedAccountAddress}`);

    // Wait a bit and refresh balance
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const balance = await bento.getUserManagedAccountBalance(req.params.id);
    user.bentoManagedAccountBalance = balance;
    user.bentoManagedAccountBalanceUpdatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      address: user.bentoManagedAccountAddress,
      newBalance: balance,
    });
  } catch (error) {
    console.error('[users] Mint error:', error?.message);
    res.status(500).json({ error: error?.message || 'Mint failed' });
  }
});

export default router;

// test-place-bet.mjs
//
// Step-by-step exercise of the Bento SDK bet flow:
//   1. Sign the login message with your wallet -> exchange for a JWT (eoaLogin,
//      falling back to eoaRegister for a brand-new wallet).
//   2. Read the market to sanity-check the duelId.
//   3. estimateBuy() -> quote a price for the stake.
//   4. placeBetFromEstimate() -> place the bet (server-accepted, not yet settled).
//   5. getUserShares() -> reconcile your resulting position.
//
// Docs: https://docs.bento.fun/guides/place-bet
//       https://docs.bento.fun/concepts/authentication
//       https://docs.bento.fun/quickstart

import 'dotenv/config';
import { createBentoSdk, walletAuthProvider } from '@bento.fun/sdk';
import { privateKeyToAccount } from 'viem/accounts';
import crypto from 'node:crypto';

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

async function main() {
  const BENTO_URL = requireEnv('BENTO_URL');
  const BENTO_BUILDER_API_KEY = requireEnv('BENTO_BUILDER_API_KEY');
  const BENTO_PRIVATE_KEY = requireEnv('BENTO_PRIVATE_KEY');
  const DUEL_ID = requireEnv('DUEL_ID');
  const BENTO_USERNAME = process.env.BENTO_USERNAME; // only used if register is needed
  const OPTION_INDEX = Number(process.env.OPTION_INDEX ?? 0);
  const BET_AMOUNT_WEI = process.env.BET_AMOUNT_WEI ?? '10000000000000000000'; // 10 units
  const TOKEN_DECIMALS = Number(process.env.TOKEN_DECIMALS ?? 18);

  const account = privateKeyToAccount(BENTO_PRIVATE_KEY);
  console.log(`Wallet (signing key): ${account.address}`);

  // --- Unauthenticated client: enough to log in and to read the public catalog ---
  const publicSdk = createBentoSdk({
    baseUrl: BENTO_URL,
    apiKey: BENTO_BUILDER_API_KEY,
    auth: walletAuthProvider(() => ({})),
  });

  // --- Step 1: sign the login message, exchange for a JWT ---
  const ts = String(Date.now());
  const signature = await account.signMessage({
    message: `Bento.fun Login\nTimestamp: ${ts}\nWallet: ${account.address}`,
  });

  let token;
  let managedAddress;
  try {
    const session = await publicSdk.public.auth.eoaLogin({
      address: account.address,
      signature,
      timestamp: ts,
    });
    token = session.token;
    managedAddress = session.address ?? session.account?.address;
    console.log('Logged in (existing wallet).');
  } catch (err) {
    console.log('eoaLogin failed, attempting eoaRegister (new wallet)...', err?.message ?? err);
    if (!BENTO_USERNAME) {
      throw new Error('eoaRegister requires BENTO_USERNAME to be set in .env');
    }
    const session = await publicSdk.public.auth.eoaRegister({
      address: account.address,
      signature,
      timestamp: ts,
      username: BENTO_USERNAME,
    });
    token = session.token;
    managedAddress = session.address ?? session.account?.address;
    console.log('Registered new wallet.');
  }

  console.log(`Managed account (where funds/positions live): ${managedAddress}`);

  // --- Authenticated client ---
  const sdk = createBentoSdk({
    baseUrl: BENTO_URL,
    apiKey: BENTO_BUILDER_API_KEY,
    auth: walletAuthProvider(() => ({ Authorization: `Bearer ${token}` })),
  });

  // --- Step 2: sanity-check the market ---
  const market = await sdk.public.getDuelById({ duelId: DUEL_ID });
  console.log(`Market: ${market?.title ?? DUEL_ID} (type: ${market?.duelType ?? 'unknown'})`);

  // --- Step 3: estimate ---
  console.log(`Estimating bet: optionIndex=${OPTION_INDEX}, amount=${BET_AMOUNT_WEI} wei`);
  const est = await sdk.user.bets.estimateBuy({
    duelId: DUEL_ID,
    optionIndex: OPTION_INDEX,
    betAmountUsdc: BET_AMOUNT_WEI,
    slippageBps: 100,
  });

  if (!est.success) {
    throw new Error(`Estimate rejected: ${JSON.stringify(est)}`);
  }
  console.log('Estimate OK:', est.estimate);

  // --- Step 4: place (uses placeBetFromEstimate so slippage floor is derived
  // correctly from sharesOut, per the docs' warning about hand-building requests) ---
  const idempotencyKey = crypto.randomUUID();
  const bet = market?.duelType === 'VERSUS'
    ? (OPTION_INDEX === 0 ? market.optionA : market.optionB)
    : (OPTION_INDEX === 0 ? 'YES' : 'NO');

  const placed = await sdk.user.placeBetFromEstimate(
    {
      estimate: est.estimate,
      duelId: DUEL_ID,
      duelType: market?.duelType ?? 'PREDICTION',
      bet,
      optionIndex: OPTION_INDEX,
      betAmount: BET_AMOUNT_WEI,
      betAmountUsdc: BET_AMOUNT_WEI,
      slippageBps: 100,
      tokenDecimals: TOKEN_DECIMALS,
    },
    { idempotencyKey },
  );
  console.log('Bet accepted by server:', placed);

  // --- Step 5: reconcile ---
  const shares = await sdk.user.bets.getUserShares({
    duelId: DUEL_ID,
    address: managedAddress,
  });
  console.log('Current position:', shares);
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

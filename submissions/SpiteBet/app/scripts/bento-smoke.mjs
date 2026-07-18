/** Smoke test: faucet -> estimate -> place bet on our market. */
import { createBentoSdk, walletAuthProvider } from '@bento.fun/sdk';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const apiKey = fs.readFileSync(path.join(ROOT, '.env'), 'utf8').match(/testnet_builder_api_key=(\S+)/)[1].trim();
const { token } = JSON.parse(fs.readFileSync(path.join(ROOT, '.bento-session.json'), 'utf8'));
const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
const address = claims.address;

const BASE = 'https://internal-server.bento.fun';
const H = { 'x-builder-api-key': apiKey, Authorization: `Bearer ${token}`, 'content-type': 'application/json' };
const sdk = createBentoSdk({
  baseUrl: BASE,
  apiKey,
  auth: walletAuthProvider(() => ({ Authorization: `Bearer ${token}` })),
});

const DUEL_ID = process.argv[2] || '9f42e01312e06bb657e4cd59779c40fe2df4b1f9a598fcf2cb65d32845bf71d6';

// 1. Faucet with the managed account address
let r = await fetch(`${BASE}/bento/auto-mint/mint`, {
  method: 'POST',
  headers: H,
  body: JSON.stringify({ userAddress: address }),
});
console.log('mint:', r.status, (await r.text()).slice(0, 300));

// 2. Estimate a buy. Amounts are wei; credits use 18 decimals. Min bet is 5 units.
const betAmountUsdc = (10n * 10n ** 18n).toString();
try {
  const estimateRes = await sdk.user.estimateBuy({
    duelId: DUEL_ID,
    optionIndex: 1, // 0 = YES/believe, 1 = NO/hate (options array is ["YES","NO"])
    betAmountUsdc,
    slippageBps: 100,
  });
  const estimate = estimateRes.estimate ?? estimateRes;
  console.log("estimateBuy:", JSON.stringify(estimate).slice(0, 300));

  // 3. Place the bet from that estimate
  const placed = await sdk.user.placeBetFromEstimate(
    {
      estimate,
      duelId: DUEL_ID,
      duelType: 'PREDICTION',
      bet: 'NO',
      optionIndex: 1,
      betAmount: betAmountUsdc,
      betAmountUsdc,
      slippageBps: 100,
      tokenDecimals: 18,
    },
    { idempotencyKey: `bet-${Date.now()}` },
  );
  console.log('placeBet:', JSON.stringify(placed).slice(0, 400));

  const shares = await sdk.user.getUserShares({ duelId: DUEL_ID, address });
  console.log('shares:', JSON.stringify(shares).slice(0, 300));
} catch (err) {
  console.log('FAILED:', err?.constructor?.name);
  console.log('sdkError:', JSON.stringify(err?.sdkError ?? {}).slice(0, 500));
  console.log('message:', err?.message?.slice(0, 300));
}

import { createBentoSdk } from '@bento.fun/sdk';
import { parseUnits } from 'viem';
import { getAuthedSdk, getOrCreateUserWallet } from './bento-auth.js';
import * as ai from './ai.js';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env'), override: true });

// Bento enforces length caps - truncate with an ellipsis so a long claim / tweet
// text still produces a well-formed duel instead of a 400.
const MAX_QUESTION_LEN = 140;
const MAX_DESCRIPTION_LEN = 500;

function clampText(value, max) {
  if (typeof value !== 'string') return value;
  if (value.length <= max) return value;
  return value.slice(0, max - 1).trimEnd() + '…';
}

let publicSdk = null;

function getPublicSdk() {
  if (!publicSdk) {
    publicSdk = createBentoSdk({
      baseUrl: process.env.BENTO_URL,
      headers: {
        'x-builder-api-key': process.env.BENTO_BUILDER_API_KEY,
      },
    });
  }
  return publicSdk;
}

export async function getUserManagedAccountBalance(bentoManagedAccountAddress) {
  if (!bentoManagedAccountAddress) {
    console.warn('[bento] No bentoManagedAccountAddress provided');
    return '0';
  }

  try {
    const sdk = getPublicSdk();
    const portfolio = await sdk.public.portfolio.getAccountDetails({
      address: bentoManagedAccountAddress,
    });
    console.log(`[bento] Portfolio response for ${bentoManagedAccountAddress}:`, JSON.stringify(portfolio, null, 2));

    if (!portfolio?.accounts?.[0]) {
      return '0';
    }

    const balanceWei = portfolio.accounts[0].balance || portfolio.accounts[0].credits || portfolio.accounts[0].usdc || '0';
    console.log(`[bento] Extracted balance: ${balanceWei}`);
    return balanceWei;
  } catch (error) {
    console.warn(`[bento] Failed to fetch balance for address ${bentoManagedAccountAddress}:`, error?.message || error);
    return '0';
  }
}

export function toWei(amountInCredits) {
  return parseUnits(String(amountInCredits), 18).toString();
}

export async function listTrendingDuels(limit = 20) {
  const sdk = getPublicSdk();
  const result = await sdk.public.listDuels({ page: 1, limit });
  return result.duels || [];
}

export async function getDuel(duelId) {
  const sdk = getPublicSdk();
  return await sdk.public.getDuelById({ duelId });
}

/**
 * Create a Bento prediction market for a tweet claim.
 *
 * Uses 'prediction' type with a question (maps naturally to our
 * "is this claim true?" format). Option 0 = True, option 1 = False.
 *
 * Retry strategy:
 *   1. Try up to 3 times with the same payload (handles transient RPC / nginx hiccups).
 *      Each attempt gets fresh timestamps and a fresh idempotency key.
 *   2. If pre-flight simulation fails, first attempt to mint testnet credits before retrying.
 *   3. Validation errors (400 / schema mismatch) are thrown immediately.
 */
export async function createClaimDuel(userId, { question, description, category, resolvesBy }) {
  const authedSdk = await getAuthedSdk(userId);

  const RETRY_DELAYS_MS = [1000, 2000, 4000];
  // Hard cap so a slow Bento doesn't make the extension's message channel time out
  // (Chrome MV3 content scripts lose their callback if the round-trip exceeds ~25 s).
  const MAX_TOTAL_MS = 22_000;
  const startedAt = Date.now();

  let lastError;
  let hasMintedCredits = false;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const startTime = new Date(Date.now() + 31 * 60 * 1000).toISOString();
    const endTime = resolvesBy
      ? new Date(resolvesBy).toISOString()
      : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const requestId = crypto.randomUUID();

    try {
      const result = await authedSdk.user.createDuel(
        {
          question: clampText(question, MAX_QUESTION_LEN),
          type: 'prediction',
          category: category || 'Sports',
          description: clampText(description, MAX_DESCRIPTION_LEN),
          startTime,
          endTime,
          privacyAccess: 'public',
          collateralMode: 'credits',
        },
        { requestId },
      );

      const { duelId, txHash } = result.raw;
      if (!duelId) {
        throw new Error(`createDuel succeeded but no duelId in result.raw: ${JSON.stringify(result.raw)}`);
      }

      // Poll up to 10x at 2 s intervals to wait for chain finality.
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        try {
          const duel = await getDuel(duelId);
          if (duel) {
            return { duelId, txHash };
          }
        } catch {
          // Not visible yet - keep polling.
        }
      }

      // Polling finished without confirming, but the duel was submitted.
      return { duelId, txHash };
    } catch (error) {
      lastError = error;
      const message = (error && error.message) || '';

      // Validation errors (400 / schema mismatch) won't be fixed by retrying.
      if (
        message.includes('must be') ||
        message.includes('required') ||
        message.includes('should not exist') ||
        message.includes('status 400') ||
        error?.sdkError?.status === 400
      ) {
        throw new Error(
          `Bento rejected the market parameters: ${message.split('\n')[0].slice(0, 200)}. ` +
          `Check that question (<=${MAX_QUESTION_LEN} chars) and category are valid.`,
        );
      }

      const isSimulation =
        message.includes('Pre-flight') ||
        message.includes('pre-flight') ||
        message.includes('simulation') ||
        message.includes('SIMULATION') ||
        error?.sdkError?.message?.includes('Pre-flight');

      if (isSimulation) {
        const remaining = RETRY_DELAYS_MS.length - attempt;
        if (remaining <= 0 || Date.now() - startedAt > MAX_TOTAL_MS) {
          // All retries exhausted with pre-flight failure.
          throw new Error(
            'Bento pre-flight simulation failed. The most likely cause: the custodial ' +
            'wallet needs testnet credits. Visit the Bento faucet or ensure your Builder ' +
            'API key has credits enabled. (Technical detail: ' +
            message.split('\n')[0].slice(0, 120) + ')',
          );
        }

        // Attempt to mint testnet credits on first pre-flight failure.
        // The wallet might be new/empty because the auto-mint in bento-auth.js
        // can silently fail (logged as non-fatal there, but wallet ends up with 0 credits).
        if (!hasMintedCredits) {
          try {
            const { address } = await getOrCreateUserWallet(userId);
            const bento = getPublicSdk();

            // Check auto-mint service status first
            try {
              const status = await bento.public.autoMint.getStatus();
              console.log(`[bento] Auto-mint status response:`, JSON.stringify(status));
            } catch (statusError) {
              console.warn(`[bento] Auto-mint status check failed:`, statusError?.message || statusError);
            }

            // Try minting to the signing wallet address.
            // Bento's docs say the managed account (where collateral lives) is a different
            // address from the signing wallet. The autoMint endpoint should route internally,
            // but if not, we may need the managed account address from portfolio.getAccountDetails.
            console.log(`[bento] Attempting mint with address: ${address}, format valid: ${/^0x[a-fA-F0-9]{40}$/.test(address)}`);
            const mintResult = await bento.public.autoMint.mint({ userAddress: address });
            console.log(`[bento] Mint result for ${address.slice(0, 10)}:`,
              mintResult ? JSON.stringify(mintResult).slice(0, 300) : '201 accepted (no body)');

            // Wait longer after minting — credits may take time to propagate.
            console.log(`[bento] Waiting 5s after mint for credits to settle...`);
            await new Promise((resolve) => setTimeout(resolve, 5000));

            hasMintedCredits = true;
          } catch (mintError) {
            console.warn(
              `[bento] Attempted to mint credits before retry but mint failed:`,
              mintError?.message || mintError,
            );
          }
        }

        const delay = RETRY_DELAYS_MS[attempt];
        console.log(
          `[bento] Pre-flight simulation failed (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length}), ` +
          `retrying in ${delay}ms: ${message.split('\n')[0].slice(0, 80)}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Unknown / non-transient error - surface immediately.
      throw error;
    }
  }

  // All attempts exhausted. Generate a diagnostic.
  let diagnostic = '';
  try {
    diagnostic = await ai.diagnosePreflightFailure({
      question,
      description,
      errorMessage: lastError?.message || '',
    });
  } catch {
    // best-effort
  }

  throw new Error(
    `Bento pre-flight simulation failed after multiple retries.` +
      (diagnostic ? ` AI diagnosis: ${diagnostic}` : ''),
  );
}

export async function placeBet(userId, duelId, optionIndex, stakeCredits) {
  const authedSdk = await getAuthedSdk(userId);

  const betAmountWei = String(toWei(stakeCredits));

  // Estimate with betAmountUsdc
  let estimate;
  try {
    console.log(`[bento] estimateBuy with betAmountUsdc: "${betAmountWei}"`);
    estimate = await authedSdk.user.bets.estimateBuy({
      duelId,
      optionIndex,
      betAmountUsdc: betAmountWei,
      slippageBps: 100,
    });
    console.log(`[bento] estimateBuy succeeded`);
  } catch (error) {
    console.warn(`[bento] estimateBuy failed:`, error?.message);
    throw error;
  }

  if (!estimate.success) {
    throw new Error(`Bet estimate failed: ${estimate.error || 'Unknown error'}`);
  }

  const idempotencyKey = crypto.randomUUID();

  // Place bet with BOTH betAmount and betAmountUsdc (API requires both)
  console.log(`[bento] placeBetFromEstimate with betAmount="${betAmountWei}" and betAmountUsdc="${betAmountWei}"`);
  const result = await authedSdk.user.placeBetFromEstimate(
    {
      estimate: estimate.estimate,
      duelId,
      duelType: 'PREDICTION',
      bet: optionIndex === 0 ? 'YES' : 'NO',
      optionIndex,
      betAmount: betAmountWei,
      betAmountUsdc: betAmountWei,
      slippageBps: 100,
      tokenDecimals: 18,
    },
    { idempotencyKey },
  );
  console.log(`[bento] placeBetFromEstimate succeeded`);

  return { txHash: result.txHash || result.transactionHash };
}

export async function resolveDuel(userId, duelId, winningOptionIndex) {
  const authedSdk = await getAuthedSdk(userId);

  const result = await authedSdk.user.duels.resolve({
    duelIds: [{ duelId, winningOptionIndex }],
  });

  return { txHash: result.txHash || result.transactionHash };
}

export async function getDuelStatus(duelId) {
  const duel = await getDuel(duelId);
  return {
    status: duel.status,
    winningOptionIndex: duel.winningOptionIndex,
  };
}

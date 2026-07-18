import { NextResponse } from 'next/server';
import { createBentoSdk, walletAuthProvider } from '@bento.fun/sdk';

export async function POST(req: Request) {
  try {
    const { duelId: rawDuelId, optionIndex, amount } = await req.json();
    const token = process.env.AI_JWT;
    const apiKey = process.env.BENTO_BUILDER_API_KEY;
    const baseUrl = process.env.BENTO_URL || 'https://internal-server.bento.fun';
    const aiAddress = process.env.AI_ADDRESS || '0xaa784bb5e2949fbe189bdd7e6fad3ddf4bd08eb6';

    if (!token || !apiKey) {
      return NextResponse.json(
        { error: 'AI JWT or Bento Builder API key missing in environment' },
        { status: 500 }
      );
    }

    const sdk = createBentoSdk({
      baseUrl,
      apiKey,
      auth: walletAuthProvider(() => ({ Authorization: `Bearer ${token}` })),
    });

    // duelId is required
    const duelId: string = rawDuelId || '';
    if (!duelId || duelId === 'placeholder' || duelId === 'undefined') {
      return NextResponse.json({ error: 'duelId is required. Create a market first.' }, { status: 400 });
    }

    const stake = amount || '5000000000000000000'; // 5 credits (18 decimals — platform minimum)

    // 1. Estimate
    const est = await sdk.user.bets.estimateBuy({
      duelId,
      optionIndex,
      betAmountUsdc: stake,
      slippageBps: 100,
    });

    if (!est.success) {
      return NextResponse.json({ error: 'Bento estimate buy rejected' }, { status: 400 });
    }

    // 2. Place
    const idempotencyKey = crypto.randomUUID();
    await sdk.user.placeBet(
      {
        duelId,
        duelType: 'PREDICTION',
        bet: optionIndex === 0 ? 'YES' : 'NO',
        optionIndex,
        betAmount: stake,
        betAmountUsdc: stake,
        tokenDecimals: 18,
        sharesOut: est.estimate.shares_out,
        minSharesOut: est.estimate.min_shares_out,
        slippageBps: 100,
        quoteId: est.estimate.quote_id,
        quoteTimestamp: est.estimate.quote_timestamp,
      },
      { idempotencyKey }
    );

    // 3. Fetch shares using AI_ADDRESS
    const walletAddress = aiAddress;
    let shares = null;
    if (walletAddress) {
      try {
        shares = await sdk.user.bets.getUserShares({ duelId, address: walletAddress });
        if (!Array.isArray(shares) && shares && typeof shares === 'object') {
          const s = shares as { balances?: unknown[] };
          if (Array.isArray(s.balances)) shares = s.balances;
        }
      } catch {
        // non-fatal
      }
    }

    return NextResponse.json({
      success: true,
      duelId,
      shares,
    });
  } catch (error: unknown) {
    console.error('Error in ai-bet API:', error);
    const sdkErr = (error as { sdkError?: { message?: string } })?.sdkError;
    return NextResponse.json(
      {
        success: false,
        error: sdkErr?.message || (error instanceof Error ? error.message : 'Failed to place AI bet'),
      },
      { status: 500 }
    );
  }
}

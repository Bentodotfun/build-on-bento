import { NextResponse } from 'next/server';
import { createBentoSdk, walletAuthProvider } from '@bento.fun/sdk';

export async function POST(req: Request) {
  try {
    const { duelId: rawDuelId, outcome } = await req.json(); // outcome = 'YES' or 'NO'
    const token = process.env.HUMAN_JWT; // Use Human JWT to resolve
    const apiKey = process.env.BENTO_BUILDER_API_KEY;
    const baseUrl = process.env.BENTO_URL || 'https://internal-server.bento.fun';

    if (!token || !apiKey) {
      return NextResponse.json(
        { error: 'Human JWT or Bento Builder API key missing in environment' },
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

    console.log(`Resolving duel ${duelId} with outcome ${outcome}...`);
    
    const winningOptionIndex = outcome === 'YES' ? 0 : 1;

    // Attempt resolve using Bento SDK
    try {
      await sdk.user.duels.resolve({
        duelIds: [
          {
            duelId,
            winningOptionIndex,
          },
        ],
      });
      return NextResponse.json({ success: true, resolved: true, outcome, duelId });
    } catch (sdkErr: any) {
      console.warn('On-chain resolution failed, enabling simulated fallback:', sdkErr);
      const msg = sdkErr?.sdkError?.message || sdkErr?.message || 'Transaction rejected';
      return NextResponse.json({
        success: false,
        error: msg,
        msg: `Failed to resolve on-chain (${msg}). Simulated resolution activated in UI.`,
        outcome,
        duelId
      });
    }
  } catch (error: any) {
    console.error('Error resolving duel:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Server error' },
      { status: 500 }
    );
  }
}

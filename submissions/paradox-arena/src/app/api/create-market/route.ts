import { NextResponse } from 'next/server';
import { createBentoSdk, walletAuthProvider } from '@bento.fun/sdk';

export const dynamic = 'force-dynamic';

/**
 * POST /api/create-market
 *
 * Creates a private credits-based prediction market for the Argentina vs England scenario,
 * then generates an invite code so the AI agent wallet can join and bet.
 *
 * Returns: { duelId, inviteCode, txHash }
 */
export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // Fall back to defaults
  }

  const token = process.env.HUMAN_JWT;
  const apiKey = process.env.BENTO_BUILDER_API_KEY;
  const baseUrl = process.env.BENTO_URL || 'https://internal-server.bento.fun';
  const humanAddress = process.env.HUMAN_ADDRESS || '0x2c18d6cd9020d3a84f87a4bca7075a1b85d3dcea';

  if (!token || !apiKey) {
    return NextResponse.json(
      { error: 'HUMAN_JWT or BENTO_BUILDER_API_KEY missing in environment' },
      { status: 500 }
    );
  }

  const question = body.question || 'Will Argentina win the match against England? (FIFA World Cup 2026)';
  const description = body.description || "Round of 16. Argentina (defending champions) vs England. Will Messi's Argentina take the win?";
  const category = body.category || 'Football';
  const tags = body.tags || ['FIFA', 'World Cup 2026', 'Argentina', 'England'];

  const sdk = createBentoSdk({
    baseUrl,
    apiKey,
    auth: walletAuthProvider(() => ({ Authorization: `Bearer ${token}` })),
  });

  // Private market: startTime must be ≥5 min ahead; use 8 min to be safe.
  // endTime: 2 hours after start (enough for the demo).
  const start = Date.now() + 8 * 60_000;
  const startTime = new Date(start).toISOString();
  const endTime = new Date(start + 2 * 3600_000).toISOString();

  try {
    // ── 1. Create the duel ────────────────────────────────────────────────────
    const result = await sdk.user.createDuel(
      {
        question,
        type: 'prediction',
        category,
        description,
        startTime,
        endTime,
        privacyAccess: 'private',
        collateralMode: 'credits',
        tags,
      },
      { requestId: `create-${Date.now()}` }
    );

    const { duelId, txHash } = result.raw as { duelId: string; txHash: string };
    console.log('[create-market] duelId:', duelId, 'txHash:', txHash);

    // ── 2. Poll until market appears in catalog (eventual consistency) ────────
    let detail = null;
    for (let i = 0; i < 15; i++) {
      try {
        detail = await sdk.public.getDuelById({ duelId });
        break;
      } catch {
        await delay(2000);
      }
    }

    // ── 3. Create an invite code so the AI agent can join ────────────────────
    const inviteCode = Math.random().toString(36).substring(2, 12).toUpperCase();
    try {
      await sdk.user.duelInvitations.create({
        duelId,
        inviteCode,
        inviterAddress: humanAddress,
        expiresAt: 0,  // never expires
        maxUses: 0,    // unlimited
      });
      console.log('[create-market] invite created:', inviteCode);
    } catch (invErr) {
      // Non-fatal — AI can still join if this fails (log but don't throw)
      console.warn('[create-market] invite creation warning:', invErr);
    }

    return NextResponse.json({
      success: true,
      duelId,
      txHash,
      inviteCode,
      startTime,
      endTime,
      detail,
    });
  } catch (error: unknown) {
    console.error('[create-market] Error:', error);
    const sdkErr = (error as { sdkError?: { message?: string } })?.sdkError;
    return NextResponse.json(
      {
        success: false,
        error:
          sdkErr?.message ||
          (error instanceof Error ? error.message : 'Failed to create market'),
      },
      { status: 500 }
    );
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

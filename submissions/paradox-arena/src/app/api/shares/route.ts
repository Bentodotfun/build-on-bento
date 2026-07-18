import { NextResponse } from 'next/server';
import { createBentoSdk, walletAuthProvider } from '@bento.fun/sdk';
import { createPublicClient, http } from 'viem';

export const dynamic = 'force-dynamic';

const publicClient = createPublicClient({
  transport: http('https://data-seed-prebsc-1-s1.binance.org:8545'),
});

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
  },
] as const;

async function getOnChainBalance(tokenAddress: `0x${string}`, userAddress: `0x${string}`) {
  try {
    const balance = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress],
    });
    return Number(balance) / 1e18; // Convert Wei to Whole Tokens
  } catch (err) {
    console.error(`Error reading balance for ${tokenAddress}:`, err);
    return 0;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    let duelId = searchParams.get('duelId');

    if (!role || !duelId) {
      return NextResponse.json({ error: 'Missing role or duelId' }, { status: 400 });
    }

    const token =
      searchParams.get('jwt') ||
      (role === 'human' ? process.env.HUMAN_JWT : process.env.AI_JWT);
    const apiKey = process.env.BENTO_BUILDER_API_KEY;
    const baseUrl = process.env.BENTO_URL || 'https://internal-server.bento.fun';

    if (!token || !apiKey) {
      return NextResponse.json(
        { error: 'Credentials missing in environment' },
        { status: 500 }
      );
    }

    const sdk = createBentoSdk({
      baseUrl,
      apiKey,
      auth: walletAuthProvider(() => ({ Authorization: `Bearer ${token}` })),
    });

    // Resolve placeholder duelId — prefer credits markets
    if (!duelId || duelId === 'placeholder' || duelId === 'undefined') {
      const duelsRes = await sdk.public.listDuels({ page: 1, limit: 20 });
      const allDuels = duelsRes?.data ?? [];
      const creditsDuel =
        allDuels.find((d) => (d as { collateralMode?: string }).collateralMode === 'credits') ??
        allDuels[0];
      if (creditsDuel) {
        duelId = creditsDuel.duelId;
      } else {
        return NextResponse.json({ error: 'No active duels found' }, { status: 404 });
      }
    }

    // Decode JWT to get the managed wallet address (payload.address)
    let address = searchParams.get('address') || '';
    if (!address) {
      try {
        const payload = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64').toString('utf8')
        );
        // The managed account address — NOT eoaAddress
        address = payload.address || payload.eoaAddress || '';
      } catch {
        return NextResponse.json(
          { error: 'Failed to extract wallet address from JWT' },
          { status: 500 }
        );
      }
    }

    if (!address) {
      return NextResponse.json(
        { error: 'No wallet address found — specify via query param or JWT' },
        { status: 400 }
      );
    }

    // Fetch user shares
    let sharesObj = { option0: 0, option1: 0 };
    try {
      const shares = await sdk.user.bets.getUserShares({ duelId, address });

      // Normalize: SDK returns { success: true, shares: { option0: number, option1: number } }
      if (shares && typeof shares === 'object') {
        if ('shares' in shares && shares.shares) {
          sharesObj = (shares as any).shares;
        } else if ('option0' in shares) {
          sharesObj = shares as any;
        }
      }
    } catch (shareErr) {
      console.warn(`[shares] Failed to fetch shares for duelId ${duelId} / address ${address}:`, shareErr);
    }

    // Fetch on-chain balances
    const creditsBalance = await getOnChainBalance('0x65c05d38f56c0a2be84b511addbf0d367988f43d', address as `0x${string}`);
    const usdcBalance = await getOnChainBalance('0xf6656c18194fcdaf370dca4ffae860208e343397', address as `0x${string}`);

    return NextResponse.json({
      success: true,
      role,
      duelId,
      address,
      shares: sharesObj,
      creditsBalance,
      usdcBalance,
    });
  } catch (error: unknown) {
    console.error('Error fetching shares:', error);
    const sdkErr = (error as { sdkError?: { message?: string } })?.sdkError;
    return NextResponse.json(
      {
        success: false,
        error: sdkErr?.message || (error instanceof Error ? error.message : 'Failed to fetch shares'),
      },
      { status: 500 }
    );
  }
}

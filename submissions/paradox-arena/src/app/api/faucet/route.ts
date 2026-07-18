import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { address } = await req.json();
    const bentoUrl = process.env.BENTO_URL || 'https://internal-server.bento.fun';

    if (!address) {
      return NextResponse.json({ error: 'Missing smart wallet address' }, { status: 400 });
    }

    console.log(`Requesting testnet credits faucet for address: ${address}...`);

    const res = await fetch(`${bentoUrl}/bento/auto-mint/mint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userAddress: address }),
    });

    const data = await res.json();
    console.log(`Faucet response for ${address}:`, data);

    if (res.ok && (data.success || data.usdc?.success || data.credits?.success)) {
      return NextResponse.json({
        success: true,
        message: 'Free-play credits and test tokens successfully minted to your smart wallet!',
        details: data,
      });
    } else {
      const errMsg = data.message || data.credits?.error || data.usdc?.error || 'Faucet allocation limit reached or transaction reverted.';
      return NextResponse.json({
        success: false,
        error: errMsg,
        details: data,
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Faucet Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to request faucet credits',
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

/**
 * Testnet faucet proxy — mints credits (and USDC) to a managed account.
 * Called once per fresh login (see bentoAuth.ts's connectBento) so a new
 * session always has something to bet with, instead of hitting "Insufficient
 * Credits" on the very first tap. No SDK wrapper exists for this endpoint
 * (see pulse/worker/src/faucet.ts's note) — calling the REST route directly.
 */

const BENTO_URL = process.env.BENTO_URL ?? "https://internal-server.bento.fun";
const BENTO_BUILDER_API_KEY = process.env.BENTO_BUILDER_API_KEY ?? "";

export async function POST(req: NextRequest) {
  const { managedAddress } = await req.json().catch(() => ({}));
  console.log("[auth/fund] request for:", managedAddress);
  if (!managedAddress) {
    return NextResponse.json({ ok: false, message: "Missing managedAddress." }, { status: 200 });
  }

  try {
    const res = await fetch(`${BENTO_URL}/bento/auto-mint/mint`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-builder-api-key": BENTO_BUILDER_API_KEY },
      body: JSON.stringify({ userAddress: managedAddress }),
    });
    const data = await res.json().catch(() => null);
    console.log("[auth/fund] faucet response:", res.status, data);
    if (!res.ok || !data?.success) {
      return NextResponse.json({ ok: false, message: data?.message ?? "Faucet failed." }, { status: 200 });
    }
    return NextResponse.json({ ok: true, credits: 1000, usdc: 1000 });
  } catch (err: any) {
    console.error("[auth/fund] FAILED:", err?.message ?? err);
    return NextResponse.json({ ok: false, message: err?.message ?? "Faucet unreachable." }, { status: 200 });
  }
}

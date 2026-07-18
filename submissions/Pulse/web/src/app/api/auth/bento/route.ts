import { NextRequest, NextResponse } from "next/server";
import { createBentoSdk, walletAuthProvider } from "@bento.fun/sdk";

/**
 * Bento login proxy. The client signs `Bento.fun Login\nTimestamp: …\nWallet: …`
 * with an injected EVM wallet; we exchange that for a session JWT via
 * eoaLogin, registering the wallet first if it's never logged in before.
 * BENTO_BUILDER_API_KEY stays server-side.
 */

const BENTO_URL = process.env.BENTO_URL ?? "https://internal-server.bento.fun";
const BENTO_BUILDER_API_KEY = process.env.BENTO_BUILDER_API_KEY ?? "";

export async function POST(req: NextRequest) {
  const { address, signature, timestamp } = await req.json().catch(() => ({}));
  if (!address || !signature || !timestamp) {
    return NextResponse.json({ ok: false, message: "Missing signature." }, { status: 200 });
  }

  const sdk = createBentoSdk({
    baseUrl: BENTO_URL,
    apiKey: BENTO_BUILDER_API_KEY,
    auth: walletAuthProvider(() => ({})),
  });

  try {
    let res = (await sdk.public.auth.eoaLogin({ address, signature, timestamp })) as {
      exists: boolean;
      token?: string;
      user?: { address?: string; username?: string };
    };

    if (!res.exists) {
      // Fresh wallet — register with an auto-generated username. Mainnet also
      // requires inviteCode; testnet does not (docs.bento.fun/concepts/authentication).
      const username = `pulse-${address.slice(2, 8).toLowerCase()}`;
      res = (await sdk.public.auth.eoaRegister({ address, signature, timestamp, username })) as typeof res;
    }

    if (!res.token) {
      return NextResponse.json({ ok: false, message: "Bento sign-in failed." }, { status: 200 });
    }

    return NextResponse.json({
      ok: true,
      token: res.token,
      managedAddress: res.user?.address ?? null,
      username: res.user?.username ?? null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.sdkError?.message ?? err?.message ?? "Could not reach Bento." },
      { status: 200 },
    );
  }
}

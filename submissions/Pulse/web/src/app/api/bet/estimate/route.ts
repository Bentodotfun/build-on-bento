import { NextRequest, NextResponse } from "next/server";
import { createBentoSdk, walletAuthProvider } from "@bento.fun/sdk";

/**
 * Read-only price check. Turns out estimateBuy is NOT anonymous despite
 * being a pure quote — every working call in this codebase has used an
 * authenticated session, and calling it with an empty auth provider returns
 * "Unauthorized" (confirmed live). So this forwards the user's own Bearer
 * token, same as /api/bet/place — meaning it only works once the user has
 * a session; BuySheet skips the fetch until then.
 */

const BENTO_URL = process.env.BENTO_URL ?? "https://internal-server.bento.fun";
const BENTO_BUILDER_API_KEY = process.env.BENTO_BUILDER_API_KEY ?? "";

/** amount like 20 or 20.5 (dollars) -> wei string, 18 decimals, BigInt-safe. */
function toWei(amount: number, decimals = 18): string {
  const [whole, frac = ""] = String(amount).split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return (BigInt(whole || "0") * BigInt(10) ** BigInt(decimals) + BigInt(fracPadded || "0")).toString();
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const { duelId, optionIndex, amountUsd } = await req.json().catch(() => ({}));
  console.log("[bet/estimate] request:", { duelId, optionIndex, amountUsd, hasToken: !!token });
  if (!duelId || optionIndex == null) {
    return NextResponse.json({ ok: false, message: "Missing fields." }, { status: 200 });
  }
  if (!token) {
    return NextResponse.json({ ok: false, message: "Not signed in." }, { status: 200 });
  }

  const sdk = createBentoSdk({
    baseUrl: BENTO_URL,
    apiKey: BENTO_BUILDER_API_KEY,
    auth: walletAuthProvider(() => ({ Authorization: `Bearer ${token}` })),
  });

  try {
    const est: any = await sdk.user.bets.estimateBuy({
      duelId,
      optionIndex,
      betAmountUsdc: toWei(amountUsd ?? 1),
      slippageBps: 100,
    });
    console.log("[bet/estimate] response:", JSON.stringify(est));
    if (!est.success) return NextResponse.json({ ok: false, message: est?.message ?? "Estimate rejected." }, { status: 200 });
    return NextResponse.json({
      ok: true,
      yesPrice: est.estimate.current_yes_price,
      noPrice: est.estimate.current_no_price,
      sharesOut: est.estimate.shares_out,
    });
  } catch (err: any) {
    console.error("[bet/estimate] FAILED:", err?.sdkError ?? err?.message ?? err);
    return NextResponse.json({ ok: false, message: err?.sdkError?.message ?? err?.message }, { status: 200 });
  }
}

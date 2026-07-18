import { NextRequest, NextResponse } from "next/server";
import { createBentoSdk, walletAuthProvider } from "@bento.fun/sdk";

/**
 * Places a real bet on Bento: estimateBuy for a fresh quote, then placeBet
 * with that quote's fields. Runs server-side so BENTO_BUILDER_API_KEY stays
 * off the client — the browser only ever holds the user's own Bearer JWT
 * (from /api/auth/bento), which it forwards here.
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
  const body = await req.json().catch(() => ({}));
  const { duelId, optionIndex, amountUsd, collateralMode } = body ?? {};

  console.log("[bet/place] request:", { duelId, optionIndex, amountUsd, collateralMode, hasToken: !!token });

  if (!token) {
    console.log("[bet/place] rejected: no token");
    return NextResponse.json({ ok: false, message: "Not signed in." }, { status: 200 });
  }
  if (!duelId || optionIndex == null || !amountUsd) {
    console.log("[bet/place] rejected: missing fields");
    return NextResponse.json({ ok: false, message: "Missing bet fields." }, { status: 200 });
  }

  const sdk = createBentoSdk({
    baseUrl: BENTO_URL,
    apiKey: BENTO_BUILDER_API_KEY,
    auth: walletAuthProvider(() => ({ Authorization: `Bearer ${token}` })),
  });

  const betAmountUsdc = toWei(amountUsd);
  console.log("[bet/place] betAmountUsdc (wei):", betAmountUsdc);

  try {
    console.log("[bet/place] calling estimateBuy...");
    const est: any = await sdk.user.bets.estimateBuy({
      duelId,
      optionIndex,
      betAmountUsdc,
      slippageBps: 100,
    });
    console.log("[bet/place] estimateBuy response:", JSON.stringify(est));

    if (!est.success) {
      console.log("[bet/place] estimate rejected:", est);
      return NextResponse.json({ ok: false, message: est?.message ?? "Estimate rejected." }, { status: 200 });
    }

    console.log("[bet/place] calling placeBet with quoteId:", est.estimate.quote_id);
    const placed: any = await sdk.user.placeBet(
      {
        duelId,
        duelType: "PREDICTION",
        bet: optionIndex === 0 ? "YES" : "NO",
        optionIndex,
        betAmount: betAmountUsdc,
        betAmountUsdc,
        tokenDecimals: 18,
        sharesOut: est.estimate.shares_out,
        minSharesOut: est.estimate.min_shares_out,
        slippageBps: 100,
        quoteId: est.estimate.quote_id,
        quoteTimestamp: est.estimate.quote_timestamp,
        collateralMode: collateralMode === "usdc" ? "usdc" : "credits",
      },
      { idempotencyKey: `pulse-bet-${duelId}-${Date.now()}` },
    );
    console.log("[bet/place] placeBet response:", JSON.stringify(placed));

    return NextResponse.json({
      ok: true,
      message: "Bet placed.",
      sharesOut: est.estimate.shares_out,
      raw: placed,
    });
  } catch (err: any) {
    console.error("[bet/place] FAILED:", err?.sdkError ?? err?.message ?? err);
    return NextResponse.json(
      { ok: false, message: err?.sdkError?.message ?? err?.message ?? "Bet failed." },
      { status: 200 },
    );
  }
}

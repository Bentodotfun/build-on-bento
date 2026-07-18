import "dotenv/config";
import { getSeedSdk } from "./bento.js";
import { loadState, markSeeded } from "./state.js";

/**
 * Places an equal-sized credits bet on BOTH sides of every tracked market
 * that's open (past startTime) but not yet seeded, so it starts with real,
 * balanced liquidity instead of whatever lopsided mix of bets users/tests
 * happen to place. Without this, the liquidity-based price estimate in
 * bento.ts's impliedYes() skews to 0% or 100% — the "0¢" bug seen live.
 * Doesn't replace the real-time fix (BuySheet's live estimateBuy fetch,
 * used at confirm time) but keeps the deck-list price display sane too.
 *
 * Usage: npm run seed
 */

const SEED_AMOUNT = Number(process.env.PULSE_SEED_AMOUNT ?? 50); // credits — 50 on each side, 100 total per market

function toWei(amount: number, decimals = 18): string {
  const [whole, frac = ""] = String(amount).split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return (BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(fracPadded || "0")).toString();
}

async function seedSide(sdk: Awaited<ReturnType<typeof getSeedSdk>>, duelId: string, optionIndex: 0 | 1) {
  const betAmountUsdc = toWei(SEED_AMOUNT);
  const est: any = await sdk.user.bets.estimateBuy({ duelId, optionIndex, betAmountUsdc, slippageBps: 200 });
  if (!est.success) throw new Error(`estimate rejected: ${JSON.stringify(est)}`);
  await sdk.user.placeBet(
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
      slippageBps: 200,
      quoteId: est.estimate.quote_id,
      quoteTimestamp: est.estimate.quote_timestamp,
      collateralMode: "credits",
    },
    { idempotencyKey: `pulse-seed-${duelId}-${optionIndex}-${Date.now()}` },
  );
}

async function main() {
  const state = await loadState();
  const now = Date.now();
  // Pre-start betting works (confirmed live) — don't wait for startTime,
  // only exclude markets that are already closed or resolved. Previous
  // version filtered on `startTime <= now`, which backwards-selected the
  // OLD closed markets (past startTime) instead of the new ones (not yet
  // started but very much bettable) — real bug, fixed here.
  const due = state.filter((d) => !d.seeded && !d.resolved && d.endTime > now);
  console.log(`${due.length} market(s) still open and unseeded.`);

  const sdk = await getSeedSdk();
  for (const d of due) {
    console.log(`Seeding "${d.question}" (${d.duelId})...`);
    let yesOk = false;
    let noOk = false;
    try {
      console.log("  YES side...");
      await seedSide(sdk, d.duelId, 0);
      console.log("  ✅ YES seeded");
      yesOk = true;
    } catch (e: any) {
      console.log("  ❌ YES failed:", e?.sdkError?.message ?? e?.message);
    }
    try {
      console.log("  NO side...");
      await seedSide(sdk, d.duelId, 1);
      console.log("  ✅ NO seeded");
      noOk = true;
    } catch (e: any) {
      console.log("  ❌ NO failed:", e?.sdkError?.message ?? e?.message);
    }
    // Only mark seeded once BOTH sides land — a half-seeded market is the
    // same degenerate-price problem we're trying to fix. Leave it unmarked
    // so a later `npm run seed` retries the whole thing.
    if (yesOk && noOk) {
      await markSeeded(d.duelId);
    } else {
      console.log("  ⚠️  not fully seeded — will retry next run");
    }
  }
}

main();

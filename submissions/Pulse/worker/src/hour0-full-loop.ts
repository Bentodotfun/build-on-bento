/**
 * Full end-to-end Hour 0 close-the-loop test: create a short-window private
 * duel, wait until it's actually past endTime (so status flips to "closed"),
 * then resolve it. This is the one thing hour0-check.ts couldn't prove —
 * that resolve() actually succeeds once a market is eligible, not just that
 * it correctly rejects early resolution.
 */
import { getAuthedSdk, botAccount } from "./bento.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`Bot wallet: ${botAccount.address}`);
  const sdk = await getAuthedSdk();

  const LEAD_MIN = 6; // confirmed minimum viable for private markets
  const WINDOW_MIN = 1; // shortest reasonable betting window
  const now = Date.now();
  const startTime = new Date(now + LEAD_MIN * 60_000).toISOString();
  const endTime = new Date(now + (LEAD_MIN + WINDOW_MIN) * 60_000).toISOString();

  console.log(`Creating: opens in ${LEAD_MIN}min, closes ${WINDOW_MIN}min after that.`);
  const created = await sdk.user.createDuel({
    question: "[pulse-full-loop] will resolve() succeed once truly closed?",
    type: "prediction",
    category: "Football",
    description: "Full loop Hour 0 check — safe to ignore/delete.",
    optionA: "Yes",
    optionB: "No",
    startTime,
    endTime,
    privacyAccess: "private",
    collateralMode: "credits",
  });
  const duelId = (created as any).raw?.duelId;
  if (!duelId) throw new Error("No duelId in create response: " + JSON.stringify(created));
  console.log(`✅ Created duelId=${duelId}. Waiting until past endTime...`);

  // Wait until well past endTime, checking status via getDuelById as we go.
  const deadline = now + (LEAD_MIN + WINDOW_MIN) * 60_000 + 90_000; // +90s safety margin
  while (Date.now() < deadline) {
    await sleep(20_000);
    try {
      const detail = await sdk.public.getDuelById({ duelId });
      console.log(`[poll] status field(s):`, JSON.stringify((detail as any).status ?? detail).slice(0, 200));
    } catch (e: any) {
      console.log(`[poll] getDuelById not ready yet: ${e?.message ?? e}`);
    }
  }

  console.log("Attempting resolve()...");
  try {
    const res = await sdk.user.duels.resolve({ duelIds: [{ duelId, winningOptionIndex: 0 }] });
    console.log("✅✅✅ FULL LOOP CONFIRMED — resolve() succeeded on a naturally-closed market.");
    console.log(JSON.stringify(res, null, 2));
  } catch (err: any) {
    console.error("❌ resolve() still failed after waiting past endTime:");
    console.error(err?.sdkError ?? err?.message ?? err);
  }
}

main().catch((err) => {
  console.error("Full loop check crashed:", err);
  process.exit(1);
});

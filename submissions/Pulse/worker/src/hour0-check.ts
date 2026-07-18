/**
 * Hour 0 de-risk script — see docs/BUILD_PLAN.md.
 *
 * Runs the smallest possible create -> read -> resolve round trip against a
 * real Bento environment, using the exact DTO shapes confirmed from the
 * pinned OpenAPI schema (docs/BENTO_INTEGRATION.md). Answers, with a real
 * 200/403, the one thing static analysis couldn't: can our own bot account
 * resolve a duel it just created.
 *
 * Requires .env filled in from .env.example. Safe to run repeatedly —
 * everything it creates is a throwaway credits-mode duel.
 */
import { getAuthedSdk, botAccount } from "./bento.js";

async function main() {
  console.log(`Bot wallet: ${botAccount.address}`);

  const sdk = await getAuthedSdk();
  console.log("✅ Auth OK — got a JWT and built an authenticated SDK client.");

  // 1. Read path — prove the auth chain works end to end.
  const list = await sdk.public.listDuels({ page: 1, limit: 5 });
  console.log(`✅ Read OK — listDuels returned ${list.data?.length ?? 0} duels.`);

  // 2. Create a plain, top-level duel. Skipping parent/child markets for
  //    this check — createParentMarket's sub-market creation failed with
  //    an unexplained "All sub-market creations failed" (see BUILD_PLAN.md
  //    / ask Bento support). Not needed to answer Hour 0's actual question
  //    (can we resolve a duel we created) — revisit parent/child separately.
  // Per docs.bento.fun/reference/common-patterns: startTime a few minutes out
  // passes HTTP validation but still reverts on-chain ("Pre-flight simulation
  // failed"). Confirmed minimums: ~31min for public markets, ~5min for
  // private. Using privacyAccess: 'private' + 5min here specifically to test
  // whether that's a viable path for Pulse's 5-minute cadence (see
  // BENTO_INTEGRATION.md — this is the central open question right now).
  // DIAGNOSTIC round 2: docs claim private markets need only ~5min, but our
  // exact-5min attempt still 500'd. Testing 10min private here to find the
  // real threshold — this number directly decides whether Pulse's 5-minute
  // cadence is achievable at all. Read PULSE_OFFSET_MINUTES from env so this
  // can be re-run at different values without editing code each time.
  const offsetMinutes = Number(process.env.PULSE_OFFSET_MINUTES ?? 10);
  const privacy = (process.env.PULSE_PRIVACY as "public" | "private") ?? "private";
  console.log(`Testing offsetMinutes=${offsetMinutes}, privacyAccess=${privacy}`);

  const now = Date.now();
  const startTime = new Date(now + offsetMinutes * 60_000).toISOString();
  const endTime = new Date(now + offsetMinutes * 60_000 + 30 * 60_000).toISOString();

  const created = await sdk.user.createDuel({
    question: `[pulse-hour0-check] offset=${offsetMinutes}min privacy=${privacy}`,
    type: "prediction",
    category: "Football",
    description: "Hour 0 de-risk check for the Pulse hackathon project — safe to ignore/delete.",
    optionA: "Yes",
    optionB: "No",
    startTime,
    endTime,
    privacyAccess: privacy,
    collateralMode: "credits",
  });
  console.log("✅ createDuel OK:", JSON.stringify(created, null, 2));

  const duelId = (created as any).raw?.duelId ?? (created as any).duelId ?? (created as any).id;
  if (!duelId) {
    console.warn("⚠️  Could not find duelId on the createDuel response — inspect the JSON dump above.");
    return;
  }
  console.log(`Resolving duelId: ${duelId}`);

  // 3. THE key test: can we resolve our own duel.
  try {
    const resolveRes = await sdk.user.duels.resolve({
      duelIds: [{ duelId, winningOptionIndex: 0 }],
    });
    console.log("✅✅✅ resolve() SUCCEEDED — self-resolution works. Full autonomy is viable.");
    console.log(resolveRes);
  } catch (err: any) {
    console.error("❌ resolve() FAILED — this is the critical finding for Hour 0.");
    console.error(`   Status: ${err?.status ?? err?.response?.status ?? "unknown"}`);
    console.error(`   Message: ${err?.message ?? err}`);
    console.error(
      "   -> If this is a 401/403: self-resolution needs a privileged role. Fall back to the human-tap-to-approve design in BUILD_PLAN.md and ask Bento's support channel whether hackathon keys can get that role.",
    );
  }
}

main().catch((err) => {
  console.error("Hour 0 check crashed:", err);
  process.exit(1);
});

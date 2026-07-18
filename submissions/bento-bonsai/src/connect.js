import "dotenv/config";
import { createBentoSdk, walletAuthProvider } from "@bento.fun/sdk";

async function main() {
  console.log("\n🔍 Deep Data Exploration\n");

  const sdk = createBentoSdk({
    baseUrl: process.env.BENTO_URL,
    apiKey: process.env.BENTO_BUILDER_API_KEY,
    auth: walletAuthProvider(() => ({})),
  });

  // Get a wider sample of markets
  const { data } = await sdk.public.listDuels({ page: 1, limit: 10 });
  console.log(`Fetched ${data.length} markets\n`);

  for (let i = 0; i < Math.min(5, data.length); i++) {
    const m = data[i];
    console.log(`--- Market ${i + 1} ---`);
    console.log(`  duelId:          ${m.duelId?.slice(0, 20)}...`);
    console.log(`  betString:       ${m.betString}`);
    console.log(`  status:          ${m.status}`);
    console.log(`  duelType:        ${m.duelType}`);
    console.log(`  category:        ${m.category}`);
    console.log(`  privacyAccess:   ${m.privacyAccess}`);
    console.log(`  collateralMode:  ${m.collateralMode}`);
    console.log(`  totalBetAmountUSDC: ${m.totalBetAmountUSDC}`);
    console.log(`  uniqueParticipants: ${m.uniqueParticipants}`);
    console.log(`  startTime (unix):  ${m.startTime}`);
    console.log(`  endTime (unix):    ${m.endTime}`);

    if (m.options) {
      console.log(`  options: ${JSON.stringify(m.options)}`);
    }

    // Check Polymarket linkage
    if (m.polymarketEventId) console.log(`  polyEventId:     ${m.polymarketEventId}`);
    if (m.polymarketConditionId) console.log(`  polyConditionId: ${m.polymarketConditionId}`);
    if (m.polymarketMarketId) console.log(`  polyMarketId:    ${m.polymarketMarketId}`);

    console.log("");
  }

  // Try getDuelById for richer detail
  if (data.length > 0) {
    console.log("--- getDuelById detail ---");
    try {
      const detail = await sdk.public.getDuelById({ duelId: data[0].duelId });
      const topKeys = Object.keys(detail).slice(0, 30);
      console.log(`  Top keys: ${topKeys.join(", ")}`);
      console.log(`  options: ${JSON.stringify(detail.options)}`);

      // Check nested data paths
      if (detail.data) console.log(`  .data keys: ${Object.keys(detail.data).join(", ")}`);
    } catch (err) {
      console.error(`  Failed: ${err.message}`);
    }
  }

  // Test protocol stats (shows platform-wide data)
  console.log("\n--- Protocol Stats ---");
  try {
    const stats = await sdk.public.protocolStats.getSummary();
    console.log(`  Summary: ${JSON.stringify(stats, null, 2).slice(0, 400)}`);
  } catch (err) {
    console.error(`  Failed: ${err.message}`);
  }
}

main().catch(console.error);

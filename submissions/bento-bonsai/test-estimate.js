#!/usr/bin/env node
// Test estimate API to derive real pricing

import "dotenv/config";
import { createBentoSdk, walletAuthProvider } from "@bento.fun/sdk";

const sdk = createBentoSdk({
  baseUrl: process.env.BENTO_URL,
  apiKey: process.env.BENTO_BUILDER_API_KEY,
  auth: walletAuthProvider(() => ({})),
});

async function testEstimate() {
  console.log("🧪 Testing Estimate API for Price Discovery\n");

  // Get a sample market
  const { data } = await sdk.public.listDuels({ page: 1, limit: 5 });
  console.log(`Fetched ${data.length} markets for testing\n`);

  for (let i = 0; i < Math.min(2, data.length); i++) {
    const market = data[i];
    console.log(`\n━━━ Market ${i + 1} ━━━`);
    console.log(`Title: ${market.betString?.slice(0, 60)}`);
    console.log(`Liquidity: ${market.totalBetAmountUSDC}`);
    console.log(`duelId: ${market.duelId?.slice(0, 20)}...`);

    // Try estimating both options
    for (const optionIndex of [0, 1]) {
      console.log(`\n  Testing option ${optionIndex}...`);
      
      try {
        // Small test amount: 0.1 units
        // estimateBuy is on sdk.user.bets, not sdk.public.duels
        const est = await sdk.user.bets.estimateBuy({
          duelId: market.duelId,
          optionIndex,
          betAmountUsdc: '100000000000000000', // 0.1 units (18 decimals)
          slippageBps: 100,
        });

        if (est.success) {
          console.log(`  ✓ Option ${optionIndex} estimate succeeded!`);
          console.log(`    Shares out: ${est.estimate.shares_out}`);
          console.log(`    Min shares: ${est.estimate.min_shares_out}`);
          
          // Calculate implied price: amount / shares
          const amount = 0.1;
          const shares = parseFloat(est.estimate.shares_out) / 1e18;
          const impliedPrice = amount / shares;
          
          console.log(`    Implied price: ${impliedPrice.toFixed(4)} (${amount} / ${shares.toFixed(6)})`);
          
          // Try to see full estimate object
          console.log(`    Full estimate:`, JSON.stringify(est.estimate, null, 2).slice(0, 300));
        } else {
          console.log(`  ✗ Option ${optionIndex} estimate failed (success=false)`);
        }
      } catch (err) {
        console.log(`  ✗ Option ${optionIndex} error: ${err.message}`);
      }
    }
  }

  // Test if we can estimate without auth
  console.log("\n\n4️⃣ Testing if estimates work with public client...");
  const publicSdk = createBentoSdk({
    baseUrl: process.env.BENTO_URL,
    apiKey: process.env.BENTO_BUILDER_API_KEY,
    auth: walletAuthProvider(() => ({})),
  });

  try {
    const est = await publicSdk.user.bets.estimateBuy({
      duelId: data[0].duelId,
      optionIndex: 0,
      betAmountUsdc: '1000000000000000000',
      slippageBps: 100,
    });
    console.log("   ✓ Public estimates work!");
    console.log("   Result:", JSON.stringify(est, null, 2).slice(0, 400));
  } catch (err) {
    console.log("   ✗ Public estimate failed:", err.message);
  }
}

testEstimate().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});

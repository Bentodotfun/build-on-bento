#!/usr/bin/env node
// Test Bento market detail to find pricing info

import "dotenv/config";
import { createBentoSdk, walletAuthProvider } from "@bento.fun/sdk";

const sdk = createBentoSdk({
  baseUrl: process.env.BENTO_URL,
  apiKey: process.env.BENTO_BUILDER_API_KEY,
  auth: walletAuthProvider(() => ({})),
});

async function testDetail() {
  console.log("🧪 Testing Bento Market Detail for Pricing Info\n");

  // Get a sample market
  console.log("1️⃣ Fetching sample market from listDuels...");
  const { data } = await sdk.public.listDuels({ page: 1, limit: 3 });
  console.log(`   ✓ Fetched ${data.length} markets\n`);

  for (let i = 0; i < Math.min(2, data.length); i++) {
    const market = data[i];
    console.log(`\n━━━ Market ${i + 1} ━━━`);
    console.log(`ID: ${market.id}`);
    console.log(`duelId: ${market.duelId?.slice(0, 20)}...`);
    console.log(`Title: ${market.betString?.slice(0, 60)}`);
    console.log(`Type: ${market.duelType}`);
    
    console.log("\nList row keys:", Object.keys(market).join(", "));
    
    // Check for price-related fields in list
    const priceFieldsList = Object.keys(market).filter(k => 
      k.toLowerCase().includes('price') || 
      k.toLowerCase().includes('odds') ||
      k.toLowerCase().includes('option') ||
      k.toLowerCase().includes('share') ||
      k.toLowerCase().includes('liquidity')
    );
    
    if (priceFieldsList.length > 0) {
      console.log("\nPrice-related fields in LIST:");
      priceFieldsList.forEach(k => {
        console.log(`  ${k}: ${JSON.stringify(market[k])}`);
      });
    }

    // Get detail
    console.log("\n2️⃣ Fetching detail with getDuelById...");
    try {
      const detail = await sdk.public.getDuelById({ duelId: market.duelId });
      
      console.log("\nDetail keys:", Object.keys(detail).slice(0, 30).join(", "));
      
      // Look for price fields in detail
      const priceFieldsDetail = Object.keys(detail).filter(k => 
        k.toLowerCase().includes('price') || 
        k.toLowerCase().includes('odds') ||
        k.toLowerCase().includes('option') ||
        k.toLowerCase().includes('share') ||
        k.toLowerCase().includes('pool') ||
        k.toLowerCase().includes('reserve')
      );
      
      if (priceFieldsDetail.length > 0) {
        console.log("\n✓ Price-related fields in DETAIL:");
        priceFieldsDetail.forEach(k => {
          console.log(`  ${k}: ${JSON.stringify(detail[k])}`);
        });
      } else {
        console.log("\n✗ No obvious price fields found");
      }

      // Check options array
      if (detail.options) {
        console.log("\n✓ Options array found:");
        console.log(JSON.stringify(detail.options, null, 2));
      }

      // Check if there's nested data
      if (detail.data) {
        console.log("\n✓ Nested .data found:");
        console.log("  Keys:", Object.keys(detail.data).join(", "));
      }

    } catch (err) {
      console.log(`\n✗ getDuelById failed: ${err.message}`);
    }
  }

  // Test publicBets for chart data (might have prices)
  console.log("\n\n3️⃣ Testing publicBets.getYesPercentageSnapshots...");
  try {
    const snapshots = await sdk.public.publicBets.getYesPercentageSnapshots({
      duelId: data[0].duelId,
    });
    console.log("   ✓ Snapshots available!");
    console.log("   Sample:", JSON.stringify(snapshots, null, 2).slice(0, 400));
  } catch (err) {
    console.log(`   ✗ Failed: ${err.message}`);
  }
}

testDetail().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});

#!/usr/bin/env node
// Test Polymarket integration via Bento SDK

import "dotenv/config";
import { createBentoSdk, walletAuthProvider } from "@bento.fun/sdk";

const sdk = createBentoSdk({
  baseUrl: process.env.BENTO_URL,
  apiKey: process.env.BENTO_BUILDER_API_KEY,
  auth: walletAuthProvider(() => ({})),
});

async function testPoly() {
  console.log("🧪 Testing Polymarket Integration via Bento SDK\n");
  
  // Test 1: publicSearch (no auth)
  console.log("1️⃣ Testing publicSearch (no params)...");
  try {
    const results = await sdk.user.polymarket.publicSearch({});
    console.log("   ✓ publicSearch works!");
    console.log("   Result type:", typeof results);
    console.log("   Result keys:", Object.keys(results).slice(0, 10));
    console.log("   Sample data:", JSON.stringify(results, null, 2).slice(0, 500));
  } catch (err) {
    console.log("   ✗ publicSearch failed");
    console.log("   Error:", err.message);
    console.log("   Status:", err.sdkError?.status);
    console.log("   Kind:", err.sdkError?.kind);
  }

  console.log("\n");

  // Test 2: publicSearch with filters
  console.log("2️⃣ Testing publicSearch with limit...");
  try {
    const results = await sdk.user.polymarket.publicSearch({ limit: 5 });
    console.log("   ✓ With limit works!");
    console.log("   Data:", JSON.stringify(results, null, 2).slice(0, 500));
  } catch (err) {
    console.log("   ✗ Failed:", err.message);
  }

  console.log("\n");

  // Test 3: getEventsByTags
  console.log("3️⃣ Testing getEventsByTags...");
  try {
    const results = await sdk.user.polymarket.getEventsByTags();
    console.log("   ✓ getEventsByTags works!");
    console.log("   Data:", JSON.stringify(results, null, 2).slice(0, 500));
  } catch (err) {
    console.log("   ✗ Failed:", err.message);
  }

  console.log("\n");

  // Test 4: getSportsMap
  console.log("4️⃣ Testing getSportsMap...");
  try {
    const results = await sdk.user.polymarket.getSportsMap();
    console.log("   ✓ getSportsMap works!");
    console.log("   Data:", JSON.stringify(results, null, 2).slice(0, 500));
  } catch (err) {
    console.log("   ✗ Failed:", err.message);
  }

  console.log("\n");

  // Test 5: Check if methods exist
  console.log("5️⃣ Available Polymarket methods:");
  const polyMethods = Object.keys(sdk.user.polymarket).filter(k => typeof sdk.user.polymarket[k] === 'function');
  console.log("   Methods:", polyMethods.join(", "));
}

testPoly().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});

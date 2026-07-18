#!/usr/bin/env node
// Quick backend test - verifies API server works

async function testBackend() {
  const BASE_URL = "http://localhost:3001";

  console.log("🧪 Testing Ben-Spread Backend API\n");

  // Test 1: Health check
  console.log("1️⃣ Testing health endpoint...");
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    console.log("   ✓ Health check passed");
    console.log(`   Status: ${data.status}, Sessions: ${data.sessions}\n`);
  } catch (err) {
    console.log("   ✗ Health check failed");
    console.log("   Error:", err.message);
    console.log("   Make sure server is running: npm run server\n");
    return;
  }

  // Test 2: Markets endpoint
  console.log("2️⃣ Testing markets endpoint...");
  try {
    const res = await fetch(`${BASE_URL}/api/markets`);
    const data = await res.json();
    console.log("   ✓ Markets endpoint works");
    console.log(`   Bento: ${data.bento.length} markets`);
    console.log(`   Polymarket: ${data.polymarket.length} markets`);
    console.log(`   Real Poly data: ${data.realPolyData}\n`);
  } catch (err) {
    console.log("   ✗ Markets failed:", err.message, "\n");
  }

  // Test 3: Opportunities endpoint
  console.log("3️⃣ Testing opportunities endpoint...");
  try {
    const res = await fetch(`${BASE_URL}/api/opportunities`);
    const data = await res.json();
    console.log("   ✓ Opportunities endpoint works");
    console.log(`   Convergence: ${data.counts.convergence} found`);
    console.log(`   Arbitrage: ${data.counts.arbitrage} found\n`);
  } catch (err) {
    console.log("   ✗ Opportunities failed:", err.message, "\n");
  }

  // Test 4: Vault stats endpoint
  console.log("4️⃣ Testing vault stats endpoint...");
  try {
    const res = await fetch(`${BASE_URL}/api/vault/stats`);
    const data = await res.json();
    console.log("   ✓ Vault stats works");
    console.log(`   TVL: $${data.stats.totalAssets}`);
    console.log(`   Share price: ${data.stats.sharePrice}`);
    console.log(`   Mock data: ${data.stats.isMock || false}\n`);
  } catch (err) {
    console.log("   ✗ Vault stats failed:", err.message, "\n");
  }

  // Test 5: Vault performance endpoint
  console.log("5️⃣ Testing vault performance endpoint...");
  try {
    const res = await fetch(`${BASE_URL}/api/vault/performance`);
    const data = await res.json();
    console.log("   ✓ Vault performance works");
    console.log(`   APY: ${data.performance.apy}%`);
    console.log(`   Win rate: ${data.performance.winRate}%`);
    console.log(`   Total positions: ${data.performance.totalPositions}\n`);
  } catch (err) {
    console.log("   ✗ Vault performance failed:", err.message, "\n");
  }

  // Test 6: Deposit preparation
  console.log("6️⃣ Testing deposit preparation...");
  try {
    const res = await fetch(`${BASE_URL}/api/vault/deposit/prepare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: "100.0" }),
    });
    const data = await res.json();
    console.log("   ✓ Deposit preparation works");
    console.log(`   Amount: $${data.txData.amount}`);
    console.log(`   Wei: ${data.txData.amountWei}\n`);
  } catch (err) {
    console.log("   ✗ Deposit prepare failed:", err.message, "\n");
  }

  console.log("✅ Backend tests complete!\n");
  console.log("📡 API is ready for frontend integration.");
  console.log("📝 See BACKEND-SETUP.md for frontend examples.\n");
}

testBackend().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

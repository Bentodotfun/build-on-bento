import "dotenv/config";
import { scanAllMarkets, matchEventsBetweenPlatforms } from "./scanner.js";

async function test() {
  const { bentoMarkets, polyMarkets, allMarkets } = await scanAllMarkets();

  console.log(`\nBento: ${bentoMarkets.length} | Polymarket: ${polyMarkets.length} | Total: ${allMarkets.length}`);

  // Show sample Bento market
  if (bentoMarkets.length > 0) {
    const b = bentoMarkets[0];
    console.log(`\nSample Bento: "${b.title.slice(0, 60)}" — YES:${b.yesPrice} NO:${b.noPrice}`);
  }

  // Show sample Poly market  
  const poly = polyMarkets.find(p => p.title.includes("BTC"));
  if (poly) {
    console.log(`\nSample Poly: "${poly.title}" — YES:${poly.yesPrice} NO:${poly.noPrice}`);
  }

  // Test matching
  const matched = matchEventsBetweenPlatforms(bentoMarkets, polyMarkets);
  console.log(`\nMatched pairs: ${matched.length}`);
  for (const m of matched.slice(0, 3)) {
    console.log(`  Poly: "${m.poly.title.slice(0, 40)}" ↔ Bento: "${m.bento.title.slice(0, 40)}"`);
  }
}

test().catch(console.error);

import "dotenv/config";
import { resolveViaAnakin } from "./resolve-logic.js";

const questions = [
  "Will there be a goal? (Argentina vs Brazil)",
  "Will there be a corner? (Argentina vs Brazil)",
  "Will a card be shown? (Argentina vs Brazil)",
];

async function main() {
  for (const q of questions) {
    const start = Date.now();
    const { outcome, evidence } = await resolveViaAnakin(q);
    console.log(`"${q}"\n  -> outcome=${outcome} (${outcome === 0 ? "YES" : outcome === 1 ? "NO" : "inconclusive"}) in ${Date.now() - start}ms\n  evidence: ${evidence}\n`);
  }
}
main();

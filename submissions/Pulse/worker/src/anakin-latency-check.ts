/**
 * Hour 0 check #3 (docs/BUILD_PLAN.md) — is Anakin's `search` endpoint fast
 * enough to sit inside a 5-minute generator/resolver tick. Run a handful of
 * real calls and look at the timings, not a single sample.
 */
import "dotenv/config";
import axios from "axios";

const ANAKIN_API_KEY = process.env.ANAKIN_API_KEY!;
if (!ANAKIN_API_KEY) throw new Error("Missing ANAKIN_API_KEY — copy .env.example to .env and fill in.");

const queries = [
  "live text commentary Real Madrid vs Barcelona last 5 minutes",
  "injury news Real Madrid starting lineup today",
  "penalty VAR check football match today",
];

async function timedSearch(query: string) {
  const start = Date.now();
  try {
    const res = await axios.post(
      "https://api.anakin.io/v1/search",
      { prompt: query },
      { headers: { "X-API-Key": ANAKIN_API_KEY, "content-type": "application/json" }, timeout: 20_000 },
    );
    const ms = Date.now() - start;
    console.log(`✅ "${query}" — ${ms}ms — ${JSON.stringify(res.data).slice(0, 200)}`);
    return ms;
  } catch (err: any) {
    const ms = Date.now() - start;
    console.error(`❌ "${query}" — failed after ${ms}ms — ${err?.response?.status ?? err.message}`);
    return null;
  }
}

async function main() {
  const timings: number[] = [];
  for (const q of queries) {
    const ms = await timedSearch(q);
    if (ms) timings.push(ms);
  }
  if (timings.length) {
    const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
    console.log(`\nAverage: ${avg.toFixed(0)}ms across ${timings.length} calls.`);
    console.log(
      avg < 10_000
        ? "-> Fast enough for per-tick use in both generation and resolution."
        : "-> Too slow for per-tick use — downgrade to periodic enrichment only (see ANAKIN_INTEGRATION.md fallback).",
    );
  }
}

main().catch((err) => {
  console.error("Anakin latency check crashed:", err);
  process.exit(1);
});

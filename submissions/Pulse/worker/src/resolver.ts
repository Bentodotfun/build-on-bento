import "dotenv/config";
import { getAuthedSdk } from "./bento.js";
import { loadState, markResolved, type TrackedDuel } from "./state.js";
import { resolveViaAnakin } from "./resolve-logic.js";

/**
 * Resolver loop — see docs/ARCHITECTURE.md and docs/ANAKIN_INTEGRATION.md.
 *
 * Real Anakin-backed resolution (see resolve-logic.ts) — no longer a random
 * placeholder. Measured Anakin latency: ~1.1-1.4s per call (confirmed live,
 * npm run hour0:anakin), so POLL_MS just needs to comfortably clear that,
 * not anything tighter — one search per due market per tick is cheap.
 *
 * Deliberately conservative: only resolves NO with confidence for "goal"
 * props (a match summary reliably reports the score either way); every
 * other prop type only resolves YES, and stays open (inconclusive) rather
 * than guessing NO from a snippet that simply didn't mention the event —
 * see resolve-logic.ts's docstring for why that asymmetry is the safer
 * default given a general web search isn't a structured event feed.
 */
async function resolveOutcome(duel: TrackedDuel): Promise<0 | 1 | null> {
  const { outcome, evidence } = await resolveViaAnakin(duel.question);
  console.log(`   evidence: ${evidence}`);
  return outcome;
}

const POLL_MS = Number(process.env.PULSE_RESOLVER_POLL_MS ?? 20_000);

async function resolveOnce() {
  const state = await loadState();
  const due = state.filter((d) => !d.resolved && Date.now() >= d.endTime);
  if (!due.length) return;

  const sdk = await getAuthedSdk();
  for (const duel of due) {
    console.log(`Checking "${duel.question}"...`);
    const outcome = await resolveOutcome(duel);
    if (outcome === null) {
      console.log(`⏳ inconclusive, leaving open (no void endpoint confirmed — see BENTO_INTEGRATION.md)`);
      continue;
    }
    try {
      await sdk.user.duels.resolve({ duelIds: [{ duelId: duel.duelId, winningOptionIndex: outcome }] });
      console.log(`✅ resolved "${duel.question}" -> option ${outcome}`);
      await markResolved(duel.duelId);
    } catch (err: any) {
      console.error(`❌ resolve failed for "${duel.question}":`, err?.sdkError?.message ?? err?.message);
    }
  }
}

async function main() {
  console.log(`Pulse resolver starting — polling every ${POLL_MS / 1000}s`);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await resolveOnce().catch((e) => console.error("resolveOnce crashed:", e));
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main();

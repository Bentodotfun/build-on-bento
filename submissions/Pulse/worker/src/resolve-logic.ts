import { anakinSearch } from "./anakin.js";

/**
 * Keyword-based resolution from Anakin search results. Deliberately
 * conservative: search snippets are general web content, not a structured
 * match-event feed (that's the Sportmonks path we never wired up — see
 * ANAKIN_INTEGRATION.md). That asymmetry matters here:
 *
 *   - "Goal" props: snippets reliably mention a final score or goal
 *     summary for any real match, so we resolve both YES and NO with
 *     reasonable confidence.
 *   - Every other prop (corner/card/foul/penalty/free kick): a snippet
 *     NOT mentioning the event is only weak evidence it didn't happen —
 *     general web summaries rarely itemize corners or fouls even when
 *     they occurred. So these only resolve YES (found it) and otherwise
 *     return null (inconclusive) rather than guessing NO.
 */

type PropKind = "goal" | "corner" | "card" | "foul" | "freekick" | "penalty" | "substitution" | "player-goal" | "unknown";

const KIND_PATTERNS: { kind: PropKind; match: RegExp; terms: string[] }[] = [
  { kind: "penalty", match: /penalty/i, terms: ["penalty", "penalty kick", "spot kick"] },
  { kind: "corner", match: /\bcorner\b/i, terms: ["corner", "corner kick"] },
  { kind: "card", match: /\bcard\b/i, terms: ["card", "yellow card", "red card", "booked", "sent off"] },
  { kind: "freekick", match: /free kick/i, terms: ["free kick", "freekick"] },
  { kind: "foul", match: /\bfoul\b/i, terms: ["foul"] },
  { kind: "substitution", match: /substitution/i, terms: ["substitution", "substituted", "comes on", "brought on"] },
  { kind: "goal", match: /\bgoal\b|\bscore\b/i, terms: ["goal", "scored", "scores"] },
];

function classify(question: string): { kind: PropKind; terms: string[] } {
  for (const p of KIND_PATTERNS) {
    if (p.match.test(question)) return { kind: p.kind, terms: p.terms };
  }
  return { kind: "unknown", terms: [] };
}

function extractSubject(question: string): string | null {
  const m = question.match(/\(([^)]+)\)/); // "(Argentina vs Brazil)"
  return m ? m[1] : null;
}

export async function resolveViaAnakin(question: string): Promise<{ outcome: 0 | 1 | null; evidence: string }> {
  const { kind, terms } = classify(question);
  const subject = extractSubject(question);
  if (kind === "unknown" || !subject) {
    return { outcome: null, evidence: "no recognized prop keyword or subject — can't build a search query" };
  }

  const prompt = `${subject} match report result score today`;
  let results;
  try {
    results = await anakinSearch(prompt);
  } catch (e: any) {
    return { outcome: null, evidence: `anakin search failed: ${e?.message ?? e}` };
  }
  if (!results.length) return { outcome: null, evidence: "no search results" };

  const text = results.map((r) => `${r.title} ${r.snippet}`).join(" ").toLowerCase();
  const found = terms.some((t) => text.includes(t.toLowerCase()));
  const topUrl = results[0]?.url ?? "";

  if (kind === "goal") {
    // Goals are reliably reported either way — a real match summary either
    // mentions goals/a nonzero score, or clearly doesn't.
    const scoreMatch = text.match(/\b(\d+)\s*-\s*(\d+)\b/);
    if (found || (scoreMatch && (Number(scoreMatch[1]) > 0 || Number(scoreMatch[2]) > 0))) {
      return { outcome: 0, evidence: `goal mentioned or nonzero score found — ${topUrl}` };
    }
    if (scoreMatch) {
      return { outcome: 1, evidence: `score found with no goals (${scoreMatch[0]}) — ${topUrl}` };
    }
    return { outcome: null, evidence: "no score or goal mention found" };
  }

  // Every other kind: only confident enough to say YES, never NO.
  if (found) return { outcome: 0, evidence: `"${terms.find((t) => text.includes(t.toLowerCase()))}" found — ${topUrl}` };
  return { outcome: null, evidence: `no ${kind} mention found — not confident enough to call NO` };
}

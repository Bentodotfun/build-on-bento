/** Client for the server-side oracle (keys stay on the server). */

export type Verdict = {
  status: 'judged' | 'pending' | 'error' | 'unverifiable';
  duelId: string;
  goal?: string;
  username?: string;
  target?: number;
  commitsFound?: number;
  commits?: { message: string; sha?: string; repo?: string; at: number }[];
  passed?: boolean;
  substantiveCount?: number;
  reasoning?: string;
  roast?: string;
  anakinNote?: string;
  message?: string;
  judgedAt?: number;
  winningSide?: 'haters' | 'believers';
  winningOptionIndex?: number;
  resolution?: { ok: boolean; status: number; body: string };
};

export async function fetchVerdicts(): Promise<Record<string, Verdict>> {
  try {
    const res = await fetch('/api/oracle/verdicts');
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

/**
 * Ask the oracle to judge a market. `force` skips the deadline check, which is
 * what the "Run oracle now" demo button uses.
 */
export async function resolveMarket(
  duelId: string,
  opts: { creatorJwt?: string; force?: boolean } = {},
): Promise<Verdict> {
  const res = await fetch('/api/oracle/resolve', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ duelId, ...opts }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Oracle failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return res.json();
}

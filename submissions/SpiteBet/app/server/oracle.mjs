/**
 * SpiteBet oracle — decides whether a trap was actually completed.
 *
 * Flow: read the market from Bento -> gather evidence (commits) -> have an AI
 * judge whether the work is substantive -> record the verdict -> resolve the
 * market on Bento so payouts settle.
 *
 * Runs server-side only. ANAKIN_API_KEY and GROQ_API_KEY are deliberately NOT
 * VITE_-prefixed so they never reach the browser bundle.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const VERDICTS_FILE = path.join(ROOT, 'oracle-verdicts.json');
const BENTO = 'https://internal-server.bento.fun';
const ANAKIN = 'https://api.anakin.io';

function env(key) {
  const raw = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  return raw.match(new RegExp(`^${key}=(.+)$`, 'm'))?.[1]?.trim();
}

const BUILDER_KEY = env('testnet_builder_api_key');
const ANAKIN_KEY = env('ANAKIN_API_KEY');
const GROQ_KEY = env('GROQ_API_KEY');

// --- verdict store ---------------------------------------------------------

export function readVerdicts() {
  if (!fs.existsSync(VERDICTS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(VERDICTS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeVerdict(duelId, verdict) {
  const all = readVerdicts();
  all[duelId] = verdict;
  fs.writeFileSync(VERDICTS_FILE, JSON.stringify(all, null, 2));
}

// --- market lookup ---------------------------------------------------------

async function getMarket(duelId) {
  const res = await fetch(`${BENTO}/bento/public/duels/get-duel-by-id/${duelId}`, {
    headers: { 'x-builder-api-key': BUILDER_KEY },
  });
  if (!res.ok) throw new Error(`Bento market lookup failed (${res.status})`);
  return res.json();
}

function tagValue(tags, prefix) {
  return tags?.find((t) => t.startsWith(prefix))?.slice(prefix.length) ?? '';
}

// --- evidence gathering ----------------------------------------------------

/**
 * Anakin Wire: submit a task and poll for the result.
 * Wire's GitHub actions were failing server-side at time of writing
 * ("[scraper_error] 'NoneType' object has no attribute 'get'"), so callers
 * must treat this as best-effort and fall back.
 */
async function anakinWire(action_id, parameters, { timeoutMs = 45_000 } = {}) {
  const headers = { Authorization: `Bearer ${ANAKIN_KEY}`, 'content-type': 'application/json' };

  const submit = await fetch(`${ANAKIN}/v1/wire/task`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action_id, parameters }),
  });
  const job = await submit.json();
  if (!job.job_id) throw new Error(`Wire submit failed: ${JSON.stringify(job).slice(0, 160)}`);

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2500));
    const poll = await fetch(`${ANAKIN}/v1/wire/jobs/${job.job_id}`, { headers });
    const state = await poll.json();
    if (['processing', 'pending', 'queued', 'running'].includes(state.status)) continue;
    if (state.status === 'failed') {
      throw new Error(state.error?.message ?? 'Wire execution failed');
    }
    return state.result ?? state.data ?? state;
  }
  throw new Error('Wire job timed out');
}

/**
 * Commits by a user within [startMs, endMs].
 *
 * Wire has no per-user-commits action, so this reads GitHub's public events
 * feed. `anakinAttempted` records whether we tried Wire, so the UI can be
 * honest about which path produced the evidence.
 */
export async function fetchCommits(username, startMs, endMs) {
  let anakinNote = null;

  // Best-effort Anakin enrichment: confirms the account exists via Wire.
  try {
    await anakinWire('gh_user_details', { username }, { timeoutMs: 20_000 });
    anakinNote = 'anakin:gh_user_details ok';
  } catch (err) {
    anakinNote = `anakin unavailable (${String(err.message).slice(0, 80)})`;
  }

  const gh = { 'user-agent': 'spitebet-oracle', accept: 'application/vnd.github+json' };

  // The events feed tells us WHICH repos were pushed to, but its payload.commits
  // array comes back empty — so it can't give us messages to judge. Use it only
  // to discover repos, then pull real commits per repo.
  const evRes = await fetch(
    `https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=100`,
    { headers: gh },
  );
  if (evRes.status === 404) {
    return { commits: [], anakinNote, error: `GitHub user "${username}" not found` };
  }
  if (!evRes.ok) {
    return { commits: [], anakinNote, error: `GitHub API ${evRes.status}` };
  }

  const events = await evRes.json();
  const repos = [
    ...new Set(
      events
        .filter((ev) => ev.type === 'PushEvent')
        .filter((ev) => {
          const at = new Date(ev.created_at).getTime();
          // Allow slack either side; per-repo queries re-filter precisely.
          return at >= startMs - 86_400_000 && at <= endMs + 86_400_000;
        })
        .map((ev) => ev.repo?.name)
        .filter(Boolean),
    ),
  ];

  const since = new Date(startMs).toISOString();
  const until = new Date(endMs).toISOString();
  const commits = [];

  for (const repo of repos.slice(0, 8)) {
    const url =
      `https://api.github.com/repos/${repo}/commits` +
      `?author=${encodeURIComponent(username)}&since=${since}&until=${until}&per_page=100`;
    const res = await fetch(url, { headers: gh });
    if (!res.ok) continue;
    const rows = await res.json();
    if (!Array.isArray(rows)) continue;

    for (const c of rows) {
      commits.push({
        message: c.commit?.message ?? '',
        sha: c.sha?.slice(0, 7),
        repo,
        at: new Date(c.commit?.author?.date ?? 0).getTime(),
      });
    }
  }

  commits.sort((a, b) => b.at - a.at);
  return { commits, anakinNote, error: null, reposChecked: repos.length };
}

// --- AI judgement ----------------------------------------------------------

/**
 * Groq decides whether the commits represent real work. Counting alone is
 * trivially gamed (ten README typo commits), which is the whole point.
 */
export async function judgeCommits({ goal, target, commits }) {
  if (!GROQ_KEY) throw new Error('GROQ_API_KEY missing');

  const list = commits
    .map((c, i) => `${i + 1}. [${c.repo}] ${c.message.split('\n')[0].slice(0, 120)}`)
    .join('\n');

  const prompt = `You are the SpiteBet oracle, judging whether someone met a goal.

GOAL: "${goal}"
TARGET: ${target} substantive commits
COMMITS FOUND: ${commits.length}

${list || '(no commits in the window)'}

Judge whether the target was genuinely met. Padding does NOT count: repeated
README/typo/whitespace tweaks, empty commits, or trivial version bumps are not
substantive work. Be strict but fair.

Reply with ONLY minified JSON:
{"passed":boolean,"substantiveCount":number,"reasoning":"one sentence","roast":"one savage but playful sentence for the group chat"}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const json = await res.json();
  return JSON.parse(json.choices[0].message.content);
}

// --- Bento resolution ------------------------------------------------------

/** optionIndex 0 = YES (believers win), 1 = NO (haters win). */
async function resolveOnBento(duelId, winningOptionIndex, creatorJwt) {
  const res = await fetch(`${BENTO}/bento/user/duels/resolve`, {
    method: 'POST',
    headers: {
      'x-builder-api-key': BUILDER_KEY,
      Authorization: `Bearer ${creatorJwt}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ duelId, winningOptionIndex }),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body: body.slice(0, 300) };
}

// --- orchestration ---------------------------------------------------------

export async function runOracle(duelId, { creatorJwt, force = false } = {}) {
  const existing = readVerdicts()[duelId];
  if (existing && !force) return existing;

  const market = await getMarket(duelId);
  const endMs = (market.endTime ?? 0) * 1000;
  // Bento forces startTime ~31 min into the future, so commits made between
  // creating the trap and the market opening would otherwise be invisible.
  // Judge from creation time instead.
  const startMs = (market.createdAt ?? market.startTime ?? 0) * 1000;

  if (!force && Date.now() < endMs) {
    return { status: 'pending', duelId, message: 'Deadline has not passed yet', endTime: market.endTime };
  }

  const username = tagValue(market.tags, 'acct:');
  const target = Number(tagValue(market.tags, 'target:') || 1);
  const goal = market.betString ?? '';

  if (!username) {
    const verdict = {
      status: 'unverifiable',
      duelId,
      goal,
      message: 'No GitHub username was attached to this trap, so the oracle cannot check it.',
      judgedAt: Date.now(),
    };
    writeVerdict(duelId, verdict);
    return verdict;
  }

  const { commits, anakinNote, error } = await fetchCommits(username, startMs, endMs);
  if (error) {
    const verdict = { status: 'error', duelId, goal, username, message: error, anakinNote, judgedAt: Date.now() };
    writeVerdict(duelId, verdict);
    return verdict;
  }

  const judgement = await judgeCommits({ goal, target, commits });

  const verdict = {
    status: 'judged',
    duelId,
    goal,
    username,
    target,
    commitsFound: commits.length,
    commits: commits.slice(0, 20),
    passed: judgement.passed,
    substantiveCount: judgement.substantiveCount,
    reasoning: judgement.reasoning,
    roast: judgement.roast,
    anakinNote,
    judgedAt: Date.now(),
    // Believers (YES, option 0) win when the goal is met; haters (NO) otherwise.
    winningOptionIndex: judgement.passed ? 0 : 1,
    winningSide: judgement.passed ? 'believers' : 'haters',
  };

  if (creatorJwt) {
    verdict.resolution = await resolveOnBento(duelId, verdict.winningOptionIndex, creatorJwt);
  }

  writeVerdict(duelId, verdict);
  return verdict;
}

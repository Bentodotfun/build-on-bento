/** Probe: does the Anakin key work, and does Groq work? */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const env = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
const ANAKIN = env.match(/ANAKIN_API_KEY=(\S+)/)[1].trim();
const GROQ = env.match(/GROQ_API_KEY=(\S+)/)[1].trim();

const targets = [
  ['api.anakin.io /v1/scrape', 'https://api.anakin.io/v1/scrape'],
  ['anakin.io /api/v1/scrape', 'https://anakin.io/api/v1/scrape'],
];

for (const [label, url] of targets) {
  for (const scheme of ['Bearer', 'raw-x-api-key']) {
    try {
      const headers =
        scheme === 'Bearer'
          ? { Authorization: `Bearer ${ANAKIN}`, 'content-type': 'application/json' }
          : { 'x-api-key': ANAKIN, 'content-type': 'application/json' };
      const r = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: 'https://github.com/torvalds' }),
        signal: AbortSignal.timeout(15000),
      });
      const t = await r.text();
      console.log(`${label} [${scheme}] -> ${r.status} ${t.slice(0, 160)}`);
    } catch (e) {
      console.log(`${label} [${scheme}] -> ERROR ${e.message.slice(0, 80)}`);
    }
  }
}

// Groq
try {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: 'Reply with the single word: OK' }],
      max_tokens: 5,
    }),
    signal: AbortSignal.timeout(20000),
  });
  const j = await r.json();
  console.log(`GROQ -> ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
} catch (e) {
  console.log('GROQ ERROR', e.message);
}

// GitHub public events (no auth needed)
try {
  const r = await fetch('https://api.github.com/users/torvalds/events/public?per_page=5', {
    headers: { 'user-agent': 'spitebet-oracle' },
  });
  const j = await r.json();
  console.log(`GITHUB -> ${r.status} events:${Array.isArray(j) ? j.length : 'n/a'} type:${j?.[0]?.type}`);
} catch (e) {
  console.log('GITHUB ERROR', e.message);
}

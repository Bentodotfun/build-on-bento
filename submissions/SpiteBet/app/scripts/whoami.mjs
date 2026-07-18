/** Figure out exactly which Bento account our JWT controls. */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const apiKey = fs.readFileSync(path.join(ROOT, '.env'), 'utf8').match(/testnet_builder_api_key=(\S+)/)[1].trim();
const { token } = JSON.parse(fs.readFileSync(path.join(ROOT, '.bento-session.json'), 'utf8'));
const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());

const BASE = 'https://internal-server.bento.fun';
const H = { 'x-builder-api-key': apiKey, Authorization: `Bearer ${token}`, 'content-type': 'application/json' };

console.log('=== JWT claims ===');
console.log(JSON.stringify(claims, null, 2));

const ADDR = claims.address;
const UI_ADDR_PREFIX = '0x411f'; // what app.bento.fun shows in the sidebar

async function show(label, path, init = {}) {
  try {
    const r = await fetch(BASE + path, { headers: H, ...init });
    const t = await r.text();
    console.log(`\n--- ${label} (${r.status}) ---\n${t.slice(0, 600)}`);
  } catch (e) {
    console.log(`\n--- ${label} FAILED --- ${e.message}`);
  }
}

// Who owns the markets we created?
await show('our created markets', '/bento/user/portfolio/duels');
await show('positions for JWT address', `/bento/user/portfolio/positions/${ADDR}`);
await show('portfolio table duels', '/bento/user/portfolio/table/duels');

console.log(`\n=== ADDRESS COMPARISON ===`);
console.log(`JWT address      : ${ADDR}`);
console.log(`Bento UI sidebar : ${UI_ADDR_PREFIX}...cea4`);
console.log(`Match?           : ${ADDR.toLowerCase().startsWith(UI_ADDR_PREFIX.toLowerCase()) ? 'YES' : 'NO'}`);

/** Show balance + activity for every configured demo account. */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const env = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
const apiKey = env.match(/testnet_builder_api_key=(\S+)/)[1].trim();
const BASE = 'https://internal-server.bento.fun';

const accounts = [];
for (let i = 1; i <= 8; i++) {
  const name = env.match(new RegExp(`VITE_BENTO_ACCOUNT_${i}_NAME=(\\S+)`))?.[1];
  const jwt = env.match(new RegExp(`VITE_BENTO_ACCOUNT_${i}_JWT=(\\S+)`))?.[1];
  if (!name || !jwt) continue;
  const claims = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());
  accounts.push({ name, jwt, address: claims.address, exp: claims.exp });
}

console.log(`${accounts.length} account(s) configured\n`);

for (const a of accounts) {
  const res = await fetch(`${BASE}/bento/user/portfolio/accountDetails`, {
    method: 'POST',
    headers: {
      'x-builder-api-key': apiKey,
      Authorization: `Bearer ${a.jwt}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ userAddress: a.address, collateralStack: 'credits' }),
  });
  const d = (await res.json())?.portfolioData ?? {};
  const balance = 1000 - (d.positionValue ?? 0);
  const expires = new Date(a.exp * 1000).toISOString().slice(0, 10);
  console.log(
    `${a.name.padEnd(16)} balance ${String(balance).padStart(5)}  bets ${String(d.totalBets ?? 0).padStart(2)}  created ${String(d.totalDuelCreated ?? 0).padStart(2)}  expires ${expires}`,
  );
}

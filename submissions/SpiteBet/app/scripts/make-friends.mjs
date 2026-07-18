/**
 * Create demo "friend" accounts on Bento testnet.
 *
 * Theory under test: eoaLogin fails for unknown wallets, but bulk-register
 * /register-simple provisions an account from just an address. If we register
 * first and THEN sign in, we may get a real JWT per friend — which is what we
 * need for genuine multi-user vote attribution.
 */
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const apiKey = fs.readFileSync(path.join(ROOT, '.env'), 'utf8').match(/testnet_builder_api_key=(\S+)/)[1].trim();
const BASE = 'https://internal-server.bento.fun';
const H = { 'x-builder-api-key': apiKey, 'content-type': 'application/json' };

async function post(p, body) {
  const r = await fetch(BASE + p, { method: 'POST', headers: H, body: JSON.stringify(body) });
  const t = await r.text();
  let parsed;
  try { parsed = JSON.parse(t); } catch { parsed = t.slice(0, 200); }
  return { status: r.status, body: parsed };
}

const account = privateKeyToAccount(generatePrivateKey());
const address = account.address;
console.log('test wallet:', address);

// 1. Register the address (no signature required)
console.log('register-simple:', JSON.stringify(await post('/bento/user/bulk-register/register-simple', { address })));

// 2. Now try signing in as that wallet
const timestamp = String(Date.now());
const signature = await account.signMessage({
  message: `Bento.fun Login\nTimestamp: ${timestamp}\nWallet: ${address}`,
});
const login = await post('/bento/user/auth/eoa/login', { address, signature, timestamp });
console.log('eoaLogin after register:', JSON.stringify(login).slice(0, 400));

const token = login.body?.token ?? login.body?.data?.token;
console.log('\nGOT TOKEN?', Boolean(token));
if (token) {
  console.log('claims:', Buffer.from(token.split('.')[1], 'base64url').toString());
}

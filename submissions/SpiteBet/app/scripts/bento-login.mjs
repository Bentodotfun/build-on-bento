/**
 * Bento weblink login helper.
 *
 * The EOA signature endpoint (/user/auth/eoa/login) currently 401s on testnet,
 * so we use the weblink flow instead. Bento requires a public https returnUrl —
 * localhost is rejected — so for local dev you complete the sign-in in a browser
 * and paste the `code` back here.
 *
 *   node scripts/bento-login.mjs           → prints a connect URL to open
 *   node scripts/bento-login.mjs <code>    → exchanges the code for a JWT
 *
 * The JWT is written to .bento-session.json (gitignored).
 */
import { createBentoSdk, walletAuthProvider } from '@bento.fun/sdk';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SESSION_FILE = path.join(ROOT, '.bento-session.json');

const env = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
const apiKey = env.match(/testnet_builder_api_key=(\S+)/)?.[1]?.trim();
if (!apiKey) throw new Error('testnet_builder_api_key missing from .env');

// Must be a public https URL that you control. The page does not need to exist
// for local dev — you only need the ?code= it redirects with.
const RETURN_URL = process.env.BENTO_RETURN_URL || 'https://spitebet.vercel.app/callback';

const sdk = createBentoSdk({
  baseUrl: 'https://internal-server.bento.fun',
  apiKey,
  auth: walletAuthProvider(() => ({})),
});

const code = process.argv[2];

if (!code) {
  const { url } = await sdk.public.externalLink.getLinkUrl({
    returnUrl: RETURN_URL,
    state: 'spitebet',
  });

  console.log('\n1. Open this URL and sign in to Bento testnet:\n');
  console.log('   ' + url);
  console.log('\n2. You will be redirected to a URL like:');
  console.log(`   ${RETURN_URL}?code=ABC123&state=spitebet`);
  console.log('   (the page may 404 — that is fine, you just need the code)\n');
  console.log('3. Copy the code and run:\n');
  console.log('   node scripts/bento-login.mjs <code>\n');
  console.log('Note: this link expires in ~15 minutes.\n');
} else {
  try {
    const res = await sdk.public.externalLink.exchange({ code });
    const token = res?.token;
    if (!token) {
      console.error('No token in response:', JSON.stringify(res).slice(0, 300));
      process.exit(1);
    }

    // Keep every session we've collected — overwriting loses earlier accounts.
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    let store = { sessions: [] };
    if (fs.existsSync(SESSION_FILE)) {
      const existing = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
      store = existing.sessions ? existing : { sessions: [existing] };
    }
    store.sessions = store.sessions
      .filter((s) => s.token && s.token !== token)
      .concat([{ token, address: claims.address, savedAt: Date.now() }]);
    store.token = token; // most recent, for backwards compatibility
    fs.writeFileSync(SESSION_FILE, JSON.stringify(store, null, 2));
    console.log(`JWT saved (${store.sessions.length} session(s) stored)`);
    console.log('\nAdd this to .env as the next numbered account:\n');
    console.log(`VITE_BENTO_ACCOUNT_N_NAME=<username>`);
    console.log(`VITE_BENTO_ACCOUNT_N_JWT=${token}\n`);

    console.log('Claims:', JSON.stringify(claims));
    if (claims.exp) console.log('Expires:', new Date(claims.exp * 1000).toISOString());
  } catch (err) {
    console.error('Exchange failed:', err?.sdkError?.message ?? err?.message);
    process.exit(1);
  }
}

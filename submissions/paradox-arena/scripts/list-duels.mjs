import { createBentoSdk, walletAuthProvider } from '@bento.fun/sdk';
import fs from 'fs';
import path from 'path';

async function main() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envMap = {};
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const firstEq = trimmed.indexOf('=');
    if (firstEq === -1) return;
    const key = trimmed.slice(0, firstEq).trim();
    const val = trimmed.slice(firstEq + 1).trim();
    envMap[key] = val;
  });

  const apiKey = envMap['BENTO_BUILDER_API_KEY'];
  const baseUrl = envMap['BENTO_URL'] || 'https://internal-server.bento.fun';

  const sdk = createBentoSdk({
    baseUrl,
    apiKey,
    auth: walletAuthProvider(() => ({})),
  });

  try {
    const { data } = await sdk.public.listDuels({ page: 1, limit: 10 });
    console.log(`Found ${data.length} duels on testnet:`);
    data.forEach((d) => {
      console.log(`- Title: ${d.question}`);
      console.log(`  duelId: ${d.duelId}`);
      console.log(`  type: ${d.type}`);
      console.log(`  status: ${d.status}`);
      console.log(`  options: ${JSON.stringify(d.options || d.outcomeOptions)}`);
    });
  } catch (err) {
    console.error('Failed to list duels:', err);
  }
}

main();

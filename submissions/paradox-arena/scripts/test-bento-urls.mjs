import { createBentoSdk } from '@bento.fun/sdk';
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
  const testnetUrls = [
    'https://testnet.bento.fun',
    'https://api.testnet.bento.fun',
    'https://internal-server.bento.fun'
  ];

  for (const baseUrl of testnetUrls) {
    console.log(`\n--- Testing Base URL: ${baseUrl} ---`);
    const sdk = createBentoSdk({
      baseUrl,
      apiKey,
      auth: () => ({}),
    });

    try {
      const { data } = await sdk.public.listDuels({ page: 1, limit: 3 });
      console.log(`Success! Found ${data.length} duels.`);
      data.forEach((d) => {
        console.log(` - ${d.duelId}: ${d.question || '(no question)'}`);
      });
    } catch (err) {
      console.error(`Failed:`, err?.message || err);
    }
  }
}

main();

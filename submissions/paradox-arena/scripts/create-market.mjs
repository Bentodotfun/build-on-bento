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
  const token = envMap['HUMAN_JWT'];
  const baseUrl = envMap['BENTO_URL'] || 'https://internal-server.bento.fun';
  const humanAddress = envMap['HUMAN_ADDRESS'] || '0x2c18d6cd9020d3a84f87a4bca7075a1b85d3dcea';

  if (!token || !apiKey) {
    console.error('Missing HUMAN_JWT or BENTO_BUILDER_API_KEY in .env.local');
    process.exit(1);
  }

  console.log(`Connecting to Bento base URL: ${baseUrl}`);
  const sdk = createBentoSdk({
    baseUrl,
    apiKey,
    auth: walletAuthProvider(() => ({ Authorization: `Bearer ${token}` })),
  });

  const start = Date.now() + 8 * 60_000;
  const startTime = new Date(start).toISOString();
  const endTime = new Date(start + 2 * 3600_000).toISOString();

  try {
    console.log('Sending createDuel request to Bento on-chain protocol...');
    const result = await sdk.user.createDuel(
      {
        question: `Test Market: Argentina vs England (FIFA World Cup 2026) - Created at ${new Date().toLocaleTimeString()}`,
        type: 'prediction',
        category: 'Football',
        description: "Test run for Paradox Arena prediction market on-chain creation.",
        startTime,
        endTime,
        privacyAccess: 'private',
        collateralMode: 'credits',
        tags: ['Test', 'Argentina', 'England'],
      },
      { requestId: `create-${Date.now()}` }
    );

    console.log('Success! Response result:', JSON.stringify(result, null, 2));
    const { duelId, txHash } = result.raw || {};
    console.log(`\nCreated Market Details:`);
    console.log(`- Duel ID: ${duelId}`);
    console.log(`- Tx Hash: ${txHash}`);
  } catch (err) {
    console.error('Failed to create market:', err);
    if (err.sdkError) {
      console.error('SDK Error details:', err.sdkError);
    }
  }
}

main();

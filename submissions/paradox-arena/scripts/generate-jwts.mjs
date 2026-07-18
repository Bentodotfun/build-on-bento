import fs from 'fs';
import path from 'path';
import { createBentoSdk, walletAuthProvider } from '@bento.fun/sdk';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

async function main() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('Error: .env.local file not found at', envPath);
    process.exit(1);
  }

  // Parse .env.local
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

  const bentoBuilderApiKey = envMap['BENTO_BUILDER_API_KEY'];
  const bentoUrl = envMap['BENTO_URL'] || 'https://internal-server.bento.fun';

  if (!bentoBuilderApiKey) {
    console.error('Error: BENTO_BUILDER_API_KEY is not defined in .env.local');
    process.exit(1);
  }

  console.log('Initializing Bento SDK with:');
  console.log('- Base URL:', bentoUrl);
  console.log('- Builder API Key:', bentoBuilderApiKey.slice(0, 10) + '...');

  const sdk = createBentoSdk({
    baseUrl: bentoUrl,
    apiKey: bentoBuilderApiKey,
    auth: walletAuthProvider(() => ({})),
  });

  const generateAndRegister = async (role) => {
    const privKey = generatePrivateKey();
    const account = privateKeyToAccount(privKey);
    console.log(`\nGenerated random wallet for [${role}]:`);
    console.log(`- Address: ${account.address}`);

    const ts = String(Date.now());
    const signature = await account.signMessage({
      message: `Bento.fun Login\nTimestamp: ${ts}\nWallet: ${account.address}`,
    });

    const username = `${role.toLowerCase()}_${Math.floor(100000 + Math.random() * 900000)}`;
    console.log(`Registering on Bento testnet as "${username}"...`);

    const res = await sdk.public.auth.eoaRegister({
      address: account.address,
      signature,
      timestamp: ts,
      username,
    });

    if (!res || !res.token) {
      throw new Error(`Failed to get JWT token for ${username}. Response: ${JSON.stringify(res)}`);
    }

    console.log(`Successfully registered! JWT for ${role} obtained.`);
    return res.token;
  };

  try {
    const humanJwt = await generateAndRegister('Human');
    const aiJwt = await generateAndRegister('AI');

    // Write back to .env.local
    let newEnvContent = envContent;
    
    // Replace HUMAN_JWT lines
    if (newEnvContent.match(/HUMAN_JWT\s*=\s*/)) {
      newEnvContent = newEnvContent.replace(/HUMAN_JWT\s*=\s*[^\r\n]*/, `HUMAN_JWT = ${humanJwt}`);
    } else {
      newEnvContent += `\nHUMAN_JWT = ${humanJwt}`;
    }

    // Replace AI_JWT lines
    if (newEnvContent.match(/AI_JWT\s*=\s*/)) {
      newEnvContent = newEnvContent.replace(/AI_JWT\s*=\s*[^\r\n]*/, `AI_JWT = ${aiJwt}`);
    } else {
      newEnvContent += `\nAI_JWT = ${aiJwt}`;
    }

    fs.writeFileSync(envPath, newEnvContent, 'utf8');
    console.log('\nSuccess! .env.local file updated with new HUMAN_JWT and AI_JWT.');
  } catch (error) {
    console.error('Error during registration/JWT generation:', error);
    process.exit(1);
  }
}

main();

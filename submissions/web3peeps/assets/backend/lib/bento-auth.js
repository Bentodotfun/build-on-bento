import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import { createBentoSdk, walletAuthProvider, jwtAuthProvider } from '@bento.fun/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env'), override: true });

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-prod';

function deriveKey(password) {
  return crypto.scryptSync(password, 'salt', 32);
}

function encryptPrivateKey(privateKey) {
  const iv = crypto.randomBytes(16);
  const key = deriveKey(ENCRYPTION_KEY);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

function decryptPrivateKey(encryptedKey) {
  const parts = encryptedKey.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];

  const key = deriveKey(ENCRYPTION_KEY);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Build an unauthed SDK instance (for public reads and auth calls).
 * The builder API key is sent as a static header on every request.
 */
function buildPublicSdk() {
  return createBentoSdk({
    baseUrl: process.env.BENTO_URL,
    headers: {
      'x-builder-api-key': process.env.BENTO_BUILDER_API_KEY,
    },
  });
}

export async function getOrCreateUserWallet(userId) {
  let user = await User.findById(userId).select('+bentoWalletEncryptedKey');

  if (!user) {
    user = new User({ _id: userId });
    await user.save();
  }

  if (user.bentoWalletAddress && user.bentoWalletEncryptedKey) {
    const privateKey = decryptPrivateKey(user.bentoWalletEncryptedKey);
    const account = privateKeyToAccount(privateKey);
    return { address: user.bentoWalletAddress, account };
  }

  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  const address = account.address;

  user.bentoWalletAddress = address;
  user.bentoWalletEncryptedKey = encryptPrivateKey(privateKey);
  await user.save();

  return { address, account };
}

export async function getValidJwt(userId) {
  const user = await User.findById(userId).select('+bentoWalletEncryptedKey');

  if (user.bentoJwt && user.bentoJwtExpiresAt && user.bentoJwtExpiresAt > new Date()) {
    return user.bentoJwt;
  }

  const { account, address } = await getOrCreateUserWallet(userId);

  const timestamp = Date.now();
  const message = `Bento.fun Login\nTimestamp: ${timestamp}\nWallet: ${address}`;
  const signature = await account.signMessage({ message });

  const sdk = buildPublicSdk();

  let authResult;
  try {
    authResult = await sdk.public.auth.eoaLogin({ address, timestamp, signature });
  } catch {
    authResult = null;
  }

  if (!authResult || !authResult.token) {
    const username = `user_${address.slice(2, 10)}`;
    authResult = await sdk.public.auth.eoaRegister({ address, timestamp, signature, username });

    try {
      console.log(`[bento-auth] Minting testnet credits for new wallet ${address.slice(0, 10)}...`);
      await sdk.public.autoMint.mint({ userAddress: address });
      console.log(`[bento-auth] Testnet credits minted successfully.`);
    } catch (mintError) {
      console.warn(`[bento-auth] Auto-mint faucet call failed (non-fatal):`, mintError.message);
    }
  }

  console.log(`[bento-auth] Full auth response:`, JSON.stringify(authResult, null, 2));
  console.log(`[bento-auth] Auth response keys:`, Object.keys(authResult));

  const jwt = authResult.token;
  const managedAccount = authResult.user?.address;

  console.log(`[bento-auth] Extracted managedAccount from authResult.user.address:`, managedAccount);

  // Cache JWT and managed account
  user.bentoJwt = jwt;
  user.bentoJwtExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  user.bentoManagedAccountAddress = managedAccount;
  await user.save();

  return jwt;
}

export async function getAuthedSdk(userId) {
  const jwt = await getValidJwt(userId);
  const user = await User.findById(userId);
  const managedAccount = user.bentoManagedAccountAddress;

  console.log(`[bento-auth] Creating SDK with managed account: ${managedAccount}`);

  return createBentoSdk({
    baseUrl: process.env.BENTO_URL,
    headers: {
      'x-builder-api-key': process.env.BENTO_BUILDER_API_KEY,
    },
    auth: walletAuthProvider(() => ({ Authorization: `Bearer ${jwt}` })),
    userAddress: managedAccount,
  });
}

export { buildPublicSdk as getPublicSdk };

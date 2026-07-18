import "dotenv/config";
import { createBentoSdk, walletAuthProvider } from "@bento.fun/sdk";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";

const BENTO_URL = process.env.BENTO_URL!;
const BUILDER_API_KEY = process.env.BENTO_BUILDER_API_KEY!;
const BOT_PRIVATE_KEY = process.env.PULSE_BOT_PRIVATE_KEY as `0x${string}`;
const SEED_PRIVATE_KEY = process.env.PULSE_SEED_PRIVATE_KEY as `0x${string}` | undefined;

if (!BENTO_URL || !BUILDER_API_KEY || !BOT_PRIVATE_KEY) {
  throw new Error(
    "Missing BENTO_URL / BENTO_BUILDER_API_KEY / PULSE_BOT_PRIVATE_KEY — copy .env.example to .env and fill in.",
  );
}

export const botAccount = privateKeyToAccount(BOT_PRIVATE_KEY);
export const seedAccount = SEED_PRIVATE_KEY ? privateKeyToAccount(SEED_PRIVATE_KEY) : null;

const tokenCache = new Map<string, string>();
const managedAddressCache = new Map<string, string>();

/**
 * Wallet-sign -> JWT for a given account. Registers on first run if the
 * wallet has never logged in before (see SDK README auth flow). Cached per
 * account so multiple identities (bot, seed wallet, ...) don't collide.
 */
async function loginAs(account: PrivateKeyAccount, username: string): Promise<string> {
  const cached = tokenCache.get(account.address);
  if (cached) return cached;

  const publicSdk = createBentoSdk({
    baseUrl: BENTO_URL,
    apiKey: BUILDER_API_KEY,
    auth: walletAuthProvider(() => ({})),
  });

  const ts = String(Date.now());
  const signature = await account.signMessage({
    message: `Bento.fun Login\nTimestamp: ${ts}\nWallet: ${account.address}`,
  });

  let res = (await publicSdk.public.auth.eoaLogin({
    address: account.address,
    signature,
    timestamp: ts,
  })) as { exists: boolean; token?: string; user?: { address?: string } };

  if (!res.exists) {
    res = (await publicSdk.public.auth.eoaRegister({
      address: account.address,
      signature,
      timestamp: ts,
      username,
    })) as typeof res;
  }

  if (!res.token) throw new Error(`Bento auth did not return a token for ${username}.`);
  tokenCache.set(account.address, res.token);
  if (res.user?.address) managedAddressCache.set(account.address, res.user.address);
  return res.token;
}

function sdkWithToken(token: string) {
  return createBentoSdk({
    baseUrl: BENTO_URL,
    apiKey: BUILDER_API_KEY,
    auth: walletAuthProvider(() => ({ Authorization: `Bearer ${token}` })),
  });
}

/** Wallet-sign -> JWT for the bot's own Bento identity (creates/resolves markets). */
export async function getBotToken(): Promise<string> {
  return loginAs(botAccount, "pulse-bot");
}

/** Authenticated SDK instance for the bot identity — create/resolve calls. */
export async function getAuthedSdk() {
  return sdkWithToken(await getBotToken());
}

/**
 * Authenticated SDK for a dedicated seed wallet (PULSE_SEED_PRIVATE_KEY),
 * separate from the bot identity so seeding isn't limited by the bot
 * account's one-time faucet allocation. Falls back to the bot account if
 * no seed wallet is configured.
 */
export async function getSeedSdk() {
  if (!seedAccount) return getAuthedSdk();
  const token = await loginAs(seedAccount, `pulse-seed-${seedAccount.address.slice(2, 8).toLowerCase()}`);
  return sdkWithToken(token);
}

/** Managed account address for the seed wallet, needed to call the faucet. */
export async function getSeedManagedAddress(): Promise<string> {
  if (!seedAccount) throw new Error("No PULSE_SEED_PRIVATE_KEY configured.");
  await loginAs(seedAccount, `pulse-seed-${seedAccount.address.slice(2, 8).toLowerCase()}`);
  const addr = managedAddressCache.get(seedAccount.address);
  if (!addr) throw new Error("Seed wallet logged in but no managed address was returned.");
  return addr;
}

/** Public (unauthenticated) SDK instance for reads. */
export function getPublicSdk() {
  return createBentoSdk({
    baseUrl: BENTO_URL,
    apiKey: BUILDER_API_KEY,
    auth: walletAuthProvider(() => ({})),
  });
}

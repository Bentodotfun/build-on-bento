import "dotenv/config";
import { botAccount } from "./bento.js";
import { createBentoSdk, walletAuthProvider } from "@bento.fun/sdk";

/**
 * Testnet faucet — mints 1000 USDC + 1000 Credits to a managed account.
 * Endpoint isn't wrapped by the SDK's client classes (see
 * modules/auto-mint/auto-mint-api.d.ts — public, unattached), so this
 * calls the REST route directly. Confirmed live: mints instantly.
 *
 * Usage: npm run faucet [managedAddress]
 * Defaults to the worker's own bot account's managed address if omitted.
 */

const BENTO_URL = process.env.BENTO_URL!;
const BUILDER_API_KEY = process.env.BENTO_BUILDER_API_KEY!;

async function resolveManagedAddress(): Promise<string> {
  const pub = createBentoSdk({ baseUrl: BENTO_URL, apiKey: BUILDER_API_KEY, auth: walletAuthProvider(() => ({})) });
  const ts = String(Date.now());
  const signature = await botAccount.signMessage({
    message: `Bento.fun Login\nTimestamp: ${ts}\nWallet: ${botAccount.address}`,
  });
  const res: any = await pub.public.auth.eoaLogin({ address: botAccount.address, signature, timestamp: ts });
  return res.user.address;
}

async function main() {
  const target = process.argv[2] ?? (await resolveManagedAddress());
  console.log(`Minting testnet faucet funds to ${target}...`);
  const res = await fetch(`${BENTO_URL}/bento/auto-mint/mint`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-builder-api-key": BUILDER_API_KEY },
    body: JSON.stringify({ userAddress: target }),
  });
  const body = await res.json().catch(() => null);
  console.log(`status: ${res.status}`);
  console.log(body);
}

main();

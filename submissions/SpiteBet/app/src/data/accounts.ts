/**
 * Demo accounts for the "playing as" switcher.
 *
 * Each is a real Bento testnet account with its own JWT, so every bet is
 * genuinely attributed to that user — `uniqueParticipants` on a market counts
 * them separately. Add more by appending to .env:
 *
 *   VITE_BENTO_ACCOUNT_3_NAME=someone
 *   VITE_BENTO_ACCOUNT_3_JWT=eyJ...
 */
export type DemoAccount = {
  name: string;
  jwt: string;
  address: string;
  /** Unix seconds; these tokens last ~7 days. */
  expiresAt: number;
};

const MAX_ACCOUNTS = 8;

function decode(jwt: string): { address: string; exp: number } | null {
  try {
    const claims = JSON.parse(atob(jwt.split('.')[1]));
    return { address: claims.address ?? '', exp: claims.exp ?? 0 };
  } catch {
    return null;
  }
}

export function loadAccounts(): DemoAccount[] {
  const env = import.meta.env as Record<string, string | undefined>;
  const accounts: DemoAccount[] = [];

  for (let i = 1; i <= MAX_ACCOUNTS; i++) {
    const name = env[`VITE_BENTO_ACCOUNT_${i}_NAME`];
    const jwt = env[`VITE_BENTO_ACCOUNT_${i}_JWT`];
    if (!name || !jwt) continue;

    const claims = decode(jwt);
    if (!claims) continue;

    accounts.push({ name, jwt, address: claims.address, expiresAt: claims.exp });
  }

  // Fall back to the single-token setup if no numbered accounts are configured.
  if (accounts.length === 0 && env.VITE_BENTO_JWT) {
    const claims = decode(env.VITE_BENTO_JWT);
    if (claims) {
      accounts.push({
        name: 'me',
        jwt: env.VITE_BENTO_JWT,
        address: claims.address,
        expiresAt: claims.exp,
      });
    }
  }

  return accounts;
}

export function isExpired(account: DemoAccount): boolean {
  return account.expiresAt > 0 && account.expiresAt * 1000 < Date.now();
}

// Authentication module - handles wallet signature verification and JWT generation

import { createBentoSdk, walletAuthProvider } from "@bento.fun/sdk";
import { verifyMessage } from "viem";

/**
 * Verify a wallet signature and log the user into Bento
 * @param {string} address - Wallet address (0x...)
 * @param {string} signature - Signed message signature
 * @param {string} timestamp - Timestamp used in message
 * @returns {Promise<{token: string, address: string}>}
 */
export async function loginWithWallet(address, signature, timestamp) {
  // Verify the signature is valid
  const message = `Bento.fun Login\nTimestamp: ${timestamp}\nWallet: ${address}`;
  
  try {
    const valid = await verifyMessage({
      address,
      message,
      signature,
    });

    if (!valid) {
      throw new Error("Invalid signature");
    }
  } catch (err) {
    throw new Error(`Signature verification failed: ${err.message}`);
  }

  // Create SDK client
  const sdk = createBentoSdk({
    baseUrl: process.env.BENTO_URL,
    apiKey: process.env.BENTO_BUILDER_API_KEY,
    auth: walletAuthProvider(() => ({})),
  });

  // Try to login (will fail if not registered)
  try {
    const result = await sdk.public.auth.eoaLogin({
      address,
      signature,
      timestamp,
    });

    return {
      token: result.token,
      address,
      isNewUser: false,
    };
  } catch (loginErr) {
    // If login fails, try to register
    console.log("Login failed, attempting registration...");
    
    // Generate a username from address
    const username = `user_${address.slice(2, 10)}`;
    
    try {
      const registerResult = await sdk.public.auth.eoaRegister({
        address,
        signature,
        timestamp,
        username,
      });

      return {
        token: registerResult.token,
        address,
        username,
        isNewUser: true,
      };
    } catch (registerErr) {
      throw new Error(`Login and registration both failed: ${registerErr.message}`);
    }
  }
}

/**
 * Create an authenticated Bento SDK client
 * @param {string} token - JWT token from login
 * @returns {Object} Authenticated SDK client
 */
export function createAuthenticatedSdk(token) {
  return createBentoSdk({
    baseUrl: process.env.BENTO_URL,
    apiKey: process.env.BENTO_BUILDER_API_KEY,
    auth: walletAuthProvider(() => ({
      Authorization: `Bearer ${token}`,
    })),
  });
}

/**
 * Get user's portfolio (balance, positions, etc.)
 * @param {string} token - JWT token
 * @returns {Promise<Object>} User portfolio data
 */
export async function getUserPortfolio(token) {
  const sdk = createAuthenticatedSdk(token);
  
  try {
    const account = await sdk.user.portfolio.getAccount();
    return account;
  } catch (err) {
    throw new Error(`Failed to fetch portfolio: ${err.message}`);
  }
}

/**
 * Fetch real Polymarket markets via authenticated SDK
 * @param {string} token - JWT token
 * @param {Object} params - Search parameters
 * @returns {Promise<Array>} Polymarket markets
 */
export async function fetchPolymarketMarkets(token, params = {}) {
  const sdk = createAuthenticatedSdk(token);
  
  try {
    const markets = await sdk.user.polymarket.publicSearch({
      limit: params.limit || 50,
      ...params,
    });
    
    return markets;
  } catch (err) {
    throw new Error(`Failed to fetch Polymarket markets: ${err.message}`);
  }
}

import { createBentoSdk, walletAuthProvider } from '@bento.fun/sdk';

// Initialize the Bento SDK.
// In Next.js, we check for window to access localStorage for user JWT.
export const getBentoSdk = (userJwt?: string) => {
  const apiKey = process.env.NEXT_PUBLIC_BENTO_BUILDER_API_KEY || 'bnt_live_4cc4bb85_adbebf85e37e0ff79fdde553';
  const baseUrl = process.env.NEXT_PUBLIC_BENTO_URL || 'https://internal-server.bento.fun';
  const tournamentsBaseUrl = process.env.NEXT_PUBLIC_PARLAY_TOURNMENT_URL || 'https://bento-fun-tournaments-backend-3nku.onrender.com';

  return createBentoSdk({
    baseUrl,
    apiKey,
    tournamentsBaseUrl,
    auth: walletAuthProvider(() => {
      const token = userJwt || (typeof window !== 'undefined' ? window.localStorage.getItem('bento_jwt') : '') || '';
      return {
        Authorization: token ? `Bearer ${token}` : '',
      };
    }),
  });
};

// Default static instance
export const sdk = getBentoSdk();

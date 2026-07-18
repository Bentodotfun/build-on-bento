import { createBentoSdk, walletAuthProvider } from '@bento.fun/sdk';
const sdk = createBentoSdk({
  baseUrl: 'https://internal-server.bento.fun',
  apiKey: 'dummy',
  auth: walletAuthProvider(() => ({})),
});
console.log('sdk.public.auth:', Object.getOwnPropertyNames(Object.getPrototypeOf(sdk.public.auth)));
console.log('eoaLogin string:', sdk.public.auth.eoaLogin.toString());
console.log('eoaRegister string:', sdk.public.auth.eoaRegister.toString());

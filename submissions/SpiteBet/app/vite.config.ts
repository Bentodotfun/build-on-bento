import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-expect-error — plain JS plugin, no types needed
import { oracleApiPlugin } from './server/api-plugin.mjs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), oracleApiPlugin()],
  server: {
    // Bento's API does not send CORS headers for browser origins, so in dev we
    // proxy /bento through Vite and talk to it same-origin.
    proxy: {
      '/bento': {
        target: 'https://internal-server.bento.fun',
        changeOrigin: true,
        secure: true,
        configure: (proxy) => {
          // Bento rejects writes carrying a localhost Origin ("Not allowed by
          // CORS"). Drop the browser's origin/referer so the upstream sees a
          // plain server-to-server call, which is what this proxy really is.
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin')
            proxyReq.removeHeader('referer')
          })
        },
      },
    },
  },
})

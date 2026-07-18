/**
 * Vite dev middleware exposing the oracle at /api/oracle/*.
 *
 * This keeps ANAKIN_API_KEY and GROQ_API_KEY on the server — they must never
 * be bundled into the client. For production these become serverless routes.
 */
import { readVerdicts, runOracle } from './oracle.mjs';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

export function oracleApiPlugin() {
  return {
    name: 'spitebet-oracle-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/oracle')) return next();

        try {
          const url = new URL(req.url, 'http://localhost');

          // All recorded verdicts, so the UI can badge resolved markets.
          if (url.pathname === '/api/oracle/verdicts' && req.method === 'GET') {
            return json(res, 200, readVerdicts());
          }

          // Judge a single market. `force` skips the deadline check for demos.
          if (url.pathname === '/api/oracle/resolve' && req.method === 'POST') {
            const body = await readBody(req);
            if (!body.duelId) return json(res, 400, { error: 'duelId required' });

            const verdict = await runOracle(body.duelId, {
              creatorJwt: body.creatorJwt,
              force: Boolean(body.force),
            });
            return json(res, 200, verdict);
          }

          return json(res, 404, { error: 'Unknown oracle route' });
        } catch (err) {
          return json(res, 500, { error: String(err?.message ?? err) });
        }
      });
    },
  };
}

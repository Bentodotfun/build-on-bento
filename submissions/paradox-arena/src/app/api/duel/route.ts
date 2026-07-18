import { Anakin } from '@anakin-io/sdk';
import { createBentoSdk, walletAuthProvider } from '@bento.fun/sdk';

export const dynamic = 'force-dynamic';

function extractJson(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
  return null;
}

export async function GET(req: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendLog = (
        message: string,
        type: 'info' | 'success' | 'warning' | 'error' | 'data' = 'info',
        data?: unknown
      ) => {
        const payload =
          JSON.stringify({ timestamp: new Date().toLocaleTimeString(), message, type, data }) + '\n';
        controller.enqueue(encoder.encode(payload));
      };

      try {
        sendLog('🤖 Mind vs Machine Arena AI Agent initializing...', 'info');
        await delay(300);

        const { searchParams } = new URL(req.url);
        let duelId = searchParams.get('duelId');
        const inviteCode = searchParams.get('inviteCode') || '';
        const redditUrl =
          searchParams.get('scrapeUrl') ||
          'https://www.reddit.com/r/worldcup/comments/1uxck5c/match_thread_england_vs_argentina_world_cup/?sort=confidence';
        const espnUrl = 'https://www.espn.in/football/commentary/_/gameId/760515';

        const bentoApiKey = process.env.BENTO_BUILDER_API_KEY;
        const anakinApiKey = process.env.ANAKIN_API_KEY;
        const aiJwt = searchParams.get('aiJwt') || process.env.AI_JWT;
        const openrouterApiKey = process.env.OPENROUTER_API_KEY;
        const bentoUrl = process.env.BENTO_URL || 'https://internal-server.bento.fun';
        const aiAddress = process.env.AI_ADDRESS || '0xaa784bb5e2949fbe189bdd7e6fad3ddf4bd08eb6';

        if (!bentoApiKey || !anakinApiKey || !aiJwt || !openrouterApiKey) {
          sendLog(
            '❌ Missing env vars: BENTO_BUILDER_API_KEY, ANAKIN_API_KEY, AI_JWT, OPENROUTER_API_KEY',
            'error'
          );
          controller.close();
          return;
        }

        // ── STEP 1: Scrape Reddit ──────────────────────────────────────────────
        sendLog(`📡 Initializing Anakin SDK for web intelligence gathering...`, 'info');
        await delay(200);
        const anakin = new Anakin({ apiKey: anakinApiKey });

        sendLog(`🔍 Scraping Reddit megathread: r/worldcup — England vs Argentina match thread`, 'info');
        let redditMarkdown = '';
        try {
          const doc = await anakin.scrape(redditUrl, { formats: ['markdown'] });
          redditMarkdown = doc.markdown || '';
          sendLog(
            `✅ Reddit scraped — ${redditMarkdown.length.toLocaleString()} chars ingested.`,
            'success'
          );
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          sendLog(`⚠️ Reddit scrape partial failure: ${msg}. Continuing with ESPN data.`, 'warning');
        }

        // ── STEP 2: Scrape ESPN Commentary ────────────────────────────────────
        sendLog(`📡 Scraping ESPN live commentary (gameId: 760515)...`, 'info');
        let espnMarkdown = '';
        try {
          const espnDoc = await anakin.scrape(espnUrl, { formats: ['markdown'] });
          espnMarkdown = espnDoc.markdown || '';
          sendLog(
            `✅ ESPN commentary loaded — ${espnMarkdown.length.toLocaleString()} chars.`,
            'success'
          );
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          sendLog(`⚠️ ESPN scrape failed: ${msg}. Proceeding with Reddit data only.`, 'warning');
        }

        // ── STEP 3: Combine & Truncate ────────────────────────────────────────
        const combinedContext = [
          redditMarkdown ? `## Reddit Fan Sentiment\n${redditMarkdown.slice(0, 2800)}` : '',
          espnMarkdown ? `## ESPN Match Commentary\n${espnMarkdown.slice(0, 1200)}` : '',
        ]
          .filter(Boolean)
          .join('\n\n');

        if (!combinedContext) {
          sendLog('⚠️ No data scraped. Defaulting to historical scenario baseline: 58.7%', 'warning');
        } else {
          sendLog(
            `🧠 Combined intelligence corpus: ${combinedContext.length.toLocaleString()} chars ready for analysis.`,
            'info'
          );
        }

        // ── STEP 4: LLM Analysis ──────────────────────────────────────────────
        sendLog(`🧠 Contacting LLM (llama-3.2-3b-instruct) for probability analysis...`, 'info');
        await delay(200);

        const prompt = `You are an AI sports analyst. Based on the following match data for England vs Argentina (FIFA World Cup 2026), extract key probability metrics. The question is: "Will Argentina win the match?"

Respond ONLY with a single JSON object:
{
  "probability": <number 0-100 representing Argentina's win probability>,
  "sentiment": "bullish" | "bearish" | "neutral",
  "panicIndex": <number 0-100>,
  "reasoning": "<one concise sentence>"
}

Match Data:
${combinedContext || 'No live data available — use historical Argentina vs England World Cup statistics. Argentina has historically won 3 and drawn 1 of their last 4 World Cup meetings.'}`;

        let probability = 58.7;
        let sentiment = 'neutral';
        let panicIndex = 42;
        let reasoning = 'Historical baseline — Argentina marginally favored based on World Cup record.';

        try {
          const llmRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${openrouterApiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://mind-vs-machine-arena.vercel.app',
              'X-Title': 'Mind vs Machine Arena',
            },
            body: JSON.stringify({
              model: 'google/gemma-4-26b-a4b-it:free',
              messages: [{ role: 'user', content: prompt }],
            }),
          });

          const llmData = await llmRes.json();
          const responseText = llmData?.choices?.[0]?.message?.content || '';
          const analysis = extractJson(responseText);

          if (analysis) {
            probability =
              typeof analysis.probability === 'number' ? analysis.probability : 58.7;
            sentiment = analysis.sentiment || 'neutral';
            panicIndex =
              typeof analysis.panicIndex === 'number' ? analysis.panicIndex : 42;
            reasoning = analysis.reasoning || reasoning;

            // ── KEY FIX: exact string the client parses ──
            sendLog(`📊 Extracted Probability: ${probability}%`, 'success');
            sendLog(`💬 Market Sentiment: ${sentiment.toUpperCase()} | Panic Index: ${panicIndex}%`, 'data', { analysis });
            sendLog(`🧠 Reasoning: "${reasoning}"`, 'info');
          } else {
            sendLog(`⚠️ LLM returned unparseable JSON. Defaulting to historical scenario baseline: ${probability}%`, 'warning');
          }
        } catch (llmErr: unknown) {
          const msg = llmErr instanceof Error ? llmErr.message : String(llmErr);
          sendLog(`⚠️ LLM call failed: ${msg}. Defaulting to historical scenario baseline: ${probability}%`, 'warning');
        }

        // ── STEP 5: Decision ──────────────────────────────────────────────────
        const decision = probability > 50 ? 'YES' : 'NO';
        const optionIndex = decision === 'YES' ? 0 : 1;
        await delay(400);
        sendLog(
          `💡 DECISION: Win probability ${probability.toFixed(1)}% → ${probability > 50 ? '>' : '<='} 50% threshold → the AI Agent will bet: ${decision}`,
          'success'
        );

        // ── STEP 6: Initialize Bento ──────────────────────────────────────────
        sendLog(`🏦 Initializing Bento SDK with AI Agent credentials...`, 'info');
        await delay(200);

        const sdk = createBentoSdk({
          baseUrl: bentoUrl,
          apiKey: bentoApiKey,
          auth: walletAuthProvider(() => ({ Authorization: `Bearer ${aiJwt}` })),
        });

        // ── STEP 7: Resolve duelId ────────────────────────────────────────────
        if (!duelId || duelId === 'placeholder' || duelId === 'undefined') {
          throw new Error('No duelId provided. Create a market first via /api/create-market.');
        }
        sendLog(`🎯 Using configured market (duelId: ${duelId.slice(0, 12)}…)`, 'info');

        // ── STEP 7b: Join the private market if inviteCode provided ───────────
        if (inviteCode) {
          sendLog(`🔑 Joining private market with invite code ${inviteCode}...`, 'info');
          await delay(300);
          try {
            await sdk.user.duelInvitations.userJoin({ inviteCode });
            sendLog(`✅ AI Agent joined private market successfully.`, 'success');
          } catch (joinErr: unknown) {
            const joinMsg = (joinErr as { sdkError?: { message?: string } })?.sdkError?.message
              || (joinErr instanceof Error ? joinErr.message : String(joinErr));
            // "already a member" is fine — continue
            if (!joinMsg.toLowerCase().includes('already')) {
              sendLog(`⚠️ Join warning: ${joinMsg} — attempting bet anyway.`, 'warning');
            } else {
              sendLog(`✅ AI Agent already a member of this market.`, 'success');
            }
          }
          await delay(200);
        }

        // ── STEP 8: Estimate Buy ──────────────────────────────────────────────
        const stake = '5000000000000000000'; // 5 credits (18 decimals — platform minimum)
        sendLog(
          `📈 Requesting buy quote: 5 credits on option ${optionIndex} (${decision})...`,
          'info'
        );
        await delay(300);

        const est = await sdk.user.bets.estimateBuy({
          duelId: duelId!,
          optionIndex,
          betAmountUsdc: stake,
          slippageBps: 100,
        });

        if (!est.success) {
          throw new Error('Bento estimateBuy rejected — market may be closed or insufficient credits.');
        }

        sendLog(
          `✅ Quote received: ${est.estimate.shares_out} shares out | quoteId: ${est.estimate.quote_id.slice(0, 8)}…`,
          'success'
        );

        // ── STEP 9: Place Bet ─────────────────────────────────────────────────
        sendLog(`⚡ Executing autonomous Bento transaction (5 credits on ${decision})...`, 'info');
        await delay(400);

        const idempotencyKey = crypto.randomUUID();
        await sdk.user.placeBet(
          {
            duelId: duelId!,
            duelType: 'PREDICTION',
            bet: decision,
            optionIndex,
            betAmount: stake,
            betAmountUsdc: stake,
            tokenDecimals: 18,
            sharesOut: est.estimate.shares_out,
            minSharesOut: est.estimate.min_shares_out,
            slippageBps: 100,
            quoteId: est.estimate.quote_id,
            quoteTimestamp: est.estimate.quote_timestamp,
          },
          { idempotencyKey }
        );

        sendLog(`🎉 On-chain transaction accepted! Bet ${decision} placed for AI Agent.`, 'success');

        // ── STEP 10: Fetch AI Shares ──────────────────────────────────────────
        // Use env var directly (Google OAuth JWTs have address in payload too)
        let address = aiAddress;
        if (!address) {
          try {
            const jwtPayload = JSON.parse(
              Buffer.from(aiJwt.split('.')[1], 'base64').toString('utf8')
            );
            address = jwtPayload.address || jwtPayload.eoaAddress || '';
          } catch {
            /* ignore */
          }
        }

        if (address) {
          await delay(600);
          sendLog(`🔍 Reconciling AI portfolio...`, 'info');
          const shares = (await sdk.user.bets.getUserShares({
            duelId: duelId!,
            address,
          })) as unknown;

          let sharesArr: unknown[] = [];
          if (Array.isArray(shares)) sharesArr = shares;
          else if (shares && typeof shares === 'object' && Array.isArray((shares as { balances?: unknown[] }).balances))
            sharesArr = (shares as { balances: unknown[] }).balances;

          const firstAmount =
            sharesArr.length > 0
              ? (sharesArr[0] as { amount?: string }).amount || '0'
              : '0';

          sendLog(
            `💼 AI portfolio confirmed: ${(parseFloat(firstAmount) / 1e18).toFixed(4)} shares on ${decision}`,
            'data',
            { shares }
          );
        }

        sendLog('🏁 AI Duel sequence complete. Waiting for human prediction...', 'success');
      } catch (err: unknown) {
        const sdkErr = (err as { sdkError?: { message?: string } })?.sdkError;
        const msg = sdkErr?.message || (err instanceof Error ? err.message : 'Unknown error');
        console.error('AI Duel Error:', err);
        sendLog(`❌ ${msg}`, 'error');
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

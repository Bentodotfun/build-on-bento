import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env'), override: true });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.OPENROUTER_MODEL || 'tencent/hy3:free';

/**
 * Call OpenRouter with a prompt and return the text response.
 * Uses a per-call timeout so a hanging provider doesn't block market creation.
 */
async function callOpenRouter(prompt) {
  console.log('[OpenRouter] Calling with model:', MODEL);
  console.log('[OpenRouter] API key present:', !!OPENROUTER_API_KEY);
  const response = await axios.post(
    OPENROUTER_URL,
    {
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 512,
    },
    {
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        ...(process.env.OPENROUTER_SITE_URL
          ? { 'HTTP-Referer': process.env.OPENROUTER_SITE_URL }
          : {}),
        ...(process.env.OPENROUTER_APP_NAME
          ? { 'X-Title': process.env.OPENROUTER_APP_NAME }
          : {}),
      },
      timeout: 15_000,
    }
  );

  console.log('[OpenRouter] Response received:', response.status);
  const text = response.data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('OpenRouter returned empty response');
  }
  return text.trim();
}

function isTransientError(error) {
  if (!error) return false;
  const message = (error.message || '').toLowerCase();
  const status = error.response?.status;
  return (
    status === 429 ||
    status === 503 ||
    status === 502 ||
    message.includes('high demand') ||
    message.includes('overloaded') ||
    message.includes('quota') ||
    message.includes('rate limit') ||
    message.includes('temporarily unavailable') ||
    message.includes('timeout') ||
    message.includes('econnrefused')
  );
}

async function generateWithRetry(prompt, maxRetries = 2) {
  if (!OPENROUTER_API_KEY) {
    throw new Error(
      'OPENROUTER_API_KEY is not set. Add it to backend/.env to enable AI features.'
    );
  }

  let lastError;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await callOpenRouter(prompt);
    } catch (error) {
      lastError = error;
      const message = error.message || '';

      if (isTransientError(error) && i < maxRetries) {
        const delay = 1500 * Math.pow(2, i) + Math.random() * 1000;
        console.log(
          `[AI] OpenRouter transient error, retrying in ${Math.round(delay)}ms (attempt ${i + 1}/${maxRetries}): ${message.split('\n')[0]}`
        );
        await new Promise((r) => setTimeout(r, delay));
      } else {
        console.error(`[AI] OpenRouter failed after ${i + 1} attempt(s):`, message.split('\n')[0]);
        throw error;
      }
    }
  }

  throw lastError || new Error('All AI retries exhausted');
}

/**
 * Extract the core claim/topic from a tweet — what is this tweet claiming?
 * Returns a short factual statement, e.g. "Apple is acquiring Perplexity AI".
 * No question, no time bound — just the raw claim for research.
 */
export async function extractClaim(tweetText) {
  const prompt = `Extract the core factual claim from this tweet. Return only the claim as a short, clear statement with no commentary, no questions, no time bounds.

Tweet: "${tweetText}"`;

  return await generateWithRetry(prompt);
}

/**
 * Convert tweet data into a structured market question using the PROMPT.md spec.
 * Returns { isValidClaim, rejectionReason, question, resolutionCriteria, resolvesBy }
 *
 * Input format:
 *   tweetText: "Apple is buying Perplexity."
 *   authorHandle: "@username"
 *   tweetTimestamp: "2026-07-18T10:30:00Z"
 *   defaultWindowDays: 30
 */
export async function buildQuestionFromTweet(tweetText, authorHandle, tweetTimestamp, defaultWindowDays = 30) {
  const resolvesByDate = new Date(Date.now() + defaultWindowDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const formattedTweetData = `Tweet text: "${tweetText}"
Author: @${authorHandle?.replace('@', '') || 'unknown'}
Posted: ${tweetTimestamp || new Date().toISOString()}
Default resolution window if no timeframe is implied: ${defaultWindowDays} days from now (${resolvesByDate})`;

  const prompt = `You are a prediction market question generator. Your job is to ALWAYS convert a tweet into a single, precise, binary (yes/no) market question. Never reject a tweet — instead, convert even subjective claims into measurable, resolvable outcomes.

Rules for good questions:
- Phrased as a direct yes/no question
- Time-bound: include an explicit resolution deadline (use the provided default window if the tweet gives no timeframe)
- Uses named entities exactly as the tweet does
- Measurable and resolvable using public information
- Neutrally phrased — does not hint at what outcome is likely

How to handle subjective claims:
- "great weekend" → convert to measurable outcome: "Will Oscar Piastri finish in the top 5 at the Belgian GP?"
- "mid launch" → "Will the product reach 1M users in the first month?"
- "best season ever" → "Will they win more than X games this season?"
- Opinions about future events → extract the underlying claim and make it checkable

Output ONLY valid JSON, no prose, no markdown fences, matching this exact shape:

{
  "isValidClaim": boolean,
  "rejectionReason": string | null,
  "question": string | null,
  "resolutionCriteria": string | null,
  "resolvesBy": string | null
}

isValidClaim should ALMOST ALWAYS be true. Only reject if the tweet is pure spam, gibberish, or completely unintelligible. All other tweets should be converted to questions.

${formattedTweetData}`;

  const text = await generateWithRetry(prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      isValidClaim: parsed.isValidClaim || false,
      rejectionReason: parsed.rejectionReason || null,
      question: parsed.question || null,
      resolutionCriteria: parsed.resolutionCriteria || null,
      resolvesBy: parsed.resolvesBy || resolvesByDate
    };
  }

  return {
    isValidClaim: false,
    rejectionReason: 'Failed to parse AI response',
    question: null,
    resolutionCriteria: null,
    resolvesBy: null
  };
}

export async function generateHookLine(claim, snippets) {
  const context = Array.isArray(snippets) ? snippets.join('\n\n') : snippets;

  // If research context is empty or just a placeholder, generate hook from claim alone
  if (!context || context.includes('Research context missing') || context.includes('cannot be verified')) {
    const prompt = `Create a punchy 12-word-max hook line for this betting claim. Be direct, no preamble.

Claim: "${claim}"`;

    try {
      return await generateWithRetry(prompt);
    } catch (error) {
      console.warn('[AI] Hook line generation failed, using fallback:', error.message);
      return `${claim.substring(0, 50)}${claim.length > 50 ? '…' : ''}`;
    }
  }

  const prompt = `Create a 12-word-max hook line summarizing the current state of this claim based on the research. Be punchy and factual, no preamble.

Claim: "${claim}"

Research context:
${context}`;

  try {
    return await generateWithRetry(prompt);
  } catch (error) {
    console.warn('[AI] Hook line generation failed, using claim as fallback:', error.message);
    return claim.substring(0, 60) + (claim.length > 60 ? '…' : '');
  }
}

export async function assessResolution(claim, latestSnippets) {
  const context = Array.isArray(latestSnippets) ? latestSnippets.join('\n\n') : latestSnippets;

  const prompt = `Based on the evidence, assess whether this claim is true, false, or unclear. Respond in JSON format only.

Claim: "${claim}"

Evidence:
${context}

Respond with JSON only:
{
  "verdict": "true" | "false" | "unclear",
  "confidence": 0-100,
  "reasoning": "brief explanation"
}`;

  const text = await generateWithRetry(prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  return {
    verdict: 'unclear',
    confidence: 0,
    reasoning: 'Could not parse AI assessment',
  };
}

/**
 * Predict whether a claim will resolve as YES or NO based on research.
 * Returns { prediction, confidence, analysis }
 */
export async function predictOutcome(question, resolutionCriteria, researchSummary) {
  const prompt = `Based on the following research, predict whether this claim will resolve as YES or NO.

**Claim:** ${question}

**Resolution Criteria:** ${resolutionCriteria}

**Research Summary:**
${researchSummary}

**Task:**
1. Analyze the research carefully
2. Predict: will this resolve YES or NO?
3. Provide your reasoning
4. Rate your confidence (0-100%)

Output ONLY valid JSON:
{
  "prediction": "YES" or "NO",
  "confidence": number (0-100),
  "analysis": "short analysis of why you predict this way"
}`;

  const text = await generateWithRetry(prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  return {
    prediction: 'YES',
    confidence: 50,
    analysis: text,
  };
}

/**
 * Best-effort diagnostic for a Bento on-chain pre-flight failure. Used to
 * enrich the error returned to the user when every category / collateral
 * combination has been exhausted.
 */
export async function diagnosePreflightFailure({ question, description, errorMessage }) {
  const prompt = `A prediction-market creation request failed on-chain (pre-flight simulation) for every category / collateral mode combination tried. Suggest the most likely cause in 1-2 short sentences. Then suggest a concrete next step for the user.

Question: "${question || '(empty)'}"
Description: "${description || '(empty)'}"
Raw error: "${errorMessage || '(no message)'}"

Respond in plain text, no JSON, no preamble.`;

  try {
    return await generateWithRetry(prompt);
  } catch {
    return '';
  }
}

import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env'), override: true });

const anakinClient = axios.create({
  baseURL: 'https://api.anakin.io/v1',
  headers: {
    'X-API-Key': process.env.ANAKIN_API_KEY,
    'Content-Type': 'application/json',
  },
});

async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const status = error.response?.status;
      if (status === 429 || status >= 500) {
        const delay = Math.min(1000 * Math.pow(2, i) + Math.random() * 1000, 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  return await fn();
}

/**
 * Synchronous AI-powered web search with citations.
 * POST /v1/search
 */
export async function searchClaim(claimText) {
  return await retryWithBackoff(async () => {
    const response = await anakinClient.post('/search', {
      prompt: claimText,
    });

    const data = response.data;
    const summary = data.summary || data.result || '';
    const sourceUrls = (data.results || data.sources || [])
      .map((r) => (typeof r === 'string' ? r : r.url))
      .filter(Boolean);

    return { summary, sourceUrls };
  });
}

/**
 * Asynchronous multi-stage research job.
 * POST  /v1/agentic-search → { job_id }
 * GET   /v1/agentic-search/{id} → { status, generatedJson: { summary, structured_data, data_schema } }
 */
export async function deepResearchClaim(claimText) {
  return await retryWithBackoff(async () => {
    const submitResponse = await anakinClient.post('/agentic-search', {
      prompt: `Research this claim thoroughly and provide supporting or contradicting evidence: "${claimText}"`,
    });

    const jobId = submitResponse.data.job_id;
    if (!jobId) {
      throw new Error('No job_id returned from agentic search submission');
    }

    for (let i = 0; i < 60; i++) {
      await new Promise((resolve) => setTimeout(resolve, 10000));

      const statusResponse = await anakinClient.get(`/agentic-search/${jobId}`);
      const data = statusResponse.data;
      const status = data.status;

      if (status === 'completed') {
        const result = data.generatedJson || data.result || {};
        return {
          summary: result.summary || result.report || '',
          structuredData: result.structured_data || result,
        };
      } else if (status === 'failed') {
        throw new Error('Agentic search job failed');
      }
    }

    throw new Error('Agentic search timed out after ~10 minutes');
  });
}

/**
 * Generate AI analysis for a market prediction using OpenRouter with Anakin research
 */
export async function generateMarketAnalysis(question, resolutionCriteria, searchSummary, sourceUrls) {
  try {
    const { default: ai } = await import('./ai.js');

    const analysisPrompt = `You are an expert investment analyst. Analyze this prediction market and provide actionable investment insights.

**Market Claim:** ${question}

**Resolution Criteria:** ${resolutionCriteria}

**Research Summary:**
${searchSummary}

**Sources:** ${sourceUrls.join(', ')}

Provide a concise analysis (2-3 paragraphs) that includes:
1. Key supporting and contradicting factors
2. Risk assessment (low/medium/high)
3. Investment recommendation (YES/NO/NEUTRAL with confidence 0-100%)
4. Key timeframes to monitor

Format as:
ANALYSIS: [your analysis]
CONFIDENCE: [0-100]
RISK_LEVEL: [low/medium/high]`;

    const response = await ai.callOpenRouter(analysisPrompt);

    // Parse the response
    const confidenceMatch = response.match(/CONFIDENCE:\s*(\d+)/);
    const riskMatch = response.match(/RISK_LEVEL:\s*(low|medium|high)/i);
    const analysisMatch = response.match(/ANALYSIS:\s*([\s\S]+?)(?=CONFIDENCE:|$)/);

    return {
      analysis: (analysisMatch?.[1] || response).trim(),
      confidence: parseInt(confidenceMatch?.[1] || '50'),
      riskLevel: riskMatch?.[1]?.toLowerCase() || 'medium',
    };
  } catch (error) {
    console.warn('[anakin] Failed to generate market analysis:', error?.message);
    return null;
  }
}

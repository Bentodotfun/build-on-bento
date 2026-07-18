import "dotenv/config";
import axios from "axios";

/**
 * Anakin search client. Confirmed live shape (docs/ANAKIN_INTEGRATION.md
 * had this wrong originally — field is `prompt`, not `query`):
 *
 *   POST https://api.anakin.io/v1/search
 *   headers: { "X-API-Key": ... }
 *   body: { prompt: string }
 *   -> { id, results: [{ title, snippet, url, date?, last_updated? }] }
 *
 * Measured latency: ~1.1-1.4s per call (3-sample average 1180ms) — cheap
 * enough to call once per due market in the resolver loop, no batching or
 * caching needed at this scale.
 */

const ANAKIN_API_KEY = process.env.ANAKIN_API_KEY!;

export type AnakinResult = {
  title: string;
  snippet: string;
  url: string;
  date?: string;
  last_updated?: string;
};

export async function anakinSearch(prompt: string): Promise<AnakinResult[]> {
  if (!ANAKIN_API_KEY) throw new Error("Missing ANAKIN_API_KEY");
  const res = await axios.post(
    "https://api.anakin.io/v1/search",
    { prompt },
    { headers: { "X-API-Key": ANAKIN_API_KEY, "content-type": "application/json" }, timeout: 20_000 },
  );
  return res.data?.results ?? [];
}

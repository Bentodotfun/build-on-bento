export type PoolStatus = "open" | "resolved_true" | "resolved_false";

export interface PoolSummary {
  id: string;
  claim: string;
  status: PoolStatus;
  oddsTrue: number; // 0..1
  oddsFalse: number; // 0..1
  hookLine: string;
  sentiment: "leaning_true" | "leaning_false" | "too_early";
  confidence: number; // 0..1
  sourceTweetUrl: string;
  sourceAuthor: string;
  createdAt: string;
  volume: number;
  bentoMarketId?: string;
}

export interface PoolDetail extends PoolSummary {
  tweetText: string;
  context: {
    title: string;
    body: string;
    sourceUrl?: string;
    sourceName?: string;
  }[];
  bentoMarketId?: string;
  participants?: number;
  yesVotes?: number;
  noVotes?: number;
  totalVolume?: number;
}

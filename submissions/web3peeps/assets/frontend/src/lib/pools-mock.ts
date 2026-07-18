import type { PoolDetail, PoolSummary } from "./pools-types";

const base: PoolDetail[] = [
  {
    id: "p_001",
    claim: "SpaceX will land Starship on the Moon before the end of 2026.",
    status: "open",
    oddsTrue: 0.34,
    oddsFalse: 0.66,
    hookLine: "Timeline slipping — NASA docs suggest 2027 is more realistic.",
    sentiment: "leaning_false",
    confidence: 0.71,
    sourceTweetUrl: "https://x.com/SpaceX/status/1800000000000000001",
    sourceAuthor: "@SpaceX",
    createdAt: new Date(Date.now() - 1000 * 60 * 34).toISOString(),
    volume: 12480,
    bentoMarketId: "duel_001",
    tweetText:
      "Starship is on track for a crewed lunar landing before the end of 2026.",
    context: [
      {
        title: "NASA Artemis III baseline",
        body: "Latest NASA OIG report projects Artemis III no earlier than late 2027, citing Starship HLS and suit readiness delays.",
        sourceUrl: "https://oig.nasa.gov",
        sourceName: "NASA OIG",
      },
      {
        title: "Orbital refueling milestone",
        body: "Starship has not yet demonstrated ship-to-ship cryogenic propellant transfer, a prerequisite for lunar missions.",
      },
    ],
  },
  {
    id: "p_002",
    claim: "Apple will ship an AR headset under $1,500 in 2026.",
    status: "open",
    oddsTrue: 0.58,
    oddsFalse: 0.42,
    hookLine: "Supply chain leaks point to a cheaper Vision model this fall.",
    sentiment: "leaning_true",
    confidence: 0.62,
    sourceTweetUrl: "https://x.com/markgurman/status/1800000000000000002",
    sourceAuthor: "@markgurman",
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    volume: 9820,
    bentoMarketId: "duel_002",
    tweetText:
      "Apple's cheaper Vision headset is in EVT, targeting a sub-$1,500 price for 2026.",
    context: [
      {
        title: "Bloomberg supply-chain report",
        body: "Reports of a lighter, tethered Vision variant in engineering validation with reduced display cost.",
        sourceName: "Bloomberg",
      },
    ],
  },
  {
    id: "p_003",
    claim: "The Fed will cut rates at least twice before end of Q3.",
    status: "open",
    oddsTrue: 0.71,
    oddsFalse: 0.29,
    hookLine: "CPI cooling faster than expected — market pricing agrees.",
    sentiment: "leaning_true",
    confidence: 0.78,
    sourceTweetUrl: "https://x.com/federalreserve/status/1800000000000000003",
    sourceAuthor: "@federalreserve",
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    volume: 45120,
    bentoMarketId: "duel_003",
    tweetText:
      "Two rate cuts before Q3 is now the base case per SOFR futures.",
    context: [
      {
        title: "SOFR futures pricing",
        body: "Implied probability of ≥2 cuts before Q3 sits at ~68% per current SOFR curve.",
      },
    ],
  },
  {
    id: "p_004",
    claim: "GPT-6 will be released in 2026.",
    status: "open",
    oddsTrue: 0.41,
    oddsFalse: 0.59,
    hookLine: "OpenAI comms emphasize iteration, not a numbered release.",
    sentiment: "too_early",
    confidence: 0.42,
    sourceTweetUrl: "https://x.com/sama/status/1800000000000000004",
    sourceAuthor: "@sama",
    createdAt: new Date(Date.now() - 1000 * 60 * 210).toISOString(),
    volume: 22200,
    bentoMarketId: "duel_004",
    tweetText: "Big things coming this year — you'll be surprised.",
    context: [
      {
        title: "OpenAI product cadence",
        body: "Recent releases have followed a suffix-based naming pattern (4o, 4.1, 5) rather than clean major versions.",
      },
    ],
  },
  {
    id: "p_005",
    claim: "Bitcoin closes above $150k on Dec 31.",
    status: "open",
    oddsTrue: 0.48,
    oddsFalse: 0.52,
    hookLine: "ETF inflows strong but macro headwinds persist.",
    sentiment: "too_early",
    confidence: 0.5,
    sourceTweetUrl: "https://x.com/saylor/status/1800000000000000005",
    sourceAuthor: "@saylor",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    volume: 88400,
    tweetText: "$150k by year end is inevitable.",
    context: [
      {
        title: "Spot ETF flows",
        body: "Cumulative net inflows into US spot BTC ETFs cross $58B YTD.",
      },
    ],
  },
  {
    id: "p_006",
    claim: "Tesla will deliver a working Robotaxi ride in Austin this quarter.",
    status: "resolved_true",
    oddsTrue: 1,
    oddsFalse: 0,
    hookLine: "Confirmed — first paid rides logged last week.",
    sentiment: "leaning_true",
    confidence: 0.95,
    sourceTweetUrl: "https://x.com/elonmusk/status/1800000000000000006",
    sourceAuthor: "@elonmusk",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    volume: 61230,
    tweetText: "Robotaxi rides begin in Austin this quarter.",
    context: [
      {
        title: "Verified deployment",
        body: "Public riders logged trips via the Tesla app in Austin, June 22.",
      },
    ],
  },
  {
    id: "p_007",
    claim: "Threads will pass 500M monthly active users by summer.",
    status: "resolved_false",
    oddsTrue: 0.22,
    oddsFalse: 0.78,
    hookLine: "Missed target — Meta reported 320M in latest earnings.",
    sentiment: "leaning_false",
    confidence: 0.9,
    sourceTweetUrl: "https://x.com/zuck/status/1800000000000000007",
    sourceAuthor: "@zuck",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    volume: 14020,
    tweetText: "Threads is on pace for 500M MAU by summer.",
    context: [
      {
        title: "Meta Q2 earnings",
        body: "Meta reported Threads MAU at 320M, well below the 500M target.",
      },
    ],
  },
  {
    id: "p_008",
    claim: "England will win Euro 2028.",
    status: "open",
    oddsTrue: 0.19,
    oddsFalse: 0.81,
    hookLine: "Bookmakers rank them 4th — not the favorite.",
    sentiment: "leaning_false",
    confidence: 0.68,
    sourceTweetUrl: "https://x.com/England/status/1800000000000000008",
    sourceAuthor: "@England",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    volume: 5430,
    tweetText: "Bring it home in 2028.",
    context: [
      {
        title: "Consensus odds",
        body: "Average bookmaker implied probability for England: ~19%.",
      },
    ],
  },
];

export function getMockPools(status?: string): PoolSummary[] {
  const list = base.map(({ tweetText: _t, context: _c, ...rest }) => rest);
  if (!status || status === "all") return list;
  if (status === "open") return list.filter((p) => p.status === "open");
  if (status === "resolved")
    return list.filter((p) => p.status !== "open");
  return list;
}

export function getMockPool(id: string): PoolDetail | null {
  return base.find((p) => p.id === id) ?? null;
}

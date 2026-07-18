// Client-safe shapes returned by our API routes.

export type Side = "home" | "draw" | "away" | "btts";

export type MarketOdds = {
  home: number | null; // 0..100 %
  draw: number | null;
  away: number | null;
  btts: number | null;
  volume: number;
};

export type FixtureDTO = {
  id: string;
  competition: string;
  kickoff: number;
  home: { name: string; iso: string | null };
  away: { name: string; iso: string | null };
  odds: MarketOdds;
  ticker: string;
};

export type SmartBuy = {
  name: string;
  amount: number;
  marketTitle: string;
  outcome: string;
  winRate: number;
  alphaScore: number;
};

export type Buyable = {
  side: Side;
  label: string;
  conditionId?: string;
  tokenId?: string;
  price: number | null; // 0..1 implied
  outcome: "YES" | "NO";
  // Bento betting — duelId comes from FixtureDTO.id (== DeckCard.fixtureId).
  // Optional so BuySheet can default both rather than requiring every
  // producer in src/lib/bento.ts to set them explicitly.
  optionIndex?: 0 | 1;
  collateralMode?: "usdc" | "credits";
};

// --- degen shuffle deck ---

export type CardType = "winner" | "draw" | "btts" | "prop";

export type CardSubject = {
  kind: "team" | "player" | "match";
  name: string; // team or player name
  iso: string | null; // flag iso when it's a team
  team: string | null; // owning team (for players), for gradient color
};

export type DeckCard = {
  key: string; // unique per card
  fixtureId: string;
  competition: string;
  kickoff: number;
  home: { name: string; iso: string | null };
  away: { name: string; iso: string | null };
  type: CardType;
  question: string; // "Will Haaland score?" / "Norway to win?"
  yes: number | null; // market YES %, 0..100
  subject: CardSubject;
  conditionId?: string;
  tokenId?: string; // YES outcome token
  noTokenId?: string; // NO outcome token
  volume?: number; // event $ volume — social proof
  edit: string | null; // /edits/<slug>.jpg if present
  collateralMode?: "usdc" | "credits"; // only set by Bento-sourced cards, see Buyable
};

export type MatchInsight = {
  id: string;
  home: { name: string; iso: string | null };
  away: { name: string; iso: string | null };
  odds: MarketOdds;
  favorite: Side;
  smartPick: { side: Side; team: string; confidenceUsd: number } | null;
  smartCount: number;
  smartMoney: SmartBuy[];
  track: { pct: number; correct: number; resolved: number; roi: number; profit: number };
  buyables: Buyable[];
};

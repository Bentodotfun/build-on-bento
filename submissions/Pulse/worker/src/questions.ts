/**
 * Templated micro-prop questions for a live match window. Kept deliberately
 * generic (no real player-tracking wired up yet) — swap `playerNames` for
 * the actual starting XI once a live match is selected, and the sentences
 * read naturally either way.
 */

export type PropTemplate = {
  id: string;
  question: (ctx: MatchContext) => string;
  category: string;
};

export type MatchContext = {
  home: string;
  away: string;
  /** Optional — if provided, player-specific props are included. */
  playerNames?: string[];
};

export const TEMPLATES: PropTemplate[] = [
  {
    id: "next-goal",
    category: "Football",
    question: (c) => `Will there be a goal in the next 5 minutes? (${c.home} vs ${c.away})`,
  },
  {
    id: "next-corner",
    category: "Football",
    question: (c) => `Will there be a corner in the next 5 minutes? (${c.home} vs ${c.away})`,
  },
  {
    id: "next-card",
    category: "Football",
    question: (c) => `Will a card be shown in the next 5 minutes? (${c.home} vs ${c.away})`,
  },
  {
    id: "next-foul",
    category: "Football",
    question: (c) => `Will there be a foul given in the next 5 minutes? (${c.home} vs ${c.away})`,
  },
  {
    id: "next-freekick",
    category: "Football",
    question: (c) => `Will there be a free kick in a dangerous area in the next 5 minutes? (${c.home} vs ${c.away})`,
  },
  {
    id: "next-penalty",
    category: "Football",
    question: (c) => `Will a penalty be given in the next 5 minutes? (${c.home} vs ${c.away})`,
  },
  {
    id: "next-yellow-card",
    category: "Football",
    question: (c) => `Will a yellow card be shown in the next 5 minutes? (${c.home} vs ${c.away})`,
  },
  {
    id: "next-red-card",
    category: "Football",
    question: (c) => `Will a red card be shown in the next 5 minutes? (${c.home} vs ${c.away})`,
  },
  {
    id: "next-substitution",
    category: "Football",
    question: (c) => `Will a substitution be made in the next 5 minutes? (${c.home} vs ${c.away})`,
  },
  {
    id: "player-goal",
    category: "Football",
    question: (c) => `Will ${pick(c.playerNames)} score in the next 5 minutes?`,
  },
  {
    id: "player-shot",
    category: "Football",
    question: (c) => `Will ${pick(c.playerNames)} have a shot on target in the next 5 minutes?`,
  },
];

function pick<T>(arr: T[] | undefined): T | "the star player" {
  if (!arr || !arr.length) return "the star player";
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Pick N templates for one generator tick, skipping player props if no roster is known. */
export function pickBatch(ctx: MatchContext, n: number): PropTemplate[] {
  const pool = ctx.playerNames?.length ? TEMPLATES : TEMPLATES.filter((t) => !t.id.startsWith("player-"));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

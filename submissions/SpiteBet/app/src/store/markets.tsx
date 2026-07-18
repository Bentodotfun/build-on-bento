import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { MARKETS, type Market } from '../data/markets';
import {
  claimFaucet,
  createTrap,
  fetchAccount,
  fetchPositions,
  fetchSpiteMarkets,
  getAddressFromToken,
  fetchVotes,
  getActiveAccountName,
  getStoredToken,
  isConfigured,
  placeSpiteBet,
  setActiveAccountName,
  FAUCET_CREDITS,
  type Account,
  type Position,
  type VoteBreakdown,
} from '../lib/bento';
import { loadAccounts, type DemoAccount } from '../data/accounts';
import { fetchVerdicts, resolveMarket, type Verdict } from '../lib/oracle';

export type Vote = 'hate' | 'believe';

export type Bet = {
  id: string;
  marketId: string;
  vote: Vote;
  amount: number;
  placedAt: number;
  /** false while the on-chain write is still in flight or if it failed. */
  onChain: boolean;
};

export type NewMarketInput = {
  goal: string;
  handle: string;
  hoursFromNow: number;
  category: string;
  verifiedVia: string;
  oracleHandle?: string;
  target?: number;
};

/** Where the deck's data is coming from, surfaced in the UI so nothing is faked. */
export type Source = 'loading' | 'bento' | 'local';

type MarketsValue = {
  markets: Market[];
  bets: Bet[];
  /** Real Bento positions — the authoritative record of what you've staked. */
  positions: Position[];
  account: Account | null;
  balance: number;
  source: Source;
  error: string | null;
  busy: boolean;
  addMarket: (input: NewMarketInput) => Promise<Market>;
  placeBet: (marketId: string, vote: Vote, amount: number) => void;
  undoLastBet: () => void;
  marketById: (id: string) => Market | undefined;
  refresh: () => Promise<void>;
  /** Real per-market voter headcounts, keyed by duelId. */
  votes: Record<string, VoteBreakdown>;
  /** True on first load and while switching accounts. */
  loading: boolean;
  /** Oracle verdicts keyed by duelId — present once a market is settled. */
  verdicts: Record<string, Verdict>;
  refreshVerdicts: () => Promise<void>;
  /** Real Bento testnet accounts available to swipe as. */
  accounts: DemoAccount[];
  activeAccount: DemoAccount | null;
  switchAccount: (name: string) => void;
};

const MarketsContext = createContext<MarketsValue | null>(null);

export function MarketsProvider({ children }: { children: ReactNode }) {
  const [markets, setMarkets] = useState<Market[]>(MARKETS);
  const [bets, setBets] = useState<Bet[]>([]);
  const [source, setSource] = useState<Source>('loading');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [votes, setVotes] = useState<Record<string, VoteBreakdown>>({});
  const [loading, setLoading] = useState(true);
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  /** Markets we've already asked the oracle about this session. */
  const triggered = useRef<Set<string>>(new Set());

  const accounts = useMemo(() => loadAccounts(), []);
  const [activeName, setActiveName] = useState<string | null>(
    () => getActiveAccountName() ?? accounts[0]?.name ?? null,
  );
  const activeAccount = accounts.find((a) => a.name === activeName) ?? accounts[0] ?? null;

  const live = source === 'bento';

  /** Pull balance + positions straight from Bento. Returns the account it saw. */
  const refreshAccount = useCallback(async (): Promise<Account | null> => {
    const token = getStoredToken();
    const address = token ? getAddressFromToken(token) : null;
    if (!address) return null;

    try {
      const [acct, pos] = await Promise.all([fetchAccount(address), fetchPositions(address)]);
      setAccount(acct);
      setPositions(pos);
      return acct;
    } catch {
      // Non-fatal: the deck still works without portfolio numbers.
      return null;
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!isConfigured() || !getStoredToken()) {
      setSource('local');
      setError('No Bento key or session — showing sample traps.');
      return;
    }
    try {
      const fetched = await fetchSpiteMarkets();
      if (fetched.length === 0) {
        // Live, but nobody has created a trap yet. Seed the deck so it isn't empty.
        setMarkets(MARKETS);
        setSource('local');
        setError('Connected to Bento, but no SpiteBet traps exist yet. Create one!');
        return;
      }
      setMarkets(fetched);
      setSource('bento');
      setError(null);

      // Real voter headcounts per market, fetched alongside the catalog.
      // Bento only returns auth0 handles (e.g. "term101112"), so relabel our
      // own accounts by address; strangers keep their handle.
      const knownNames = new Map(
        loadAccounts().map((a) => [a.address.toLowerCase(), a.name] as const),
      );
      const relabel = (v: VoteBreakdown): VoteBreakdown => ({
        haters: v.haters.map((x) => ({
          ...x,
          username: knownNames.get(x.address.toLowerCase()) ?? x.username,
        })),
        believers: v.believers.map((x) => ({
          ...x,
          username: knownNames.get(x.address.toLowerCase()) ?? x.username,
        })),
      });

      const entries = await Promise.all(
        fetched.map(async (m) => [m.id, relabel(await fetchVotes(m.id))] as const),
      );
      setVotes(Object.fromEntries(entries));
    } catch (err) {
      setMarkets(MARKETS);
      setSource('local');
      setError(err instanceof Error ? err.message : 'Could not reach Bento.');
    }
  }, []);

  // Re-runs whenever you switch account, so balance/positions follow the user.
  useEffect(() => {
    setAccount(null);
    setPositions([]);
    setBets([]);
    setLoading(true);

    void claimFaucet().catch(() => {});
    void Promise.all([refresh(), refreshAccount()]).finally(() => setLoading(false));
  }, [refresh, refreshAccount, activeName]);

  // Poll the catalog so traps created by other people show up in the deck
  // without anyone refreshing the page.
  useEffect(() => {
    const id = setInterval(() => {
      void refresh();
    }, 20_000);
    return () => clearInterval(id);
  }, [refresh]);

  const refreshVerdicts = useCallback(async () => {
    setVerdicts(await fetchVerdicts());
  }, []);

  useEffect(() => {
    void refreshVerdicts();
  }, [refreshVerdicts]);

  // Fire the oracle the moment a trap's deadline passes, once per market.
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      for (const m of markets) {
        if (!m.endTime || m.endTime * 1000 > now) continue;
        if (verdicts[m.id] || triggered.current.has(m.id)) continue;

        triggered.current.add(m.id);
        void resolveMarket(m.id, { creatorJwt: activeAccount?.jwt })
          .then(() => refreshVerdicts())
          .catch(() => {
            // Leave it marked so we don't hammer a failing market every tick.
          });
      }
    }, 15_000);
    return () => clearInterval(id);
  }, [markets, verdicts, activeAccount, refreshVerdicts]);

  const switchAccount = useCallback((name: string) => {
    setActiveAccountName(name);
    setActiveName(name);
  }, []);

  // Real balance from Bento when we have it; optimistic local maths until then
  // so the number still moves the instant you swipe.
  const balance = useMemo(() => {
    const pendingLocal = bets.filter((b) => !b.onChain).reduce((sum, b) => sum + b.amount, 0);
    if (account) return Math.max(0, account.balance - pendingLocal);
    return FAUCET_CREDITS - bets.reduce((sum, b) => sum + b.amount, 0);
  }, [account, bets]);

  const addMarket = useCallback(
    async (input: NewMarketInput) => {
      setBusy(true);
      setError(null);
      try {
        if (isConfigured() && getStoredToken()) {
          const duelId = await createTrap(input);
          // Creation is accepted before it is visible; poll briefly then refresh.
          await new Promise((r) => setTimeout(r, 2500));
          await refresh();
          const found = markets.find((m) => m.id === duelId);
          if (found) return found;
        }

        // Local fallback so the demo keeps working if the chain write fails.
        const market: Market = {
          id: `local_${Date.now()}`,
          handle: input.handle.startsWith('@') ? input.handle : `@${input.handle}`,
          avatarSeed: input.handle.replace(/[^a-zA-Z0-9]/g, '') || 'anon',
          goal: input.goal,
          deadline: `${String(input.hoursFromNow).padStart(2, '0')}:00:00`,
          streak: 0,
          friendsBetting: 0,
          poolHate: 0,
          poolBelieve: 0,
          category: input.category,
          verifiedVia: input.verifiedVia,
        };
        setMarkets((prev) => [market, ...prev]);
        return market;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not create the trap on Bento.');
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [markets, refresh],
  );

  const placeBet = useCallback(
    (marketId: string, vote: Vote, amount: number) => {
      const betId = `bet_${Date.now()}`;

      // Optimistic: the swipe must feel instant, the chain catches up after.
      setBets((prev) => [
        ...prev,
        { id: betId, marketId, vote, amount, placedAt: Date.now(), onChain: false },
      ]);
      setMarkets((prev) =>
        prev.map((m) =>
          m.id === marketId
            ? {
                ...m,
                friendsBetting: m.friendsBetting + 1,
                poolHate: vote === 'hate' ? m.poolHate + amount : m.poolHate,
                poolBelieve: vote === 'believe' ? m.poolBelieve + amount : m.poolBelieve,
              }
            : m,
        ),
      );

      if (!live) return;

      const before = account?.positionValue ?? 0;

      void placeSpiteBet(marketId, vote, amount)
        .then(async () => {
          // Bento accepts the bet before its portfolio reflects it. Keep the
          // optimistic deduction until positionValue actually moves, otherwise
          // the balance visibly snaps back to its old value.
          for (let i = 0; i < 6; i++) {
            const acct = await refreshAccount();
            if (acct && acct.positionValue > before) break;
            await new Promise((r) => setTimeout(r, 2500));
          }
          setBets((prev) => prev.map((b) => (b.id === betId ? { ...b, onChain: true } : b)));
          await refresh();
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Bet failed on Bento.');
        });
    },
    [live, refreshAccount, refresh, account],
  );

  const undoLastBet = useCallback(() => {
    setBets((prev) => {
      const last = prev.at(-1);
      if (!last) return prev;

      setMarkets((ms) =>
        ms.map((m) =>
          m.id === last.marketId
            ? {
                ...m,
                friendsBetting: Math.max(0, m.friendsBetting - 1),
                poolHate: last.vote === 'hate' ? m.poolHate - last.amount : m.poolHate,
                poolBelieve:
                  last.vote === 'believe' ? m.poolBelieve - last.amount : m.poolBelieve,
              }
            : m,
        ),
      );

      return prev.slice(0, -1);
    });
  }, []);

  const marketById = useCallback((id: string) => markets.find((m) => m.id === id), [markets]);

  const value = useMemo(
    () => ({
      markets,
      bets,
      positions,
      account,
      balance,
      source,
      error,
      busy,
      addMarket,
      placeBet,
      undoLastBet,
      marketById,
      refresh,
      votes,
      loading,
      verdicts,
      refreshVerdicts,
      accounts,
      activeAccount,
      switchAccount,
    }),
    [
      votes,
      loading,
      verdicts,
      refreshVerdicts,
      markets,
      bets,
      positions,
      account,
      balance,
      source,
      error,
      busy,
      addMarket,
      placeBet,
      undoLastBet,
      marketById,
      refresh,
      accounts,
      activeAccount,
      switchAccount,
    ],
  );

  return <MarketsContext.Provider value={value}>{children}</MarketsContext.Provider>;
}

export function useMarkets() {
  const ctx = useContext(MarketsContext);
  if (!ctx) throw new Error('useMarkets must be used inside <MarketsProvider>');
  return ctx;
}

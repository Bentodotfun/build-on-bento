import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ThumbsDown, Flame, Check, Receipt } from 'lucide-react';
import { useMarkets, type Vote } from '../store/markets';
import { SwipeCard } from './SwipeCard';
import { Spinner } from './Spinner';

/** Bento's minimum bet is 5 collateral units; keep the ladder above that. */
const STAKES = [5, 10, 25];

export function SwipeDeck({ onSeeBets }: { onSeeBets?: () => void }) {
  const { markets, positions, bets, balance, placeBet, votes, loading } = useMarkets();
  const [exitDir, setExitDir] = useState<Vote | null>(null);
  const [stake, setStake] = useState(10);

  // A bet is a real on-chain position — you only get one per market. Anything
  // already backed (settled or still settling) drops out of the deck for good.
  const alreadyBet = useMemo(
    () => new Set<string>([...positions.map((p) => p.duelId), ...bets.map((b) => b.marketId)]),
    [positions, bets],
  );

  const available = useMemo(
    () => markets.filter((m) => !alreadyBet.has(m.id)),
    [markets, alreadyBet],
  );

  const visible = available.slice(0, 3);
  const done = available.length === 0;
  const brokeFor = stake > balance;
  const votedCount = alreadyBet.size;

  function vote(v: Vote) {
    const top = available[0];
    if (!top || brokeFor) return;
    setExitDir(v);
    placeBet(top.id, v, stake);
  }

  const hateCount = bets.filter((b) => b.vote === 'hate').length;
  const believeCount = bets.length - hateCount;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Tally */}
      <div className="flex justify-between items-center mb-4 font-black uppercase text-sm">
        <span className="bg-neo-red neo-border px-3 py-1">{hateCount} Hated</span>
        <span className="text-gray-500">
          {loading ? '…' : `${available.length} ${available.length === 1 ? 'trap' : 'traps'} left`}
        </span>
        <span className="bg-neo-green neo-border px-3 py-1">{believeCount} Believed</span>
      </div>

      {/* Card stack */}
      <div className="relative h-[480px]">
        {loading ? (
          <div className="absolute inset-0 bg-white neo-border shadow-[10px_10px_0px_0px_rgba(28,25,23,1)] flex items-center justify-center">
            <Spinner label="Pulling traps from Bento" />
          </div>
        ) : done ? (
          <div className="absolute inset-0 bg-white neo-border shadow-[10px_10px_0px_0px_rgba(28,25,23,1)] p-8 flex flex-col items-center justify-center text-center">
            <div className="bg-neo-green neo-border rounded-full p-4 mb-5">
              <Check size={36} />
            </div>
            <h3 className="text-3xl font-black uppercase mb-3">All caught up</h3>
            <p className="font-bold text-lg text-gray-700 mb-6">
              You've backed {votedCount} {votedCount === 1 ? 'trap' : 'traps'}. Your bets are locked
              in on Bento — no takebacks.
            </p>
            <p className="font-bold text-sm text-gray-500 mb-6">
              New cards appear here automatically as your friends post goals.
            </p>
            {onSeeBets && (
              <button
                onClick={onSeeBets}
                className="bg-neo-blue neo-border shadow-neo px-6 py-3 font-black uppercase flex items-center gap-2 hover:-translate-y-1 transition-all cursor-pointer"
              >
                <Receipt size={20} /> See your bets
              </button>
            )}
          </div>
        ) : (
          <AnimatePresence>
            {visible
              .map((market, depth) => (
                <SwipeCard
                  key={market.id}
                  market={market}
                  depth={depth}
                  exitDir={exitDir}
                  onVote={vote}
                  votes={votes[market.id]}
                />
              ))
              .reverse()}
          </AnimatePresence>
        )}
      </div>

      {/* Stake picker */}
      <div className="flex items-center gap-2 mt-6 justify-center font-black uppercase text-sm">
        <span className="text-gray-500">Stake</span>
        {STAKES.map((s) => (
          <button
            key={s}
            onClick={() => setStake(s)}
            disabled={s > balance || done}
            className={`neo-border px-3 py-1 transition-all disabled:opacity-30 cursor-pointer ${
              stake === s ? 'bg-neo-yellow shadow-neo-sm' : 'bg-white hover:bg-neo-bg'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-4 mt-4 items-stretch">
        <button
          onClick={() => vote('hate')}
          disabled={done || brokeFor}
          className="flex-1 bg-neo-red neo-border shadow-neo py-4 flex flex-col items-center hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-40 disabled:hover:translate-y-0 cursor-pointer"
        >
          <ThumbsDown size={30} />
          <span className="font-black uppercase mt-1">Hate (No)</span>
        </button>

        <button
          onClick={() => vote('believe')}
          disabled={done || brokeFor}
          className="flex-1 bg-neo-green neo-border shadow-neo py-4 flex flex-col items-center hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-40 disabled:hover:translate-y-0 cursor-pointer"
        >
          <Flame size={30} />
          <span className="font-black uppercase mt-1">Believe (Yes)</span>
        </button>
      </div>

      <p className="text-center font-bold text-sm text-gray-500 mt-4">
        {done
          ? 'Waiting on new goals from your friends.'
          : brokeFor
            ? `Only ${balance} credits left — pick a smaller stake.`
            : 'Drag the card, or use the buttons. One bet per trap.'}
      </p>
    </div>
  );
}

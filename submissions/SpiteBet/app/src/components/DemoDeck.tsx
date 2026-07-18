import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ThumbsDown, Flame, RotateCcw } from 'lucide-react';
import { MARKETS } from '../data/markets';
import { SwipeCard } from './SwipeCard';
import type { Vote } from '../store/markets';

/**
 * Landing-page toy deck. Deliberately fake sample data with no Bento calls —
 * visitors get something to play with before they ever sign in, and the real
 * money only ever appears inside /app.
 */
export function DemoDeck({ onEnterApp }: { onEnterApp?: () => void }) {
  const [index, setIndex] = useState(0);
  const [exitDir, setExitDir] = useState<Vote | null>(null);
  const [tally, setTally] = useState({ hate: 0, believe: 0 });

  const visible = MARKETS.slice(index, index + 3);
  const done = index >= MARKETS.length;

  function vote(v: Vote) {
    if (done) return;
    setExitDir(v);
    setTally((t) => ({ ...t, [v]: t[v] + 1 }));
    setIndex((i) => i + 1);
  }

  function reset() {
    setIndex(0);
    setTally({ hate: 0, believe: 0 });
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex justify-between items-center mb-4 font-black uppercase text-sm">
        <span className="bg-neo-red neo-border px-3 py-1">{tally.hate} Hated</span>
        <span className="bg-neo-yellow neo-border px-3 py-1 text-xs">Demo — try it</span>
        <span className="bg-neo-green neo-border px-3 py-1">{tally.believe} Believed</span>
      </div>

      <div className="relative h-[480px]">
        {done ? (
          <div className="absolute inset-0 bg-white neo-border shadow-[10px_10px_0px_0px_rgba(28,25,23,1)] p-8 flex flex-col items-center justify-center text-center">
            <div className="text-6xl mb-4">🔥</div>
            <h3 className="text-3xl font-black uppercase mb-3">That's the vibe</h3>
            <p className="font-bold text-lg text-gray-700 mb-6">
              These were fake. Go put real credits on your actual friends.
            </p>
            <div className="flex gap-3 flex-wrap justify-center">
              {onEnterApp && (
                <button
                  onClick={onEnterApp}
                  className="bg-neo-green neo-border shadow-neo px-6 py-3 font-black uppercase hover:-translate-y-1 transition-all cursor-pointer"
                >
                  Open the real app
                </button>
              )}
              <button
                onClick={reset}
                className="bg-white neo-border shadow-neo px-6 py-3 font-black uppercase flex items-center gap-2 hover:-translate-y-1 transition-all cursor-pointer"
              >
                <RotateCcw size={18} /> Again
              </button>
            </div>
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
                />
              ))
              .reverse()}
          </AnimatePresence>
        )}
      </div>

      <div className="flex gap-4 mt-6 items-stretch">
        <button
          onClick={() => vote('hate')}
          disabled={done}
          className="flex-1 bg-neo-red neo-border shadow-neo py-4 flex flex-col items-center hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-40 cursor-pointer"
        >
          <ThumbsDown size={30} />
          <span className="font-black uppercase mt-1">Hate (No)</span>
        </button>
        <button
          onClick={() => vote('believe')}
          disabled={done}
          className="flex-1 bg-neo-green neo-border shadow-neo py-4 flex flex-col items-center hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-40 cursor-pointer"
        >
          <Flame size={30} />
          <span className="font-black uppercase mt-1">Believe (Yes)</span>
        </button>
      </div>

      <p className="text-center font-bold text-sm text-gray-500 mt-4">
        Sample goals. Nothing here touches your credits.
      </p>
    </div>
  );
}

import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { Clock, Users, Flame, ShieldCheck } from 'lucide-react';
import type { Market } from '../data/markets';
import type { Vote } from '../store/markets';
import type { VoteBreakdown } from '../lib/bento';

/** Past this many px of drag, releasing commits the bet. */
const SWIPE_THRESHOLD = 110;

type Props = {
  market: Market;
  /** 0 = top of the stack and interactive; 1 and 2 sit behind it. */
  depth: number;
  exitDir: Vote | null;
  onVote: (vote: Vote) => void;
  /** Real voters from Bento; omitted on the landing-page demo deck. */
  votes?: VoteBreakdown;
};

export function SwipeCard({ market, depth, exitDir, onVote, votes }: Props) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-18, 0, 18]);
  const hateOpacity = useTransform(x, [-SWIPE_THRESHOLD, -20], [1, 0]);
  const believeOpacity = useTransform(x, [20, SWIPE_THRESHOLD], [0, 1]);

  const isTop = depth === 0;
  const haters = votes?.haters ?? [];
  const believers = votes?.believers ?? [];
  const totalVoters = haters.length + believers.length;
  // Split by headcount when anyone has voted, otherwise fall back to the pool.
  const believePct =
    totalVoters > 0
      ? Math.round((believers.length / totalVoters) * 100)
      : Math.round((market.poolBelieve / Math.max(1, market.poolHate + market.poolBelieve)) * 100);

  function handleDragEnd(_: unknown, info: PanInfo) {
    const power = info.offset.x + info.velocity.x * 0.15;
    if (power < -SWIPE_THRESHOLD) onVote('hate');
    else if (power > SWIPE_THRESHOLD) onVote('believe');
  }

  return (
    <motion.div
      className="absolute inset-0"
      style={{ x: isTop ? x : 0, rotate: isTop ? rotate : 0, zIndex: 30 - depth }}
      drag={isTop ? 'x' : false}
      dragSnapToOrigin
      dragElastic={0.6}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.9, y: 30, opacity: 0 }}
      animate={{ scale: 1 - depth * 0.05, y: depth * 16, opacity: 1 }}
      exit={{
        x: exitDir === 'hate' ? -700 : 700,
        rotate: exitDir === 'hate' ? -35 : 35,
        opacity: 0,
        transition: { duration: 0.35 },
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      whileDrag={{ cursor: 'grabbing' }}
    >
      <div
        className={`bg-white neo-border shadow-[10px_10px_0px_0px_rgba(28,25,23,1)] h-full p-6 flex flex-col ${
          isTop ? 'cursor-grab' : 'pointer-events-none'
        }`}
      >
        {/* Drag stamps */}
        {isTop && (
          <>
            <motion.div
              style={{ opacity: hateOpacity }}
              className="absolute top-8 right-6 bg-neo-red neo-border px-4 py-2 text-2xl font-black uppercase rotate-12 z-40"
            >
              Hater
            </motion.div>
            <motion.div
              style={{ opacity: believeOpacity }}
              className="absolute top-8 left-6 bg-neo-green neo-border px-4 py-2 text-2xl font-black uppercase -rotate-12 z-40"
            >
              Believer
            </motion.div>
          </>
        )}

        <div className="flex justify-between items-start mb-4">
          <img
            src={`https://api.dicebear.com/7.x/notionists/svg?seed=${market.avatarSeed}&backgroundColor=b6e3f4`}
            alt=""
            draggable={false}
            className="w-20 h-20 rounded-full border-4 border-neo-dark shadow-neo-sm bg-neo-bg"
          />
          <div className="bg-neo-yellow neo-border px-3 py-1 font-bold text-sm rotate-2">
            {market.deadline} LEFT
          </div>
        </div>

        <div className="font-black text-sm uppercase text-gray-500 mb-1">{market.handle}</div>
        <h2 className="text-2xl md:text-3xl font-black uppercase leading-tight mb-4">
          "{market.goal}"
        </h2>

        <div className="flex items-center gap-2 flex-wrap mb-auto">
          <span className="bg-neo-dark text-white px-2 py-1 text-xs font-bold rounded-full flex items-center gap-1">
            <Clock size={12} /> Streak: {market.streak} {market.streak === 1 ? 'Day' : 'Days'}
          </span>
          <span className="bg-blue-100 text-blue-800 px-2 py-1 text-xs font-bold rounded-full flex items-center gap-1 border-2 border-blue-800">
            <Users size={12} /> {market.friendsBetting} Friends Betting
          </span>
          <span className="bg-neo-bg neo-border px-2 py-1 text-xs font-bold flex items-center gap-1">
            <ShieldCheck size={12} /> {market.verifiedVia}
          </span>
        </div>

        {/* Vote split — real people, not pool size */}
        <div className="mt-6">
          <div className="flex h-6 neo-border overflow-hidden">
            <div className="bg-neo-red" style={{ width: `${100 - believePct}%` }} />
            <div className="bg-neo-green" style={{ width: `${believePct}%` }} />
          </div>
          <div className="flex justify-between font-black mt-2 text-sm uppercase items-center">
            <span className="text-neo-red">
              {haters.length} {haters.length === 1 ? 'Hater' : 'Haters'}
            </span>
            <span className="text-gray-400">
              {totalVoters === 0 ? 'No votes yet' : `${believePct}% believe`}
            </span>
            <span className="text-green-600">
              {believers.length} {believers.length === 1 ? 'Believer' : 'Believers'}
            </span>
          </div>

          {/* Who actually voted */}
          {totalVoters > 0 && (
            <div className="flex items-center gap-1 mt-3 flex-wrap">
              {[...haters, ...believers].slice(0, 6).map((v) => (
                <span
                  key={v.address}
                  title={`${v.username} — ${v.side === 'hate' ? 'hater' : 'believer'}`}
                  className={`${
                    v.side === 'hate' ? 'bg-neo-red' : 'bg-neo-green'
                  } neo-border px-2 py-0.5 text-[10px] font-black uppercase`}
                >
                  {v.username}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center gap-1 font-bold text-xs text-gray-500 uppercase">
          <Flame size={12} className="text-neo-red" /> {market.category}
        </div>
      </div>
    </motion.div>
  );
}

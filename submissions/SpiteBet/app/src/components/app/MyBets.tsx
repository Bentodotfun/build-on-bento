import { useEffect, useState } from 'react';
import { Clock, Flame, Inbox, RefreshCw, ThumbsDown, Trophy } from 'lucide-react';
import { useMarkets } from '../../store/markets';
import { Spinner } from '../Spinner';
import { MarketDetail } from './MarketDetail';
import type { Market } from '../../data/markets';

/** "04:12:33 left", or a resolved state once the deadline passes. */
function timeLeft(endTimeSec: number | undefined, now: number) {
  if (!endTimeSec) return { label: 'No deadline', done: false };

  const remaining = endTimeSec * 1000 - now;
  if (remaining <= 0) return { label: 'Awaiting oracle', done: true };

  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  const s = Math.floor((remaining % 60_000) / 1000);
  const hhmmss = [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
  return { label: `${hhmmss} left`, done: false };
}

function formatHandle(handle?: string) {
  if (!handle) return 'Unknown';
  return handle
    .replace(/^@/, '')
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function MyBets({ onGoSwipe }: { onGoSwipe: () => void }) {
  const { positions, account, balance, bets, refresh, source, loading, votes, marketById, verdicts } =
    useMarkets();
  const [openMarket, setOpenMarket] = useState<Market | null>(null);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const pending = bets.filter((b) => !b.onChain).length;
  const hasAny = positions.length > 0;

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl overflow-hidden bg-white neo-border shadow-neo-lg">
        <Spinner label="Loading your positions" />
      </div>
    );
  }

  if (!hasAny) {
    return (
      <div className="mx-auto max-w-2xl bg-white neo-border shadow-neo-lg p-10 text-center sm:p-12">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center bg-neo-yellow neo-border shadow-neo-sm">
          <Inbox size={40} />
        </div>
        <h3 className="mb-3 text-2xl font-black uppercase leading-tight sm:text-3xl">No positions yet</h3>
        <p className="mx-auto mb-6 max-w-lg text-base font-bold leading-relaxed text-gray-700 sm:text-lg">
          {pending > 0
            ? `${pending} bet${pending === 1 ? '' : 's'} still settling on Bento — give it a moment.`
            : 'Your friends are out there failing quietly. Go put credits on it.'}
        </p>
        <button
          onClick={onGoSwipe}
          className="cursor-pointer bg-neo-blue neo-border px-6 py-3 font-black uppercase tracking-wide shadow-neo transition-all hover:-translate-y-1"
        >
          Open the deck
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8">
      {openMarket && <MarketDetail market={openMarket} onClose={() => setOpenMarket(null)} />}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="bg-neo-yellow neo-border p-5 shadow-neo sm:p-6">
          <div className="text-4xl font-black leading-none sm:text-5xl">{account?.totalBets ?? positions.length}</div>
          <div className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] sm:text-xs">
            Bets on Bento
          </div>
        </div>
        <div className="bg-neo-red neo-border p-5 shadow-neo sm:p-6">
          <div className="text-4xl font-black leading-none sm:text-5xl">{account?.positionValue ?? 0}</div>
          <div className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] sm:text-xs">
            Credits at risk
          </div>
        </div>
        <div className="bg-neo-green neo-border p-5 shadow-neo sm:p-6">
          <div className="text-4xl font-black leading-none sm:text-5xl">{balance}</div>
          <div className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] sm:text-xs">
            Credits left
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3 bg-white neo-border p-4 shadow-neo sm:p-5">
        <p className="max-w-2xl text-sm font-bold leading-relaxed text-gray-700 sm:text-base">
          {source === 'bento' ? 'Live from your Bento portfolio.' : 'Bento offline — local only.'}
          {pending > 0 && ` ${pending} still settling.`}
        </p>
        <button
          onClick={() => void refresh()}
          className="flex cursor-pointer items-center gap-2 bg-neo-yellow neo-border px-3 py-2 text-xs font-black uppercase shadow-neo-sm transition-all hover:-translate-y-1"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="space-y-4 sm:space-y-5">
        {positions.map((p) => {
          const isHate = p.optionLabel.toUpperCase() === 'NO';
          const pnl = p.unrealizedPnL ?? 0;
          const clock = timeLeft(p.endTime, now);
          const breakdown = votes[p.duelId];
          const haterCount = breakdown?.haters.length ?? 0;
          const believerCount = breakdown?.believers.length ?? 0;
          const market = marketById(p.duelId);
          const startedBy = formatHandle(market?.handle);

          const verdict = verdicts[p.duelId];
          const settled = verdict?.status === 'judged';
          const mySide = isHate ? 'haters' : 'believers';
          const iWon = settled && verdict.winningSide === mySide;

          return (
            <div
              key={`${p.duelId}-${p.optionLabel}`}
              onClick={() => {
                const m = marketById(p.duelId);
                if (m) setOpenMarket(m);
              }}
              className="flex cursor-pointer flex-col gap-4 bg-white neo-border p-4 shadow-neo transition-transform hover:-translate-y-1 md:flex-row md:items-center sm:p-5"
            >
              <div className="min-w-0 flex-1 space-y-3">
                <div className="space-y-2">
                  <div className="text-base font-black leading-snug sm:text-lg">"{p.question}"</div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-neo-dark/70 sm:text-xs">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${
                        clock.done ? 'bg-neo-yellow' : 'bg-neo-dark text-white'
                      }`}
                    >
                      <Clock size={11} /> {clock.label}
                    </span>
                    <span>Started by: {startedBy}</span>
                    {settled && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${
                          iWon ? 'bg-neo-green' : 'bg-neo-red'
                        }`}
                      >
                        <Trophy size={11} /> {iWon ? 'You won — see payout' : 'You lost'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500 sm:text-xs">
                  <span>{p.shares.toFixed(1)} shares</span>
                  {pnl !== 0 && (
                    <span className={pnl > 0 ? 'text-green-600' : 'text-neo-red'}>
                      {pnl > 0 ? '+' : ''}
                      {pnl.toFixed(2)} PnL
                    </span>
                  )}
                  <span className="text-neo-dark">
                    {haterCount} {haterCount === 1 ? 'hater' : 'haters'}
                  </span>
                  <span className="text-neo-dark">
                    {believerCount} {believerCount === 1 ? 'believer' : 'believers'}
                  </span>
                </div>
              </div>

              <div
                className={`neo-border shrink-0 self-start px-4 py-3 text-center md:self-center min-w-[96px] sm:min-w-[112px] ${
                  isHate ? 'bg-neo-red' : 'bg-neo-green'
                }`}
              >
                <div className="flex items-center justify-center gap-1 text-[11px] font-black uppercase sm:text-xs">
                  {isHate ? <ThumbsDown size={13} /> : <Flame size={13} />}
                  {isHate ? 'Hate' : 'Believe'}
                </div>
                <div className="mt-1 text-2xl font-black leading-none">{p.costBasis}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

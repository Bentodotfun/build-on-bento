import { useEffect, useState } from 'react';
import { X, Clock, Users, ShieldCheck, Bot, Trophy, GitCommit, Zap } from 'lucide-react';
import type { Market } from '../../data/markets';
import { useMarkets } from '../../store/markets';
import { resolveMarket, type Verdict } from '../../lib/oracle';
import { Spinner } from '../Spinner';

function countdown(endTimeSec: number | undefined, now: number) {
  if (!endTimeSec) return null;
  const left = endTimeSec * 1000 - now;
  if (left <= 0) return null;
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export function MarketDetail({ market, onClose }: { market: Market; onClose: () => void }) {
  const { votes, positions, verdicts, refreshVerdicts, activeAccount } = useMarkets();
  const [now, setNow] = useState(() => Date.now());
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const verdict: Verdict | undefined = verdicts[market.id];
  const breakdown = votes[market.id];
  const haters = breakdown?.haters ?? [];
  const believers = breakdown?.believers ?? [];
  const myPosition = positions.find((p) => p.duelId === market.id);
  const left = countdown(market.endTime, now);
  const settled = verdict?.status === 'judged';

  // My side won if the oracle's winner matches the option I hold.
  const myside = myPosition ? (myPosition.optionLabel.toUpperCase() === 'NO' ? 'haters' : 'believers') : null;
  const iWon = settled && myside_match(myside, verdict?.winningSide);

  async function runOracle(force: boolean) {
    setRunning(true);
    setError(null);
    try {
      await resolveMarket(market.id, { force, creatorJwt: activeAccount?.jwt });
      await refreshVerdicts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Oracle failed');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-neo-dark/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="bg-neo-bg neo-border shadow-[10px_10px_0px_0px_rgba(28,25,23,1)] w-full max-w-2xl my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b-4 border-neo-dark bg-white p-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="font-black text-xs uppercase text-gray-500">{market.handle}</div>
            <h2 className="text-2xl font-black uppercase leading-tight mt-1">"{market.goal}"</h2>
          </div>
          <button
            onClick={onClose}
            className="bg-neo-red neo-border p-2 shrink-0 cursor-pointer hover:-translate-y-0.5 transition-transform"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Status strip */}
          <div className="flex flex-wrap gap-2 font-black uppercase text-xs">
            <span className="bg-neo-dark text-white px-3 py-2 flex items-center gap-1">
              <Clock size={12} /> {left ? `${left} left` : 'Deadline passed'}
            </span>
            <span className="bg-white neo-border px-3 py-2 flex items-center gap-1">
              <Users size={12} /> {haters.length + believers.length} voted
            </span>
            <span className="bg-white neo-border px-3 py-2 flex items-center gap-1">
              <ShieldCheck size={12} /> {market.verifiedVia}
            </span>
            {market.oracleHandle && (
              <span className="bg-neo-blue neo-border px-3 py-2">@{market.oracleHandle}</span>
            )}
            {market.target && (
              <span className="bg-neo-yellow neo-border px-3 py-2">Target: {market.target}</span>
            )}
          </div>

          {/* Vote split */}
          <div className="bg-white neo-border p-4">
            <div className="font-black uppercase text-sm mb-3">Who voted</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="font-black text-neo-red text-2xl">{haters.length}</div>
                <div className="font-bold text-xs uppercase text-gray-500 mb-2">Haters</div>
                {haters.map((v) => (
                  <div key={v.address} className="bg-neo-red neo-border px-2 py-1 text-xs font-black mb-1">
                    {v.username}
                  </div>
                ))}
              </div>
              <div>
                <div className="font-black text-green-600 text-2xl">{believers.length}</div>
                <div className="font-bold text-xs uppercase text-gray-500 mb-2">Believers</div>
                {believers.map((v) => (
                  <div key={v.address} className="bg-neo-green neo-border px-2 py-1 text-xs font-black mb-1">
                    {v.username}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Your position */}
          {myPosition && (
            <div className="bg-white neo-border p-4">
              <div className="font-black uppercase text-sm mb-2">Your bet</div>
              <div className="flex items-center justify-between font-bold">
                <span>
                  {myPosition.optionLabel.toUpperCase() === 'NO' ? 'HATE' : 'BELIEVE'} ·{' '}
                  {myPosition.costBasis} credits
                </span>
                <span className="text-gray-500">{myPosition.shares.toFixed(1)} shares</span>
              </div>
            </div>
          )}

          {/* Oracle */}
          <div className="bg-white neo-border p-4">
            <div className="font-black uppercase text-sm mb-3 flex items-center gap-2">
              <Bot size={16} /> AI Oracle
            </div>

            {running && <Spinner label="Anakin + AI judging" />}

            {!running && !settled && (
              <div className="space-y-3">
                <p className="font-bold text-sm text-gray-700">
                  {left
                    ? 'The oracle runs automatically when the deadline passes.'
                    : 'Deadline passed — the oracle has not run yet.'}
                </p>
                {error && <div className="bg-neo-red neo-border p-3 font-bold text-sm">{error}</div>}
                <button
                  onClick={() => void runOracle(true)}
                  className="bg-neo-yellow neo-border shadow-neo px-4 py-2 font-black uppercase text-sm flex items-center gap-2 cursor-pointer hover:-translate-y-1 transition-all"
                >
                  <Zap size={15} /> Run oracle now
                </button>
              </div>
            )}

            {!running && settled && (
              <div className="space-y-4">
                <div
                  className={`${
                    verdict.passed ? 'bg-neo-green' : 'bg-neo-red'
                  } neo-border p-4 text-center`}
                >
                  <div className="font-black uppercase text-2xl">
                    {verdict.passed ? 'Goal met' : 'Goal missed'}
                  </div>
                  <div className="font-bold text-sm mt-1">
                    {verdict.winningSide === 'haters' ? 'Haters' : 'Believers'} take the pool
                  </div>
                </div>

                <div className="font-bold text-sm space-y-2">
                  <p>
                    <span className="text-gray-500 uppercase text-xs">Evidence:</span>{' '}
                    {verdict.commitsFound} commits found, {verdict.substantiveCount} judged
                    substantive (target {verdict.target}).
                  </p>
                  <p className="text-gray-700">{verdict.reasoning}</p>
                  {verdict.roast && (
                    <p className="bg-neo-yellow neo-border p-3 italic">"{verdict.roast}"</p>
                  )}
                </div>

                {verdict.commits && verdict.commits.length > 0 && (
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {verdict.commits.map((c) => (
                      <div key={c.sha} className="flex gap-2 text-xs font-bold items-start">
                        <GitCommit size={12} className="mt-0.5 shrink-0" />
                        <span className="truncate">{c.message.split('\n')[0]}</span>
                      </div>
                    ))}
                  </div>
                )}

                {myPosition && (
                  <div
                    className={`${iWon ? 'bg-neo-green' : 'bg-gray-200'} neo-border p-4 flex items-center gap-3`}
                  >
                    <Trophy size={22} />
                    <div className="font-black uppercase">
                      {iWon ? 'You won this one' : 'You lost this one'}
                      <div className="font-bold text-xs normal-case text-gray-700">
                        {iWon
                          ? `Your ${myPosition.costBasis} credits share the pool.`
                          : `Your ${myPosition.costBasis} credits go to the ${verdict.winningSide}.`}
                      </div>
                    </div>
                  </div>
                )}

                {verdict.anakinNote && (
                  <p className="text-xs font-bold text-gray-400">Anakin: {verdict.anakinNote}</p>
                )}
                {verdict.resolution && (
                  <p className="text-xs font-bold text-gray-400">
                    Bento resolution: {verdict.resolution.ok ? 'accepted' : `failed (${verdict.resolution.status})`}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Small helper so the ternary above stays readable. */
function myside_match(mine: string | null, winner?: string) {
  return Boolean(mine && winner && mine === winner);
}

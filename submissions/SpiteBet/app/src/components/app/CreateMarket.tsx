import { useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useMarkets } from '../../store/markets';

const CATEGORIES = [
  { label: '🏃 Fitness', verifiers: ['Strava', 'Gym check-in', 'Photo + AI'] },
  { label: '💻 Shipping', verifiers: ['GitHub', 'Vercel deploy', 'Photo + AI'] },
  { label: '📚 Studying', verifiers: ['Screen Time', 'Photo + AI', 'Group vote'] },
  { label: '🧘 Discipline', verifiers: ['Screen Time', 'Alarm log', 'Group vote'] },
  { label: '🎯 Anything Else', verifiers: ['Group vote', 'Photo + AI'] },
];

const PROMPTS = [
  'Run 5km before 8PM',
  'Gym at 6AM, no excuses',
  'Ship the PR before standup',
  'Zero doomscrolling until 6PM',
  'Read 20 pages tonight',
];

function formatDuration(hours: number) {
  const seconds = Math.round(hours * 3600);
  if (seconds < 60) return `${seconds} sec`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const whole = Math.floor(hours);
  const mins = Math.round((hours - whole) * 60);
  return mins ? `${whole}h ${mins}m` : `${whole} hr${whole === 1 ? '' : 's'}`;
}

/** Quick picks, including sub-minute windows for demoing the oracle. */
const DURATION_PRESETS = [10 / 3600, 60 / 3600, 5 / 60, 0.5, 1, 2, 8];

/** Verifiers that need an account handle for the oracle to scrape. */
const NEEDS_ACCOUNT: Record<string, { label: string; placeholder: string }> = {
  GitHub: { label: 'GitHub username', placeholder: 'torvalds' },
  Strava: { label: 'Strava username', placeholder: 'your-strava-handle' },
};

export function CreateMarket({ onCreated }: { onCreated: () => void }) {
  const { addMarket, busy, source, error, activeAccount } = useMarkets();

  const [goal, setGoal] = useState('');
  // Default to whoever is currently swiping so the trap is attributed correctly.
  const [handle, setHandle] = useState(activeAccount?.name ?? '');
  const [oracleHandle, setOracleHandle] = useState('');
  const [target, setTarget] = useState(5);
  const [hours, setHours] = useState(2);
  const [categoryIdx, setCategoryIdx] = useState(0);
  const [verifier, setVerifier] = useState(CATEGORIES[0].verifiers[0]);

  const category = CATEGORIES[categoryIdx];
  const account = NEEDS_ACCOUNT[verifier];
  const valid =
    goal.trim().length > 3 && handle.trim().length > 0 && (!account || oracleHandle.trim().length > 0);

  function selectCategory(idx: number) {
    setCategoryIdx(idx);
    setVerifier(CATEGORIES[idx].verifiers[0]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;

    try {
      await addMarket({
        goal: goal.trim(),
        handle: handle.trim(),
        hoursFromNow: hours,
        category: category.label,
        verifiedVia: verifier,
        oracleHandle: oracleHandle.trim() || undefined,
        target: account ? target : undefined,
      });
      setGoal('');
      setOracleHandle('');
      onCreated();
    } catch {
      // Error is surfaced from the store below; keep the form filled in.
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="inline-block bg-neo-yellow neo-border px-4 py-1 font-bold text-sm uppercase mb-4 -rotate-2">
          Set The Trap
        </div>
        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-[0.95]">
          Say it out loud.
          <br />
          Then live with it.
        </h2>
        <p className="font-bold text-lg text-gray-700 mt-4">
          This mints a live prediction market. Once it's up, you can't edit it and you can't delete it.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white neo-border shadow-neo-lg p-6 md:p-8 space-y-6">
        {/* Goal */}
        <div className="space-y-2">
          <label htmlFor="goal" className="font-black text-lg uppercase block">
            What are you committing to?
          </label>
          <textarea
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={3}
            maxLength={140}
            placeholder="I will run 5km on Strava before 8PM"
            className="w-full bg-neo-bg neo-border p-4 font-bold text-lg focus:outline-none focus:bg-white transition-colors resize-none"
          />
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap">
              {PROMPTS.slice(0, 3).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setGoal(p)}
                  className="bg-neo-bg neo-border px-2 py-1 text-xs font-bold hover:bg-neo-yellow transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Sparkles size={11} /> {p}
                </button>
              ))}
            </div>
            <span className="font-bold text-sm text-gray-400">{goal.length}/140</span>
          </div>
        </div>

        {/* Handle */}
        <div className="space-y-2">
          <label htmlFor="handle" className="font-black text-lg uppercase block">
            Your handle
          </label>
          <input
            id="handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="@hater_supreme"
            className="w-full bg-neo-bg neo-border p-4 font-bold text-lg focus:outline-none focus:bg-white transition-colors"
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <span className="font-black text-lg uppercase block">Category</span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c, idx) => (
              <button
                key={c.label}
                type="button"
                onClick={() => selectCategory(idx)}
                className={`neo-border px-3 py-2 font-bold text-sm transition-all cursor-pointer ${
                  categoryIdx === idx ? 'bg-neo-green shadow-neo-sm' : 'bg-white hover:bg-neo-bg'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Verifier */}
        <div className="space-y-2">
          <span className="font-black text-lg uppercase block">How should the oracle check?</span>
          <div className="flex flex-wrap gap-2">
            {category.verifiers.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVerifier(v)}
                className={`neo-border px-3 py-2 font-bold text-sm transition-all cursor-pointer ${
                  verifier === v ? 'bg-neo-blue shadow-neo-sm' : 'bg-white hover:bg-neo-bg'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Oracle account — only when the verifier needs something to scrape */}
        {account && (
          <div className="space-y-2 bg-neo-bg neo-border p-4">
            <label htmlFor="oracleHandle" className="font-black text-lg uppercase block">
              {account.label}
            </label>
            <p className="font-bold text-sm text-gray-600">
              Anakin reads this account at the deadline and an AI judges whether the work is real —
              ten README typo commits will not pass.
            </p>
            <input
              id="oracleHandle"
              value={oracleHandle}
              onChange={(e) => setOracleHandle(e.target.value)}
              placeholder={account.placeholder}
              className="w-full bg-white neo-border p-4 font-bold text-lg focus:outline-none transition-colors"
            />

            <label htmlFor="target" className="font-black text-sm uppercase block pt-2">
              How many {verifier === 'GitHub' ? 'commits' : 'activities'}?
            </label>
            <input
              id="target"
              type="number"
              min={1}
              max={50}
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              className="w-32 bg-white neo-border p-3 font-black text-lg focus:outline-none"
            />
          </div>
        )}

        {/* Deadline — half-hour granularity */}
        <div className="space-y-2">
          <label htmlFor="hours" className="font-black text-lg uppercase block">
            Deadline: <span className="text-neo-red">{formatDuration(hours)}</span> from now
          </label>
          <input
            id="hours"
            type="range"
            min={10 / 3600}
            max={24}
            step={0.5}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="w-full accent-neo-red"
          />
          <div className="flex justify-between font-bold text-xs text-gray-400 uppercase">
            <span>10 sec — reckless</span>
            <span>24 hrs — coward</span>
          </div>
          <div className="flex gap-2 flex-wrap pt-1">
            {DURATION_PRESETS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHours(h)}
                className={`neo-border px-3 py-1 text-xs font-black uppercase cursor-pointer transition-all ${
                  hours === h ? 'bg-neo-yellow shadow-neo-sm' : 'bg-white hover:bg-neo-bg'
                }`}
              >
                {formatDuration(h)}
              </button>
            ))}
          </div>
          {hours < 5 / 60 && (
            <p className="font-bold text-xs text-neo-red">
              Demo window. Bento still won't open the market for ~31 min, so use "Run oracle now"
              on the trap's detail view to judge it immediately.
            </p>
          )}
        </div>

        {error && (
          <div className="bg-neo-red neo-border p-4 font-bold">{error}</div>
        )}

        <button
          type="submit"
          disabled={!valid || busy}
          className="w-full bg-neo-dark text-white neo-border px-8 py-5 text-xl font-black uppercase hover:bg-neo-red hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(28,25,23,1)] transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:bg-neo-dark cursor-pointer"
        >
          {busy ? 'Minting on Bento…' : 'Mint This Trap'} <ArrowRight size={22} />
        </button>

        <p className="font-bold text-sm text-gray-500 text-center">
          {source === 'bento'
            ? 'This creates a real prediction market on Bento testnet.'
            : 'Bento offline — this will be saved locally for the demo.'}
        </p>
      </form>
    </div>
  );
}

import { Wallet, PenLine, Hand, Bot, Coins } from 'lucide-react';

const STEPS = [
  {
    icon: Wallet,
    title: 'Connect & Get Credits',
    body: 'Hook up your wallet and claim 1,000 free testnet credits. No real money, no bank details, no regrets you can actually afford.',
    tag: '30 seconds',
    color: 'bg-neo-blue',
  },
  {
    icon: PenLine,
    title: 'Post Your Trap',
    body: 'Write the goal in your own words — "gym at 7am", "ship the PR", "no doomscrolling til 6". Pick a deadline. It goes live as a real prediction market on Bento.',
    tag: 'You vs you',
    color: 'bg-neo-yellow',
  },
  {
    icon: Hand,
    title: 'Friends Swipe On You',
    body: 'Your trap lands in the group deck. Left to HATE, right to BELIEVE. Every swipe moves the odds, and everybody can see exactly who bet against you.',
    tag: 'The pressure',
    color: 'bg-neo-red',
  },
  {
    icon: Bot,
    title: 'The Oracle Checks',
    body: 'At the deadline Anakin scrapes the receipts — Strava, GitHub, whatever you linked. No screenshots, no honour system, no arguing with it.',
    tag: 'Automatic',
    color: 'bg-neo-green',
  },
  {
    icon: Coins,
    title: 'Pool Gets Split',
    body: 'Winners take the pot, streaks tick up, the leaderboard reshuffles. Losers get a personalised roast dropped straight in the chat.',
    tag: 'Every midnight',
    color: 'bg-white',
  },
];

/** Vertical numbered flow — the full loop from signup to payout. */
export function UserFlow() {
  return (
    <section id="flow" className="py-24 border-t-4 border-neo-dark bg-neo-bg">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-16">
          <div className="inline-block bg-neo-dark text-white px-4 py-1 font-bold text-sm uppercase mb-4">
            The Full Loop
          </div>
          <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tighter leading-[0.95]">
            From "I'll start Monday"
            <br />
            to actually doing it.
          </h2>
          <p className="text-xl font-bold max-w-2xl mt-6 text-gray-700">
            Five steps. The whole thing takes less than a minute to set up and then runs itself every single day.
          </p>
        </div>

        <div className="relative">
          {/* Spine */}
          <div className="absolute left-[27px] top-4 bottom-4 w-1 bg-neo-dark hidden md:block" />

          <div className="space-y-8">
            {STEPS.map((step, idx) => (
              <div key={step.title} className="flex gap-6 items-start relative">
                <div
                  className={`${step.color} neo-border shadow-neo w-14 h-14 shrink-0 hidden md:flex items-center justify-center font-black text-2xl relative z-10`}
                >
                  {idx + 1}
                </div>

                <div className="bg-white neo-border shadow-neo-lg p-6 md:p-8 flex-1 hover:-translate-y-1 transition-transform">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <step.icon size={28} />
                    <h3 className="text-2xl md:text-3xl font-black uppercase">{step.title}</h3>
                    <span className={`${step.color} neo-border px-3 py-1 text-xs font-black uppercase`}>
                      {step.tag}
                    </span>
                  </div>
                  <p className="font-bold text-lg leading-snug text-gray-700">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

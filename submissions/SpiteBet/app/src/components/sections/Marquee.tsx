const TICKER = [
  '@toxic_alex bet 200 HATE on @rahul',
  '@ananya_codes hit a 22 day streak',
  '@ship_it_steve just got liquidated',
  '@sarah_no cashed out +540 credits',
  'AI Oracle roasted @lazy_liam',
  '@david_goggins_jr never misses',
  '6 friends piled onto "run 5km"',
];

/** Infinite scrolling ticker of fake live activity. Pure vibes. */
export function Marquee() {
  return (
    <div className="border-y-4 border-neo-dark bg-neo-red overflow-hidden py-3 select-none">
      <div className="flex w-max animate-marquee">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0" aria-hidden={copy === 1}>
            {TICKER.map((item, idx) => (
              <span
                key={idx}
                className="flex items-center gap-4 px-6 font-black uppercase text-lg whitespace-nowrap"
              >
                {item}
                <span className="text-neo-dark">◆</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

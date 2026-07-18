const CATEGORIES = [
  {
    emoji: '🏃',
    name: 'Fitness',
    example: '"5km before 8pm"',
    verified: 'Strava',
    color: 'bg-neo-green',
    span: 'md:col-span-2',
  },
  {
    emoji: '💻',
    name: 'Shipping',
    example: '"5 commits today"',
    verified: 'GitHub',
    color: 'bg-neo-blue',
    span: '',
  },
  {
    emoji: '📚',
    name: 'Studying',
    example: '"3 hours, no phone"',
    verified: 'Screen Time',
    color: 'bg-neo-yellow',
    span: '',
  },
  {
    emoji: '🧘',
    name: 'Discipline',
    example: '"Wake up at 5:30am"',
    verified: 'Photo + AI',
    color: 'bg-white',
    span: 'md:col-span-2',
  },
  {
    emoji: '🎯',
    name: 'Anything Else',
    example: '"Text her back"',
    verified: 'Group vote',
    color: 'bg-neo-red',
    span: 'md:col-span-3',
  },
];

/** Bento-style grid of goal categories the oracle can verify. */
export function Categories() {
  return (
    <section id="categories" className="py-24 border-t-4 border-neo-dark bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
          <div>
            <div className="inline-block bg-neo-green neo-border px-4 py-1 font-bold text-sm uppercase mb-4 -rotate-2">
              Bet On Anything
            </div>
            <h2 className="text-5xl font-black uppercase tracking-tighter">What people trap themselves with</h2>
          </div>
          <p className="font-bold max-w-sm md:text-right text-gray-700">
            If there's a public API or a photo that proves it, the oracle can judge it.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.name}
              className={`${cat.color} ${cat.span} neo-border shadow-neo-lg p-8 hover:-translate-y-2 transition-transform flex flex-col justify-between min-h-[200px]`}
            >
              <div>
                <div className="text-5xl mb-4">{cat.emoji}</div>
                <h3 className="text-3xl font-black uppercase mb-2">{cat.name}</h3>
                <p className="font-bold text-lg text-neo-dark/70">{cat.example}</p>
              </div>
              <div className="mt-6 pt-4 border-t-4 border-neo-dark font-black uppercase text-sm">
                Verified via {cat.verified}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

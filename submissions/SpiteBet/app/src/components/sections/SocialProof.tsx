const STATS = [
  { value: '3.2x', label: 'more likely to finish a goal when money is on it', color: 'bg-neo-yellow' },
  { value: '91%', label: 'of streaks break within 4 days without an audience', color: 'bg-neo-red' },
  { value: '0', label: 'excuses accepted by the AI oracle', color: 'bg-neo-green' },
];

const RECEIPTS = [
  {
    seed: 'Priya',
    name: '@priya.exe',
    quote: "My whole hostel floor bet against my 6am gym thing. Woke up out of pure spite. Day 19 now.",
    tag: 'Believer',
    color: 'bg-neo-green',
  },
  {
    seed: 'Kabir',
    name: '@kabir_hates',
    quote: "I've made 4,000 credits purely by knowing my friends are lazy. This is easy money.",
    tag: 'Hater',
    color: 'bg-neo-red',
  },
  {
    seed: 'Meera',
    name: '@meera.wip',
    quote: "The roast the AI wrote when I missed my deadline is still pinned in our group chat. Never again.",
    tag: 'Survivor',
    color: 'bg-neo-blue',
  },
];

/** Stat band + group-chat style testimonial cards. */
export function SocialProof() {
  return (
    <section className="py-24 border-t-4 border-neo-dark bg-neo-bg">
      <div className="max-w-7xl mx-auto px-4">
        {/* Stat band */}
        <div className="grid md:grid-cols-3 gap-6 mb-24">
          {STATS.map((stat) => (
            <div key={stat.value} className={`${stat.color} neo-border shadow-neo-lg p-8`}>
              <div className="text-6xl font-black tracking-tighter mb-3">{stat.value}</div>
              <p className="font-bold text-lg leading-snug">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="text-center mb-12">
          <div className="inline-block bg-neo-dark text-white px-4 py-1 font-bold text-sm uppercase mb-4">
            Receipts
          </div>
          <h2 className="text-5xl font-black uppercase tracking-tighter">Straight from the group chat</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {RECEIPTS.map((r, idx) => (
            <div
              key={r.name}
              className={`bg-white neo-border shadow-neo-lg p-6 hover:-translate-y-2 transition-transform ${
                idx === 1 ? 'md:-rotate-1' : 'md:rotate-1'
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={`https://api.dicebear.com/7.x/notionists/svg?seed=${r.seed}`}
                  alt=""
                  className="w-14 h-14 rounded-full border-4 border-neo-dark bg-neo-bg"
                />
                <div>
                  <div className="font-black text-lg">{r.name}</div>
                  <span className={`${r.color} neo-border px-2 py-0.5 text-xs font-black uppercase inline-block`}>
                    {r.tag}
                  </span>
                </div>
              </div>
              <p className="font-bold text-lg leading-snug text-gray-700">"{r.quote}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

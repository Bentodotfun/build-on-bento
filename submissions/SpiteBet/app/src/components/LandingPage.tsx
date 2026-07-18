import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Flame, ThumbsDown, ArrowRight, Zap, Trophy, Target, Crown, Plus, Minus } from 'lucide-react';
import { scrollToSection } from '../lib/scroll';
import { DemoDeck } from './DemoDeck';
import { Marquee } from './sections/Marquee';
import { UserFlow } from './sections/UserFlow';
import { Categories } from './sections/Categories';
import { SocialProof } from './sections/SocialProof';

export function LandingPage({ onEnterApp }: { onEnterApp: () => void }) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: "Is SpiteBet a real crypto casino?",
      a: "No! It's a social accountability app. We use testnet credits (fake internet money) so you can bet on your friends without losing your actual house."
    },
    {
      q: "How does the AI Oracle work?",
      a: "At midnight, Anakin AI scrapes public APIs (like Strava or GitHub) to check if your friend actually did what they promised. No human intervention. Pure ruthless logic."
    },
    {
      q: "What if I miss my daily goal?",
      a: "Your 'Haters' (friends who bet against you) take all the credits in the pool, and our AI automatically posts a roast about your failure in your group chat."
    },
    {
      q: "Can I just bet on myself?",
      a: "Yes. In fact, if you bet on yourself and succeed, you steal all the credits from your haters. It's the ultimate flex."
    }
  ];

  return (
    <div className="min-h-screen bg-neo-bg font-mono overflow-x-hidden text-neo-dark pt-20 sm:pt-24">
      
      {/* NAVBAR */}
      <nav className="fixed inset-x-0 top-0 z-50 w-full border-b-4 border-neo-dark bg-white/95 p-4 backdrop-blur-sm flex justify-between items-center shadow-neo-sm">
        <div className="text-3xl font-black tracking-tighter uppercase flex items-center gap-2">
          <Flame className="text-neo-red" size={32} />
          SpiteBet
        </div>
        <div className="hidden md:flex gap-6 font-bold uppercase text-sm">
          <button type="button" onClick={() => scrollToSection('how')} className="uppercase hover:text-neo-red transition-colors cursor-pointer">How it Works</button>
          <button type="button" onClick={() => scrollToSection('flow')} className="uppercase hover:text-neo-yellow transition-colors cursor-pointer">User Flow</button>
          <button type="button" onClick={() => scrollToSection('categories')} className="uppercase hover:text-neo-blue transition-colors cursor-pointer">Categories</button>
          <button type="button" onClick={() => scrollToSection('leaderboard')} className="uppercase hover:text-neo-blue transition-colors cursor-pointer">Leaderboard</button>
          <button type="button" onClick={() => scrollToSection('faq')} className="uppercase hover:text-neo-green transition-colors cursor-pointer">FAQ</button>
        </div>
        <button
          onClick={onEnterApp}
          className="bg-neo-green neo-border shadow-neo px-6 py-2 font-bold uppercase hover:-translate-y-1 hover:shadow-neo-lg transition-all cursor-pointer"
        >
          Launch App
        </button>
      </nav>

      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 py-20 flex flex-col lg:flex-row items-center justify-between gap-16 relative">
        <div className="flex-1 space-y-8 relative z-10">
          <div className="inline-block bg-neo-yellow neo-border px-4 py-1 font-bold text-sm uppercase mb-4 transform -rotate-2">
            The #1 Social Betting Trap
          </div>
          <h1 className="text-6xl md:text-8xl font-black uppercase leading-[0.9] tracking-tighter">
            Hate on your friends. <br/>
            <span className="text-neo-red relative">
              On Purpose.
              <svg className="absolute -bottom-2 left-0 w-full" height="14" viewBox="0 0 300 14" fill="none">
                <path d="M3 9 C80 3 220 3 297 7" stroke="currentColor" strokeWidth="6" strokeLinecap="round"></path>
              </svg>
            </span>
          </h1>
          <p className="text-xl md:text-2xl font-bold max-w-lg leading-snug">
            Turn any daily goal into a ruthless competition. Create a trap, invite your friends, and fight for the top of the leaderboard. Because nobody wants to lose to their group chat.
          </p>
          <div className="flex gap-4 pt-4">
            <button onClick={onEnterApp} className="bg-neo-blue neo-border shadow-neo-lg px-8 py-4 text-xl font-black uppercase flex items-center gap-3 hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_rgba(28,25,23,1)] transition-all cursor-pointer">
              Start Swiping <ArrowRight size={24} />
            </button>
            <button onClick={() => scrollToSection('waitlist')} className="bg-white neo-border shadow-neo px-8 py-4 text-xl font-black uppercase hover:-translate-y-1 transition-all hidden sm:block cursor-pointer">
              Join Waitlist
            </button>
          </div>
          <p className="text-sm font-bold text-gray-500 mt-2">* Reserve your username. For the first 500 only.</p>
        </div>

        {/* DEMO DECK — sample data only, never touches Bento */}
        <div id="deck" className="flex-1 w-full max-w-md">
          <DemoDeck onEnterApp={onEnterApp} />
        </div>
      </section>

      <Marquee />

      {/* LEADERBOARD PREVIEW */}
      <section id="leaderboard" className="py-20 border-t-4 border-neo-dark bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12">
            <div>
              <div className="inline-block bg-neo-dark text-white px-4 py-1 font-bold text-sm uppercase mb-4">
                Global Rankings
              </div>
              <h2 className="text-5xl font-black uppercase tracking-tighter">Current Standings</h2>
            </div>
            <p className="font-bold max-w-sm md:text-right mt-4 md:mt-0">
              Only the most ruthless haters and the most consistent achievers make it to the top.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            
            {/* Haters Leaderboard */}
            <div className="bg-[#fecdd3] neo-border shadow-neo-lg p-6 md:p-8">
              <div className="flex items-center gap-3 mb-8 border-b-4 border-neo-dark pb-4">
                <div className="bg-neo-red p-3 rounded-full border-4 border-neo-dark">
                  <ThumbsDown className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase">Biggest Haters</h3>
                  <p className="font-bold text-sm">Most credits won by betting NO.</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { rank: 1, name: "toxic_alex", pts: 8400, color: "bg-yellow-400" },
                  { rank: 2, name: "hater_mike", pts: 6200, color: "bg-gray-300" },
                  { rank: 3, name: "sarah_no", pts: 5100, color: "bg-orange-400" },
                ].map((user) => (
                  <div key={user.rank} className="bg-white neo-border p-4 flex items-center justify-between hover:-translate-y-1 transition-transform">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 ${user.color} neo-border flex items-center justify-center font-black rounded-full`}>
                        #{user.rank}
                      </div>
                      <div className="font-bold text-lg">{user.name}</div>
                    </div>
                    <div className="text-neo-red font-black text-xl">
                      {user.pts} pts
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Believers Leaderboard */}
            <div className="bg-[#dcfce3] neo-border shadow-neo-lg p-6 md:p-8">
              <div className="flex items-center gap-3 mb-8 border-b-4 border-neo-dark pb-4">
                <div className="bg-neo-green p-3 rounded-full border-4 border-neo-dark">
                  <Crown className="text-neo-dark" size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase">Most Trusted</h3>
                  <p className="font-bold text-sm">Most successful habit completions.</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { rank: 1, name: "david_goggins_jr", pts: 12, streak: "🔥 45 Day Streak", color: "bg-yellow-400" },
                  { rank: 2, name: "ananya_codes", pts: 10, streak: "🔥 22 Day Streak", color: "bg-gray-300" },
                  { rank: 3, name: "ship_it_steve", pts: 8, streak: "🔥 14 Day Streak", color: "bg-orange-400" },
                ].map((user) => (
                  <div key={user.rank} className="bg-white neo-border p-4 flex items-center justify-between hover:-translate-y-1 transition-transform">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 ${user.color} neo-border flex items-center justify-center font-black rounded-full`}>
                        #{user.rank}
                      </div>
                      <div>
                        <div className="font-bold text-lg">{user.name}</div>
                        <div className="text-xs font-bold text-gray-500">{user.streak}</div>
                      </div>
                    </div>
                    <div className="text-neo-green font-black text-xl">
                      {user.pts} W's
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="border-t-4 border-neo-dark bg-neo-yellow py-24 relative overflow-hidden">
        {/* Background text pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none text-[200px] font-black leading-none break-all text-neo-dark flex flex-wrap">
          SWIPE HATE BET SWIPE HATE BET
        </div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-6xl font-black uppercase mb-4">
              How The Trap Works
            </h2>
            <p className="text-xl font-bold max-w-2xl mx-auto">
              We took the addictive swipe mechanics of dating apps and weaponized them for your productivity.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white neo-border shadow-neo-lg p-8 hover:-translate-y-2 transition-transform h-full flex flex-col">
              <div className="bg-neo-blue w-16 h-16 rounded-full neo-border flex items-center justify-center mb-6 text-2xl font-black text-white">1</div>
              <Target size={48} className="mb-4 text-neo-dark" />
              <h3 className="text-3xl font-black uppercase mb-4">Declare a Goal</h3>
              <p className="font-bold text-lg leading-snug text-gray-700 flex-1">
                Tell the world you're gonna do something hard today. "I will run 5k." "I will push code." We mint this as a live prediction market on Bento.
              </p>
            </div>
            
            <div className="bg-white neo-border shadow-neo-lg p-8 hover:-translate-y-2 transition-transform h-full flex flex-col">
              <div className="bg-neo-red w-16 h-16 rounded-full neo-border flex items-center justify-center mb-6 text-2xl font-black text-white">2</div>
              <Zap size={48} className="mb-4 text-neo-dark" />
              <h3 className="text-3xl font-black uppercase mb-4">The Swipe Deck</h3>
              <p className="font-bold text-lg leading-snug text-gray-700 flex-1">
                Your goal enters the doomscroll feed. Your friends swipe left to bet against you (Hate), or swipe right to back you (Believe). The odds shift in real-time.
              </p>
            </div>
            
            <div className="bg-white neo-border shadow-neo-lg p-8 hover:-translate-y-2 transition-transform h-full flex flex-col">
              <div className="bg-neo-green w-16 h-16 rounded-full neo-border flex items-center justify-center mb-6 text-2xl font-black text-neo-dark">3</div>
              <Trophy size={48} className="mb-4 text-neo-dark" />
              <h3 className="text-3xl font-black uppercase mb-4">AI Oracle Judges</h3>
              <p className="font-bold text-lg leading-snug text-gray-700 flex-1">
                At midnight, Anakin AI quietly scrapes your public profiles (Strava, GitHub). If you lied, the haters win the pool and the AI roasts you publicly.
              </p>
            </div>
          </div>
        </div>
      </section>

      <UserFlow />

      <Categories />

      <SocialProof />

      {/* FAQ SECTION (Inspired by Edmo) */}
      <section id="faq" className="py-24 border-t-4 border-neo-dark bg-neo-bg">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block bg-neo-dark text-white px-4 py-1 font-bold text-sm uppercase mb-4">
              FAQS
            </div>
            <h2 className="text-5xl font-black uppercase tracking-tighter">Your Learning, Your Rules. <br/>Wait, No. Your Betting, Your Rules.</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const open = openFaq === idx;
              return (
                <div key={idx} className="bg-white neo-border shadow-neo overflow-hidden">
                  <button
                    className="w-full text-left p-6 flex justify-between items-center gap-4 font-black text-xl hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setOpenFaq(open ? null : idx)}
                    aria-expanded={open}
                  >
                    <span className="uppercase">{faq.q}</span>
                    <motion.span
                      animate={{ rotate: open ? 180 : 0 }}
                      transition={{ duration: 0.25 }}
                      className="shrink-0"
                    >
                      {open ? <Minus size={24} /> : <Plus size={24} />}
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="p-6 border-t-4 border-neo-dark bg-gray-50 font-bold text-lg text-gray-700">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* WAITLIST / CTA SECTION */}
      <section id="waitlist" className="py-24 border-t-4 border-neo-dark bg-neo-blue text-white relative">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-6xl font-black uppercase mb-8 text-neo-dark drop-shadow-[4px_4px_0_rgba(255,255,255,1)]">
            Future Awaits. <br/> Don't Be Boring.
          </h2>
          <p className="text-xl font-bold mb-12 text-neo-dark">
            Secure your unique username before someone else steals it.
          </p>
          
          <form className="bg-white neo-border shadow-neo-lg p-8 space-y-6 text-left">
            <div className="space-y-2">
              <label className="font-black text-xl uppercase text-neo-dark">Username</label>
              <input 
                type="text" 
                placeholder="@hater_supreme" 
                className="w-full bg-neo-bg neo-border p-4 font-bold text-lg focus:outline-none focus:bg-white transition-colors text-neo-dark"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="font-black text-xl uppercase text-neo-dark">Email Address</label>
              <input 
                type="email" 
                placeholder="tony@stank.industries" 
                className="w-full bg-neo-bg neo-border p-4 font-bold text-lg focus:outline-none focus:bg-white transition-colors text-neo-dark"
                required
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-neo-dark text-white neo-border px-8 py-5 text-2xl font-black uppercase hover:bg-neo-red hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(28,25,23,1)] transition-all mt-4"
            >
              Join The Waitlist
            </button>
          </form>
        </div>
      </section>
      
      {/* FOOTER */}
      <footer className="bg-neo-dark text-white py-12 border-t-4 border-black">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="font-black text-3xl uppercase flex items-center gap-2">
            <Flame className="text-neo-red" size={28} />
            SpiteBet
          </div>
          <div className="text-center md:text-right font-bold text-sm text-gray-400">
            <p className="mb-2 uppercase text-white">Built on Bento + Anakin</p>
            <p>Hackathon Edition - Use Testnet Credits Only.</p>
            <p className="mt-4">© 2026 SpiteBet Inc. Outwork your friends.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppState, Market, PendingMarket } from '@/lib/state';
import Header from '@/components/Header';
import PredictGptSheet from '@/components/PredictGptSheet';
import { 
  Sparkles, Star, TrendingUp, ChevronRight, Bookmark, 
  Clock, Award, Terminal, Flame, Info, Check, User, Plus, Vote, CheckCircle
} from 'lucide-react';

export default function Dashboard() {
  const { 
    markets, 
    watchlist, 
    toggleWatchlist, 
    placePrediction, 
    setActiveMarketId,
    setMarkets,
    userPositions,
    pendingMarkets,
    createPublicMarket,
    voteApprovePublicMarket,
    adminApproveMarket
  } = useAppState();

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [predictingMarketId, setPredictingMarketId] = useState<string | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<'YES' | 'NO'>('YES');
  const [predictionAmount, setPredictionAmount] = useState<number>(50);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Market creation modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('Technology');
  const [createSuccess, setCreateSuccess] = useState(false);

  // Set mounted client-side to prevent hydration mismatch errors
  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Fetch live markets from Bento SDK via backend API route
  const { data: bentoData } = useQuery({
    queryKey: ['bentoMarkets'],
    queryFn: async () => {
      const res = await fetch('/api/bento-markets');
      if (!res.ok) throw new Error('Failed to load bento markets');
      return res.json();
    },
  });

  // 2. Merge markets on load (safely checking keys to avoid update loops and update categories dynamically)
  useEffect(() => {
    if (bentoData?.success && bentoData.markets) {
      const initialIds = ['market-1', 'market-2', 'market-3', 'market-4', 'market-5', 'market-football-1'];
      const currentMarkets = useAppState.getState().markets;
      
      // Filter out only the initial/created local markets
      const localMarkets = currentMarkets.filter(m => 
        initialIds.includes(m.id) || 
        m.id.startsWith('approved') || 
        m.id.startsWith('room-m')
      );
      
      // Combine with the fresh SDK markets that have the corrected categorization
      const merged = [
        ...localMarkets,
        ...bentoData.markets.filter((sdkMarket: any) => 
          !localMarkets.some(local => local.id === sdkMarket.id)
        )
      ];

      // De-duplicate by title (case-insensitive) to prevent repeated markets
      const uniqueMerged: Market[] = [];
      const seenTitles = new Set<string>();

      for (const m of merged) {
        const normalizedTitle = m.title.trim().toLowerCase();
        if (!seenTitles.has(normalizedTitle)) {
          seenTitles.add(normalizedTitle);
          uniqueMerged.push(m);
        }
      }

      // Compare IDs and category tags to detect changes and prevent infinite render loops
      const currentSignature = currentMarkets.map(m => `${m.id}:${m.category}`).join('|');
      const newSignature = uniqueMerged.map(m => `${m.id}:${m.category}`).join('|');

      if (currentSignature !== newSignature) {
        setMarkets(uniqueMerged);
      }
    }
  }, [bentoData, setMarkets]);

  const handlePredictClick = (marketId: string, outcome: 'YES' | 'NO') => {
    setPredictingMarketId(marketId);
    setSelectedOutcome(outcome);
    setSuccessMessage(null);
  };

  const handleConfirmPrediction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!predictingMarketId) return;
    
    placePrediction(predictingMarketId, selectedOutcome, predictionAmount);
    setSuccessMessage(`Prediction Placed: ${predictionAmount} USDC on ${selectedOutcome}`);
    
    setTimeout(() => {
      setPredictingMarketId(null);
      setSuccessMessage(null);
    }, 2000);
  };

  // Submit market for approval
  const handleCreateMarketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    createPublicMarket(newTitle, newDesc, newCategory);
    setCreateSuccess(true);
    setNewTitle('');
    setNewDesc('');
    
    setTimeout(() => {
      setCreateSuccess(false);
      setShowCreateModal(false);
    }, 2000);
  };

  // Filter public-only markets (hide room-specific markets)
  const publicMarkets = markets.filter(m => !m.roomId);

  // Filter active markets dynamically based on tab
  const filteredMarkets = publicMarkets.filter(market => {
    if (activeTab === 'all') return true;
    if (activeTab === 'watchlist') return watchlist.includes(market.id);
    return market.category.toLowerCase() === activeTab.toLowerCase();
  });

  const activePendingMarkets = pendingMarkets.filter(m => m.status === 'pending');

  const accuracy = 92;
  const winRate = 85;
  const streak = 8;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#000000] pb-20 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Header />

      <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        
        {/* Clean visual banner */}
        <div className="relative w-full h-[140px] md:h-[180px] rounded-3xl overflow-hidden mb-4 border border-slate-200 dark:border-[#15181f] shadow-lg shrink-0">
          <img 
            src="/images/dashboard_banner.png" 
            alt="Predicto Intelligence Banner"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Prediction Intelligence Description Box */}
        <div className="pm-card p-5 mb-8 bg-white dark:bg-[#090a0f] border border-slate-200 dark:border-[#15181f] transition-colors duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-orange-655 dark:text-orange-400 mb-1.5">
                <Sparkles className="h-3.5 w-3.5 animate-pulse text-[#fa5025]" />
                <span>PredictGPT Insight Layer</span>
              </div>
              <h2 className="text-base md:text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
                Master the Markets before making predictions
              </h2>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Use <span className="text-[#fa5025] font-bold">PredictGPT</span> to gain accurate insights, developer activity stats, and community sentiment to decide whether to predict <span className="text-emerald-600 dark:text-emerald-450 font-bold">YES</span> or <span className="text-rose-600 dark:text-rose-455 font-bold">NO</span>.
              </p>
            </div>
            <div className="shrink-0 flex items-center">
              <div className="rounded-lg bg-orange-500/10 px-3 py-1.5 text-xs font-bold text-[#fa5025] border border-orange-500/20">
                🔥 Powered by PredictGPT
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal User Profile Banner */}
        <div className="pm-card p-5 mb-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-center bg-white dark:bg-[#090a0f] border border-slate-200 dark:border-[#15181f] transition-colors duration-200">
          {/* Profile Name & Level */}
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-2xl border border-orange-500/20">
              🧙‍♂️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Mannan (You)</h3>
                <span className="rounded bg-orange-500/15 border border-orange-500/25 px-1.5 py-0.5 text-[9px] font-bold text-orange-600 dark:text-orange-400 uppercase">
                  Level 8
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-400 dark:text-slate-550 mt-0.5 uppercase tracking-wider">PredictGPT Analyst Rank</p>
            </div>
          </div>

          {/* Stats & Streak */}
          <div className="flex items-center gap-6 justify-between md:justify-center border-y md:border-y-0 md:border-x border-slate-200 dark:border-[#1d1e24] py-3 md:py-0 md:px-6">
            <div className="text-center">
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Accuracy</p>
              <p className="mt-0.5 text-sm font-black text-slate-800 dark:text-white">{accuracy}%</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Win Rate</p>
              <p className="mt-0.5 text-sm font-black text-emerald-600 dark:text-emerald-400">{winRate}%</p>
            </div>
            {streak > 0 && (
              <div className="text-center flex flex-col items-center">
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Active Streak</p>
                <span className="mt-0.5 flex items-center gap-0.5 text-xs font-bold text-orange-500 font-mono">
                  <Flame className="h-4 w-4 fill-orange-500 text-orange-500" />
                  <span>{streak} Wins</span>
                </span>
              </div>
            )}
          </div>

          {/* Active Positions Scroll List (Vertical Scroll box) */}
          <div className="space-y-2">
            <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">Your Active Predictions</p>
            {userPositions.length === 0 ? (
              <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-550 italic">No active positions yet. Predict YES or NO below to start!</p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-[85px] overflow-y-auto pr-1">
                {userPositions.slice().reverse().map((pos, idx) => {
                  const market = markets.find(m => m.id === pos.marketId);
                  return (
                    <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-[#1d1e24] bg-slate-50 dark:bg-[#17181d] px-3 py-1.5 text-[10px]">
                      <span className="font-semibold text-slate-700 dark:text-slate-350 truncate max-w-[170px]" title={market?.title || 'Bento Market'}>
                        {market?.title || 'Bento Market'}
                      </span>
                      <span className={`font-mono font-bold ${pos.outcome === 'YES' ? 'text-orange-550 dark:text-orange-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {pos.outcome} ({pos.amount}u)
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        {/* Header & Tabs */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#1d1e24] pb-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {['all', 'technology', 'ai', 'football', 'watchlist'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition capitalize ${
                  activeTab === tab 
                    ? 'bg-[#fa5025] text-white shadow-sm shadow-[#fa5025]/10' 
                    : 'text-slate-650 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-[#121318]'
                }`}
              >
                {tab === 'all' ? 'All Markets' : tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[#fa5025] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-[#e0451e] transition"
            >
              <Plus className="h-4 w-4" />
              <span>Create Market</span>
            </button>
          </div>
        </div>

        {/* Main Feed (Full Width Wrapper) */}
        <div className="space-y-10 w-full">
          
          {/* Active Catalog Section */}
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500 mb-4">Active Market Catalog</h2>
            {filteredMarkets.length === 0 ? (
              <div className="pm-card flex flex-col items-center justify-center p-12 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">No active markets found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMarkets.map(market => (
                  <MarketCard 
                    key={market.id} 
                    market={market}
                    isWatched={watchlist.includes(market.id)}
                    onWatchToggle={toggleWatchlist}
                    onAnalyze={() => setActiveMarketId(market.id)}
                    onPredict={handlePredictClick}
                    mounted={mounted}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Approval Queue / Pending Voting Board Section */}
          <section className="border-t border-slate-200 dark:border-[#1d1e24] pt-8">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white">🗳️ Market Approval Queue</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Community votes for approval. Bento Admin handles final catalog tags.</p>
              </div>
              <span className="rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-mono font-bold text-orange-600 dark:text-orange-400 border border-orange-500/20">
                {activePendingMarkets.length} pending
              </span>
            </div>

            {activePendingMarkets.length === 0 ? (
              <div className="pm-card flex flex-col items-center justify-center p-8 text-center text-slate-500 dark:text-slate-400">
                <p className="text-xs">No pending approvals. Use "+ Create Market" to submit a public proposal!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activePendingMarkets.map(market => (
                  <div key={market.id} className="pm-card p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center text-[10px] text-slate-450 dark:text-slate-500">
                        <span className="uppercase font-mono bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded border border-slate-250 dark:border-[#1d1e24]">
                          {market.category}
                        </span>
                        <span>By: {market.creator}</span>
                      </div>
                      <h3 className="mt-3.5 text-sm font-bold text-slate-900 dark:text-white leading-snug">{market.title}</h3>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{market.description}</p>
                    </div>

                    {/* Vote & Approval interface */}
                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-[#1d1e24]">
                      <div className="flex justify-between items-center text-xs mb-3 text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Vote className="h-4 w-4" />
                          <span>Community votes:</span>
                        </span>
                        <span className="font-mono font-bold">
                          <span className="text-emerald-600 dark:text-emerald-400">+{market.yesVotes}</span> / <span className="text-rose-600 dark:text-rose-400">-{market.noVotes}</span>
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => voteApprovePublicMarket(market.id, 'YES')}
                          className="flex-1 rounded-lg border border-emerald-500/20 bg-emerald-500/5 py-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                        >
                          Vote Approve
                        </button>
                        <button
                          onClick={() => voteApprovePublicMarket(market.id, 'NO')}
                          className="flex-1 rounded-lg border border-rose-500/20 bg-rose-500/5 py-1.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                        >
                          Vote Reject
                        </button>
                      </div>

                      {/* Admin Action mockup */}
                      <button
                        onClick={() => adminApproveMarket(market.id)}
                        className="mt-2.5 w-full flex items-center justify-center gap-1 rounded-lg bg-slate-200 dark:bg-white/5 py-1.5 text-[10px] font-bold text-slate-700 dark:text-white hover:bg-slate-300 dark:hover:bg-white/10 cursor-pointer"
                      >
                        <CheckCircle className="h-3.5 w-3.5 text-blue-550 dark:text-blue-400" />
                        <span>Admin Force Approval (Instant Catalog)</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>

      </main>

      {/* Predict Drawer Sheet */}
      <PredictGptSheet />

      {/* Place Prediction Modal Overlay */}
      {predictingMarketId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-[#1d1e24] bg-white dark:bg-[#121318] p-6 shadow-2xl transition-colors duration-200">
            {successMessage ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  <Check className="h-6 w-6" />
                </div>
                <p className="mt-4 font-bold text-slate-800 dark:text-white">{successMessage}</p>
                <p className="mt-1 text-xs text-slate-450 dark:text-slate-500">Bento contract updated successfully.</p>
              </div>
            ) : (
              <form onSubmit={handleConfirmPrediction}>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">Confirm Predict on Bento</h3>
                <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500 line-clamp-2">
                  "{markets.find(m => m.id === predictingMarketId)?.title}"
                </p>

                <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 dark:bg-[#17181d] p-2.5 font-mono text-xs">
                  <span className="text-slate-550">Side Selected</span>
                  <span className={`rounded-md px-2.5 py-0.5 font-bold ${selectedOutcome === 'YES' ? 'bg-orange-500/10 text-[#fa5025]' : 'bg-slate-500/10 text-slate-650 dark:text-slate-400'}`}>
                    {selectedOutcome}
                  </span>
                </div>

                <div className="mt-4">
                  <label className="text-xs text-slate-550">Amount (USDC)</label>
                  <input 
                    type="number" 
                    value={predictionAmount}
                    onChange={(e) => setPredictionAmount(Math.max(1, parseInt(e.target.value) || 0))}
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-[#1d1e24] bg-white dark:bg-[#17181d] px-3 py-2 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#fa5025]"
                  />
                </div>

                <div className="mt-6 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setPredictingMarketId(null)}
                    className="flex-1 rounded-xl border border-slate-200 dark:border-[#1d1e24] py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 rounded-xl bg-[#fa5025] text-white py-2.5 text-xs font-bold hover:bg-[#e0451e]"
                  >
                    Predict
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Create Public Market Modal Overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-[#1d1e24] bg-white dark:bg-[#121318] p-6 shadow-2xl">
            {createSuccess ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  <Check className="h-6 w-6" />
                </div>
                <p className="mt-4 font-bold text-slate-800 dark:text-white">Submitted to Approval Queue!</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Bento admins and voting community have been notified.</p>
              </div>
            ) : (
              <form onSubmit={handleCreateMarketSubmit} className="space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Propose Public Prediction Market</h3>
                <p className="text-xs text-slate-455 dark:text-slate-500">Your market will go through community approval voting before appearing in the active catalog.</p>

                <div>
                  <label className="text-xs font-bold text-slate-550">Market Question / Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Will React v19 launch another minor patch by September?"
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-[#1d1e24] bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-555">Settlement Rules & Description</label>
                  <textarea
                    rows={3}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Provide description and settlement source links..."
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-[#1d1e24] bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-555">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-[#1d1e24] bg-slate-50 dark:bg-[#17181d] px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none"
                  >
                    <option value="Technology">Technology</option>
                    <option value="AI">AI</option>
                    <option value="Football">Football</option>
                  </select>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 rounded-xl border border-slate-200 dark:border-[#1d1e24] py-2.5 text-xs font-bold text-slate-550 hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-[#fa5025] text-white py-2.5 text-xs font-bold hover:bg-[#e0451e]"
                  >
                    Submit Proposal
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Market Card Sub-Component (Bento Matchup-style cards with icons)
function MarketCard({ 
  market, 
  isWatched, 
  onWatchToggle, 
  onAnalyze, 
  onPredict,
  mounted
}: { 
  market: Market; 
  isWatched: boolean;
  onWatchToggle: (id: string) => void;
  onAnalyze: () => void;
  onPredict: (id: string, side: 'YES' | 'NO') => void;
  mounted: boolean;
}) {
  // Map titles dynamically to duel matchups (Option A vs Option B with icons)
  const getMatchupDetails = (title: string, category: string) => {
    const t = title.toLowerCase().trim();
    
    if (t.includes('next.js 16 release') || t.includes('next.js 16 stable') || t.includes('next/react-native')) {
      return { nameA: 'Next.js v16', iconA: '🚀', nameB: 'Delay', iconB: '⏰' };
    }
    if (t.includes('tailwind css v5') || t.includes('tailwind v5')) {
      return { nameA: 'Tailwind v5', iconA: '🎨', nameB: 'Delay', iconB: '⏰' };
    }
    if (t.includes('gemini exceed gpt-5') || t.includes('gemini vs gpt')) {
      return { nameA: 'Gemini AI', iconA: '🤖', nameB: 'GPT-5', iconB: '🧠' };
    }
    if (t.includes('native browser web-editor') || t.includes('web-editor') || t.includes('vercel announce')) {
      return { nameA: 'Web Editor', iconA: '💻', nameB: 'No Release', iconB: '❌' };
    }
    if (t.includes('remix v3')) {
      return { nameA: 'Remix RSC', iconA: '📦', nameB: 'No RSC', iconB: '🛡️' };
    }
    if (t.includes('argentina') || t.includes('world cup')) {
      return { nameA: 'Argentina', iconA: '🇦🇷', nameB: 'Others', iconB: '🏆' };
    }
    if (t.includes('oscar') || t.includes('piastri')) {
      return { nameA: 'Oscar Piastri', iconA: '🏎️', nameB: 'Others', iconB: '🏁' };
    }
    if (t.includes('lando norris') || t.includes('belgian')) {
      return { nameA: 'Lando Norris', iconA: '🏎️', nameB: 'Others', iconB: '🏁' };
    }
    if (t.includes('team a win') || t.includes('team a')) {
      return { nameA: 'Team A', iconA: '⚽', nameB: 'Team B', iconB: '🛡️' };
    }
    if (t.includes('outage')) {
      return { nameA: 'Resolve', iconA: '✅', nameB: 'Outage', iconB: '⚠️' };
    }
    if (t.includes('dependency')) {
      return { nameA: 'Fixed', iconA: '📦', nameB: 'Broken', iconB: '🚨' };
    }
    
    // Generic split for vs strings
    if (title.includes(' vs ')) {
      const parts = title.split(' vs ');
      return { 
        nameA: parts[0].trim().substring(0, 12), 
        iconA: '⚔️', 
        nameB: parts[1].replace(/\?/g, '').trim().substring(0, 12), 
        iconB: '🛡️' 
      };
    }

    return { nameA: 'YES Option', iconA: '🟢', nameB: 'NO Option', iconB: '🔴' };
  };

  const matchup = getMatchupDetails(market.title, market.category);

  return (
    <div className="pm-card p-5 flex flex-col justify-between relative group hover:border-[#fa5025]/60 transition-all duration-300 bg-white dark:bg-[#121318] border border-slate-200 dark:border-[#1d1e24] rounded-2xl shadow-sm">
      <div>
        {/* Category Header Row */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1d1e24] pb-3 mb-4">
          <span className="rounded bg-slate-100 dark:bg-[#17181d] px-2 py-0.5 text-[9px] font-mono uppercase text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#2c2e3a]">
            {market.category}
          </span>
          
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-[#fa5025] animate-ping" />
            <span className="text-[9px] font-mono font-bold text-[#fa5025] tracking-wider uppercase">LIVE</span>
            <button 
              onClick={() => onWatchToggle(market.id)}
              className={`rounded p-0.5 transition ${isWatched ? 'text-amber-500' : 'text-slate-350 dark:text-slate-650 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              <Bookmark className="h-4.5 w-4.5 fill-current" />
            </button>
          </div>
        </div>

        {/* Bento Dual Matchup Row (Icons & Option Names) */}
        <div className="flex items-center justify-between bg-slate-50/50 dark:bg-[#17181d]/40 rounded-xl p-3 mb-4 border border-slate-100 dark:border-[#1d1e24]/60">
          <div className="flex items-center gap-2">
            <span className="text-xl shrink-0">{matchup.iconA}</span>
            <span className="font-bold text-xs text-slate-700 dark:text-slate-300 truncate max-w-[80px]" title={matchup.nameA}>
              {matchup.nameA}
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 font-mono tracking-widest px-2">VS</span>
          <div className="flex items-center gap-2 text-right">
            <span className="font-bold text-xs text-slate-700 dark:text-slate-350 truncate max-w-[80px]" title={matchup.nameB}>
              {matchup.nameB}
            </span>
            <span className="text-xl shrink-0">{matchup.iconB}</span>
          </div>
        </div>

        {/* Prediction Question Text */}
        <h3 className="text-[13px] font-bold leading-normal text-slate-800 dark:text-white line-clamp-2 min-h-[38px] mb-4 pr-1">
          {market.title}
        </h3>
      </div>

      {/* Button Controls */}
      <div className="space-y-3.5">
        {/* Yes/No Buttons */}
        <div className="flex gap-2">
          <button 
            onClick={() => onPredict(market.id, 'YES')}
            className="flex-1 btn-yes py-2 text-xs font-bold rounded-lg transition cursor-pointer"
          >
            YES · {market.yesPercent}%
          </button>
          <button 
            onClick={() => onPredict(market.id, 'NO')}
            className="flex-1 btn-no py-2 text-xs font-bold rounded-lg transition cursor-pointer"
          >
            NO · {market.noPercent}%
          </button>
        </div>

        {/* Footer stats */}
        <div className="flex items-center gap-4 border-t border-slate-100 dark:border-[#1d1e24] pt-3 text-xs text-slate-400 dark:text-slate-500 font-mono justify-between">
          <div className="flex gap-2 text-[9px] text-slate-400 dark:text-slate-500">
            <span>VOL: {mounted ? market.volume.toLocaleString() : '2,500'} USDC</span>
            <span>•</span>
            <span>{market.timeRemaining}</span>
          </div>
          
          <button 
            onClick={onAnalyze}
            className="flex items-center gap-1 font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-[#fa5025] shrink-0" />
            <span>PredictGPT</span>
          </button>
        </div>
      </div>
    </div>
  );
}

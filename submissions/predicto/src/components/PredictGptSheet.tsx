'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useAppState } from '@/lib/state';
import { 
  X, Sparkles, TrendingUp, GitBranch, AlertTriangle, 
  MessageSquare, Compass, Award, ShieldAlert,
  Loader2, ChevronRight, Activity, CheckCircle
} from 'lucide-react';

export default function PredictGptSheet() {
  const { activeMarketId, setActiveMarketId, markets } = useAppState();
  const activeMarket = markets.find(m => m.id === activeMarketId);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveMarketId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveMarketId]);

  // Click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setActiveMarketId(null);
    }
  };

  // Fetch prediction data using React Query when sheet is active
  const { data, isLoading, error } = useQuery({
    queryKey: ['predictGpt', activeMarketId],
    queryFn: async () => {
      if (!activeMarket) return null;
      const res = await fetch('/api/predict-gpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeMarket),
      });
      if (!res.ok) throw new Error('Failed to load PredictGPT intelligence report');
      return res.json();
    },
    enabled: !!activeMarketId && !!activeMarket,
  });

  // Smooth scroll container when report data is loaded
  useEffect(() => {
    if (data && containerRef.current) {
      containerRef.current.scrollTo({ top: 140, behavior: 'smooth' });
    }
  }, [data]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (activeMarketId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [activeMarketId]);

  if (!activeMarket) return null;

  const report = data?.report;
  const confidenceScore = report?.confidenceScore || 0;
  
  // Calculate confidence description
  let confidenceText = 'Medium Confidence';
  let confidenceColor = 'text-amber-600 border-amber-200 bg-amber-50 dark:text-amber-400 dark:border-amber-500/30 dark:bg-amber-500/5';
  if (confidenceScore > 80) {
    confidenceText = 'High Confidence';
    confidenceColor = 'text-emerald-600 border-emerald-200 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-500/30 dark:bg-emerald-500/5';
  } else if (confidenceScore < 60) {
    confidenceText = 'Low Confidence';
    confidenceColor = 'text-rose-600 border-rose-200 bg-rose-50 dark:text-rose-400 dark:border-rose-500/30 dark:bg-rose-500/5';
  }

  return (
    <AnimatePresence>
      {activeMarketId && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs"
          onClick={handleBackdropClick}
        >
          {/* Bottom Sheet Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="pm-card fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl rounded-t-3xl border-t border-x border-slate-250 dark:border-[#15181f] bg-white dark:bg-[#090a0f] shadow-2xl h-[80vh] flex flex-col text-slate-800 dark:text-slate-200 transition-colors duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Drag handle indicator */}
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-200 dark:bg-white/10 shrink-0" />

            {/* Fixed Header */}
            <div className="px-6 pt-3 pb-4 border-b border-slate-100 dark:border-[#15181f] flex items-start justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-orange-650 dark:text-orange-400">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                  <span>PredictGPT Intelligence Report</span>
                </div>
                <h2 className="mt-1.5 text-lg font-bold text-slate-900 dark:text-white md:text-xl leading-snug">{activeMarket.title}</h2>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <span className="rounded bg-slate-100 dark:bg-[#0d0e12] border border-slate-200 dark:border-[#15181f] px-2.5 py-0.5 text-[10px] text-slate-550 dark:text-slate-400 font-mono">
                    Category: {activeMarket.category}
                  </span>
                  <span className="rounded bg-slate-100 dark:bg-[#0d0e12] border border-slate-200 dark:border-[#15181f] px-2.5 py-0.5 text-[10px] text-slate-550 dark:text-slate-400 font-mono">
                    Volume: {activeMarket.volume.toLocaleString()} USDC
                  </span>
                  <span className="rounded bg-slate-100 dark:bg-[#0d0e12] border border-slate-200 dark:border-[#15181f] px-2.5 py-0.5 text-[10px] text-slate-550 dark:text-slate-400 font-mono">
                    YES: {activeMarket.yesPercent}% · NO: {activeMarket.noPercent}%
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setActiveMarketId(null)}
                className="rounded-full border border-slate-200 dark:border-[#15181f] bg-slate-55 dark:bg-[#0d0e12] p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div 
              ref={containerRef}
              className="flex-1 overflow-y-auto px-6 py-6 pb-24 space-y-6"
            >
              {/* Loading State */}
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="h-10 w-10 animate-spin text-[#fa5025]" />
                  <p className="mt-4 text-xs font-mono text-slate-450 dark:text-slate-500">Synthesizing scraped signals and raw web context...</p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <AlertTriangle className="h-12 w-12 text-rose-550" />
                  <p className="mt-4 text-base font-semibold text-slate-950 dark:text-white">Failed to build market analysis</p>
                  <button 
                    onClick={() => setActiveMarketId(null)}
                    className="mt-6 rounded-md bg-[#fa5025] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#e0451e] cursor-pointer"
                  >
                    Close Report
                  </button>
                </div>
              )}

              {/* Report Content */}
              {!isLoading && report && (
                <>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {/* Left Column (Summary, Moving Reasons, Signals) */}
                    <div className="space-y-6 md:col-span-2">
                      
                      {/* Executive Summary */}
                      <div className="rounded-xl border border-slate-250 dark:border-[#1d1e24] bg-slate-50/50 dark:bg-white/[0.01] p-5">
                        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                          <Sparkles className="h-4 w-4 text-orange-500" />
                          Executive Summary
                        </h3>
                        <p className="mt-3 text-xs leading-relaxed text-slate-655 dark:text-slate-350">{report.executiveSummary}</p>
                      </div>

                      {/* Why It's Moving */}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-250 dark:border-[#1d1e24] bg-slate-50/50 dark:bg-white/[0.01] p-5">
                          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                            Probability Split
                          </h3>
                          <div className="mt-3.5 flex items-center gap-3">
                            <span className="text-3xl font-black text-[#fa5025]">{activeMarket.yesPercent}%</span>
                            <div>
                              <p className="text-[10px] text-slate-400 font-mono">YES Odds</p>
                              <p className="text-[10px] font-mono text-emerald-650 dark:text-emerald-400">{activeMarket.recentChanges || '+1.5% hourly'}</p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-250 dark:border-[#1d1e24] bg-slate-50/50 dark:bg-white/[0.01] p-5">
                          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                            <Activity className="h-4 w-4 text-slate-500" />
                            Movement Drivers
                          </h3>
                          <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{report.whyMoving}</p>
                        </div>
                      </div>

                      {/* Positive Indicators */}
                      <div className="rounded-xl border border-emerald-250 dark:border-emerald-500/10 bg-emerald-500/[0.01] p-5">
                        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-650 dark:text-emerald-400">
                          <CheckCircle className="h-4 w-4" />
                          Positive Indicators
                        </h3>
                        <ul className="mt-3 space-y-2 text-xs text-slate-700 dark:text-slate-350">
                          {Array.isArray(report.positiveIndicators) && report.positiveIndicators.map((item: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-emerald-500 font-bold shrink-0 mt-0.5">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Risk Metrics */}
                      <div className="rounded-xl border border-rose-250 dark:border-rose-500/10 bg-rose-500/[0.01] p-5">
                        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-650 dark:text-rose-455">
                          <AlertTriangle className="h-4 w-4" />
                          Risk Metrics
                        </h3>
                        <ul className="mt-3 space-y-2 text-xs text-slate-700 dark:text-slate-350">
                          {Array.isArray(report.riskMetrics) && report.riskMetrics.map((item: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-rose-500 font-bold shrink-0 mt-0.5">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Historical Precedence */}
                      {report.historicalPrecedence && (
                        <div className="rounded-xl border border-slate-250 dark:border-[#1d1e24] bg-slate-50/50 dark:bg-white/[0.01] p-5">
                          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                            <Compass className="h-4 w-4 text-blue-500" />
                            Historical Precedence
                          </h3>
                          <p className="mt-3 text-xs leading-relaxed text-slate-655 dark:text-slate-350">{report.historicalPrecedence}</p>
                        </div>
                      )}
                    </div>

                    {/* Right Column (Confidence, Sentiment, Watchlist) */}
                    <div className="space-y-6">
                      
                      {/* Confidence Score Gauge */}
                      <div className="rounded-xl border border-slate-250 dark:border-[#1d1e24] bg-slate-50/50 dark:bg-white/[0.01] p-6 text-center">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Confidence Meter</h3>
                        
                        <div className="relative mx-auto mt-6 flex h-28 w-28 items-center justify-center rounded-full border-4 border-slate-100 dark:border-[#1d1e24]">
                          <div className="text-2xl font-black text-slate-900 dark:text-white">{confidenceScore}%</div>
                        </div>

                        <div className={`mx-auto mt-5 inline-block rounded-full border px-3 py-1 text-xs font-bold capitalize ${confidenceColor}`}>
                          {confidenceText}
                        </div>

                        <p className="mt-4 text-[10px] leading-normal text-slate-450 dark:text-slate-500 font-mono">
                          AI analysis certainty calculated from scraped coverage.
                        </p>
                      </div>

                      {/* Community Sentiment */}
                      <div className="rounded-xl border border-slate-250 dark:border-[#1d1e24] bg-slate-50/50 dark:bg-white/[0.01] p-5">
                        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                          <MessageSquare className="h-4 w-4 text-cyan-500" />
                          Community Buzz
                        </h3>
                        <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{report.communitySentiment}</p>
                      </div>

                      {/* Watch Next */}
                      <div className="rounded-xl border border-orange-250 dark:border-orange-500/10 bg-orange-500/[0.01] p-5">
                        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                          <Compass className="h-4 w-4" />
                          Watch Next
                        </h3>
                        <ul className="mt-3 space-y-2 text-xs text-slate-700 dark:text-slate-350">
                          {Array.isArray(report.watchNext) && report.watchNext.map((item: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <ChevronRight className="mt-0.5 h-3.5 w-3.5 text-orange-500 shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* PredictGPT Dynamic Recommendation / Guidance Insight Box */}
                  <div className="mt-6 rounded-xl border border-orange-500/25 bg-orange-500/5 dark:bg-orange-500/[0.04] p-5">
                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                      <Sparkles className="h-4 w-4 animate-pulse text-[#fa5025]" />
                      <span>PredictGPT Intelligence Guidance</span>
                    </h3>
                    <div className="mt-3.5 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                      <div className="md:col-span-3">
                        <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-350">
                          {confidenceScore > 75 
                            ? `PredictGPT has calculated a high confidence index (${confidenceScore}%) based on scraped developer sources and direct official clarifications. The data signals suggest that positive drivers are strongly established, but caution is recommended regarding the outlined risks. If you align with these direct indicators, YES remains the statistical favorite.` 
                            : `PredictGPT calculated a moderate confidence rating of ${confidenceScore}% due to contrasting coverage. We advise monitoring the upcoming releases and data metrics outlined in the "Watch Next" queue. If you suspect rumors and release complications are overstated, NO offers an attractive risk-reward hedge.`
                          }
                        </p>
                        <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-2 font-mono italic">
                          Disclaimer: PredictGPT handles context mapping and does not provide financial advice. Monitor live Bento SDK pools before settling bets.
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 md:col-span-1 justify-end md:items-end w-full">
                        <span className="text-[10px] uppercase font-mono text-slate-400 dark:text-slate-500 block">Suggested Action</span>
                        <span className="rounded-lg bg-[#fa5025] text-white font-bold text-xs py-2 px-4 shadow text-center w-full block uppercase tracking-wider">
                          {confidenceScore > 75 ? 'Consider YES' : 'Hedge Side'}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

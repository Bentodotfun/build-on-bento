'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { useAppState, RoomMember, RoomAward, Market } from '@/lib/state';
import { 
  Sparkles, Award, Users, ShieldAlert, Zap, Trophy, 
  Share2, Play, AlertCircle, HelpCircle, MessageSquare, 
  Loader2, RefreshCw, VolumeX, Volume2, UserCheck, Flame, Check, Plus, Bookmark
} from 'lucide-react';

export default function RoomsPage() {
  const { 
    rooms, 
    activeRoomId, 
    togglePartyMode, 
    togglePunishmentMode,
    setRoomSummary,
    claimFunnyAward,
    markets,
    placePrediction,
    createRoomMarket,
    userPositions
  } = useAppState();

  const [mounted, setMounted] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [awardingMemberId, setAwardingMemberId] = useState<string | null>(null);
  const [selectedAwardType, setSelectedAwardType] = useState<string>('funniest_prediction');

  // Prediction modal states
  const [predictingMarketId, setPredictingMarketId] = useState<string | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<'YES' | 'NO'>('YES');
  const [predictionAmount, setPredictionAmount] = useState<number>(50);
  const [predictionSuccess, setPredictionSuccess] = useState<string | null>(null);

  // Room Market creation modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('Technology');
  const [createSuccess, setCreateSuccess] = useState(false);

  // Client-side mount to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const activeRoom = rooms.find(r => r.id === activeRoomId);

  if (!activeRoom) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#000000] text-slate-900 dark:text-slate-100">
        <Header />
        <div className="flex h-[80vh] items-center justify-center">
          <p>No active rooms found.</p>
        </div>
      </div>
    );
  }

  // Handle generating summary via API
  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const res = await fetch('/api/room-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeRoom),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setRoomSummary(activeRoom.id, data.summary);
        }
      }
    } catch (err) {
      console.error('Error generating summary:', err);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleOpenAwardModal = (memberId: string) => {
    setAwardingMemberId(memberId);
  };

  const handleConfirmAward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!awardingMemberId) return;

    const member = activeRoom.members.find(m => m.id === awardingMemberId);
    if (member) {
      claimFunnyAward(activeRoom.id, selectedAwardType, member.name);
    }
    setAwardingMemberId(null);
  };

  const handlePredictClick = (marketId: string, outcome: 'YES' | 'NO') => {
    setPredictingMarketId(marketId);
    setSelectedOutcome(outcome);
    setPredictionSuccess(null);
  };

  const handleConfirmPrediction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!predictingMarketId) return;

    placePrediction(predictingMarketId, selectedOutcome, predictionAmount);
    setPredictionSuccess(`Prediction Placed: ${predictionAmount} USDC on ${selectedOutcome}`);

    setTimeout(() => {
      setPredictingMarketId(null);
      setPredictionSuccess(null);
    }, 2000);
  };

  const handleCreateRoomMarketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    createRoomMarket(activeRoom.id, newTitle, newDesc, newCategory);
    setCreateSuccess(true);
    setNewTitle('');
    setNewDesc('');

    setTimeout(() => {
      setCreateSuccess(false);
      setShowCreateModal(false);
    }, 1500);
  };

  // Filter markets specific to this room, or show mock active duels in this league context
  const roomMarkets = markets.filter(m => m.roomId === activeRoom.id || m.id === 'market-3' || m.id === 'market-4');

  const sortedMembers = [...activeRoom.members].sort((a, b) => b.accuracy - a.accuracy);
  const champion = sortedMembers.find(m => m.isChampion) || sortedMembers[0];

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-[#000000] pb-20 text-slate-900 dark:text-slate-100 transition-all duration-300 ${
      activeRoom.partyMode ? 'shadow-inner shadow-purple-500/10 bg-purple-50/20 dark:bg-purple-950/5' : ''
    }`}>
      <Header />

      <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        
        {/* Room Header and Selector */}
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-slate-200 dark:border-[#202430] pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-blue-600 dark:text-blue-400">
              <Users className="h-4 w-4" />
              <span>BENTO PRIVATE LEAGUES</span>
            </div>
            <h1 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{activeRoom.name}</span>
              {activeRoom.partyMode && (
                <span className="animate-bounce inline-block">🎉</span>
              )}
            </h1>
          </div>

          {/* Selector Tabs */}
          <div className="flex items-center gap-1 bg-slate-200/50 dark:bg-white/5 border border-slate-200 dark:border-[#202430] p-1 rounded-xl">
            {rooms.map(room => (
              <button
                key={room.id}
                onClick={() => {
                  useAppState.setState({ activeRoomId: room.id });
                }}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                  activeRoomId === room.id 
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/10' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {room.name.split(' ')[1] || room.name}
              </button>
            ))}
          </div>
        </div>

        {/* Party Banner */}
        {activeRoom.partyMode && (
          <div className="mb-6 rounded-xl border border-purple-200 dark:border-purple-500/20 bg-purple-50 dark:bg-purple-500/5 px-4 py-3 text-center text-xs text-purple-700 dark:text-purple-300 font-mono animate-pulse">
            🥳 <strong>PARTY MODE IS ACTIVE!</strong> Chat emojis are boosted and standings are heated. Enjoy the hype!
          </div>
        )}

        {/* Content Layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          
          {/* Left Column: Leaderboard, Predictions, Awards, Timeline */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Leaderboard Panel */}
            <section className="pm-card p-6 relative overflow-hidden">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  <Trophy className="h-4.5 w-4.5 text-orange-500" />
                  <span>Room Leaderboard</span>
                </h3>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-[#202430] bg-slate-50 dark:bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Share Card</span>
                </button>
              </div>

              {/* Leaderboard Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#202430] text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      <th className="pb-3 text-center">Rank</th>
                      <th className="pb-3 pl-2">Member</th>
                      <th className="pb-3 text-center">Streak</th>
                      <th className="pb-3 text-center">Accuracy</th>
                      <th className="pb-3 text-center">Win Rate</th>
                      <th className="pb-3 text-right">XP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#202430]">
                    {activeRoom.members.map((member) => (
                      <tr key={member.id} className="group hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-all">
                        <td className="py-3.5 text-center">
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold font-mono ${
                            member.rank === 1 ? 'bg-orange-500 text-black' :
                            member.rank === 2 ? 'bg-zinc-400 text-black' :
                            member.rank === 3 ? 'bg-amber-700 text-white' :
                            'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40'
                          }`}>
                            {member.rank}
                          </span>
                        </td>
                        <td className="py-3.5 pl-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl leading-none">{member.avatar}</span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-800 dark:text-white/95">{member.name}</span>
                                {member.isChampion && (
                                  <span className="rounded bg-orange-500/15 border border-orange-500/25 px-1 py-0.5 text-[8px] font-bold text-orange-600 dark:text-orange-400 uppercase">
                                    CHAMP
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 text-center font-mono font-bold text-orange-500">
                          {member.streak > 0 ? (
                            <span className="flex items-center justify-center gap-0.5">
                              <Flame className="h-4.5 w-4.5 fill-orange-500 text-orange-500" />
                              <span>{member.streak}</span>
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-white/10">-</span>
                          )}
                        </td>
                        <td className="py-3.5 text-center font-mono font-semibold text-slate-700 dark:text-white/80">{member.accuracy}%</td>
                        <td className="py-3.5 text-center font-mono text-slate-500 dark:text-white/50">{member.winRate}%</td>
                        <td className="py-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {mounted ? member.xp.toLocaleString() : '2,450'} XP
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Room Predictions Section */}
            <section className="pm-card p-6">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  <Award className="h-4.5 w-4.5 text-indigo-500" />
                  <span>Room Prediction Duels</span>
                </h3>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-blue-700 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Room Duel</span>
                </button>
              </div>

              {roomMarkets.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">No room prediction duels created yet.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {roomMarkets.map((market) => (
                    <div key={market.id} className="rounded-xl border border-slate-200 dark:border-[#202430] bg-slate-50 dark:bg-white/[0.01] p-4 flex flex-col justify-between">
                      <div>
                        <span className="rounded bg-slate-100 dark:bg-white/5 border border-slate-250 dark:border-[#202430] px-2 py-0.5 text-[8px] font-mono uppercase text-slate-500 dark:text-slate-400">
                          {market.category}
                        </span>
                        <h4 className="mt-2 text-xs font-bold text-slate-800 dark:text-white leading-snug">{market.title}</h4>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => handlePredictClick(market.id, 'YES')}
                          className="flex-1 btn-yes py-1.5 text-[11px] font-bold rounded-lg cursor-pointer"
                        >
                          YES · {market.yesPercent}%
                        </button>
                        <button
                          onClick={() => handlePredictClick(market.id, 'NO')}
                          className="flex-1 btn-no py-1.5 text-[11px] font-bold rounded-lg cursor-pointer"
                        >
                          NO · {market.noPercent}%
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Awards Panel */}
            <section className="pm-card p-6">
              <h3 className="mb-5 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                <Award className="h-4.5 w-4.5 text-blue-500" />
                <span>Room Badges</span>
              </h3>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {activeRoom.awards.map((award, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 dark:border-[#202430] bg-slate-50 dark:bg-white/[0.02] p-4 flex items-start gap-3">
                    <span className="text-2xl leading-none mt-1">{award.icon}</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white">{award.title}</h4>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">Recipient: {award.recipient}</p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 leading-snug">{award.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Gift Badge Action */}
              <div className="mt-5 border-t border-slate-100 dark:border-[#202430] pt-4 flex flex-wrap gap-2.5 items-center justify-between">
                <span className="text-xs text-slate-400 dark:text-slate-500">Spotted a legendary prediction? Gift a badge:</span>
                <div className="flex gap-2">
                  {activeRoom.members.filter(m => !m.name.includes('You')).slice(0, 2).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleOpenAwardModal(m.id)}
                      className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-2.5 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                    >
                      Award {m.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Timeline */}
            <section className="pm-card p-6">
              <h3 className="mb-5 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                <Zap className="h-4 w-4 text-slate-400" />
                <span>Timeline Logs</span>
              </h3>

              <div className="relative border-l border-slate-200 dark:border-[#202430] ml-3 pl-5 space-y-4">
                {activeRoom.timeline.map((event, idx) => (
                  <div key={idx} className="relative">
                    {/* Bullet */}
                    <div className={`absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-slate-50 dark:border-[#0a0d14] ${
                      event.type === 'bet' ? 'bg-orange-500' :
                      event.type === 'win' ? 'bg-emerald-500' :
                      'bg-purple-500'
                    }`} />
                    
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-xs text-slate-700 dark:text-slate-350">
                        <span className="font-bold text-slate-900 dark:text-white">{event.user}</span>{' '}
                        <span>{event.text}</span>
                      </p>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0">{event.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>

          {/* Right Column: AI Summary, Rules & Penalties */}
          <div className="space-y-6">
            
            {/* Toggles */}
            <section className="pm-card p-5">
              <h3 className="mb-4 text-xs font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Modifiers</h3>
              
              <div className="space-y-3">
                {/* Party Mode */}
                <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-[#202430] bg-slate-50 dark:bg-white/[0.02] p-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white">🎉 Party Mode</h4>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">Hype & chat emoji boosts.</p>
                  </div>
                  <button
                    onClick={() => togglePartyMode(activeRoom.id)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      activeRoom.partyMode ? 'bg-purple-600' : 'bg-slate-300 dark:bg-zinc-700'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${
                      activeRoom.partyMode ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Punishment Mode */}
                <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-[#202430] bg-slate-50 dark:bg-white/[0.02] p-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white">🌶 Punishment Mode</h4>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">Enforces room penalty terms.</p>
                  </div>
                  <button
                    onClick={() => togglePunishmentMode(activeRoom.id)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      activeRoom.punishmentMode ? 'bg-red-600' : 'bg-slate-300 dark:bg-zinc-700'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${
                      activeRoom.punishmentMode ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>
            </section>

            {/* Punishment Alert Banner */}
            {activeRoom.punishmentMode && activeRoom.funnyRule && (
              <section className="pm-card border-red-500/20 bg-red-500/5 dark:bg-red-500/[0.02] p-5">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Punishment Enforced</h4>
                    <p className="mt-2 text-xs font-bold text-slate-800 dark:text-white leading-relaxed italic">
                      "{activeRoom.funnyRule}"
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* AI Room Summary */}
            <section className="pm-card p-5">
              <h3 className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                <Sparkles className="h-4 w-4 animate-pulse" />
                <span>AI Room Wrap-Up</span>
              </h3>

              {activeRoom.summary ? (
                <div className="mt-4">
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.01] border border-slate-200 dark:border-[#202430] rounded-xl p-3.5">
                    {activeRoom.summary}
                  </p>
                  <button
                    onClick={handleGenerateSummary}
                    disabled={generatingSummary}
                    className="mt-4 flex items-center justify-center gap-1.5 w-full rounded-xl border border-slate-200 dark:border-[#202430] bg-slate-50 dark:bg-white/5 py-2.5 text-xs font-bold text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition disabled:opacity-50"
                  >
                    {generatingSummary ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5 text-orange-500" />
                    )}
                    <span>Re-generate Summary</span>
                  </button>
                </div>
              ) : (
                <div className="mt-4 text-center py-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                    Compile league scores and stand logs to generate a sass analysis.
                  </p>
                  <button
                    onClick={handleGenerateSummary}
                    disabled={generatingSummary}
                    className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-orange-600 py-2.5 text-xs font-bold text-white hover:bg-orange-700 transition disabled:opacity-50"
                  >
                    {generatingSummary ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    <span>Generate AI Wrap-Up</span>
                  </button>
                </div>
              )}
            </section>

          </div>

        </div>

      </main>

      {/* Share standings card dialog */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-[#202430] bg-white dark:bg-[#131722] p-6 shadow-2xl transition-colors duration-200">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Share Standings Card</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Standings code ready to share.</p>

            <div className="mt-5 rounded-2xl border border-slate-200 dark:border-[#202430] bg-slate-50 dark:bg-[#0d1017] p-5 text-center shadow-lg">
              <div className="flex items-center justify-center gap-1 text-[10px] font-mono tracking-widest text-orange-600 dark:text-orange-400 uppercase">
                <Sparkles className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                <span>PREDICTGPT LEAGUE CARD</span>
              </div>
              <h4 className="mt-2 text-lg font-black text-slate-800 dark:text-white">{activeRoom.name}</h4>

              <div className="my-6 grid grid-cols-2 gap-4 border-y border-slate-200 dark:border-[#202430] py-4">
                <div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">Room Champion</p>
                  <p className="mt-1 text-sm font-bold text-slate-800 dark:text-white flex items-center justify-center gap-1">
                    <span>{champion.avatar}</span>
                    <span>{champion.name}</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">Top Accuracy</p>
                  <p className="mt-1 text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{champion.accuracy}%</p>
                </div>
              </div>

              <p className="text-[9px] font-mono text-slate-400 dark:text-slate-500 tracking-tight">Code: BNT-ROOM-{activeRoom.id.toUpperCase()}</p>
            </div>

            <div className="mt-6 flex gap-3">
              <button 
                onClick={() => setShowShareModal(false)}
                className="flex-1 rounded-xl border border-slate-200 dark:border-[#202430] py-2.5 text-xs font-bold text-slate-500 dark:text-white/60 hover:bg-slate-50 dark:hover:bg-white/5"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`Standings in ${activeRoom.name}! invite code: BNT-ROOM-${activeRoom.id.toUpperCase()}`);
                  alert('Standings invite code copied to clipboard!');
                  setShowShareModal(false);
                }}
                className="flex-1 rounded-xl bg-blue-600 text-white py-2.5 text-xs font-bold hover:bg-blue-700"
              >
                Copy Invite Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Give Award Modal */}
      {awardingMemberId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-[#202430] bg-white dark:bg-[#131722] p-6 shadow-2xl">
            <form onSubmit={handleConfirmAward}>
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Award className="h-5 w-5 text-blue-500" />
                <span>Gift AI Award Badge</span>
              </h3>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Member: {activeRoom.members.find(m => m.id === awardingMemberId)?.name}
              </p>

              <div className="mt-4">
                <label className="text-xs text-slate-500">Choose Award Badge</label>
                <select
                  value={selectedAwardType}
                  onChange={(e) => setSelectedAwardType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-[#202430] bg-slate-50 dark:bg-[#0e0e12] px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="funniest_prediction">🤡 Funniest Prediction (For wild claims)</option>
                  <option value="room_mvp">👑 Room MVP (High vibes analyst)</option>
                </select>
              </div>

              <div className="mt-6 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setAwardingMemberId(null)}
                  className="flex-1 rounded-lg border border-slate-200 dark:border-[#202430] py-2.5 text-xs font-semibold text-slate-500 dark:text-white/60 hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 rounded-lg bg-blue-600 text-white py-2.5 text-xs font-semibold hover:bg-blue-700"
                >
                  Confirm Award
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Room Bet prediction Modal Overlay */}
      {predictingMarketId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-[#202430] bg-white dark:bg-[#131722] p-6 shadow-2xl transition-colors duration-200">
            {predictionSuccess ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  <Check className="h-6 w-6" />
                </div>
                <p className="mt-4 font-bold text-slate-800 dark:text-white">{predictionSuccess}</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Bento contract updated successfully.</p>
              </div>
            ) : (
              <form onSubmit={handleConfirmPrediction}>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">Confirm Predict on Bento</h3>
                <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500 line-clamp-2">
                  "{markets.find(m => m.id === predictingMarketId)?.title}"
                </p>

                <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 dark:bg-white/5 p-2.5 font-mono text-xs">
                  <span className="text-slate-500">Side Selected</span>
                  <span className={`rounded-md px-2.5 py-0.5 font-bold ${selectedOutcome === 'YES' ? 'bg-orange-500/10 text-[#fa5025] dark:text-[#fa5025]' : 'bg-slate-550/15 text-slate-500 dark:text-slate-400'}`}>
                    {selectedOutcome}
                  </span>
                </div>

                <div className="mt-4">
                  <label className="text-xs text-slate-500">Amount (USDC)</label>
                  <input 
                    type="number" 
                    value={predictionAmount}
                    onChange={(e) => setPredictionAmount(Math.max(1, parseInt(e.target.value) || 0))}
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-[#202430] bg-white dark:bg-white/5 px-3 py-2 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#fa5025]"
                  />
                </div>

                <div className="mt-6 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setPredictingMarketId(null)}
                    className="flex-1 rounded-xl border border-slate-200 dark:border-[#202430] py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5"
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

      {/* Create Room Market Modal Overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-[#202430] bg-white dark:bg-[#131722] p-6 shadow-2xl">
            {createSuccess ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  <Check className="h-6 w-6" />
                </div>
                <p className="mt-4 font-bold text-slate-800 dark:text-white">Room Duel Created Instantly!</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">All room members can now predict on this league contract.</p>
              </div>
            ) : (
              <form onSubmit={handleCreateRoomMarketSubmit} className="space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Room Prediction Duel</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">Private room predictions are created instantly and are exclusive to this league.</p>

                <div>
                  <label className="text-xs font-bold text-slate-500">Duel Question / Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Will Mannan claim the next funniest prediction badge?"
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-[#202430] bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500">Description / Settlement Rules</label>
                  <textarea
                    rows={3}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Provide context and rules..."
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-[#202430] bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-[#202430] bg-slate-50 dark:bg-[#1b2030] px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none"
                  >
                    <option value="Technology">Technology</option>
                    <option value="AI">AI</option>
                    <option value="Formula 1">Formula 1</option>
                    <option value="Football">Football</option>
                  </select>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 rounded-xl border border-slate-200 dark:border-[#202430] py-2.5 text-xs font-bold text-slate-505 hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-[#fa5025] text-white py-2.5 text-xs font-bold hover:bg-[#e0451e]"
                  >
                    Create Room Market
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

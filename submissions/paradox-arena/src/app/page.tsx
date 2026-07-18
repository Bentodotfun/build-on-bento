'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Zap,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface LogLine {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'data';
  data?: unknown;
}

interface UserShares {
  amount: string;
  shares_value_usdc?: string;
  avg_price_paid_usdc?: string;
  option_index: number;
}

interface HistoryItem {
  timestamp: string;
  role: 'human' | 'ai';
  type: 'Bet Placed' | 'Faucet Claim' | 'Duel Settlement';
  amount: string;
  outcome: string;
  market: string;
}

// ── Scenario Config ───────────────────────────────────────────────────────────

const SCENARIO = {
  title: 'England vs Argentina — FIFA World Cup 2026',
  question: 'Will Argentina win the match against England?',
  marketLabel: 'Argentina Win',
  context:
    "It's the round of 16. Argentina, the defending World Cup champions, face England in a high-stakes rematch. The crowd is electric. Both teams are evenly matched on paper — but Argentina's recent form and Messi's legacy give them the edge in the eyes of many.",
  tags: ['FIFA World Cup 2026', 'Round of 16', 'Argentina', 'England'],
  redditUrl:
    'https://www.reddit.com/r/worldcup/comments/1uxck5c/match_thread_england_vs_argentina_world_cup/?sort=confidence',
  bentoMarketId: 'a9b1101d6eef1ff2b2ac4735027a3111d58b48412b3c867bbe5adf8622447011',
  matchStats: {
    argentinaWinProb: 58,
    drawProb: 22,
    englandWinProb: 20,
    venue: 'Lusail Stadium, Qatar',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatWei(wei: string) {
  if (!wei) return '0.0000';
  try {
    const val = parseFloat(wei) / 1e18;
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  } catch {
    return '0.0000';
  }
}

const normalizeToWeiStr = (val: any) => {
  if (!val) return '0';
  const valStr = String(val);
  if (valStr.includes('0000000000000')) {
    return valStr;
  }
  try {
    const parsed = parseFloat(valStr);
    if (isNaN(parsed)) return '0';
    if (parsed < 1e9) {
      return String(BigInt(Math.floor(parsed * 1e18)));
    }
    return valStr;
  } catch {
    return valStr;
  }
};

// ── Live Ticker & Timeline ───────────────────────────────────────────────────

const MATCH_TIMELINE = [
  { minute: "11'", score: "ARG 0 – 0 ENG", event: "11' — Argentina corner — headed wide" },
  { minute: "21'", score: "ARG 0 – 0 ENG", event: "21' — Messi free kick saved by Pickford!" },
  { minute: "38'", score: "ARG 0 – 0 ENG", event: "38' — VAR review: penalty call overturned" },
  { minute: "43'", score: "ARG 0 – 0 ENG", event: "43' — Yellow card: De Paul (ARG)" },
  { minute: "54'", score: "ARG 0 – 1 ENG", event: "54' — GOAL! England take the lead — Bellingham strike!" },
  { minute: "67'", score: "ARG 1 – 1 ENG", event: "67' — GOAL! Argentina equalise through Fernandez!" },
  { minute: "75'", score: "ARG 1 – 1 ENG", event: "75' — Midfield battle intensifies — high pressing!" },
  { minute: "84'", score: "ARG 1 – 1 ENG", event: "84' — Alvarez shot saved by Pickford!" },
  { minute: "90'", score: "ARG 2 – 1 ENG", event: "90' — GOAL! Messi scores a penalty in injury time!" },
  { minute: "90+4'", score: "ARG 2 – 1 ENG", event: "90+4' — Full time whistle! Argentina wins 2 – 1!" },
];

function LiveTicker({ event }: { event: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 bg-error/10 border border-error/20 text-error text-[10px] font-bold rounded uppercase tracking-[0.2em] animate-pulse">
      <span className="w-1.5 h-1.5 bg-error rounded-full"></span>
      {event.length > 35 ? event.slice(0, 35) + '...' : event}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Home() {
  const [redditUrl, setRedditUrl] = useState(SCENARIO.redditUrl);

  const [timelineIdx, setTimelineIdx] = useState(5);
  const [resolvedOutcome, setResolvedOutcome] = useState<'YES' | 'NO' | null>(null);
  const [resolvingMarket, setResolvingMarket] = useState(false);
  const [resolveMessage, setResolveMessage] = useState<{ text: string; type: 'success' | 'warning' } | null>(null);

  const [faucetLoading, setFaucetLoading] = useState<'human' | 'ai' | null>(null);
  const [faucetStatus, setFaucetStatus] = useState<string | null>(null);

  // Balances
  const [humanBalance, setHumanBalance] = useState<number>(0.0);
  const [aiBalance, setAiBalance] = useState<number>(0.0);

  // Transaction History
  const [history, setHistory] = useState<HistoryItem[]>([
    { timestamp: new Date().toLocaleTimeString(), role: 'human', type: 'Duel Settlement', amount: '—', outcome: 'READY', market: 'World Cup 2026' },
  ]);

  // Human prediction state
  const [humanBetting, setHumanBetting] = useState(false);
  const [humanBetResult, setHumanBetResult] = useState<{
    success: boolean;
    message: string;
    error?: string;
  } | null>(null);
  const [humanShares, setHumanShares] = useState<UserShares[] | null>(null);
  const [humanAddress, setHumanAddress] = useState('');

  // AI prediction state
  const [aiDuelRunning, setAiDuelRunning] = useState(false);
  const [aiLogs, setAiLogs] = useState<LogLine[]>([]);
  const [aiShares, setAiShares] = useState<UserShares[] | null>(null);
  const [aiAddress, setAiAddress] = useState('');
  const [aiDecision, setAiDecision] = useState<'NONE' | 'YES' | 'NO'>('NONE');
  const [aiProbability, setAiProbability] = useState<number | null>(null);

  // AI Thinking panel tab state
  const [aiTab, setAiTab] = useState<'thinking' | 'sources'>('thinking');
  const [aiThinking, setAiThinking] = useState<{
    redditSnippet: string;
    espnSnippet: string;
    rawPrompt: string;
    jsonResponse: string | null;
    sentiment: string;
    panicIndex: number;
    reasoning: string;
  } | null>(null);

  // Market
  const [activeDuelId, setActiveDuelId] = useState<string>(SCENARIO.bentoMarketId);
  const [inviteCode, setInviteCode] = useState<string>('');
  const [creatingMarket, setCreatingMarket] = useState(false);
  const [loadingShares, setLoadingShares] = useState(false);

  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal internally
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [aiLogs]);

  // Cycle match events
  useEffect(() => {
    const t = setInterval(() => {
      setTimelineIdx((i) => (i + 1) % MATCH_TIMELINE.length);
    }, 5500);
    return () => clearInterval(t);
  }, []);

  // Load config on mount
  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((config) => {
        if (config.humanAddress) setHumanAddress(config.humanAddress);
        if (config.aiAddress) setAiAddress(config.aiAddress);
        fetchPositions(config.humanAddress, config.aiAddress, activeDuelId);
      })
      .catch((err) => console.error('Failed to load config:', err));
  }, []);

  // Fetch Positions & Balances (Real-time)
  const fetchPositions = async (hAddr?: string, aAddr?: string, currentDuelId?: string) => {
    setLoadingShares(true);
    const targetHumanAddr = hAddr !== undefined ? hAddr : humanAddress;
    const targetAiAddr = aAddr !== undefined ? aAddr : aiAddress;
    const targetDuelId = currentDuelId !== undefined ? currentDuelId : activeDuelId;

    if (!targetHumanAddr && !targetAiAddr) {
      setLoadingShares(false);
      return;
    }

    try {
      // Fetch human details
      if (targetHumanAddr) {
        const humanRes = await fetch(`/api/shares?role=human&duelId=${targetDuelId}&address=${targetHumanAddr}`).then(r => r.json());
        if (humanRes.success) {
          setHumanBalance(humanRes.creditsBalance);
          if (humanRes.shares) {
            const sharesObj = humanRes.shares;
            const mappedShares = [];
            const opt0Wei = normalizeToWeiStr(sharesObj.option0);
            const opt1Wei = normalizeToWeiStr(sharesObj.option1);
            if (parseFloat(opt0Wei) > 0) {
              mappedShares.push({ amount: opt0Wei, option_index: 0 });
            }
            if (parseFloat(opt1Wei) > 0) {
              mappedShares.push({ amount: opt1Wei, option_index: 1 });
            }
            setHumanShares(mappedShares.length > 0 ? mappedShares : null);
          }
        }
      }

      // Fetch AI details
      if (targetAiAddr) {
        const aiRes = await fetch(`/api/shares?role=ai&duelId=${targetDuelId}&address=${targetAiAddr}`).then(r => r.json());
        if (aiRes.success) {
          setAiBalance(aiRes.creditsBalance);
          if (aiRes.shares) {
            const sharesObj = aiRes.shares;
            const mappedShares = [];
            const opt0Wei = normalizeToWeiStr(sharesObj.option0);
            const opt1Wei = normalizeToWeiStr(sharesObj.option1);
            if (parseFloat(opt0Wei) > 0) {
              mappedShares.push({ amount: opt0Wei, option_index: 0 });
            }
            if (parseFloat(opt1Wei) > 0) {
              mappedShares.push({ amount: opt1Wei, option_index: 1 });
            }
            setAiShares(mappedShares.length > 0 ? mappedShares : null);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch positions:', err);
    } finally {
      setLoadingShares(false);
      if (hAddr !== undefined) setHumanAddress(hAddr);
      if (aAddr !== undefined) setAiAddress(aAddr);
    }
  };

  // Create Custom Prediction Market
  const handleCreateMarket = async () => {
    setCreatingMarket(true);
    setFaucetStatus('Deploying custom prediction market on Bento host...');
    try {
      const res = await fetch('/api/create-market', { method: 'POST' }).then(r => r.json());
      if (res.success && res.duelId) {
        setActiveDuelId(res.duelId);
        setInviteCode(res.inviteCode);
        
        setFaucetStatus(`Success: Private credits market created on-chain! ID: ${res.duelId.slice(0, 12)}...`);
        setHistory((prev) => [
          {
            timestamp: new Date().toLocaleTimeString(),
            role: 'human',
            type: 'Duel Settlement',
            amount: '—',
            outcome: 'CREATED',
            market: `Private Duel ${res.duelId.slice(0, 8)}`,
          },
          ...prev,
        ]);
        await fetchPositions(humanAddress, aiAddress, res.duelId);
      } else {
        setFaucetStatus(`Deploy failed: ${res.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('Error creating market:', err);
      setFaucetStatus(`Deploy error: ${err.message}`);
    } finally {
      setCreatingMarket(false);
      setTimeout(() => setFaucetStatus(null), 6000);
    }
  };

  // Human Bet (Real)
  const handleHumanBet = async (optionIndex: number) => {
    setHumanBetting(true);
    setHumanBetResult(null);

    try {
      const res = await fetch('/api/human-bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duelId: activeDuelId,
          optionIndex,
          amount: '5000000000000000000', // 5 credits
        }),
      }).then(r => r.json());

      if (res.success) {
        setHumanBetResult({
          success: true,
          message: `Bet ${optionIndex === 0 ? 'YES' : 'NO'} placed — 5 free-play credits staked successfully on-chain!`,
        });
        setHistory((prev) => [
          {
            timestamp: new Date().toLocaleTimeString(),
            role: 'human',
            type: 'Bet Placed',
            amount: '5.00',
            outcome: optionIndex === 0 ? 'YES' : 'NO',
            market: `Duel Prediction (${activeDuelId.slice(0, 8)})`,
          },
          ...prev,
        ]);
        await fetchPositions(humanAddress, aiAddress);
      } else {
        setHumanBetResult({
          success: false,
          message: 'Bet rejected by Bento.',
          error: res.error || 'Unknown error placing bet.',
        });
      }
    } catch (err: any) {
      console.error('Bet error:', err);
      setHumanBetResult({
        success: false,
        message: 'Bet execution failed.',
        error: err.message,
      });
    } finally {
      setHumanBetting(false);
    }
  };

  // AI Duel Stream (Real-time logs NDJSON consumption)
  const startAiDuel = async () => {
    if (aiDuelRunning) return;
    setAiDuelRunning(true);
    setAiLogs([]);
    setAiDecision('NONE');
    setAiProbability(null);
    setAiThinking(null);

    try {
      const response = await fetch(`/api/duel?duelId=${activeDuelId}&inviteCode=${inviteCode}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No readable stream reader');

      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            
            // Append line to logs
            setAiLogs((prev) => [
              ...prev,
              {
                timestamp: parsed.timestamp || new Date().toLocaleTimeString(),
                message: parsed.message,
                type: parsed.type,
              },
            ]);

            // Track specific log structures to fill state details
            if (parsed.type === 'data' && parsed.data) {
              if (parsed.data.analysis) {
                const analysis = parsed.data.analysis;
                const prob = analysis.probability;
                setAiProbability(prob);
                setAiDecision(prob > 50 ? 'YES' : 'NO');
                setAiThinking({
                  redditSnippet: `[u/MessiMagic10]: "If Argentina wins, it's Lionel's final tournament carry. Midfield is pressing."\n[u/ThreeLionsPride]: "Bellingham is on fire. England has this."\n[u/TacticalAnalyst]: "Argentina's 4-3-3 is locking wings."`,
                  espnSnippet: `67' - GOAL! Argentina equalize. Fernandez fires it home.\n54' - GOAL! Bellingham puts England ahead.`,
                  rawPrompt: `You are an AI sports analyst. Will Argentina win the match?`,
                  jsonResponse: JSON.stringify(analysis, null, 2),
                  sentiment: (analysis.sentiment || 'neutral').toUpperCase(),
                  panicIndex: analysis.panicIndex || 40,
                  reasoning: analysis.reasoning || '',
                });
              } else if (parsed.data.shares) {
                const sharesObj = parsed.data.shares;
                const mappedShares = [];
                const opt0Wei = normalizeToWeiStr(sharesObj.option0);
                const opt1Wei = normalizeToWeiStr(sharesObj.option1);
                if (parseFloat(opt0Wei) > 0) {
                  mappedShares.push({ amount: opt0Wei, option_index: 0 });
                }
                if (parseFloat(opt1Wei) > 0) {
                  mappedShares.push({ amount: opt1Wei, option_index: 1 });
                }
                setAiShares(mappedShares.length > 0 ? mappedShares : null);
              }
            } else if (parsed.message.includes('the AI Agent will bet:')) {
              const yesIdx = parsed.message.indexOf('YES');
              setAiDecision(yesIdx !== -1 ? 'YES' : 'NO');
            } else if (parsed.message.includes('Bet YES placed') || parsed.message.includes('Bet NO placed')) {
              setHistory((prev) => [
                {
                  timestamp: new Date().toLocaleTimeString(),
                  role: 'ai',
                  type: 'Bet Placed',
                  amount: '5.00',
                  outcome: parsed.message.includes('YES') ? 'YES' : 'NO',
                  market: `Duel Prediction (${activeDuelId.slice(0, 8)})`,
                },
                ...prev,
              ]);
            }
          } catch (e) {
            console.error('Failed to parse NDJSON line:', e);
          }
        }
      }
      
      // Post-sync balance/shares
      await fetchPositions(humanAddress, aiAddress);
    } catch (err: any) {
      console.error('AI Duel Stream error:', err);
      setAiLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          message: `❌ Error: ${err.message}`,
          type: 'error',
        },
      ]);
    } finally {
      setAiDuelRunning(false);
    }
  };

  // Reset Arena (State reset + positions refresh)
  const resetArena = () => {
    setAiLogs([]);
    setAiDecision('NONE');
    setAiProbability(null);
    setHumanBetResult(null);
    setResolvedOutcome(null);
    setResolveMessage(null);
    setHumanShares(null);
    setAiShares(null);
    setAiThinking(null);
    fetchPositions(humanAddress, aiAddress);
  };

  // Resolve Market (Real)
  const handleResolveMarket = async (outcome: 'YES' | 'NO') => {
    setResolvingMarket(true);
    setResolveMessage(null);
    try {
      const res = await fetch('/api/resolve-duel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duelId: activeDuelId,
          outcome,
        }),
      }).then(r => r.json());

      if (res.success) {
        setResolvedOutcome(outcome);
        setResolveMessage({
          text: `Market resolved as ${outcome} successfully! Duel settled on-chain.`,
          type: 'success',
        });
        setHistory((prev) => [
          {
            timestamp: new Date().toLocaleTimeString(),
            role: 'human',
            type: 'Duel Settlement',
            amount: '—',
            outcome,
            market: `Duel ${activeDuelId.slice(0, 8)} Settle`,
          },
          ...prev,
        ]);
        await fetchPositions(humanAddress, aiAddress);
      } else {
        setResolvedOutcome(outcome);
        setResolveMessage({
          text: res.msg || `On-chain resolution failed, simulated outcome set to ${outcome}`,
          type: 'warning',
        });
      }
    } catch (err: any) {
      console.error('Resolve error:', err);
      setResolvedOutcome(outcome);
      setResolveMessage({
        text: `Resolve error: ${err.message}. Simulated outcome set to ${outcome}`,
        type: 'warning',
      });
    } finally {
      setResolvingMarket(false);
    }
  };

  // Faucet request (Real)
  const handleRequestFaucet = async (addressToFund: string, role: 'human' | 'ai') => {
    if (!addressToFund) return;
    setFaucetLoading(role);
    setFaucetStatus(`Requesting faucet funds for ${role === 'human' ? 'Human' : 'AI'} smart wallet...`);
    try {
      const res = await fetch('/api/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addressToFund }),
      }).then(r => r.json());

      if (res.success) {
        setFaucetStatus(`Success: Free-play credits and test tokens successfully minted to your smart wallet!`);
        setHistory((prev) => [
          {
            timestamp: new Date().toLocaleTimeString(),
            role,
            type: 'Faucet Claim',
            amount: '10.00',
            outcome: '—',
            market: 'Credits Faucet',
          },
          ...prev,
        ]);
        await fetchPositions(humanAddress, aiAddress);
      } else {
        setFaucetStatus(`Faucet failed: ${res.error || 'Allocation limit reached.'}`);
      }
    } catch (err: any) {
      console.error('Faucet error:', err);
      setFaucetStatus(`Faucet error: ${err.message}`);
    } finally {
      setFaucetLoading(null);
      setTimeout(() => setFaucetStatus(null), 5000);
    }
  };

  const determineDuelWinner = () => {
    if (!resolvedOutcome) return null;
    const humanOption = humanHolding ? humanShares[0].option_index : null;
    const aiOption = aiHolding ? aiShares[0].option_index : null;

    const winningOptionIndex = resolvedOutcome === 'YES' ? 0 : 1;

    const humanCorrect = humanOption !== null && humanOption === winningOptionIndex;
    const aiCorrect = aiOption !== null && aiOption === winningOptionIndex;

    if (humanCorrect && aiCorrect) return 'BOTH';
    if (humanCorrect) return 'HUMAN';
    if (aiCorrect) return 'AI';
    if (!humanHolding && !aiHolding) return 'NO_BETS';
    return 'NEITHER';
  };

  // Auto-resolve when BOTH predictions are placed (in real time)
  useEffect(() => {
    const hasHuman = humanShares && humanShares.length > 0;
    const hasAi = aiShares && aiShares.length > 0;
    if (hasHuman && hasAi && !resolvedOutcome && !resolvingMarket) {
      const timer = setTimeout(() => {
        setTimelineIdx(MATCH_TIMELINE.length - 1);
        handleResolveMarket('YES');
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [humanShares, aiShares, resolvedOutcome, resolvingMarket]);

  // ── Render ──────────────────────────────────────────────────────────────────

  const humanHolding = humanShares && humanShares.length > 0;
  const aiHolding = aiShares && aiShares.length > 0;

  const humanAmount = humanShares && humanShares.length > 0 ? parseFloat(humanShares[0].amount) : 0;
  const aiAmount = aiShares && aiShares.length > 0 ? parseFloat(aiShares[0].amount) : 0;
  const totalAmount = humanAmount + aiAmount;
  const humanRatio = totalAmount > 0 ? (humanAmount / totalAmount) * 100 : 50;

  const dynamicARGProb = aiProbability ?? SCENARIO.matchStats.argentinaWinProb;
  const dynamicENGProb = aiProbability !== null ? 100 - aiProbability - 22 : SCENARIO.matchStats.englandWinProb;

  // Jittered stats progression based on match progress
  const dynamicARGShots = Math.floor(timelineIdx * 0.8 + 1);
  const dynamicENGShots = Math.floor(timelineIdx * 0.6 + 2);
  const dynamicARGCorners = Math.floor(timelineIdx * 0.5 + 1);
  const dynamicENGCorners = Math.floor(timelineIdx * 0.4 + 2);

  return (
    <div className="bg-surface text-on-surface selection:bg-primary-container selection:text-on-primary-container min-h-screen overflow-x-hidden pb-12 font-sans">
      
      {/* Grid Background */}
      <div className="light-grid-bg"></div>

      {/* TopNavBar */}
      <header className="fixed top-0 w-full z-50 flex items-center justify-between px-margin-edge h-16 bg-surface/80 backdrop-blur-md border-b border-outline-variant">
        <div className="flex items-center gap-8">
          <span className="font-display-lg text-headline-lg tracking-tighter text-electric-blue">MIND VS MACHINE ARENA</span>
          <nav className="hidden md:flex items-center gap-6">
            <Link className="text-electric-blue border-b-2 border-electric-blue pb-1 font-title-md text-body-sm transition-all duration-300" href="/">Live Duel</Link>
            <Link className="text-on-surface-variant hover:text-electric-blue transition-colors font-title-md text-body-sm" href="/paradox-arena">Paradox Arena</Link>
            <a className="text-on-surface-variant hover:text-electric-blue transition-colors font-title-md text-body-sm" href="#">Staking</a>
            <a className="text-on-surface-variant hover:text-electric-blue transition-colors font-title-md text-body-sm" href="#">Bento</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-on-surface-variant hover:text-electric-blue transition-all duration-350 cursor-pointer">account_balance_wallet</span>
          <span className="material-symbols-outlined text-on-surface-variant hover:text-electric-blue transition-all duration-350 cursor-pointer">notifications</span>
          <button className="px-5 py-2 bg-electric-blue text-on-primary font-label-caps text-label-caps rounded shadow-sm hover:brightness-110 active:scale-95 transition-all rounded-xl">
            {humanAddress ? `${humanAddress.slice(0, 6)}...${humanAddress.slice(-4)}` : 'CONNECT WALLET'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 px-margin-edge max-w-7xl mx-auto flex flex-col gap-6">
        
        {/* Arena Operations Header */}
        <div className="flex items-center justify-between bg-surface-container-lowest border border-outline-variant rounded p-4 shadow-sm rounded-xl">
          <div className="flex items-center gap-4">
            <span className="font-label-caps text-label-caps text-on-surface-variant flex items-center gap-2">
              <span className="w-2 h-2 bg-electric-blue rounded-full animate-pulse"></span>
              ARENA OPERATIONS
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => fetchPositions(humanAddress, aiAddress, activeDuelId)}
                disabled={loadingShares}
                className="p-1 text-on-surface-variant hover:text-electric-blue transition-all duration-300 transform hover:rotate-180 material-symbols-outlined text-xl cursor-pointer disabled:opacity-50"
              >
                refresh
              </button>
              <button 
                onClick={resetArena}
                className="p-1 text-on-surface-variant hover:text-error transition-all duration-300 transform hover:scale-110 material-symbols-outlined text-xl cursor-pointer"
              >
                restart_alt
              </button>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleCreateMarket}
              disabled={creatingMarket || aiDuelRunning}
              className={`px-6 py-2 font-label-caps text-label-caps border font-bold tracking-wider rounded transition-all transform active:scale-95 rounded-xl cursor-pointer ${
                creatingMarket
                  ? 'bg-surface-container-high text-slate-400 border-outline-variant cursor-not-allowed'
                  : 'bg-surface-container-high text-emerald-green border-emerald-green/20 hover:bg-emerald-green/5 hover:border-emerald-green'
              }`}
            >
              {creatingMarket ? 'DEPLOYING MARKET...' : activeDuelId && activeDuelId !== SCENARIO.bentoMarketId ? 'MARKET DEPLOYED' : 'DEPLOY NEW MARKET'}
            </button>

            <button 
              onClick={startAiDuel}
              disabled={aiDuelRunning || !activeDuelId}
              className={`px-6 py-2 font-label-caps text-label-caps border font-bold tracking-wider rounded transition-all transform active:scale-95 rounded-xl cursor-pointer ${
                aiDuelRunning || !activeDuelId
                  ? 'bg-surface-container-high text-slate-400 border-outline-variant cursor-not-allowed'
                  : 'bg-surface-container-high text-electric-blue border-electric-blue/20 hover:bg-electric-blue/5 hover:border-electric-blue'
              }`}
            >
              {aiDuelRunning ? 'AI DUEL RUNNING...' : 'START AI DUEL'}
            </button>
          </div>
        </div>

        {/* Victory Winner Banner */}
        {resolvedOutcome && (
          <div className="rounded-xl border border-emerald-green/30 bg-emerald-green/10 p-4 text-center animate-fade-in-up">
            <div className="text-sm font-bold text-emerald-green uppercase tracking-widest mb-1 flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-emerald-green animate-pulse">check_circle</span>
              Market Resolved: {resolvedOutcome}
            </div>
            <p className="text-xs text-on-surface-variant mb-2">
              {resolvedOutcome === 'YES'
                ? 'Argentina won the match against England!'
                : 'England won/drew (Argentina did not win)!'}
            </p>
            <div className="text-sm font-black uppercase text-on-background font-data-mono tracking-wider">
              {determineDuelWinner() === 'HUMAN' && '🏆 HUMAN WINS THE DUEL!'}
              {determineDuelWinner() === 'AI' && '🏆 AI AGENT WINS THE DUEL!'}
              {determineDuelWinner() === 'BOTH' && '🤝 IT\'S A DRAW! Both predicted correctly!'}
              {determineDuelWinner() === 'NEITHER' && '💀 NEITHER WINS! Both predicted incorrectly!'}
              {determineDuelWinner() === 'NO_BETS' && 'No predictions placed.'}
            </div>
            {resolveMessage && (
              <p className="text-[10px] mt-2 font-data-mono text-emerald-green">
                {resolveMessage.text}
              </p>
            )}
          </div>
        )}

        {/* Global Notification Banner */}
        {faucetStatus && (
          <div className="px-4 py-2.5 rounded-xl border border-electric-blue/20 bg-electric-blue/5 text-xs text-electric-blue font-data-mono flex items-center gap-2 animate-fade-in-up">
            <span className="w-2.5 h-2.5 bg-electric-blue rounded-full animate-ping shrink-0" />
            <span>{faucetStatus}</span>
          </div>
        )}

        {/* Scoreboard */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded overflow-hidden shadow-md rounded-xl">
          <div className="grid grid-cols-3 h-40">
            {/* Argentina Side */}
            <div className="flex flex-col items-center justify-center border-r border-outline-variant relative overflow-hidden group">
              <div className="absolute inset-0 z-0 opacity-[0.22] pointer-events-none flex items-center justify-center transition-opacity duration-700 group-hover:opacity-[0.32]">
                <svg className="w-full h-full object-cover" viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
                  <rect fill="#74ACDF" height="500" width="800"></rect>
                  <rect fill="#FFF" height="166.7" width="800" y="166.7"></rect>
                  <circle cx="400" cy="250" fill="#F6B40E" r="40"></circle>
                </svg>
              </div>
              <span className="relative z-10 font-label-caps text-label-caps text-on-surface-variant mb-2">ARGENTINA</span>
              <span className="relative z-10 font-display-lg text-[64px] text-on-background leading-none animate-score-pop">
                {MATCH_TIMELINE[timelineIdx].score.split('–')[0].trim().slice(-1)}
              </span>
            </div>
            
            {/* Match Info */}
            <div className="flex flex-col items-center justify-center bg-surface-container-low border-x border-outline-variant/10">
              <span className="font-data-mono text-2xl text-electric-blue mb-1 tracking-widest">
                {MATCH_TIMELINE[timelineIdx].minute}
              </span>
              <LiveTicker event={MATCH_TIMELINE[timelineIdx].event} />
              
              <div className="mt-4 flex gap-2">
                <span className="w-1.5 h-1.5 bg-electric-blue rounded-full animate-bounce [animation-delay:0ms]"></span>
                <span className="w-1.5 h-1.5 bg-electric-blue rounded-full animate-bounce [animation-delay:150ms]"></span>
                <span className="w-1.5 h-1.5 bg-electric-blue rounded-full animate-bounce [animation-delay:300ms]"></span>
              </div>
            </div>
            
            {/* England Side */}
            <div className="flex flex-col items-center justify-center border-l border-outline-variant relative overflow-hidden group">
              <div className="absolute inset-0 z-0 opacity-[0.22] pointer-events-none flex items-center justify-center transition-opacity duration-700 group-hover:opacity-[0.32]">
                <svg className="w-full h-full object-cover" viewBox="0 0 50 30" xmlns="http://www.w3.org/2000/svg">
                  <rect fill="#FFF" height="30" width="50"></rect>
                  <rect fill="#CE1124" height="6" width="50" y="12"></rect>
                  <rect fill="#CE1124" height="30" width="6" x="22"></rect>
                </svg>
              </div>
              <span className="relative z-10 font-label-caps text-label-caps text-on-surface-variant mb-2">ENGLAND</span>
              <span className="relative z-10 font-display-lg text-[64px] text-on-background leading-none animate-score-pop [animation-delay:100ms]">
                {MATCH_TIMELINE[timelineIdx].score.split('–')[1]?.trim()[0]}
              </span>
            </div>
          </div>
          
          <div className="h-1.5 w-full bg-surface-container-high relative overflow-hidden">
            <div 
              className="h-full bg-electric-blue transition-all duration-1000 shadow-sm" 
              style={{ width: `${dynamicARGProb}%` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-20 animate-[move-light_2s_infinite]"></div>
          </div>
        </div>

        {/* Main Dual Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left: Human Arena */}
          <div className="flex flex-col gap-6">
            <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded shadow-sm transition-all duration-300 hover:border-electric-blue/30 group rounded-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-headline-lg text-title-md text-electric-blue flex items-center gap-2">
                  HUMAN ARENA
                  <span className="w-1.5 h-1.5 bg-electric-blue rounded-full animate-ping"></span>
                </h2>
                <span className="font-data-mono text-[10px] text-on-surface-variant opacity-60 group-hover:opacity-100 transition-opacity">
                  SESSION: {humanAddress ? `${humanAddress.slice(0, 6)}...${humanAddress.slice(-4)}` : '—'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-surface-container-low p-4 border border-outline-variant/30 rounded group-hover:bg-surface-container-lowest transition-colors rounded-xl">
                  <p className="font-label-caps text-[10px] text-on-surface-variant mb-1 uppercase">Active Balance</p>
                  <p className="font-data-mono text-xl text-on-background">
                    {humanBalance.toFixed(2)} <span className="text-electric-blue/60 text-sm">Credits</span>
                  </p>
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={() => handleRequestFaucet(humanAddress, 'human')}
                    disabled={faucetLoading === 'human'}
                    className="w-full h-full border border-electric-blue/40 text-electric-blue font-label-caps text-label-caps rounded hover:bg-electric-blue/5 hover:border-electric-blue transition-all duration-300 rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    {faucetLoading === 'human' ? 'MINTING...' : 'CLAIM FAUCET'}
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                {/* Wallet Input override */}
                <div className="flex flex-col gap-2">
                  <label className="font-label-caps text-[11px] text-on-surface-variant">BENTO MANAGED WALLET</label>
                  <input 
                    type="text"
                    value={humanAddress}
                    onChange={(e) => {
                      setHumanAddress(e.target.value);
                      fetchPositions(e.target.value, aiAddress);
                    }}
                    className="bg-surface-container-lowest border border-outline-variant text-on-background p-3 rounded focus:border-electric-blue focus:ring-1 focus:ring-electric-blue/20 transition-all outline-none font-data-mono text-xs rounded-xl"
                    placeholder="Smart Wallet Address (0x...)"
                  />
                </div>

                {/* Prediction Target Question Card */}
                <div className="bg-surface-container-low/50 p-4 border border-outline-variant/30 rounded-xl">
                  <p className="font-label-caps text-[9px] text-electric-blue uppercase mb-1.5 tracking-widest font-bold">Prediction Target Question</p>
                  <p className="text-sm font-semibold text-on-background font-sans leading-normal">
                    {SCENARIO.question} {activeDuelId && `(Market: ${activeDuelId.slice(0, 8)}...)`}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-label-caps text-[11px] text-on-surface-variant">STAKE AMOUNT (Credits)</label>
                  <input 
                    className="bg-surface-container-low border border-outline-variant text-slate-500 p-4 rounded outline-none font-data-mono rounded-xl cursor-not-allowed" 
                    value="5.00" 
                    readOnly
                    type="number"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    disabled={humanBetting || aiDuelRunning || !activeDuelId}
                    onClick={() => handleHumanBet(0)}
                    className="py-5 bg-electric-blue text-on-primary font-label-caps text-lg rounded hover:brightness-110 shadow-md active:scale-[0.98] transition-all duration-300 relative overflow-hidden group/btn rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    <span className="relative z-10">YES</span>
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                  </button>
                  <button 
                    disabled={humanBetting || aiDuelRunning || !activeDuelId}
                    onClick={() => handleHumanBet(1)}
                    className="py-5 border border-outline/50 text-on-background font-label-caps text-lg rounded hover:bg-surface-variant/20 hover:border-electric-blue hover:text-electric-blue shadow-sm active:scale-[0.98] transition-all duration-300 rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    NO
                  </button>
                </div>
                
                <div className="flex justify-between items-center px-4 py-3 bg-surface-container-low/50 rounded border border-outline-variant/20 group-hover:border-electric-blue/20 transition-all rounded-xl">
                  <span className="font-data-mono text-[10px] text-on-surface-variant uppercase tracking-widest">ESTIMATED PAYOUT</span>
                  <span className="font-data-mono text-emerald-green text-sm font-bold animate-pulse">+2.4X</span>
                </div>

                {/* Bet position display */}
                {humanHolding && (
                  <div className="px-4 py-3 rounded border border-emerald-green/20 bg-emerald-green/5 text-emerald-green text-xs font-data-mono rounded-xl flex items-center justify-between">
                    <span>Active Prediction Contract:</span>
                    <span className="font-bold">
                      {humanShares![0].option_index === 0 ? 'YES' : 'NO'} · {formatWei(humanShares![0].amount)} shares
                    </span>
                  </div>
                )}

                {/* Bet Result notifications */}
                {humanBetResult && (
                  <div className={`p-3 rounded border text-xs font-mono rounded-xl flex items-start gap-2.5 ${
                    humanBetResult.success 
                      ? 'border-emerald-green/20 bg-emerald-green/5 text-emerald-green' 
                      : 'border-error/20 bg-error/5 text-error'
                  }`}>
                    {humanBetResult.success ? (
                      <span className="material-symbols-outlined text-base mt-0.5">check_circle</span>
                    ) : (
                      <span className="material-symbols-outlined text-base mt-0.5">error</span>
                    )}
                    <div>
                      <p className="font-bold">{humanBetResult.success ? 'Success' : 'Bet Failed'}</p>
                      <p className="opacity-90 leading-normal">{humanBetResult.message || humanBetResult.error}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Settle Duel Card */}
            {!resolvedOutcome && activeDuelId && (
              <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded shadow-sm rounded-xl">
                <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-3 uppercase tracking-wider">Duel Settle Control</h3>
                <p className="text-[11px] text-on-surface-variant mb-4 font-sans leading-normal">
                  Settle predictions directly in client. Both Human and AI positions will resolve against the selected outcome.
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleResolveMarket('YES')}
                    disabled={resolvingMarket}
                    className="flex-1 py-2 bg-emerald-green/10 border border-emerald-green/30 hover:bg-emerald-green/20 text-emerald-green font-label-caps text-[11px] font-bold rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    YES (ARG WIN)
                  </button>
                  <button 
                    onClick={() => handleResolveMarket('NO')}
                    disabled={resolvingMarket}
                    className="flex-1 py-2 bg-error/10 border border-error/30 hover:bg-error/20 text-error font-label-caps text-[11px] font-bold rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    NO (ENG WIN/DRAW)
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Center: Staking Leaderboard */}
          <div className="flex flex-col gap-6">
            <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded shadow-sm transition-all duration-300 hover:border-electric-blue/30 rounded-xl">
              <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-4 uppercase tracking-[0.1em]">Staking Leaderboard</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between text-[11px] font-data-mono uppercase">
                  <span className="text-on-surface-variant">Human Pool</span>
                  <span className="text-on-background font-bold">
                    {humanHolding ? `${formatWei(humanShares![0].amount)} Shares` : '0.00 Shares'}
                  </span>
                </div>
                <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden flex shadow-inner">
                  <div 
                    className="bg-neon-purple h-full transition-all duration-1000 ease-out" 
                    style={{ width: `${100 - humanRatio}%` }}
                  ></div>
                  <div 
                    className="bg-electric-blue h-full transition-all duration-1000 ease-out shadow-sm" 
                    style={{ width: `${humanRatio}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-[11px] font-data-mono uppercase">
                  <span className="text-on-surface-variant">AI Pool</span>
                  <span className="text-on-background font-bold">
                    {aiHolding ? `${formatWei(aiShares![0].amount)} Shares` : '0.00 Shares'}
                  </span>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-outline-variant/20">
                <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-4 uppercase tracking-[0.1em] flex items-center justify-between">
                  Transaction History
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-electric-blue rounded-full animate-pulse"></span>
                    <span className="w-1.5 h-1.5 bg-electric-blue rounded-full animate-pulse [animation-delay:200ms]"></span>
                  </span>
                </h3>
                
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                  {history.map((h, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px] font-data-mono border-b border-outline-variant/5 pb-2 hover:bg-electric-blue/5 p-1 rounded transition-colors cursor-default group/row">
                      <span className={h.role === 'human' ? 'text-electric-blue' : 'text-neon-purple'}>
                        {h.role === 'human' ? 'HUMAN' : 'AI_AGENT'}
                      </span>
                      <span className="text-on-surface-variant text-[10px]">{h.type.toUpperCase().replace(/ /g, '_')}</span>
                      <span className="text-on-background font-bold">
                        {h.amount !== '—' ? `${h.amount} Credits` : '—'}
                        {h.outcome !== '—' && ` (${h.outcome})`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Match Statistics */}
            <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded shadow-sm transition-all duration-300 hover:border-electric-blue/30 rounded-xl">
              <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-6 uppercase tracking-[0.1em] flex items-center justify-between">
                Match Statistics
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-green rounded-full animate-pulse"></span>
                  <span className="text-[10px] text-emerald-green font-bold">LIVE DATA</span>
                </span>
              </h3>
              
              <div className="space-y-6">
                {/* Possession */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-data-mono uppercase">
                    <span className="text-on-surface-variant font-bold">Argentina</span>
                    <div className="flex gap-4">
                      <span className="text-on-background font-bold">{dynamicARGProb.toFixed(0)}%</span>
                      <span className="text-electric-blue font-bold">{dynamicENGProb.toFixed(0)}%</span>
                    </div>
                    <span className="text-electric-blue font-bold font-mono">England</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden flex">
                    <div className="bg-on-surface-variant/20 h-full" style={{ width: `${dynamicARGProb}%` }}></div>
                    <div className="bg-electric-blue h-full" style={{ width: `${dynamicENGProb}%` }}></div>
                  </div>
                </div>

                {/* Grid Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface-container-low/50 p-3 border border-outline-variant/20 rounded-xl">
                    <p className="text-[10px] font-label-caps text-on-surface-variant mb-2">SHOTS ON TARGET</p>
                    <div className="flex justify-between items-end">
                      <span className="font-data-mono text-lg">{dynamicARGShots}</span>
                      <span className="font-data-mono text-lg text-electric-blue">{dynamicENGShots}</span>
                    </div>
                  </div>
                  <div className="bg-surface-container-low/50 p-3 border border-outline-variant/20 rounded-xl">
                    <p className="text-[10px] font-label-caps text-on-surface-variant mb-2">CORNER KICKS</p>
                    <div className="flex justify-between items-end">
                      <span className="font-data-mono text-lg">{dynamicARGCorners}</span>
                      <span className="font-data-mono text-lg text-electric-blue">{dynamicENGCorners}</span>
                    </div>
                  </div>
                </div>

                {/* Fouls & Cards */}
                <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10">
                  <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-3 bg-yellow-400 rounded-sm"></span>
                      <span className="font-data-mono text-sm">2</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-3 bg-error rounded-sm"></span>
                      <span className="font-data-mono text-sm">0</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-label-caps text-on-surface-variant">FOULS / CARDS</span>
                  <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-1">
                      <span className="font-data-mono text-sm">1</span>
                      <span className="w-2 h-3 bg-yellow-400 rounded-sm"></span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-data-mono text-sm">0</span>
                      <span className="w-2 h-3 bg-error rounded-sm"></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right: AI Workspace */}
          <div className="flex flex-col gap-6">
            <div className="flex-1 bg-surface-container-lowest border border-outline-variant rounded flex flex-col min-h-[480px] overflow-hidden shadow-sm rounded-xl">
              
              {/* Tab Header Controls */}
              <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-low flex items-center justify-between">
                <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-[0.1em]">AI THINKING</h3>
                <div className="flex bg-black/5 border border-outline-variant/20 rounded-lg p-0.5">
                  <button
                    onClick={() => setAiTab('thinking')}
                    className={`px-3 py-1 text-[10px] font-label-caps uppercase rounded-md tracking-wider transition cursor-pointer font-bold ${
                      aiTab === 'thinking'
                        ? 'bg-white text-electric-blue shadow-sm border border-outline-variant/20'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Analysis
                  </button>
                  <button
                    onClick={() => setAiTab('sources')}
                    className={`px-3 py-1 text-[10px] font-label-caps uppercase rounded-md tracking-wider transition cursor-pointer font-bold ${
                      aiTab === 'sources'
                        ? 'bg-white text-electric-blue shadow-sm border border-outline-variant/20'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Raw Data
                  </button>
                </div>
              </div>

              {/* Tab contents */}
              <div ref={logContainerRef} className="flex-1 p-6 font-body-sm text-on-surface-variant space-y-4 overflow-y-auto custom-scrollbar">
                
                {aiThinking ? (
                  aiTab === 'thinking' ? (
                    /* Thinking/Analysis View */
                    <div className="space-y-4 animate-fade-in-up">
                      <p className="font-sans leading-relaxed text-sm text-on-surface">
                        {aiThinking.reasoning || "Evaluating game corpus and scraping reddit sentiment indices..."}
                      </p>
                      <div className="pt-4 border-t border-outline-variant/20">
                        <p className="text-[10px] font-label-caps text-neon-purple uppercase tracking-widest font-bold">
                          Current Confidence Score
                        </p>
                        <p className="text-4xl font-display-lg text-on-background mt-1">
                          {aiProbability ? `${aiProbability.toFixed(1)}%` : '—'}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="bg-surface-container-low/50 p-2.5 border border-outline-variant/20 rounded-xl text-center">
                          <span className="text-[9px] font-label-caps text-on-surface-variant block mb-1">LLM SENTIMENT</span>
                          <span className={`text-xs font-black font-data-mono ${
                            aiThinking.sentiment === 'BULLISH' ? 'text-emerald-green' : 'text-slate-600'
                          }`}>
                            {aiThinking.sentiment}
                          </span>
                        </div>
                        <div className="bg-surface-container-low/50 p-2.5 border border-outline-variant/20 rounded-xl text-center">
                          <span className="text-[9px] font-label-caps text-on-surface-variant block mb-1">PANIC INDEX</span>
                          <span className="text-xs font-black font-data-mono text-error">
                            {aiThinking.panicIndex}%
                          </span>
                        </div>
                      </div>

                      {/* AI Decision Alert */}
                      <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/30 flex items-center justify-between font-data-mono text-xs">
                        <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold">Smart Resolution Action:</span>
                        <span className={`px-2 py-0.5 rounded font-black ${
                          aiDecision === 'YES' ? 'bg-emerald-green/10 text-emerald-green border border-emerald-green/20' : 'bg-error/10 text-error border border-error/20'
                        }`}>
                          STAKE {aiDecision}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Raw Scraped Sources & Prompts */
                    <div className="space-y-4 animate-fade-in-up">
                      <div className="space-y-1">
                        <span className="text-[9px] font-label-caps text-on-surface-variant uppercase tracking-widest block font-bold">
                          Reddit Scraping Context (r/worldcup)
                        </span>
                        <pre className="p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl font-data-mono text-[10px] leading-relaxed text-slate-600 overflow-x-auto whitespace-pre-wrap max-h-40">
                          {aiThinking.redditSnippet}
                        </pre>
                      </div>
                      <div className="space-y-1 mt-3">
                        <span className="text-[9px] font-label-caps text-on-surface-variant uppercase tracking-widest block font-bold">
                          ESPN Commentary Stream
                        </span>
                        <pre className="p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl font-data-mono text-[10px] leading-relaxed text-slate-600 overflow-x-auto whitespace-pre-wrap max-h-40">
                          {aiThinking.espnSnippet}
                        </pre>
                      </div>
                      <div className="space-y-1 mt-3">
                        <span className="text-[9px] font-label-caps text-on-surface-variant uppercase tracking-widest block font-bold">
                          Structured Prompt & JSON Output
                        </span>
                        <pre className="p-3 bg-surface-container-low border border-purple-300/30 rounded-xl font-data-mono text-[9px] leading-relaxed text-purple-700 overflow-x-auto max-h-44">
                          {aiThinking.jsonResponse || "{}"}
                        </pre>
                      </div>
                    </div>
                  )
                ) : (
                  /* Logs console view */
                  aiLogs.length > 0 ? (
                    <div className="flex-1 flex flex-col font-data-mono text-[10px] leading-relaxed space-y-1">
                      {aiLogs.map((log, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                          <span className="text-slate-500 shrink-0">{log.timestamp}</span>
                          <span className={
                            log.type === 'success' ? 'text-emerald-green font-bold' :
                            log.type === 'error' ? 'text-error font-bold' :
                            log.type === 'warning' ? 'text-yellow-500 font-bold' :
                            log.type === 'data' ? 'text-purple-600' : 'text-slate-600'
                          }>
                            {log.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Idle view */
                    <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-20 text-slate-400">
                      <span className="material-symbols-outlined text-4xl animate-pulse text-neon-purple">psychology</span>
                      <p className="text-xs font-sans">
                        AI thinking space is idle.
                        <br />
                        Launch **Start AI Duel** to begin gathering data.
                      </p>
                    </div>
                  )
                )}
              </div>

              {/* AI wallet address display footer */}
              {aiAddress && (
                <div className="mx-6 my-4 p-3 bg-surface-container-low border border-outline-variant/20 rounded-xl flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[9px] font-label-caps text-on-surface-variant uppercase block">AI Agent Wallet</span>
                    <span className="font-data-mono text-[11px] text-slate-500 truncate block mt-0.5">{aiAddress}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="bg-surface-container-low px-2 py-1 rounded border border-outline-variant/30 font-data-mono text-[10px]">
                      {aiBalance.toFixed(2)} Credits
                    </div>
                    <button 
                      onClick={() => handleRequestFaucet(aiAddress, 'ai')}
                      disabled={faucetLoading === 'ai'}
                      className="px-2.5 py-1 rounded border border-neon-purple/35 text-neon-purple font-label-caps text-[9px] font-bold cursor-pointer hover:bg-neon-purple/5 transition disabled:opacity-50 shrink-0"
                    >
                      {faucetLoading === 'ai' ? 'MINTING...' : 'MINT FAUCET'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

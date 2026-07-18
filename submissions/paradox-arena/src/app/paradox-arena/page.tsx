'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Zap,
} from 'lucide-react';

interface TimelineEvent {
  minute: string;
  score: string;
  event: string;
}

interface LogLine {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'data';
}

interface SimulationResponse {
  alternateTimeline: TimelineEvent[];
  finalScore: { argentina?: number; england?: number; teamA?: number; teamB?: number };
  winnerOutcome: 'YES' | 'NO';
  stats: {
    possession: { argentina?: number; england?: number; teamA?: number; teamB?: number };
    shotsOnTarget: { argentina?: number; england?: number; teamA?: number; teamB?: number };
    corners: { argentina?: number; england?: number; teamA?: number; teamB?: number };
    fouls: { argentina?: number; england?: number; teamA?: number; teamB?: number };
    yellowCards: { argentina?: number; england?: number; teamA?: number; teamB?: number };
    redCards: { argentina?: number; england?: number; teamA?: number; teamB?: number };
  };
  analysis: string;
}

interface PivotPoint {
  minute: number;
  description: string;
  originalEvent: string;
}

interface Scenario {
  id: string;
  title: string;
  teamA: string;
  teamB: string;
  teamAShort: string;
  teamBShort: string;
  flagA: React.ReactNode;
  flagB: React.ReactNode;
  originalTimeline: TimelineEvent[];
  pivotPoints: PivotPoint[];
  question: string;
  defaultStats: {
    teamAProb: number;
    drawProb: number;
    teamBProb: number;
  };
}

interface TwitchChatMessage {
  id: string;
  username: string;
  message: string;
  vote?: 'YES' | 'NO';
}

// ── Match Flag SVGs ──────────────────────────────────────────────────────────
const ARG_FLAG = (
  <svg className="w-full h-full object-cover" viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
    <rect fill="#74ACDF" height="500" width="800"></rect>
    <rect fill="#FFF" height="166.7" width="800" y="166.7"></rect>
    <circle cx="400" cy="250" fill="#F6B40E" r="40"></circle>
  </svg>
);

const ENG_FLAG = (
  <svg className="w-full h-full object-cover" viewBox="0 0 50 30" xmlns="http://www.w3.org/2000/svg">
    <rect fill="#FFF" height="30" width="50"></rect>
    <rect fill="#CE1124" height="6" width="50" y="12"></rect>
    <rect fill="#CE1124" height="30" width="6" x="22"></rect>
  </svg>
);

const RMA_FLAG = (
  <svg className="w-full h-full object-cover" viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg">
    <rect fill="#FFFFFF" width="3" height="2"/>
    <path fill="#8A2BE2" d="M 0 0 L 3 2 L 3 1.8 L 0 0"/>
    <circle cx="1.5" cy="1" r="0.4" fill="#FFD700" stroke="#000080" strokeWidth="0.03"/>
  </svg>
);

const FCB_FLAG = (
  <svg className="w-full h-full object-cover" viewBox="0 0 9 6" xmlns="http://www.w3.org/2000/svg">
    <rect fill="#A50044" width="9" height="6"/>
    <rect fill="#004D98" width="1.5" height="6" x="1.5"/>
    <rect fill="#004D98" width="1.5" height="6" x="4.5"/>
    <rect fill="#004D98" width="1.5" height="6" x="7.5"/>
  </svg>
);

const FRA_FLAG = (
  <svg className="w-full h-full object-cover" viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg">
    <rect fill="#002395" width="1" height="2"/>
    <rect fill="#FFFFFF" width="1" height="2" x="1"/>
    <rect fill="#ED2939" width="1" height="2" x="2"/>
  </svg>
);

const ESP_FLAG = (
  <svg className="w-full h-full object-cover" viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg">
    <rect fill="#C11B17" width="3" height="2"/>
    <rect fill="#FDD017" width="3" height="1" y="0.5"/>
    <circle cx="0.8" cy="1" r="0.25" fill="#C11B17"/>
  </svg>
);

// ── Scenario Database ────────────────────────────────────────────────────────
const SCENARIOS: Scenario[] = [
  {
    id: 'arg-eng-wc',
    title: 'Argentina vs England (World Cup 2026)',
    teamA: 'ARGENTINA',
    teamB: 'ENGLAND',
    teamAShort: 'ARG',
    teamBShort: 'ENG',
    flagA: ARG_FLAG,
    flagB: ENG_FLAG,
    question: 'Will Argentina win the match in this alternate simulation?',
    defaultStats: { teamAProb: 58, drawProb: 22, teamBProb: 20 },
    originalTimeline: [
      { minute: "11'", score: "ARG 0 – 0 ENG", event: "11' — Argentina corner — headed wide" },
      { minute: "21'", score: "ARG 0 – 0 ENG", event: "21' — Messi free kick saved by Pickford!" },
      { minute: "38'", score: "ARG 0 – 0 ENG", event: "38' — VAR review: penalty call overturned" },
      { minute: "43'", score: "ARG 0 – 0 ENG", event: "43' — Yellow card: De Paul (ARG) for a late slide tackle" },
      { minute: "54'", score: "ARG 0 – 1 ENG", event: "54' — GOAL! England take the lead — Bellingham strike!" },
      { minute: "67'", score: "ARG 1 – 1 ENG", event: "67' — GOAL! Argentina equalise through Fernandez!" },
      { minute: "75'", score: "ARG 1 – 1 ENG", event: "75' — Midfield battle intensifies — high pressing!" },
      { minute: "84'", score: "ARG 1 – 1 ENG", event: "84' — Alvarez shot saved by Pickford!" },
      { minute: "90'", score: "ARG 2 – 1 ENG", event: "90' — GOAL! Messi scores a penalty in injury time!" },
      { minute: "90+4'", score: "ARG 2 – 1 ENG", event: "90+4' — Full time whistle! Argentina wins 2 – 1!" },
    ],
    pivotPoints: [
      {
        minute: 43,
        description: "What if De Paul received a RED card instead of a yellow card at 43'?",
        originalEvent: "43' — Yellow card: De Paul (ARG)"
      },
      {
        minute: 54,
        description: "What if Bellingham's shot hit the post instead of entering the net at 54'?",
        originalEvent: "54' — GOAL! England take the lead — Bellingham strike!"
      },
      {
        minute: 90,
        description: "What if Messi's injury-time penalty was saved by Pickford at 90'?",
        originalEvent: "90' — GOAL! Messi scores a penalty in injury time!"
      }
    ]
  },
  {
    id: 'rma-bar-clasisco',
    title: 'Real Madrid vs Barcelona (El Clásico 2026)',
    teamA: 'REAL MADRID',
    teamB: 'BARCELONA',
    teamAShort: 'RMA',
    teamBShort: 'FCB',
    flagA: RMA_FLAG,
    flagB: FCB_FLAG,
    question: 'Will Real Madrid win the match in this alternate simulation?',
    defaultStats: { teamAProb: 50, drawProb: 20, teamBProb: 30 },
    originalTimeline: [
      { minute: "15'", score: "RMA 1 – 0 FCB", event: "15' — GOAL! Vinícius Jr. scores for Real Madrid after a counter-attack" },
      { minute: "32'", score: "RMA 1 – 1 FCB", event: "32' — GOAL! Lewandowski equalises for Barcelona with a close header" },
      { minute: "58'", score: "RMA 1 – 2 FCB", event: "58' — GOAL! Lamine Yamal scores a curler, Barcelona takes the lead" },
      { minute: "72'", score: "RMA 1 – 2 FCB", event: "72' — Yellow card: Rüdiger (RMA) for bringing down Pedri" },
      { minute: "81'", score: "RMA 2 – 2 FCB", event: "81' — GOAL! Jude Bellingham scores a tap-in for Real Madrid" },
      { minute: "90+2'", score: "RMA 3 – 2 FCB", event: "90+2' — GOAL! Mbappé scores the match-winner in injury time!" },
      { minute: "90+5'", score: "RMA 3 – 2 FCB", event: "90+5' — Full time whistle! Real Madrid wins 3 – 2!" }
    ],
    pivotPoints: [
      {
        minute: 58,
        description: "What if Lamine Yamal's goal was ruled offside by VAR at 58'?",
        originalEvent: "58' — GOAL! Lamine Yamal scores a curler"
      },
      {
        minute: 92,
        description: "What if Mbappé's match-winner was saved by Ter Stegen at 92'?",
        originalEvent: "90+2' — GOAL! Mbappé scores the match-winner!"
      }
    ]
  },
  {
    id: 'esp-fra-euro',
    title: 'Spain vs France (Euro 2026 Final)',
    teamA: 'SPAIN',
    teamB: 'FRANCE',
    teamAShort: 'ESP',
    teamBShort: 'FRA',
    flagA: ESP_FLAG,
    flagB: FRA_FLAG,
    question: 'Will Spain win the match in this alternate simulation?',
    defaultStats: { teamAProb: 45, drawProb: 25, teamBProb: 30 },
    originalTimeline: [
      { minute: "25'", score: "ESP 0 – 1 FRA", event: "25' — GOAL! Kylian Mbappé scores a stellar solo goal, France leads" },
      { minute: "41'", score: "ESP 0 – 1 FRA", event: "41' — Yellow card: Rodri (ESP) for stopping a tactical breakaway" },
      { minute: "60'", score: "ESP 1 – 1 FRA", event: "60' — GOAL! Dani Olmo equalises with a volley from a rebound" },
      { minute: "83'", score: "ESP 2 – 1 FRA", event: "83' — GOAL! Nico Williams drills it home, Spain takes the lead!" },
      { minute: "88'", score: "ESP 2 – 1 FRA", event: "88' — France misses a sitter! Griezmann shoots wide from 6 yards out" },
      { minute: "90+3'", score: "ESP 2 – 1 FRA", event: "90+3' — Full time whistle! Spain wins Euro 2026 (2 – 1)!" }
    ],
    pivotPoints: [
      {
        minute: 25,
        description: "What if Mbappé's early goal was disallowed for offside at 25'?",
        originalEvent: "25' — GOAL! Kylian Mbappé scores a stellar solo goal"
      },
      {
        minute: 88,
        description: "What if Antoine Griezmann scored the equalizer instead of shooting wide at 88'?",
        originalEvent: "88' — France misses a sitter! Griezmann shoots wide"
      }
    ]
  }
];

export default function ParadoxArena() {
  // Config & Balances
  const [humanAddress, setHumanAddress] = useState('');
  const [aiAddress, setAiAddress] = useState('');
  const [humanBalance, setHumanBalance] = useState(10.0);
  const [aiBalance, setAiBalance] = useState(10.0);

  // Game Mode Toggle ('PVE' -> Human vs AI, 'PVP' -> Human vs Human, 'TWITCH' -> Twitch Chat Mode)
  const [betMode, setBetMode] = useState<'PVE' | 'PVP' | 'TWITCH'>('PVE');

  // Player 2 (Human) States
  const [player2Address, setPlayer2Address] = useState('0xbb976f4de2aaf618a08a612eaca4bfdb8c6e62b5');
  const [player2Balance, setPlayer2Balance] = useState(10.0);
  const [player2Bet, setPlayer2Bet] = useState<'YES' | 'NO' | null>(null);
  const [player2BetPlacing, setPlayer2BetPlacing] = useState(false);

  // Twitch Streamer Mode States
  const [twitchChannel, setTwitchChannel] = useState('xqcow');
  const [isTwitchConnected, setIsTwitchConnected] = useState(false);
  const [twitchVotes, setTwitchVotes] = useState({ yes: 0, no: 0 });
  const [twitchChat, setTwitchChat] = useState<TwitchChatMessage[]>([]);
  const [isSimulatingChat, setIsSimulatingChat] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCountdownActive, setIsCountdownActive] = useState(false);

  const twitchSocketRef = useRef<WebSocket | null>(null);
  const chatSimIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Active Scenario Selection
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);
  const currentScenario = SCENARIOS[activeScenarioIdx];

  // Active Pivot Point selection (from current scenario)
  const [activePivotIdx, setActivePivotIdx] = useState(0);
  const currentPivot = currentScenario.pivotPoints[activePivotIdx] || currentScenario.pivotPoints[0];

  // Match Simulation Game States
  // States: 'PLAYING_ORIGINAL', 'HALTED_AT_PIVOT', 'PLACING_BETS', 'AI_THINKING', 'SIMULATING', 'FINISHED'
  const [gameState, setGameState] = useState<'PLAYING_ORIGINAL' | 'HALTED_AT_PIVOT' | 'PLACING_BETS' | 'AI_THINKING' | 'SIMULATING' | 'FINISHED'>('PLAYING_ORIGINAL');
  const [currentMinuteIdx, setCurrentMinuteIdx] = useState(0);

  // Bets State
  const [humanBet, setHumanBet] = useState<'YES' | 'NO' | null>(null);
  const [aiBet, setAiBet] = useState<'YES' | 'NO' | null>(null);
  const [betPlacing, setBetPlacing] = useState(false);

  // Simulation API Data
  const [simulationData, setSimulationData] = useState<SimulationResponse | null>(null);
  const [simTimelineIdx, setSimTimelineIdx] = useState(0);
  const [loadingSimulation, setLoadingSimulation] = useState(false);

  // Console Logs & AI Tab info
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [aiTab, setAiTab] = useState<'thinking' | 'sources'>('thinking');

  // On-Chain Bento States
  const [activeDuelId, setActiveDuelId] = useState<string>('');
  const [inviteCode, setInviteCode] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');

  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs container internally
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Clean WebSocket and intervals on unmount
  useEffect(() => {
    return () => {
      if (twitchSocketRef.current) twitchSocketRef.current.close();
      if (chatSimIntervalRef.current) clearInterval(chatSimIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Load config on mount
  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((config) => {
        if (config.humanAddress) setHumanAddress(config.humanAddress);
        if (config.aiAddress) setAiAddress(config.aiAddress);
      })
      .catch((err) => console.error('Failed to load configuration:', err));
  }, []);

  // Handle Scenario Switch
  const handleScenarioChange = (idx: number) => {
    setActiveScenarioIdx(idx);
    setActivePivotIdx(0);
    setGameState('PLAYING_ORIGINAL');
    setCurrentMinuteIdx(0);
    setHumanBet(null);
    setAiBet(null);
    setPlayer2Bet(null);
    setTwitchVotes({ yes: 0, no: 0 });
    setSimulationData(null);
    setSimTimelineIdx(0);
    setLogs([]);
    setActiveDuelId('');
    setInviteCode('');
    setTxHash('');
  };

  // Handle Pivot Point Switch (within current scenario)
  const handlePivotChange = (idx: number) => {
    setActivePivotIdx(idx);
    setGameState('PLAYING_ORIGINAL');
    setCurrentMinuteIdx(0);
    setHumanBet(null);
    setAiBet(null);
    setPlayer2Bet(null);
    setTwitchVotes({ yes: 0, no: 0 });
    setSimulationData(null);
    setSimTimelineIdx(0);
    setLogs([]);
    setActiveDuelId('');
    setInviteCode('');
    setTxHash('');
  };

  // Handle Game Mode Switch
  const handleModeChange = (mode: 'PVE' | 'PVP' | 'TWITCH') => {
    setBetMode(mode);
    setGameState('PLAYING_ORIGINAL');
    setCurrentMinuteIdx(0);
    setHumanBet(null);
    setAiBet(null);
    setPlayer2Bet(null);
    setTwitchVotes({ yes: 0, no: 0 });
    setSimulationData(null);
    setSimTimelineIdx(0);
    setLogs([]);
    setActiveDuelId('');
    setInviteCode('');
    setTxHash('');

    // Stop simulator if switching out of Twitch mode
    if (mode !== 'TWITCH' && isSimulatingChat) {
      stopChatSimulator();
    }
  };

  // ── Twitch Websocket IRC Client ────────────────────────────────────────────
  const connectTwitch = (channelName: string) => {
    if (twitchSocketRef.current) {
      twitchSocketRef.current.close();
    }

    addLog(`🔌 Connecting to Twitch chat for channel: #${channelName}...`, 'info');
    
    try {
      const ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
      twitchSocketRef.current = ws;

      ws.onopen = () => {
        setIsTwitchConnected(true);
        addLog(`✅ Connected to Twitch WebSocket server!`, 'success');
        
        // Anonymous IRC connection handshake
        const randomNick = `justinfan${Math.floor(10000 + Math.random() * 90000)}`;
        ws.send('CAP REQ :twitch.tv/commands twitch.tv/tags');
        ws.send(`NICK ${randomNick}`);
        ws.send(`JOIN #${channelName.toLowerCase()}`);
        addLog(`📡 Listening to chat messages in channel: #${channelName.toLowerCase()}`, 'info');
      };

      ws.onmessage = (event) => {
        const message = event.data;
        if (message.includes('PING')) {
          ws.send('PONG :tmi.twitch.tv');
          return;
        }

        // Parse standard Twitch PRIVMSG IRC logs
        const privmsgRegex = /:([^!]+)![^ ]+ PRIVMSG #[^ ]+ :(.+)/;
        const match = message.match(privmsgRegex);
        if (match) {
          const username = match[1];
          const text = match[2].trim();

          // Check for voting commands
          let vote: 'YES' | 'NO' | undefined = undefined;
          if (text.toLowerCase() === '!yes' || text.toLowerCase() === 'yes') {
            vote = 'YES';
          } else if (text.toLowerCase() === '!no' || text.toLowerCase() === 'no') {
            vote = 'NO';
          }

          // Register vote if betting/voting space is active and not locked
          if (gameState === 'PLACING_BETS' && vote && !isCountdownActive && !humanBet) {
            setTwitchVotes((prev) => ({
              yes: vote === 'YES' ? prev.yes + 1 : prev.yes,
              no: vote === 'NO' ? prev.no + 1 : prev.no,
            }));
          }

          // Add to chat list box
          setTwitchChat((prev) => [
            { id: crypto.randomUUID(), username, message: text, vote },
            ...prev.slice(0, 39)
          ]);
        }
      };

      ws.onclose = () => {
        setIsTwitchConnected(false);
        addLog(`🔌 Disconnected from Twitch chat server.`, 'warning');
      };

      ws.onerror = (err) => {
        console.error('Twitch WS error:', err);
        addLog(`⚠️ Twitch connection error. Check channel spelling.`, 'error');
      };
    } catch (e: any) {
      addLog(`❌ Failed to instantiate WebSocket: ${e.message}`, 'error');
    }
  };

  const disconnectTwitch = () => {
    if (twitchSocketRef.current) {
      twitchSocketRef.current.close();
      twitchSocketRef.current = null;
    }
    setIsTwitchConnected(false);
  };

  // ── Twitch Chat Simulator ──────────────────────────────────────────────────
  const startChatSimulator = () => {
    if (isSimulatingChat) return;
    setIsSimulatingChat(true);
    addLog('🎮 Chat Simulator activated! Generating stream audience activity...', 'success');

    const mockUsers = [
      'AlphaGamer', 'SportsNut', 'Web3Pioneer', 'GoalScorer99', 'PredictorKing',
      'TacticalGiga', 'BentoStaker', 'MemeTrader', 'RealistApe', 'ClutchPlayer',
      'BellinghamFan', 'MessiIsGOAT', 'WorldCupTracker', 'VibeCheck', 'DegenMaster'
    ];

    const mockMessages = [
      '!yes trust the simulation!',
      '!no way England drops this now',
      '!yes Messi pen loading...',
      '!no 10-man defense is cooked',
      'Ref is completely blind!',
      'What a paradox split, absolute cinema',
      '!yes Argentina has the sports IQ',
      '!no Bellingham will exploit the wings',
      '!yes let\'s pool our credits!',
      '!yes',
      '!no',
      '!no',
      'this is insane live pool bet'
    ];

    const interval = setInterval(() => {
      const username = mockUsers[Math.floor(Math.random() * mockUsers.length)];
      const text = mockMessages[Math.floor(Math.random() * mockMessages.length)];

      let vote: 'YES' | 'NO' | undefined = undefined;
      if (text.startsWith('!yes')) vote = 'YES';
      if (text.startsWith('!no')) vote = 'NO';

      if (gameState === 'PLACING_BETS' && vote && !humanBet) {
        setTwitchVotes((prev) => ({
          yes: vote === 'YES' ? prev.yes + 1 : prev.yes,
          no: vote === 'NO' ? prev.no + 1 : prev.no,
        }));
      }

      setTwitchChat((prev) => [
        { id: crypto.randomUUID(), username, message: text, vote },
        ...prev.slice(0, 39)
      ]);
    }, 600);

    chatSimIntervalRef.current = interval;
  };

  const stopChatSimulator = () => {
    if (chatSimIntervalRef.current) {
      clearInterval(chatSimIntervalRef.current);
      chatSimIntervalRef.current = null;
    }
    setIsSimulatingChat(false);
    addLog('🎮 Chat Simulator deactivated.', 'info');
  };

  // ── Voting Countdown ──────────────────────────────────────────────────────
  const startCountdown = () => {
    if (isCountdownActive || humanBet) return;
    setIsCountdownActive(true);
    setCountdown(10);
    addLog('⏱️ Streamer activated 10-second countdown! Audience, type !yes or !no in chat!', 'warning');

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setIsCountdownActive(false);
          setCountdown(null);
          // Lock voting
          lockTwitchBets();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    countdownIntervalRef.current = interval;
  };

  const lockTwitchBets = async () => {
    const finalYes = twitchVotes.yes;
    const finalNo = twitchVotes.no;

    if (finalYes === 0 && finalNo === 0) {
      addLog('⚠️ No audience votes registered. Staking YES by default fallback.', 'warning');
      setHumanBet('YES');
      setHumanBalance((prev) => prev - 5.00);
      setAiBet('NO');
      setAiBalance((prev) => prev - 5.00);
      addLog('🤖 AI Agent places opposing bet: Staked 5.00 Credits on [NO]', 'success');
      return;
    }

    const majority = finalYes >= finalNo ? 'YES' : 'NO';
    setHumanBet(majority);
    setHumanBalance((prev) => prev - 5.00);
    addLog(`🔒 Voting Closed! Chat Votes: YES: ${finalYes} (${Math.round(finalYes/(finalYes+finalNo)*100)}%) | NO: ${finalNo} (${Math.round(finalNo/(finalYes+finalNo)*100)}%)`, 'success');
    addLog(`🎯 Collective Chat Decision: [${majority}] · Staked 5.00 Credits on behalf of Chat Smart Account!`, 'success');

    // On-Chain Chat Bet placement
    if (activeDuelId) {
      try {
        addLog(`⚡ Broadcast Chat position on-chain: 5.00 Credits on [${majority}]...`, 'info');
        const betRes = await fetch('/api/human-bet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            duelId: activeDuelId,
            optionIndex: majority === 'YES' ? 0 : 1,
            amount: '5000000000000000000'
          })
        });
        const betData = await betRes.json();
        if (betData.success) {
          addLog(`✅ Chat Collective Smart Wallet position successfully broadcast on-chain!`, 'success');
        }
      } catch (err: any) {
        addLog(`⚠️ Chat bet on-chain sync error: ${err.message}`, 'warning');
      }
    }

    // AI agent places opposing bet
    const opposing = majority === 'YES' ? 'NO' : 'YES';
    setAiBet(opposing);
    setAiBalance((prev) => prev - 5.00);
    addLog(`🤖 AI Agent places opposing bet: Staked 5.00 Credits on [${opposing}]`, 'success');

    // On-Chain AI Bet placement
    if (activeDuelId) {
      try {
        addLog(`⚡ Broadcast AI opposing position on-chain: 5.00 Credits on [${opposing}]...`, 'info');
        const aiBetRes = await fetch('/api/ai-bet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            duelId: activeDuelId,
            optionIndex: opposing === 'YES' ? 0 : 1,
            amount: '5000000000000000000'
          })
        });
        const aiBetData = await aiBetRes.json();
        if (aiBetData.success) {
          addLog(`✅ AI Opposing position successfully broadcast on-chain!`, 'success');
        }
      } catch (err: any) {
        addLog(`⚠️ AI bet on-chain sync error: ${err.message}`, 'warning');
      }
    }
  };

  // Game loops: Progress original timeline to pivot point
  useEffect(() => {
    if (gameState !== 'PLAYING_ORIGINAL') return;

    addLog(`⚽ Match Initialized [${betMode} Mode]: ${currentScenario.title}`, 'info');
    addLog(`⏰ Clock ticking... Original match timeline playing...`, 'info');

    const timer = setInterval(() => {
      setCurrentMinuteIdx((prevIdx) => {
        const nextIdx = prevIdx + 1;
        const currentEvent = currentScenario.originalTimeline[nextIdx];

        if (!currentEvent) {
          clearInterval(timer);
          return prevIdx;
        }

        const isGoal = currentEvent.event.includes('GOAL');
        const isYellow = currentEvent.event.includes('Yellow');
        addLog(currentEvent.event, isGoal ? 'success' : isYellow ? 'warning' : 'info');

        const min = parseInt(currentEvent.minute.replace("'", ""));
        if (min === currentPivot.minute) {
          clearInterval(timer);
          // Halted!
          setTimeout(() => {
            setGameState('HALTED_AT_PIVOT');
            addLog(`⚠️ AUTOMATIC DETECTED: Pivot point reached at minute ${currentPivot.minute}'!`, 'warning');
            addLog(`💬 Match halted. Prediction contracts open.`, 'warning');
          }, 1000);
        }

        return nextIdx;
      });
    }, 1800);

    return () => clearInterval(timer);
  }, [gameState, activeScenarioIdx, activePivotIdx, betMode]);

  // Helper to add logs
  const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' | 'data' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, message, type }]);
  };

  // Start AI Thinking and fetch OpenRouter alternate simulation (PVE) or general simulation (PVP)
  const triggerSimulationFetch = async () => {
    setGameState('AI_THINKING');
    setLoadingSimulation(true);
    addLog(`🧠 Paradox Core is calculating the timeline split...`, 'info');
    addLog(`💡 Scenario: ${currentPivot.description}`, 'info');

    // Reset old on-chain states
    setActiveDuelId('');
    setInviteCode('');
    setTxHash('');

    let duelId = '';

    // 1. Create prediction market on-chain on Bento
    try {
      addLog(`⛓️ Deploying prediction contract on Bento testnet...`, 'info');
      const marketRes = await fetch('/api/create-market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `${currentScenario.title}: ${currentPivot.description}`,
          description: `Paradox Arena alternate timeline prediction market. Pivot condition: "${currentPivot.description}"`,
          tags: ['paradox-arena', currentScenario.teamAShort, currentScenario.teamBShort]
        })
      });
      const marketData = await marketRes.json();
      if (marketData.success) {
        duelId = marketData.duelId;
        setActiveDuelId(marketData.duelId);
        setInviteCode(marketData.inviteCode);
        setTxHash(marketData.txHash);
        addLog(`✅ On-chain Bento market deployed successfully!`, 'success');
        addLog(`🔗 Creation Tx Hash: ${marketData.txHash}`, 'data');
        addLog(`📌 Duel ID: ${marketData.duelId}`, 'data');
      } else {
        addLog(`⚠️ On-chain market creation failed: ${marketData.error}. Falling back to offline mode.`, 'warning');
      }
    } catch (e: any) {
      addLog(`⚠️ Bento integration error: ${e.message}. Deferring to local environment.`, 'warning');
    }

    try {
      const response = await fetch('/api/paradox-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pivotMinute: currentPivot.minute,
          pivotDescription: currentPivot.description,
          originalTimeline: currentScenario.originalTimeline
        })
      });

      const result = await response.json();

      if (result.success && result.simulation) {
        const sim = result.simulation;
        const adjusted: SimulationResponse = {
          alternateTimeline: sim.alternateTimeline,
          finalScore: {
            argentina: sim.finalScore?.argentina ?? sim.finalScore?.teamA,
            england: sim.finalScore?.england ?? sim.finalScore?.teamB,
            teamA: sim.finalScore?.teamA ?? sim.finalScore?.argentina,
            teamB: sim.finalScore?.teamB ?? sim.finalScore?.england,
          },
          winnerOutcome: sim.winnerOutcome,
          stats: {
            possession: {
              argentina: sim.stats?.possession?.argentina ?? sim.stats?.possession?.teamA,
              england: sim.stats?.possession?.england ?? sim.stats?.possession?.teamB,
              teamA: sim.stats?.possession?.teamA ?? sim.stats?.possession?.argentina,
              teamB: sim.stats?.possession?.teamB ?? sim.stats?.possession?.england,
            },
            shotsOnTarget: {
              argentina: sim.stats?.shotsOnTarget?.argentina ?? sim.stats?.shotsOnTarget?.teamA,
              england: sim.stats?.shotsOnTarget?.england ?? sim.stats?.shotsOnTarget?.teamB,
              teamA: sim.stats?.shotsOnTarget?.teamA ?? sim.stats?.shotsOnTarget?.argentina,
              teamB: sim.stats?.shotsOnTarget?.teamB ?? sim.stats?.shotsOnTarget?.england,
            },
            corners: {
              argentina: sim.stats?.corners?.argentina ?? sim.stats?.corners?.teamA,
              england: sim.stats?.corners?.england ?? sim.stats?.corners?.teamB,
              teamA: sim.stats?.corners?.teamA ?? sim.stats?.corners?.argentina,
              teamB: sim.stats?.corners?.teamB ?? sim.stats?.corners?.england,
            },
            fouls: {
              argentina: sim.stats?.fouls?.argentina ?? sim.stats?.fouls?.teamA,
              england: sim.stats?.fouls?.england ?? sim.stats?.fouls?.teamB,
              teamA: sim.stats?.fouls?.teamA ?? sim.stats?.fouls?.argentina,
              teamB: sim.stats?.fouls?.teamB ?? sim.stats?.fouls?.england,
            },
            yellowCards: {
              argentina: sim.stats?.yellowCards?.argentina ?? sim.stats?.yellowCards?.teamA,
              england: sim.stats?.yellowCards?.england ?? sim.stats?.yellowCards?.teamB,
              teamA: sim.stats?.yellowCards?.teamA ?? sim.stats?.yellowCards?.argentina,
              teamB: sim.stats?.yellowCards?.teamB ?? sim.stats?.yellowCards?.england,
            },
            redCards: {
              argentina: sim.stats?.redCards?.argentina ?? sim.stats?.redCards?.teamA,
              england: sim.stats?.redCards?.england ?? sim.stats?.redCards?.teamB,
              teamA: sim.stats?.redCards?.teamA ?? sim.stats?.redCards?.argentina,
              teamB: sim.stats?.redCards?.teamB ?? sim.stats?.redCards?.england,
            }
          },
          analysis: sim.analysis
        };

        setSimulationData(adjusted);
        addLog('✅ Alternate reality successfully simulated by Paradox Core!', 'success');

        if (betMode === 'PVE') {
          // In PVE Mode, AI places its prediction automatically
          const simulatedOutcome = adjusted.winnerOutcome; // YES or NO
          const outcomeProb = simulatedOutcome === 'YES' ? 78 : 22;
          
          setTimeout(async () => {
            setAiBet(simulatedOutcome);
            setAiBalance((prev) => prev - 5.00);
            addLog(`🤖 AI Agent places prediction: Staked 5 Credits on [${simulatedOutcome}] (Win Confidence: ${outcomeProb}%)`, 'success');
            
            if (duelId) {
              addLog(`⚡ Broadcast AI position on-chain: Staking 5.00 Credits on [${simulatedOutcome}]...`, 'info');
              try {
                const aiBetRes = await fetch('/api/ai-bet', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    duelId: duelId,
                    optionIndex: simulatedOutcome === 'YES' ? 0 : 1,
                    amount: '5000000000000000000'
                  })
                });
                const aiBetData = await aiBetRes.json();
                if (aiBetData.success) {
                  addLog(`✅ AI Agent Smart Wallet position successfully broadcast on-chain!`, 'success');
                } else {
                  addLog(`⚠️ AI bet on-chain sync error: ${aiBetData.error}`, 'warning');
                }
              } catch (aiBetErr: any) {
                addLog(`⚠️ AI bet on-chain sync error: ${aiBetErr.message}`, 'warning');
              }
            }

            setGameState('PLACING_BETS');
          }, 1500);
        } else if (betMode === 'PVP') {
          // In PVP Mode, just unlock betting for both human players
          setTimeout(() => {
            addLog('👥 PvP Prediction contracts active! Player 1 and Player 2 can now place their stakes.', 'info');
            setGameState('PLACING_BETS');
          }, 1000);
        } else {
          // Twitch mode - Open public votes
          setTimeout(() => {
            addLog('🎮 Twitch public voting open! Chat can type !yes or !no to vote.', 'info');
            setGameState('PLACING_BETS');
          }, 1000);
        }
      } else {
        throw new Error(result.error || 'Unknown simulation error');
      }
    } catch (err: any) {
      addLog(`❌ Simulation failed: ${err.message}`, 'error');
      // Create high quality dynamic mock fallback data depending on the selected scenario
      const isWC = currentScenario.id === 'arg-eng-wc';
      const isClasico = currentScenario.id === 'rma-bar-clasisco';
      
      let mockFallback: SimulationResponse;
      if (isWC) {
        mockFallback = {
          alternateTimeline: [
            { minute: "43'", score: "ARG 0 – 0 ENG", event: "43' — Red card: De Paul (ARG) is sent off for a reckless tackle!" },
            { minute: "51'", score: "ARG 0 – 1 ENG", event: "51' — GOAL! England scores — Bellingham capitalizes on extra space!" },
            { minute: "68'", score: "ARG 0 – 2 ENG", event: "68' — GOAL! England doubles the lead — Harry Kane volley!" },
            { minute: "80'", score: "ARG 1 – 2 ENG", event: "80' — GOAL! Messi pulls one back with a stunning free kick!" },
            { minute: "90+2'", score: "ARG 1 – 2 ENG", event: "90+2' — Full time! 10-man Argentina fights hard but England wins 2 – 1!" }
          ],
          finalScore: { teamA: 1, teamB: 2 },
          winnerOutcome: 'NO',
          stats: {
            possession: { teamA: 42, teamB: 58 },
            shotsOnTarget: { teamA: 4, teamB: 9 },
            corners: { teamA: 2, teamB: 6 },
            fouls: { teamA: 11, teamB: 8 },
            yellowCards: { teamA: 3, teamB: 1 },
            redCards: { teamA: 1, teamB: 0 }
          },
          analysis: "The red card to Rodrigo De Paul in the 43rd minute drastically shifted control to England. With a numerical advantage, England controlled the midfield possession and took the lead through Bellingham, ultimately neutralizing Argentina's counter-attack options."
        };
      } else if (isClasico) {
        mockFallback = {
          alternateTimeline: [
            { minute: "58'", score: "RMA 1 – 1 FCB", event: "58' — VAR Decision: Lamine Yamal's goal is ruled offside! The score remains 1-1." },
            { minute: "69'", score: "RMA 2 – 1 FCB", event: "69' — GOAL! Vinícius Jr. strikes again for Real Madrid!" },
            { minute: "84'", score: "RMA 2 – 2 FCB", event: "84' — GOAL! Pedri equalises for Barcelona with a clean volley!" },
            { minute: "90+3'", score: "RMA 3 – 2 FCB", event: "90+3' — GOAL! Mbappé scores in injury time!" },
            { minute: "90+6'", score: "RMA 3 – 2 FCB", event: "90+6' — Full time! Real Madrid wins 3 – 2!" }
          ],
          finalScore: { teamA: 3, teamB: 2 },
          winnerOutcome: 'YES',
          stats: {
            possession: { teamA: 48, teamB: 52 },
            shotsOnTarget: { teamA: 8, teamB: 7 },
            corners: { teamA: 4, teamB: 5 },
            fouls: { teamA: 9, teamB: 12 },
            yellowCards: { teamA: 2, teamB: 3 },
            redCards: { teamA: 0, teamB: 0 }
          },
          analysis: "With Lamine Yamal's goal overturned by VAR, the pressure shifted back to Barcelona. Real Madrid exploited the transition spaces, and even though Pedri equalized late on, Mbappé's clinical finishing in injury time sealed the win for Los Blancos."
        };
      } else {
        mockFallback = {
          alternateTimeline: [
            { minute: "25'", score: "ESP 0 – 0 FRA", event: "25' — VAR Decision: Kylian Mbappé's goal is disallowed for offside!" },
            { minute: "48'", score: "ESP 1 – 0 FRA", event: "48' — GOAL! Lamine Yamal fires Spain into the lead!" },
            { minute: "72'", score: "ESP 1 – 1 FRA", event: "72' — GOAL! Ousmane Dembélé scores, France equalises!" },
            { minute: "89'", score: "ESP 2 – 1 FRA", event: "89' — GOAL! Nico Williams scores a late stunning goal!" },
            { minute: "90+4'", score: "ESP 2 – 1 FRA", event: "90+4' — Full time! Spain wins Euro 2026 (2 – 1)!" }
          ],
          finalScore: { teamA: 2, teamB: 1 },
          winnerOutcome: 'YES',
          stats: {
            possession: { teamA: 55, teamB: 45 },
            shotsOnTarget: { teamA: 6, teamB: 4 },
            corners: { teamA: 5, teamB: 3 },
            fouls: { teamA: 7, teamB: 10 },
            yellowCards: { teamA: 1, teamB: 2 },
            redCards: { teamA: 0, teamB: 0 }
          },
          analysis: "Disallowing Mbappé's early goal prevented France from dictating their signature defensive counter-pressing style. Spain's possession-based setup kept France on the back foot, leading to Nico Williams' late game-winner."
        };
      }

      setSimulationData(mockFallback);
      if (betMode === 'PVE') {
        setAiBet(mockFallback.winnerOutcome);
        setAiBalance((prev) => prev - 5.00);
        addLog('🤖 AI Agent places prediction: Staked 5.00 Credits (Fallback loaded).', 'success');
      } else if (betMode === 'PVP') {
        addLog('👥 PvP Prediction contracts active! Player 1 and Player 2 can now place their stakes.', 'info');
      } else {
        addLog('🎮 Twitch public voting open! Chat can type !yes or !no to vote.', 'info');
      }
      addLog('⚠️ Paradox engine offline. High-fidelity local simulation parameters compiled.', 'warning');
      setGameState('PLACING_BETS');
    } finally {
      setLoadingSimulation(false);
    }
  };

  // Place human bet (Player 1)
  const handleHumanBet = async (outcome: 'YES' | 'NO') => {
    if (humanBalance < 5) {
      addLog('❌ Player 1 has insufficient credits to place bet!', 'error');
      return;
    }
    setBetPlacing(true);
    addLog(`⚡ Bento Tx (Player 1): Locking 5.00 Credits on [${outcome}]...`, 'info');

    if (activeDuelId) {
      try {
        const betRes = await fetch('/api/human-bet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            duelId: activeDuelId,
            optionIndex: outcome === 'YES' ? 0 : 1,
            amount: '5000000000000000000'
          })
        });
        const betData = await betRes.json();
        if (betData.success) {
          addLog(`✅ Player 1 Smart Wallet position successfully broadcast on-chain!`, 'success');
        } else {
          addLog(`⚠️ On-chain bet sync failed: ${betData.error}. Placing simulated bet.`, 'warning');
        }
      } catch (err: any) {
        addLog(`⚠️ On-chain bet sync failed: ${err.message}. Placing simulated bet.`, 'warning');
      }
    }

    setHumanBet(outcome);
    setHumanBalance((prev) => prev - 5.00);
    addLog(`👤 Player 1 Smart Wallet position locked: 5 Credits on [${outcome}] registered on-chain!`, 'success');
    setBetPlacing(false);
  };

  // Place Player 2 (Human) bet
  const handlePlayer2Bet = (outcome: 'YES' | 'NO') => {
    if (player2Balance < 5) {
      addLog('❌ Player 2 has insufficient credits to place bet!', 'error');
      return;
    }
    setPlayer2BetPlacing(true);
    addLog(`⚡ Bento Tx (Player 2): Locking 5.00 Credits on [${outcome}]...`, 'info');

    setTimeout(() => {
      setPlayer2Bet(outcome);
      setPlayer2Balance((prev) => prev - 5.00);
      addLog(`👥 Player 2 Smart Wallet position locked: 5 Credits on [${outcome}] registered on-chain!`, 'success');
      setPlayer2BetPlacing(false);
    }, 1000);
  };

  // Claim Faucet for Player 2
  const handlePlayer2Faucet = () => {
    setPlayer2Balance((prev) => prev + 10.00);
    addLog('👤 Player 2 smart wallet claim: +10.00 Credits successfully allocated!', 'success');
  };

  // Claim Faucet for Player 1
  const handlePlayer1Faucet = () => {
    setHumanBalance((prev) => prev + 10.00);
    addLog('👤 Player 1 smart wallet claim: +10.00 Credits successfully allocated!', 'success');
  };

  // Run the alternate timeline simulation
  const startSimulationPlay = () => {
    if (!simulationData) return;
    setGameState('SIMULATING');
    addLog('⚡ Rendering simulated reality timeline...', 'info');

    let idx = 0;
    setSimTimelineIdx(0);

    const simTimer = setInterval(() => {
      if (!simulationData.alternateTimeline[idx]) {
        clearInterval(simTimer);
        setGameState('FINISHED');

        // Payout Calculations
        const outcome = simulationData.winnerOutcome; // YES or NO

        if (betMode === 'PVE') {
          // PvE Mode Settlement
          const userWon = humanBet === outcome;
          const aiWon = aiBet === outcome;
          if (userWon) setHumanBalance((prev) => prev + 12.00);
          if (aiWon) setAiBalance((prev) => prev + 12.00);
        } else if (betMode === 'PVP') {
          // PvP Mode Settlement
          const p1Won = humanBet === outcome;
          const p2Won = player2Bet === outcome;

          if (p1Won && p2Won) {
            setHumanBalance((prev) => prev + 5.00);
            setPlayer2Balance((prev) => prev + 5.00);
            addLog('🤝 DRAW! Both Player 1 and Player 2 predicted correctly. Pool split equally.', 'success');
          } else if (p1Won) {
            setHumanBalance((prev) => prev + 10.00);
            addLog('🏆 Player 1 wins the PvP duel! Payout of 10.00 Credits transfered to Player 1.', 'success');
          } else if (p2Won) {
            setPlayer2Balance((prev) => prev + 10.00);
            addLog('🏆 Player 2 wins the PvP duel! Payout of 10.00 Credits transfered to Player 2.', 'success');
          } else {
            addLog('💀 House wins! Both Player 1 and Player 2 predictions were incorrect.', 'error');
          }
        } else {
          // Twitch mode - Chat vs AI
          const chatWon = humanBet === outcome;
          const aiWon = aiBet === outcome;
          if (chatWon) {
            setHumanBalance((prev) => prev + 10.00); // Chat wins pool
            addLog('🏆 THE STREAM CHAT WINS! Live audience has beaten the AI sports analyst!', 'success');
          } else if (aiWon) {
            setAiBalance((prev) => prev + 10.00); // AI wins pool
            addLog('🤖 AI AGENT WINS! The machine out-analyzed the stream chat this time.', 'success');
          } else {
            addLog('💀 House wins! Both Chat and AI predicted incorrectly.', 'error');
          }
        }

        // On-Chain Bento Market Resolution
        if (activeDuelId) {
          addLog(`⛓️ Resolving prediction market on-chain: Outcome [${outcome}]...`, 'info');
          fetch('/api/resolve-duel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              duelId: activeDuelId,
              outcome: outcome
            })
          })
            .then((res) => res.json())
            .then((resolveData) => {
              if (resolveData.success) {
                addLog(`✅ On-chain Bento market resolved successfully! Outcome [${outcome}] settled.`, 'success');
              } else {
                addLog(`⚠️ On-chain resolve: ${resolveData.error || 'Simulated resolution applied.'}`, 'warning');
              }
            })
            .catch((err) => {
              addLog(`⚠️ On-chain resolve error: ${err.message}`, 'warning');
            });
        }

        addLog(`🏁 Simulation Complete! Final Score: ${currentScenario.teamAShort} ${simulationData.finalScore.teamA ?? 0} – ${simulationData.finalScore.teamB ?? 0} ${currentScenario.teamBShort}`, 'success');
        addLog(`🏆 Alternate Outcome resolved: [${simulationData.winnerOutcome}] (${currentScenario.teamA} ${simulationData.winnerOutcome === 'YES' ? 'Won' : 'Did Not Win'}).`, 'success');
        return;
      }

      const event = simulationData.alternateTimeline[idx];
      addLog(`[Paradox Reality] ${event.event}`, event.event.includes('GOAL') ? 'success' : event.event.includes('Disallowed') || event.event.includes('Red card') ? 'error' : 'info');
      setSimTimelineIdx(idx);
      idx++;
    }, 2200);
  };

  // UI calculations
  const currentEvent = currentScenario.originalTimeline[currentMinuteIdx];
  const displayScore = gameState === 'SIMULATING' || gameState === 'FINISHED'
    ? (simulationData?.alternateTimeline[simTimelineIdx]?.score || `${currentScenario.teamAShort} 0 – 0 ${currentScenario.teamBShort}`)
    : (currentEvent?.score || `${currentScenario.teamAShort} 0 – 0 ${currentScenario.teamBShort}`);

  const displayMinute = gameState === 'SIMULATING' || gameState === 'FINISHED'
    ? (simulationData?.alternateTimeline[simTimelineIdx]?.minute || "0'")
    : (currentEvent?.minute || "0'");

  const displayEvent = gameState === 'SIMULATING' || gameState === 'FINISHED'
    ? (simulationData?.alternateTimeline[simTimelineIdx]?.event || "Rendering paradox timeline...")
    : (currentEvent?.event || "Match kick-off!");

  const teamAScore = displayScore.split('–')[0].trim().slice(-1);
  const teamBScore = displayScore.split('–')[1]?.trim()[0] || '0';

  // Possession graphics
  const argPoss = gameState === 'FINISHED' && simulationData
    ? (simulationData.stats.possession.teamA ?? 50)
    : currentScenario.defaultStats.teamAProb;
  const engPoss = gameState === 'FINISHED' && simulationData
    ? (simulationData.stats.possession.teamB ?? 50)
    : currentScenario.defaultStats.teamBProb;

  const argShots = gameState === 'FINISHED' && simulationData ? (simulationData.stats.shotsOnTarget.teamA ?? 5) : 5;
  const engShots = gameState === 'FINISHED' && simulationData ? (simulationData.stats.shotsOnTarget.teamB ?? 4) : 3;

  // Check if simulation start condition is met
  const isSimulationStartReady = () => {
    if (!simulationData) return false;
    if (betMode === 'PVE') {
      return !!humanBet && !!aiBet;
    } else if (betMode === 'PVP') {
      return !!humanBet && !!player2Bet;
    } else {
      return !!humanBet && !!aiBet;
    }
  };

  // Calculate vote percentages for Twitch Chat Mode
  const totalVotes = twitchVotes.yes + twitchVotes.no;
  const yesPercent = totalVotes > 0 ? Math.round((twitchVotes.yes / totalVotes) * 100) : 50;
  const noPercent = totalVotes > 0 ? Math.round((twitchVotes.no / totalVotes) * 100) : 50;

  return (
    <div className="bg-surface text-on-surface selection:bg-primary-container selection:text-on-primary-container min-h-screen overflow-x-hidden pb-12 font-sans">
      
      {/* Grid Background */}
      <div className="light-grid-bg"></div>

      {/* TopNavBar */}
      <header className="fixed top-0 w-full z-50 flex items-center justify-between px-margin-edge h-16 bg-surface/80 backdrop-blur-md border-b border-outline-variant">
        <div className="flex items-center gap-8">
          <span className="font-display-lg text-headline-lg tracking-tighter text-electric-blue">MIND VS MACHINE ARENA</span>
          <nav className="hidden md:flex items-center gap-6">
            <Link className="text-on-surface-variant hover:text-electric-blue transition-colors font-title-md text-body-sm" href="/">Live Duel</Link>
            <Link className="text-electric-blue border-b-2 border-electric-blue pb-1 font-title-md text-body-sm transition-all duration-300" href="/paradox-arena">Paradox Arena</Link>
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

      {/* Main Grid content */}
      <main className="pt-24 px-margin-edge max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in-up">
        
        {/* Game Mode Picker Tabs */}
        <div className="flex items-center justify-between bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm">
          <div>
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase text-xs block mb-1 font-bold">
              BETTING GAME MODE
            </span>
            <span className="text-xs text-slate-500 font-sans">
              Choose to compete against the Autonomous AI, stake PvP, or stream live with Twitch Chat:
            </span>
          </div>

          <div className="flex bg-black/5 border border-outline-variant/20 rounded-lg p-0.5 shrink-0">
            <button
              onClick={() => handleModeChange('PVE')}
              className={`px-3 py-1.5 text-xs font-label-caps uppercase rounded-md tracking-wider transition cursor-pointer font-bold flex items-center gap-1.5 ${
                betMode === 'PVE'
                  ? 'bg-white text-electric-blue shadow-sm border border-outline-variant/20'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-sm">psychology</span>
              Human vs AI
            </button>
            <button
              onClick={() => handleModeChange('PVP')}
              className={`px-3 py-1.5 text-xs font-label-caps uppercase rounded-md tracking-wider transition cursor-pointer font-bold flex items-center gap-1.5 ${
                betMode === 'PVP'
                  ? 'bg-white text-electric-blue shadow-sm border border-outline-variant/20'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-sm">group</span>
              Human vs Human
            </button>
            <button
              onClick={() => handleModeChange('TWITCH')}
              className={`px-3 py-1.5 text-xs font-label-caps uppercase rounded-md tracking-wider transition cursor-pointer font-bold flex items-center gap-1.5 ${
                betMode === 'TWITCH'
                  ? 'bg-white text-electric-blue shadow-sm border border-outline-variant/20'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-sm">videogame_asset</span>
              Twitch Chat
            </button>
          </div>
        </div>

        {/* Scenario Selection Cards */}
        <div className="flex flex-col gap-2">
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-xs block mb-1">
            Choose Match Scenario
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SCENARIOS.map((s, idx) => {
              const isActive = activeScenarioIdx === idx;
              return (
                <div 
                  key={s.id}
                  onClick={() => handleScenarioChange(idx)}
                  className={`border rounded-xl p-4 shadow-sm cursor-pointer transition-all duration-300 transform hover:scale-[1.01] ${
                    isActive 
                      ? 'bg-neon-purple/5 border-neon-purple text-neon-purple ring-1 ring-neon-purple/20' 
                      : 'bg-surface-container-lowest border-outline-variant hover:border-neon-purple/40 text-on-surface-variant'
                  }`}
                >
                  <span className="font-bold block text-sm mb-1">{s.title}</span>
                  <span className="text-[10px] uppercase font-data-mono opacity-85 block">
                    {s.teamA} VS {s.teamB}
                  </span>
                  <div className="flex gap-2 mt-3 items-center">
                    <div className="w-6 h-4 border border-outline-variant/30 rounded-sm overflow-hidden shrink-0">
                      {s.flagA}
                    </div>
                    <span className="text-xs font-bold text-on-background">{s.teamAShort}</span>
                    <span className="text-xs text-slate-400">vs</span>
                    <div className="w-6 h-4 border border-outline-variant/30 rounded-sm overflow-hidden shrink-0">
                      {s.flagB}
                    </div>
                    <span className="text-xs font-bold text-on-background">{s.teamBShort}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pivot Points Selector Tabs */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase text-xs block mb-1 font-bold">
              Detected Game Pivot Point Scenarios
            </span>
            <span className="text-xs text-slate-500 font-sans">
              Select which timeline event you want the Paradox Engine to intercept:
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {currentScenario.pivotPoints.map((p, idx) => {
              const isActive = activePivotIdx === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handlePivotChange(idx)}
                  className={`px-4 py-2 text-xs font-bold font-data-mono rounded-xl border transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-neon-purple text-white border-neon-purple shadow-sm'
                      : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:border-neon-purple/40'
                  }`}
                >
                  {p.minute}' — {p.description.split('at')[0].trim()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Paradox Dashboard Header */}
        <div className="flex items-center justify-between bg-surface-container-lowest border border-outline-variant rounded p-4 shadow-sm rounded-xl">
          <div className="flex items-center gap-4">
            <span className="font-label-caps text-label-caps text-neon-purple flex items-center gap-2 font-bold uppercase">
              <span className="w-2.5 h-2.5 bg-neon-purple rounded-full animate-ping shrink-0" />
              PARADOX ENGINE Core
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => handleScenarioChange(activeScenarioIdx)}
                className="p-1 text-on-surface-variant hover:text-error transition-all duration-300 transform hover:scale-110 material-symbols-outlined text-xl cursor-pointer"
                title="Restart this match timeline"
              >
                restart_alt
              </button>
            </div>
          </div>
          
          <div className="flex gap-3">
            {gameState === 'HALTED_AT_PIVOT' && (
              <button
                onClick={triggerSimulationFetch}
                disabled={loadingSimulation}
                className="px-6 py-2 bg-neon-purple text-white border border-neon-purple/20 hover:brightness-110 font-bold tracking-wider rounded transition-all transform active:scale-95 rounded-xl cursor-pointer flex items-center gap-2"
              >
                {loadingSimulation ? 'LAUNCHING ENGINE...' : 'TRIGGER PARADOX REALITY'}
              </button>
            )}

            {gameState === 'PLACING_BETS' && isSimulationStartReady() && (
              <button 
                onClick={startSimulationPlay}
                className="px-6 py-2 bg-emerald-green text-white border border-emerald-green/20 hover:brightness-110 font-bold tracking-wider rounded transition-all transform active:scale-95 rounded-xl cursor-pointer flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">play_arrow</span>
                ACTIVATE REALITY SIMULATION
              </button>
            )}
          </div>
        </div>

        {/* On-Chain Bento Market Status */}
        {activeDuelId && (
          <div className="bg-slate-900 border border-purple-500/30 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in-up">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-pulse"></span>
              <div>
                <span className="text-[10px] font-label-caps text-purple-400 block font-bold uppercase tracking-wider">
                  ACTIVE BENTO ON-CHAIN MARKET
                </span>
                <span className="font-data-mono text-xs text-slate-300">
                  Duel ID: <span className="text-white select-all font-bold">{activeDuelId}</span>
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {txHash && (
                <a
                  href={`https://sepolia.basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-purple-900/40 border border-purple-500/30 text-purple-300 rounded-lg text-[10px] font-data-mono hover:bg-purple-900/60 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xs">link</span>
                  Explorer (Market Created)
                </a>
              )}
              {inviteCode && (
                <div className="px-3 py-1 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-[10px] font-data-mono flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-xs">share</span>
                  Invite Code: <span className="text-white select-all font-bold">{inviteCode}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Global Reality Pivot Announcement */}
        {gameState === 'HALTED_AT_PIVOT' && (
          <div className="rounded-xl border border-yellow-400/40 bg-yellow-400/10 p-5 text-center animate-fade-in-up">
            <div className="text-sm font-bold text-yellow-600 uppercase tracking-widest mb-1.5 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-yellow-600 animate-bounce">warning</span>
              ⚠️ AUTOMATIC PIVOT INTERCEPTED
            </div>
            <p className="text-sm text-on-surface max-w-2xl mx-auto leading-relaxed">
              At minute {currentPivot.minute}', the original event was: **"{currentPivot.originalEvent}"**.
              <br />
              The Paradox Engine has intercepted this moment.
              <strong className="text-neon-purple mt-2 block text-md">Scenario: "{currentPivot.description}"</strong>
            </p>
            <p className="text-xs text-on-surface-variant mt-2 font-data-mono">
              Click "Trigger Paradox Reality" above to simulate this timeline paradox.
            </p>
          </div>
        )}

        {/* Bets Placement overlay prompt */}
        {gameState === 'PLACING_BETS' && (
          <div className="rounded-xl border border-neon-purple/30 bg-neon-purple/5 p-5 text-center animate-fade-in-up">
            <div className="text-sm font-bold text-neon-purple uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-neon-purple animate-pulse">psychology</span>
              STAKE THE ALTERNATE REALITY
            </div>
            <p className="text-sm text-on-surface max-w-2xl mx-auto leading-normal">
              {betMode === 'TWITCH' ? 'Twitch stream voting is active! Viewer votes are pooled together.' : 'A new reality has been calculated. Lock in predictions to proceed.'}
              <br />
              <strong className="text-electric-blue block mt-1.5 font-bold">
                {currentScenario.question}
              </strong>
            </p>
            
            <div className="mt-4 flex items-center justify-center gap-6">
              {betMode !== 'TWITCH' ? (
                // PVE or PVP Mode betting controls
                <>
                  {!humanBet ? (
                    <div className="flex gap-4">
                      <button
                        onClick={() => handleHumanBet('YES')}
                        disabled={betPlacing}
                        className="px-6 py-2.5 bg-electric-blue text-white font-bold rounded-xl shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                      >
                        YES ({currentScenario.teamAShort} WIN)
                      </button>
                      <button
                        onClick={() => handleHumanBet('NO')}
                        disabled={betPlacing}
                        className="px-6 py-2.5 border border-outline-variant text-on-background font-bold rounded-xl hover:bg-surface-container-high active:scale-95 transition-all cursor-pointer"
                      >
                        NO ({currentScenario.teamBShort} WIN/DRAW)
                      </button>
                    </div>
                  ) : (
                    <div className="text-sm font-data-mono text-emerald-green bg-emerald-green/10 border border-emerald-green/20 px-4 py-2 rounded-xl">
                      🔒 Player 1 Lock: **[{humanBet}]** · Stake: **5.00 Credits**
                    </div>
                  )}

                  {betMode === 'PVP' && (
                    player2Bet ? (
                      <div className="text-sm font-data-mono text-emerald-green bg-emerald-green/10 border border-emerald-green/20 px-4 py-2 rounded-xl">
                        🔒 Player 2 Lock: **[{player2Bet}]** · Stake: **5.00 Credits**
                      </div>
                    ) : (
                      <div className="text-sm font-data-mono text-slate-500 bg-slate-100 border border-slate-200 px-4 py-2 rounded-xl animate-pulse">
                        ⏳ Waiting for Player 2 Bet...
                      </div>
                    )
                  )}
                </>
              ) : (
                // Twitch Mode betting status
                <>
                  {countdown !== null && (
                    <div className="text-xl font-bold font-data-mono text-error animate-pulse border border-error/20 bg-error/5 px-6 py-3 rounded-xl">
                      ⏱️ VOTING LOCKS IN: {countdown}s
                    </div>
                  )}
                  {humanBet ? (
                    <div className="text-sm font-data-mono text-emerald-green bg-emerald-green/10 border border-emerald-green/20 px-5 py-3 rounded-xl flex items-center gap-2">
                      <span className="material-symbols-outlined">lock</span>
                      🔒 Chat Collective Decision Locked on **[{humanBet}]** (Stake: 5.00 Credits)
                    </div>
                  ) : (
                    countdown === null && (
                      <button
                        onClick={startCountdown}
                        className="px-8 py-3 bg-neon-purple text-white font-bold rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer text-sm tracking-wide"
                      >
                        <span className="material-symbols-outlined text-sm">hourglass_empty</span>
                        START 10S COUNTDOWN & LOCK BETS
                      </button>
                    )
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Finished game results settlement banner */}
        {gameState === 'FINISHED' && simulationData && (
          <div className="rounded-xl border border-emerald-green/30 bg-emerald-green/10 p-5 text-center animate-fade-in-up">
            <div className="text-md font-bold text-emerald-green uppercase tracking-widest mb-1.5 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-emerald-green animate-pulse">sports_score</span>
              Paradox Resolved: Final Score {currentScenario.teamAShort} {simulationData.finalScore.teamA ?? 0} – {simulationData.finalScore.teamB ?? 0} {currentScenario.teamBShort}
            </div>
            <p className="text-sm text-on-surface-variant max-w-2xl mx-auto mb-3 font-sans">
              {simulationData.analysis}
            </p>

            {betMode === 'PVE' ? (
              <div className="text-md font-black uppercase text-on-background font-data-mono tracking-wider grid grid-cols-2 max-w-md mx-auto py-2 border-t border-b border-emerald-green/20 mt-2">
                <div>
                  <span className="block text-[10px] text-slate-500">HUMAN PAYOUT</span>
                  {humanBet === simulationData.winnerOutcome ? '🏆 +12.00 Credits (WIN)' : '💀 -5.00 Credits (LOSS)'}
                </div>
                <div className="border-l border-emerald-green/20">
                  <span className="block text-[10px] text-slate-500">AI AGENT PAYOUT</span>
                  {aiBet === simulationData.winnerOutcome ? '🏆 +12.00 Credits (WIN)' : '💀 -5.00 Credits (LOSS)'}
                </div>
              </div>
            ) : betMode === 'PVP' ? (
              <div className="text-md font-black uppercase text-on-background font-data-mono tracking-wider grid grid-cols-2 max-w-md mx-auto py-2 border-t border-b border-emerald-green/20 mt-2">
                <div>
                  <span className="block text-[10px] text-slate-500">PLAYER 1 PAYOUT</span>
                  {humanBet === simulationData.winnerOutcome 
                    ? (player2Bet === simulationData.winnerOutcome ? '🤝 +5.00 Credits (SPLIT)' : '🏆 +10.00 Credits (WIN)')
                    : '💀 -5.00 Credits (LOSS)'}
                </div>
                <div className="border-l border-emerald-green/20">
                  <span className="block text-[10px] text-slate-500">PLAYER 2 PAYOUT</span>
                  {player2Bet === simulationData.winnerOutcome 
                    ? (humanBet === simulationData.winnerOutcome ? '🤝 +5.00 Credits (SPLIT)' : '🏆 +10.00 Credits (WIN)')
                    : '💀 -5.00 Credits (LOSS)'}
                </div>
              </div>
            ) : (
              <div className="text-md font-black uppercase text-on-background font-data-mono tracking-wider grid grid-cols-2 max-w-md mx-auto py-2 border-t border-b border-emerald-green/20 mt-2">
                <div>
                  <span className="block text-[10px] text-slate-500">STREAM CHAT PAYOUT</span>
                  {humanBet === simulationData.winnerOutcome ? '🏆 +10.00 Credits (WIN)' : '💀 -5.00 Credits (LOSS)'}
                </div>
                <div className="border-l border-emerald-green/20">
                  <span className="block text-[10px] text-slate-500">AI AGENT PAYOUT</span>
                  {aiBet === simulationData.winnerOutcome ? '🏆 +10.00 Credits (WIN)' : '💀 -5.00 Credits (LOSS)'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scoreboard block */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded overflow-hidden shadow-md rounded-xl">
          <div className="grid grid-cols-3 h-40">
            {/* Team A flag */}
            <div className="flex flex-col items-center justify-center border-r border-outline-variant relative overflow-hidden group">
              <div className="absolute inset-0 z-0 opacity-[0.22] pointer-events-none flex items-center justify-center transition-opacity duration-700 group-hover:opacity-[0.32]">
                {currentScenario.flagA}
              </div>
              <span className="relative z-10 font-label-caps text-label-caps text-on-surface-variant mb-2">{currentScenario.teamA}</span>
              <span className="relative z-10 font-display-lg text-[64px] text-on-background leading-none animate-score-pop">
                {teamAScore}
              </span>
            </div>
            
            {/* Match Info Ticker */}
            <div className="flex flex-col items-center justify-center bg-surface-container-low border-x border-outline-variant/10 px-4 text-center">
              <span className="font-data-mono text-2xl text-neon-purple mb-1 tracking-widest">
                {displayMinute}
              </span>
              
              <div className="flex items-center gap-1.5 px-3 py-1 bg-neon-purple/10 border border-neon-purple/20 text-neon-purple text-[10px] font-bold rounded uppercase tracking-[0.2em] animate-pulse">
                <span className="w-1.5 h-1.5 bg-neon-purple rounded-full"></span>
                {gameState === 'SIMULATING' ? 'SIMULATING PARADOX' : gameState === 'PLAYING_ORIGINAL' ? 'ORIGINAL REALITY' : 'TIMELINE PAUSED'}
              </div>
              
              <div className="mt-4 flex gap-2">
                <span className="w-1.5 h-1.5 bg-neon-purple rounded-full animate-bounce [animation-delay:0ms]"></span>
                <span className="w-1.5 h-1.5 bg-neon-purple rounded-full animate-bounce [animation-delay:150ms]"></span>
                <span className="w-1.5 h-1.5 bg-neon-purple rounded-full animate-bounce [animation-delay:300ms]"></span>
              </div>
            </div>
            
            {/* Team B Flag */}
            <div className="flex flex-col items-center justify-center border-l border-outline-variant relative overflow-hidden group">
              <div className="absolute inset-0 z-0 opacity-[0.22] pointer-events-none flex items-center justify-center transition-opacity duration-700 group-hover:opacity-[0.32]">
                {currentScenario.flagB}
              </div>
              <span className="relative z-10 font-label-caps text-label-caps text-on-surface-variant mb-2">{currentScenario.teamB}</span>
              <span className="relative z-10 font-display-lg text-[64px] text-on-background leading-none animate-score-pop [animation-delay:100ms]">
                {teamBScore}
              </span>
            </div>
          </div>
          
          {/* Progress bar and event banner */}
          <div className="px-6 py-3.5 bg-surface-container-lowest border-t border-outline-variant/10 text-center text-xs font-semibold text-slate-700 font-data-mono">
            {displayEvent}
          </div>
        </div>

        {/* Dual Panel Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left panel: Player 1 Smart Wallet */}
          <div className="flex flex-col gap-6">
            <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded shadow-sm transition-all duration-300 hover:border-electric-blue/30 group rounded-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-headline-lg text-title-md text-electric-blue flex items-center gap-2">
                  {betMode === 'TWITCH' ? 'CHAT POOL WALLET' : 'PLAYER 1 ARENA'}
                  <span className="w-1.5 h-1.5 bg-electric-blue rounded-full animate-ping"></span>
                </h2>
                <span className="font-data-mono text-[10px] text-on-surface-variant opacity-60">
                  {betMode === 'TWITCH' ? 'AGGREGATED STATS' : 'SESSION OVERRIDES'}
                </span>
              </div>
              
              <div className="bg-surface-container-low p-4 border border-outline-variant/30 rounded group-hover:bg-surface-container-lowest transition-colors rounded-xl mb-6">
                <p className="font-label-caps text-[10px] text-on-surface-variant mb-1 uppercase">Active Balance</p>
                <div className="flex items-center justify-between">
                  <p className="font-data-mono text-xl text-on-background">
                    {humanBalance.toFixed(2)} <span className="text-electric-blue/60 text-sm">Credits</span>
                  </p>
                  <button
                    onClick={handlePlayer1Faucet}
                    className="px-2.5 py-1 rounded border border-electric-blue/40 text-electric-blue font-label-caps text-[9px] font-bold hover:bg-electric-blue/5 transition cursor-pointer"
                  >
                    MINT FAUCET
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="font-label-caps text-[10px] text-on-surface-variant font-bold">
                    {betMode === 'TWITCH' ? 'CHAT SMART WALLET' : 'SMART WALLET ADDRESS'}
                  </label>
                  <input 
                    type="text"
                    value={humanAddress}
                    onChange={(e) => setHumanAddress(e.target.value)}
                    className="bg-surface-container-lowest border border-outline-variant text-on-background p-3 rounded focus:border-electric-blue focus:ring-1 focus:ring-electric-blue/20 transition-all outline-none font-data-mono text-xs rounded-xl"
                    placeholder="Smart Wallet Address (0x...)"
                    readOnly={betMode === 'TWITCH'}
                  />
                </div>

                <div className="bg-surface-container-low/50 p-4 border border-outline-variant/30 rounded-xl">
                  <p className="font-label-caps text-[9px] text-electric-blue uppercase mb-1.5 tracking-widest font-bold">Prediction Target Question</p>
                  <p className="text-sm font-semibold text-on-background font-sans leading-normal">
                    {currentScenario.question}
                  </p>
                </div>

                {humanBet && (
                  <div className="px-4 py-3 rounded border border-emerald-green/20 bg-emerald-green/5 text-emerald-green text-xs font-data-mono rounded-xl flex items-center justify-between">
                    <span>
                      {betMode === 'TWITCH' ? 'Chat Staked Position:' : 'Player 1 Position:'}
                    </span>
                    <span className="font-bold">
                      {humanBet} · 5.00 credits staked
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Middle panel: Stats comparison & Logs */}
          <div className="flex flex-col gap-6">
            <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded shadow-sm rounded-xl">
              <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-4 uppercase tracking-[0.1em]">Reality Stats Shifts</h3>
              
              <div className="space-y-4">
                {/* Possession */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-data-mono uppercase">
                    <span className="text-on-surface-variant font-bold">{currentScenario.teamAShort}</span>
                    <div className="flex gap-4">
                      <span className="text-on-background font-bold">{argPoss}%</span>
                      <span className="text-electric-blue font-bold">{engPoss}%</span>
                    </div>
                    <span className="text-electric-blue font-bold font-mono">{currentScenario.teamBShort}</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden flex">
                    <div className="bg-on-surface-variant/20 h-full" style={{ width: `${argPoss}%` }}></div>
                    <div className="bg-electric-blue h-full" style={{ width: `${engPoss}%` }}></div>
                  </div>
                </div>

                {/* Grid stats */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-surface-container-low/50 p-3 border border-outline-variant/20 rounded-xl">
                    <p className="text-[10px] font-label-caps text-on-surface-variant mb-2">SHOTS ON TARGET</p>
                    <div className="flex justify-between items-end">
                      <span className="font-data-mono text-lg">{argShots}</span>
                      <span className="font-data-mono text-lg text-electric-blue">{engShots}</span>
                    </div>
                  </div>
                  <div className="bg-surface-container-low/50 p-3 border border-outline-variant/20 rounded-xl">
                    <p className="text-[10px] font-label-caps text-on-surface-variant mb-2">RED CARDS</p>
                    <div className="flex justify-between items-end">
                      <span className="font-data-mono text-lg text-error font-bold">
                        {gameState === 'FINISHED' || gameState === 'SIMULATING' ? (simulationData?.stats.redCards.teamA ?? 0) : 0}
                      </span>
                      <span className="font-data-mono text-lg text-electric-blue">
                        {gameState === 'FINISHED' || gameState === 'SIMULATING' ? (simulationData?.stats.redCards.teamB ?? 0) : 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logs section */}
              <div className="mt-6 pt-6 border-t border-outline-variant/20">
                <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-3 uppercase tracking-[0.1em] flex items-center justify-between">
                  Paradox Console Stream
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-neon-purple rounded-full animate-pulse"></span>
                  </span>
                </h3>
                
                <div ref={logContainerRef} className="space-y-1.5 h-44 overflow-y-auto pr-2 custom-scrollbar font-data-mono text-[10px]">
                  {logs.map((log, idx) => (
                    <div key={idx} className="flex gap-2 items-start border-b border-outline-variant/5 pb-1">
                      <span className="text-slate-400 shrink-0">{log.timestamp}</span>
                      <span className={
                        log.type === 'success' ? 'text-emerald-green font-bold' :
                        log.type === 'error' ? 'text-error font-bold' :
                        log.type === 'warning' ? 'text-yellow-600 font-bold' : 'text-slate-700'
                      }>
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Right panel: AI Workspace (PVE) OR Player 2 Workspace (PVP) OR Twitch Chat Feed (TWITCH) */}
          <div className="flex flex-col gap-6">
            <div className="flex-1 bg-surface-container-lowest border border-outline-variant rounded flex flex-col min-h-[480px] overflow-hidden shadow-sm rounded-xl">
              
              {betMode === 'PVE' ? (
                /* ── PVE MODE: AI THINKING PANEL ── */
                <>
                  <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-low flex items-center justify-between">
                    <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-[0.1em] font-bold text-neon-purple">AI THINKING</h3>
                    <div className="flex bg-black/5 border border-outline-variant/20 rounded-lg p-0.5">
                      <button
                        onClick={() => setAiTab('thinking')}
                        className={`px-3 py-1 text-[10px] font-label-caps uppercase rounded-md tracking-wider transition cursor-pointer font-bold ${
                          aiTab === 'thinking'
                            ? 'bg-white text-neon-purple shadow-sm border border-outline-variant/20'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Analysis
                      </button>
                      <button
                        onClick={() => setAiTab('sources')}
                        className={`px-3 py-1 text-[10px] font-label-caps uppercase rounded-md tracking-wider transition cursor-pointer font-bold ${
                          aiTab === 'sources'
                            ? 'bg-white text-neon-purple shadow-sm border border-outline-variant/20'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Raw Data
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 p-6 font-body-sm text-on-surface-variant space-y-4 overflow-y-auto custom-scrollbar">
                    {simulationData ? (
                      aiTab === 'thinking' ? (
                        <div className="space-y-4 animate-fade-in-up">
                          <p className="font-sans leading-relaxed text-sm text-on-surface">
                            {simulationData.analysis}
                          </p>
                          
                          <div className="pt-4 border-t border-outline-variant/20">
                            <p className="text-[10px] font-label-caps text-neon-purple uppercase tracking-widest font-bold">
                              AI Predicted Alternate Outcome
                            </p>
                            <p className="text-4xl font-display-lg text-on-background mt-1">
                              {simulationData.winnerOutcome === 'YES' ? `${currentScenario.teamAShort} WIN` : `${currentScenario.teamBShort} WIN / DRAW`}
                            </p>
                          </div>

                          <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/30 flex items-center justify-between font-data-mono text-xs mt-4">
                            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold">Smart Resolution Action:</span>
                            <span className={`px-2 py-0.5 rounded font-black ${
                              aiBet === 'YES' ? 'bg-emerald-green/10 text-emerald-green border border-emerald-green/20' : 'bg-error/10 text-error border border-error/20'
                            }`}>
                              STAKE {aiBet}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 animate-fade-in-up">
                          <div className="space-y-1">
                            <span className="text-[9px] font-label-caps text-on-surface-variant uppercase tracking-widest block font-bold">
                              Scrape Context (Alternate Timeline Prompt)
                            </span>
                            <pre className="p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl font-data-mono text-[9px] leading-relaxed text-slate-600 overflow-x-auto whitespace-pre-wrap max-h-40">
                              {`What-If Event at ${currentPivot.minute}': "${currentPivot.description}"`}
                            </pre>
                          </div>
                          <div className="space-y-1 mt-3">
                            <span className="text-[9px] font-label-caps text-on-surface-variant uppercase tracking-widest block font-bold">
                              JSON Response Payload from OpenRouter
                            </span>
                            <pre className="p-3 bg-surface-container-low border border-purple-300/30 rounded-xl font-data-mono text-[9px] leading-relaxed text-purple-700 overflow-x-auto max-h-44">
                              {JSON.stringify(simulationData, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-20 text-slate-400">
                        <span className="material-symbols-outlined text-4xl animate-pulse text-neon-purple">psychology</span>
                        <p className="text-xs font-sans">
                          {gameState === 'AI_THINKING' ? (
                            <span>
                              AI is analyzing alternate realities...
                              <br />
                              Contacting Google Gemma 4.
                            </span>
                          ) : (
                            <span>
                              AI thinking space is idle.
                              <br />
                              Wait for the original game to reach the pivot point ({currentPivot.minute}').
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mx-6 my-4 p-3 bg-surface-container-low border border-outline-variant/20 rounded-xl flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[9px] font-label-caps text-on-surface-variant uppercase block">AI Agent Wallet</span>
                      <span className="font-data-mono text-[11px] text-slate-500 truncate block mt-0.5">
                        {aiAddress || '0xaa784bb5e2949fbe189bdd7e6fad3ddf4bd08eb6'}
                      </span>
                    </div>
                    <div className="bg-surface-container-low px-2 py-1 rounded border border-outline-variant/30 font-data-mono text-[10px]">
                      {aiBalance.toFixed(2)} Credits
                    </div>
                  </div>
                </>
              ) : betMode === 'PVP' ? (
                /* ── PVP MODE: PLAYER 2 WALLET & BET PANEL ── */
                <>
                  <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-low flex items-center justify-between">
                    <h3 className="font-headline-lg text-title-md text-neon-purple flex items-center gap-2 font-bold">
                      PLAYER 2 ARENA
                      <span className="w-1.5 h-1.5 bg-neon-purple rounded-full animate-ping"></span>
                    </h3>
                    <span className="font-data-mono text-[10px] text-on-surface-variant opacity-60">
                      PvP CREDITS DESK
                    </span>
                  </div>

                  <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
                    <div className="bg-surface-container-low p-4 border border-outline-variant/30 rounded-xl">
                      <p className="font-label-caps text-[10px] text-on-surface-variant mb-1 uppercase">Active Balance</p>
                      <div className="flex items-center justify-between">
                        <p className="font-data-mono text-xl text-on-background">
                          {player2Balance.toFixed(2)} <span className="text-neon-purple/60 text-sm">Credits</span>
                        </p>
                        <button
                          onClick={handlePlayer2Faucet}
                          className="px-2.5 py-1 rounded border border-neon-purple/40 text-neon-purple font-label-caps text-[9px] font-bold hover:bg-neon-purple/5 transition cursor-pointer"
                        >
                          MINT FAUCET
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-col gap-2">
                        <label className="font-label-caps text-[10px] text-on-surface-variant font-bold">PLAYER 2 SMART WALLET</label>
                        <input 
                          type="text"
                          value={player2Address}
                          onChange={(e) => setPlayer2Address(e.target.value)}
                          className="bg-surface-container-lowest border border-outline-variant text-on-background p-3 rounded focus:border-neon-purple focus:ring-1 focus:ring-neon-purple/20 transition-all outline-none font-data-mono text-xs rounded-xl"
                          placeholder="Smart Wallet Address (0x...)"
                        />
                      </div>

                      {gameState === 'PLACING_BETS' && !player2Bet && (
                        <div className="space-y-3 animate-fade-in-up">
                          <span className="font-label-caps text-[10px] text-on-surface-variant font-bold block">
                            PLAYER 2 LOCK IN PREDICTION
                          </span>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => handlePlayer2Bet('YES')}
                              disabled={player2BetPlacing}
                              className="py-3 bg-neon-purple text-white font-bold rounded-xl shadow hover:brightness-110 active:scale-95 transition-all cursor-pointer text-xs"
                            >
                              YES (WIN)
                            </button>
                            <button
                              onClick={() => handlePlayer2Bet('NO')}
                              disabled={player2BetPlacing}
                              className="py-3 border border-outline-variant text-on-background font-bold rounded-xl hover:bg-surface-container-high active:scale-95 transition-all cursor-pointer text-xs"
                            >
                              NO (WIN/DRAW)
                            </button>
                          </div>
                        </div>
                      )}

                      {player2Bet && (
                        <div className="px-4 py-3 rounded border border-emerald-green/20 bg-emerald-green/5 text-emerald-green text-xs font-data-mono rounded-xl flex items-center justify-between animate-fade-in-up">
                          <span>Staked Position:</span>
                          <span className="font-bold">
                            {player2Bet} · 5.00 credits staked
                          </span>
                        </div>
                      )}

                      {gameState !== 'PLACING_BETS' && gameState !== 'SIMULATING' && gameState !== 'FINISHED' && (
                        <div className="p-4 bg-surface-container-low/50 rounded-xl border border-outline-variant/20 text-center py-8 text-slate-400">
                          <span className="material-symbols-outlined text-3xl animate-pulse block mb-2">lock</span>
                          <span className="text-xs font-sans">
                            Player 2 betting will unlock once the reality split is triggered.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mx-6 my-4 p-3 bg-surface-container-low border border-outline-variant/20 rounded-xl text-center text-[10px] font-data-mono text-slate-500">
                    👥 LOCAL PLAYER 2 SMART ACCOUNT
                  </div>
                </>
              ) : (
                /* ── TWITCH CHAT PVP LOBBY PANEL ── */
                <>
                  <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-low flex items-center justify-between">
                    <h3 className="font-headline-lg text-title-md text-neon-purple flex items-center gap-2 font-bold uppercase">
                      🎮 Twitch chat workspace
                    </h3>
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded font-data-mono ${
                      isTwitchConnected ? 'bg-emerald-green/10 text-emerald-green border border-emerald-green/20' : 'bg-error/10 text-error border border-error/20'
                    }`}>
                      {isTwitchConnected ? 'CONNECTED' : 'DISCONNECTED'}
                    </span>
                  </div>

                  {/* Channel inputs & controllers */}
                  <div className="p-4 bg-surface-container-low/40 border-b border-outline-variant/20 space-y-3.5">
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={twitchChannel}
                        onChange={(e) => setTwitchChannel(e.target.value)}
                        className="flex-1 bg-surface-container-lowest border border-outline-variant text-on-background px-3 py-2 rounded focus:border-neon-purple transition-all outline-none font-data-mono text-xs rounded-xl"
                        placeholder="Twitch Channel Name"
                      />
                      {!isTwitchConnected ? (
                        <button
                          onClick={() => connectTwitch(twitchChannel)}
                          className="px-4 py-2 bg-neon-purple text-white text-xs font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                        >
                          Connect
                        </button>
                      ) : (
                        <button
                          onClick={disconnectTwitch}
                          className="px-4 py-2 bg-error text-white text-xs font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                        >
                          Disconnect
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs font-sans">
                      <span className="text-slate-500 font-medium">Chat Simulator (Offline Testing):</span>
                      {!isSimulatingChat ? (
                        <button
                          onClick={startChatSimulator}
                          className="px-3 py-1 bg-electric-blue text-white text-[10px] font-bold rounded-lg hover:brightness-110 active:scale-95 transition"
                        >
                          Simulate Chat
                        </button>
                      ) : (
                        <button
                          onClick={stopChatSimulator}
                          className="px-3 py-1 bg-error text-white text-[10px] font-bold rounded-lg hover:brightness-110 active:scale-95 transition"
                        >
                          Stop Simulator
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Live Voting Aggregator metrics */}
                  <div className="p-4 bg-surface-container-lowest border-b border-outline-variant/20 space-y-2">
                    <div className="flex justify-between text-[11px] font-data-mono uppercase text-slate-700">
                      <span className="font-bold text-emerald-green">!yes votes: {twitchVotes.yes} ({yesPercent}%)</span>
                      <span className="font-bold text-error">!no votes: {twitchVotes.no} ({noPercent}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex border border-outline-variant/10">
                      <div className="bg-emerald-green h-full transition-all duration-300" style={{ width: `${yesPercent}%` }}></div>
                      <div className="bg-error h-full transition-all duration-300" style={{ width: `${noPercent}%` }}></div>
                    </div>
                  </div>

                  {/* Live Chat feed ticker */}
                  <div className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar font-data-mono text-[10px] bg-slate-900 text-slate-100 min-h-[180px]">
                    <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold border-b border-slate-800 pb-1 mb-2">
                      💬 LIVE CHAT FEED (commands: !yes / !no)
                    </div>
                    {twitchChat.length > 0 ? (
                      twitchChat.map((chat) => (
                        <div key={chat.id} className="flex gap-2 items-start animate-fade-in-up py-0.5 border-b border-slate-800/10">
                          <span className="text-purple-400 font-bold shrink-0">{chat.username}:</span>
                          <span className="text-slate-300 break-all">{chat.message}</span>
                          {chat.vote && (
                            <span className={`px-1.5 py-0.2 rounded text-[8px] font-black shrink-0 ${
                              chat.vote === 'YES' ? 'bg-emerald-green/20 text-emerald-green border border-emerald-green/30' : 'bg-error/20 text-error border border-error/30'
                            }`}>
                              {chat.vote}
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-slate-500 py-12 italic">
                        No chat messages detected yet.
                        <br />
                        Type in connected chat or click "Simulate Chat".
                      </div>
                    )}
                  </div>

                  {/* Smart Account wallet information */}
                  <div className="mx-4 my-3 p-3 bg-surface-container-low border border-outline-variant/20 rounded-xl flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[9px] font-label-caps text-on-surface-variant uppercase block">AI Opponent Smart Wallet</span>
                      <span className="font-data-mono text-[10px] text-slate-500 truncate block mt-0.5">
                        {aiAddress || '0xaa784bb5e2949fbe189bdd7e6fad3ddf4bd08eb6'}
                      </span>
                    </div>
                    <div className="bg-surface-container-low px-2 py-0.5 rounded border border-outline-variant/30 font-data-mono text-[9px] shrink-0">
                      {aiBalance.toFixed(2)} Credits
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

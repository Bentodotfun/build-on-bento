import { create } from 'zustand';

export interface Market {
  id: string;
  title: string;
  description: string;
  yesPercent: number;
  noPercent: number;
  volume: number;
  timeRemaining: string;
  category: string;
  recentChanges?: string; // probability trend
  githubRepo?: string;
  officialSource?: string;
  roomId?: string; // Room-specific markets
}

export interface PendingMarket {
  id: string;
  title: string;
  description: string;
  category: string;
  yesVotes: number;
  noVotes: number;
  status: 'pending' | 'approved' | 'rejected';
  creator: string;
}

export interface UserPosition {
  marketId: string;
  outcome: 'YES' | 'NO';
  amount: number;
  probabilityAtBet: number;
  timestamp: string;
}

export interface RoomAward {
  type: string;
  title: string;
  recipient: string;
  description: string;
  icon: string;
}

export interface RoomMember {
  id: string;
  name: string;
  rank: number;
  accuracy: number;
  winRate: number;
  streak: number;
  xp: number;
  isChampion: boolean;
  avatar: string;
}

export interface Room {
  id: string;
  name: string;
  members: RoomMember[];
  awards: RoomAward[];
  timeline: { time: string; text: string; user: string; type: 'bet' | 'join' | 'win' }[];
  partyMode: boolean;
  punishmentMode: boolean;
  funnyRule?: string;
  summary?: string;
}

interface AppState {
  // Markets
  markets: Market[];
  activeMarketId: string | null;
  watchlist: string[];
  userPositions: UserPosition[];
  userXp: number;
  
  // Private Rooms
  rooms: Room[];
  activeRoomId: string | null;

  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Pending approval markets
  pendingMarkets: PendingMarket[];

  // Actions
  setActiveMarketId: (id: string | null) => void;
  setMarkets: (markets: Market[]) => void;
  toggleWatchlist: (id: string) => void;
  placePrediction: (marketId: string, outcome: 'YES' | 'NO', amount: number) => void;
  togglePartyMode: (roomId: string) => void;
  togglePunishmentMode: (roomId: string) => void;
  addRoomTimelineEvent: (roomId: string, text: string, user: string, type: 'bet' | 'join' | 'win') => void;
  setRoomSummary: (roomId: string, summary: string) => void;
  claimFunnyAward: (roomId: string, awardType: string, recipient: string) => void;
  
  // Market creation actions
  createPublicMarket: (title: string, description: string, category: string) => void;
  voteApprovePublicMarket: (marketId: string, vote: 'YES' | 'NO') => void;
  adminApproveMarket: (marketId: string) => void;
  createRoomMarket: (roomId: string, title: string, description: string, category: string) => void;
}

const INITIAL_MARKETS: Market[] = [
  {
    id: 'market-1',
    title: 'Will Next.js 16 release stable by Q4 2026?',
    description: 'Resolves to YES if Vercel officially tags and publishes Next.js v16.0.0 stable on npm before December 31, 2026. Official GitHub releases will be used for settlement.',
    yesPercent: 68,
    noPercent: 32,
    volume: 124500,
    timeRemaining: '165 days remaining',
    category: 'Technology',
    recentChanges: '+4% in last 24h',
    githubRepo: 'vercel/next.js',
    officialSource: 'https://nextjs.org/blog'
  },
  {
    id: 'market-2',
    title: 'Will Tailwind CSS v5 release stable in 2026?',
    description: 'Tailwind CSS creator Adam Wathan or Tailwind Labs tags a v5.0.0 stable release on npm by December 31, 2026.',
    yesPercent: 42,
    noPercent: 58,
    volume: 87200,
    timeRemaining: '165 days remaining',
    category: 'Technology',
    recentChanges: '-8% in last 3 days',
    githubRepo: 'tailwindlabs/tailwindcss',
    officialSource: 'https://tailwindcss.com'
  },
  {
    id: 'market-3',
    title: 'Will Gemini exceed GPT-5 on general coding benchmarks (MMLU-Code)?',
    description: 'Based on official comparisons or independent evaluation publications released in 2026.',
    yesPercent: 74,
    noPercent: 26,
    volume: 341000,
    timeRemaining: '120 days remaining',
    category: 'AI',
    recentChanges: '+12% in last week',
    githubRepo: 'google-gemini/generative-ai-js',
    officialSource: 'https://deepmind.google/technologies/gemini'
  },
  {
    id: 'market-4',
    title: 'Will Vercel announce a native browser web-editor built into Next.js?',
    description: 'Resolves to YES if Vercel officially releases a tool during their next conference allowing editing code in browser.',
    yesPercent: 31,
    noPercent: 69,
    volume: 45000,
    timeRemaining: '22 days remaining',
    category: 'Technology',
    recentChanges: '+2% in last 24h',
    githubRepo: 'vercel/next.js',
    officialSource: 'https://vercel.com/blog'
  },
  {
    id: 'market-5',
    title: 'Will React Server Components (RSC) be supported natively in Remix v3?',
    description: 'Resolves to YES if Remix v3 launches stable with built-in, out-of-the-box RSC support enabled by default.',
    yesPercent: 81,
    noPercent: 19,
    volume: 98000,
    timeRemaining: '95 days remaining',
    category: 'Technology',
    recentChanges: '+1% in last 24h',
    githubRepo: 'remix-run/remix',
    officialSource: 'https://remix.run'
  },
  {
    id: 'market-football-1',
    title: 'Will Argentina win the 2026 FIFA World Cup?',
    description: 'Resolves to YES if Argentina wins the FIFA World Cup tournament final match in 2026. Resolves to NO if any other country wins the tournament.',
    yesPercent: 55,
    noPercent: 45,
    volume: 2500,
    timeRemaining: '72h remaining',
    category: 'Football',
    recentChanges: '+1.8% in last hour',
    officialSource: 'https://www.fifa.com/fifaplus'
  }
];

const INITIAL_ROOMS: Room[] = [
  {
    id: 'room-1',
    name: '🚀 Web Dev Wizards',
    partyMode: false,
    punishmentMode: false,
    funnyRule: 'Worst analyst has to write documentation in PHP for a week',
    summary: 'The room is super competitive! Mannan is dominating with a 92% win rate, mostly predicting Next.js releases correctly. Sarah took a huge gamble on Tailwind v5 releasing early but lost her streak, while Alex is climbing fast.',
    members: [
      { id: 'm-1', name: 'Mannan (You)', rank: 1, accuracy: 92, winRate: 85, streak: 8, xp: 2450, isChampion: true, avatar: '🧙‍♂️' },
      { id: 'm-2', name: 'Sarah L.', rank: 2, accuracy: 78, winRate: 72, streak: 0, xp: 1890, isChampion: false, avatar: '👩‍💻' },
      { id: 'm-3', name: 'Alex K.', rank: 3, accuracy: 74, winRate: 68, streak: 3, xp: 1420, isChampion: false, avatar: '👨‍🚀' },
      { id: 'm-4', name: 'Jane Doe', rank: 4, accuracy: 61, winRate: 50, streak: 1, xp: 950, isChampion: false, avatar: '🦖' }
    ],
    awards: [
      { type: 'most_accurate', title: 'Most Accurate', recipient: 'Mannan (You)', description: 'Best analyst in the room.', icon: '🏆' },
      { type: 'risk_taker', title: 'Biggest Risk Taker', recipient: 'Sarah L.', description: 'Voted YES on a 15% probability market.', icon: '🌶' },
      { type: 'lucky_winner', title: 'Lucky Winner', recipient: 'Alex K.', description: 'Settled YES on last minute repository activity.', icon: '🍀' }
    ],
    timeline: [
      { time: '10 mins ago', text: 'predicted YES on Next.js 16 release (150 USDC)', user: 'Mannan (You)', type: 'bet' },
      { time: '1 hour ago', text: 'predicted NO on Tailwind CSS v5 release (100 USDC)', user: 'Sarah L.', type: 'bet' },
      { time: '3 hours ago', text: 'won prediction: React RSC support in Remix v3 (+75 XP)', user: 'Alex K.', type: 'win' },
      { time: '5 hours ago', text: 'joined the room', user: 'Jane Doe', type: 'join' }
    ]
  },
  {
    id: 'room-2',
    name: '🧠 AI Enthusiasts',
    partyMode: true,
    punishmentMode: true,
    funnyRule: 'Loser buys specialty coffee for the whole team',
    members: [
      { id: 'm-5', name: 'Dr. Emily', rank: 1, accuracy: 89, winRate: 80, streak: 6, xp: 2150, isChampion: true, avatar: '🤖' },
      { id: 'm-1', name: 'Mannan (You)', rank: 2, accuracy: 85, winRate: 78, streak: 4, xp: 1980, isChampion: false, avatar: '🧙‍♂️' },
      { id: 'm-6', name: 'Professor Oak', rank: 3, accuracy: 68, winRate: 60, streak: 0, xp: 1200, isChampion: false, avatar: '👴' }
    ],
    awards: [
      { type: 'most_accurate', title: 'Most Accurate', recipient: 'Dr. Emily', description: 'Predicted Gemini benchmarks flawlessly.', icon: '🏆' },
      { type: 'early_predictor', title: 'Early Predictor', recipient: 'Mannan (You)', description: 'Placed predictions 5 days before closing.', icon: '⚡' }
    ],
    timeline: [
      { time: '2 hours ago', text: 'predicted YES on Gemini exceed GPT-5 (200 USDC)', user: 'Dr. Emily', type: 'bet' },
      { time: '4 hours ago', text: 'won prediction: Gemini exceed GPT-5 (+120 XP)', user: 'Mannan (You)', type: 'win' }
    ]
  }
];

export const useAppState = create<AppState>((set) => ({
  markets: INITIAL_MARKETS,
  activeMarketId: null,
  watchlist: ['market-1', 'market-3'],
  userPositions: [],
  userXp: 2450,
  rooms: INITIAL_ROOMS,
  activeRoomId: 'room-1',
  theme: 'dark',
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  pendingMarkets: [],

  setActiveMarketId: (id) => set({ activeMarketId: id }),
  setMarkets: (markets) => set({ markets }),
  
  toggleWatchlist: (id) => set((state) => ({
    watchlist: state.watchlist.includes(id)
      ? state.watchlist.filter((mId) => mId !== id)
      : [...state.watchlist, id]
  })),

  placePrediction: (marketId, outcome, amount) => set((state) => {
    const market = state.markets.find((m) => m.id === marketId);
    if (!market) return {};

    const prob = outcome === 'YES' ? market.yesPercent : market.noPercent;
    
    // Add position
    const newPosition: UserPosition = {
      marketId,
      outcome,
      amount,
      probabilityAtBet: prob,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Update volume, yes/no percentages slightly to mock liquidity
    const updatedMarkets = state.markets.map((m) => {
      if (m.id === marketId) {
        const delta = amount > 100 ? 2 : 1;
        const newYes = outcome === 'YES' ? Math.min(m.yesPercent + delta, 99) : Math.max(m.yesPercent - delta, 1);
        const newNo = 100 - newYes;
        return {
          ...m,
          yesPercent: newYes,
          noPercent: newNo,
          volume: m.volume + amount
        };
      }
      return m;
    });

    // Award XP
    const addedXp = Math.floor(amount / 5);

    // Update active room timeline if any
    const updatedRooms = state.rooms.map((room) => {
      if (room.id === state.activeRoomId) {
        const text = `predicted ${outcome} on ${market.title.substring(0, 30)}... (${amount} USDC)`;
        const newEvent = {
          time: 'Just now',
          text,
          user: 'Mannan (You)',
          type: 'bet' as const
        };
        
        // Update user streak inside room
        const updatedMembers = room.members.map((member) => {
          if (member.name.includes('You')) {
            return {
              ...member,
              streak: member.streak + 1,
              xp: member.xp + addedXp
            };
          }
          return member;
        });

        return {
          ...room,
          members: updatedMembers,
          timeline: [newEvent, ...room.timeline]
        };
      }
      return room;
    });

    return {
      userPositions: [...state.userPositions, newPosition],
      markets: updatedMarkets,
      userXp: state.userXp + addedXp,
      rooms: updatedRooms
    };
  }),

  togglePartyMode: (roomId) => set((state) => ({
    rooms: state.rooms.map((r) => r.id === roomId ? { ...r, partyMode: !r.partyMode } : r)
  })),

  togglePunishmentMode: (roomId) => set((state) => ({
    rooms: state.rooms.map((r) => r.id === roomId ? { ...r, punishmentMode: !r.punishmentMode } : r)
  })),

  addRoomTimelineEvent: (roomId, text, user, type) => set((state) => ({
    rooms: state.rooms.map((r) => {
      if (r.id === roomId) {
        return {
          ...r,
          timeline: [{ time: 'Just now', text, user, type }, ...r.timeline]
        };
      }
      return r;
    })
  })),

  setRoomSummary: (roomId, summary) => set((state) => ({
    rooms: state.rooms.map((r) => r.id === roomId ? { ...r, summary } : r)
  })),

  claimFunnyAward: (roomId, awardType, recipient) => set((state) => ({
    rooms: state.rooms.map((r) => {
      if (r.id === roomId) {
        const awards = [...r.awards];
        const index = awards.findIndex((a) => a.type === awardType);
        const funnyAwardText = awardType === 'funniest_prediction' ? 'Funniest Prediction' : 'Room MVP';
        const funnyAwardIcon = awardType === 'funniest_prediction' ? '🤡' : '👑';
        
        const newAward: RoomAward = {
          type: awardType,
          title: funnyAwardText,
          recipient,
          description: awardType === 'funniest_prediction' ? 'Called the most hilarious outcome' : 'Maintained the vibes',
          icon: funnyAwardIcon
        };

        if (index > -1) {
          awards[index] = newAward;
        } else {
          awards.push(newAward);
        }
        return { ...r, awards };
      }
      return r;
    })
  })),

  createPublicMarket: (title, description, category) => set((state) => {
    const newMarket: PendingMarket = {
      id: `pending-${Date.now()}`,
      title,
      description,
      category,
      yesVotes: 0,
      noVotes: 0,
      status: 'pending',
      creator: 'Mannan (You)'
    };
    return { pendingMarkets: [...state.pendingMarkets, newMarket] };
  }),

  voteApprovePublicMarket: (marketId, vote) => set((state) => ({
    pendingMarkets: state.pendingMarkets.map((m) => {
      if (m.id === marketId) {
        return {
          ...m,
          yesVotes: vote === 'YES' ? m.yesVotes + 1 : m.yesVotes,
          noVotes: vote === 'NO' ? m.noVotes + 1 : m.noVotes
        };
      }
      return m;
    })
  })),

  adminApproveMarket: (marketId) => set((state) => {
    const pending = state.pendingMarkets.find((m) => m.id === marketId);
    if (!pending) return {};

    const newMarket: Market = {
      id: `approved-${Date.now()}`,
      title: pending.title,
      description: pending.description,
      category: pending.category,
      yesPercent: 50,
      noPercent: 50,
      volume: 2500,
      timeRemaining: '72h remaining',
      recentChanges: 'New Market'
    };

    return {
      markets: [...state.markets, newMarket],
      pendingMarkets: state.pendingMarkets.map((m) => 
        m.id === marketId ? { ...m, status: 'approved' } : m
      )
    };
  }),

  createRoomMarket: (roomId, title, description, category) => set((state) => {
    const newMarket: Market = {
      id: `room-m-${Date.now()}`,
      title,
      description,
      category,
      yesPercent: 50,
      noPercent: 50,
      volume: 500,
      timeRemaining: '48h remaining',
      recentChanges: 'New Room Market',
      roomId
    };

    const updatedRooms = state.rooms.map((r) => {
      if (r.id === roomId) {
        const newTimeline = {
          time: 'Just now',
          text: `created a new room prediction: "${title}"`,
          user: 'Mannan (You)',
          type: 'join' as const
        };
        return {
          ...r,
          timeline: [newTimeline, ...r.timeline]
        };
      }
      return r;
    });

    return {
      markets: [...state.markets, newMarket],
      rooms: updatedRooms
    };
  })
}));

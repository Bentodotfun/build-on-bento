export type Market = {
  id: string;
  handle: string;
  avatarSeed: string;
  goal: string;
  deadline: string;
  streak: number;
  friendsBetting: number;
  poolHate: number;
  poolBelieve: number;
  category: string;
  verifiedVia: string;
  /** GitHub/Strava account the oracle checks, when the verifier needs one. */
  oracleHandle?: string;
  /** Numeric goal the oracle measures against, e.g. 5 commits. */
  target?: number;
  /** Unix seconds — when the oracle runs. */
  endTime?: number;
};

/** Placeholder deck until we wire up live Bento markets. */
export const MARKETS: Market[] = [
  {
    id: 'mkt_001',
    handle: '@ananya.runs',
    avatarSeed: 'Ananya',
    goal: 'I will run 5km on Strava before 8PM',
    deadline: '04:59:59',
    streak: 4,
    friendsBetting: 6,
    poolHate: 250,
    poolBelieve: 400,
    category: '🏃 Fitness',
    verifiedVia: 'Strava',
  },
  {
    id: 'mkt_002',
    handle: '@rahul_ships',
    avatarSeed: 'Rahul',
    goal: 'Push 5 commits to GitHub today',
    deadline: '02:15:30',
    streak: 0,
    friendsBetting: 11,
    poolHate: 800,
    poolBelieve: 200,
    category: '💻 Shipping',
    verifiedVia: 'GitHub',
  },
  {
    id: 'mkt_003',
    handle: '@sam.reads',
    avatarSeed: 'Sam',
    goal: 'Read 10 pages of a real physical book',
    deadline: '12:00:00',
    streak: 12,
    friendsBetting: 3,
    poolHate: 90,
    poolBelieve: 610,
    category: '📚 Studying',
    verifiedVia: 'Photo + AI',
  },
  {
    id: 'mkt_004',
    handle: '@lazy_liam',
    avatarSeed: 'Liam',
    goal: 'Wake up at 5:30AM. No snooze. Not even once.',
    deadline: '08:42:11',
    streak: 0,
    friendsBetting: 18,
    poolHate: 1450,
    poolBelieve: 120,
    category: '🧘 Discipline',
    verifiedVia: 'Alarm log',
  },
  {
    id: 'mkt_005',
    handle: '@priya.exe',
    avatarSeed: 'Priya',
    goal: 'Gym at 6AM before my 9AM standup',
    deadline: '06:30:00',
    streak: 19,
    friendsBetting: 9,
    poolHate: 180,
    poolBelieve: 720,
    category: '🏃 Fitness',
    verifiedVia: 'Gym check-in',
  },
  {
    id: 'mkt_006',
    handle: '@kabir_hates',
    avatarSeed: 'Kabir',
    goal: 'Zero doomscrolling until 6PM',
    deadline: '09:12:45',
    streak: 2,
    friendsBetting: 14,
    poolHate: 990,
    poolBelieve: 310,
    category: '🧘 Discipline',
    verifiedVia: 'Screen Time',
  },
  {
    id: 'mkt_007',
    handle: '@meera.wip',
    avatarSeed: 'Meera',
    goal: 'Finally ship the portfolio site I have been "finishing" since March',
    deadline: '23:59:59',
    streak: 1,
    friendsBetting: 22,
    poolHate: 1800,
    poolBelieve: 240,
    category: '💻 Shipping',
    verifiedVia: 'Vercel deploy',
  },
  {
    id: 'mkt_008',
    handle: '@david_goggins_jr',
    avatarSeed: 'David',
    goal: 'Cold shower + 10km. Stay hard.',
    deadline: '03:20:00',
    streak: 45,
    friendsBetting: 7,
    poolHate: 60,
    poolBelieve: 940,
    category: '🏃 Fitness',
    verifiedVia: 'Strava',
  },
  {
    id: 'mkt_009',
    handle: '@sarah_no',
    avatarSeed: 'Sarah',
    goal: 'Study 3 hours for finals with phone in another room',
    deadline: '07:45:00',
    streak: 6,
    friendsBetting: 5,
    poolHate: 300,
    poolBelieve: 450,
    category: '📚 Studying',
    verifiedVia: 'Screen Time',
  },
  {
    id: 'mkt_010',
    handle: '@ship_it_steve',
    avatarSeed: 'Steve',
    goal: 'Text her back. It has been four days.',
    deadline: '11:11:11',
    streak: 0,
    friendsBetting: 27,
    poolHate: 2100,
    poolBelieve: 95,
    category: '🎯 Anything Else',
    verifiedVia: 'Group vote',
  },
];

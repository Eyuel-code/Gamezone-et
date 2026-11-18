export type Currency = 'ETB';

// Exchange rate: ~130 ETB per USD (2025 market rate)
export interface Game {
  id: string;
  name: string;
  tagline: string;
  publisher: string;
  platform: 'Mobile' | 'PC' | 'Mobile & PC';
  color: string;
  accent: string;
  iconKey: 'flame' | 'crosshair' | 'football';
  coverImage: string;
  logoInitials: string;
  topUpLabel: string;
  topUpUnit: string;
  topUpIcon: 'gem' | 'coins' | 'ball';
  packages: TopUpPackage[];
  memberships: MembershipTier[];
  passes: GamePass[];
  crateItems: CrateItem[];
  perks: string[];
  whatYouCanBuy: string[];
  rating: number;
  activePlayers: string;
  description: string;
}

export interface TopUpPackage {
  id: string;
  amount: number;
  unit: string;
  bonus?: number;
  priceETB: number;
  popular?: boolean;
  bestValue?: boolean;
}

export interface MembershipTier {
  id: string;
  name: string;
  duration: string;
  priceETB: number;
  perks: string[];
  highlight?: boolean;
}

export interface GamePass {
  id: string;
  name: string;
  season: string;
  priceETB: number;
  reward: string;
  maxLevel: number;
  highlight?: boolean;
}

export interface CrateItem {
  id: string;
  name: string;
  type: string;
  priceETB: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface Tournament {
  id: string;
  gameId: string;
  gameName: string;
  title: string;
  date: string;
  prizePoolETB: number;
  entryFeeETB: number;
  mode: string;
  slotsTotal: number;
  slotsFilled: number;
  region: string;
  status: 'open' | 'filling' | 'full' | 'live' | 'completed';
  format: string;
  organizer: string;
}

export interface Promo {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  accent: string;
}

export const HERO_IMAGE =
  'https://images.pexels.com/photos/7862508/pexels-photo-7862508.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';
export const ARENA_IMAGE =
  'https://images.pexels.com/photos/36899796/pexels-photo-36899796.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';
export const STADIUM_IMAGE =
  'https://images.pexels.com/photos/30651230/pexels-photo-30651230.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';
export const CONTROLLER_IMAGE =
  'https://images.pexels.com/photos/34592708/pexels-photo-34592708.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';
export const RGB_SETUP_IMAGE =
  'https://images.pexels.com/photos/9072394/pexels-photo-9072394.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';

export const games: Game[] = [
  {
    id: 'freefire',
    name: 'Free Fire',
    tagline: '10-minute survival battle royale',
    publisher: 'Garena',
    platform: 'Mobile',
    color: 'from-accent-500/30 to-gold-500/10',
    accent: '#ff4516',
    iconKey: 'flame',
    coverImage: HERO_IMAGE,
    logoInitials: 'FF',
    topUpLabel: 'Diamonds',
    topUpUnit: 'Diamonds',
    topUpIcon: 'gem',
    rating: 4.8,
    activePlayers: '42M+',
    description:
      'The world\u2019s most downloaded mobile battle royale. 50 players, 10-minute matches, one survivor. Top up diamonds to unlock bundles, weapon skins, characters, and the Booyah Pass.',
    packages: [
      { id: 'ff-100', amount: 100, unit: 'Diamonds', priceETB: 130, popular: true },
      { id: 'ff-310', amount: 310, unit: 'Diamonds', priceETB: 390 },
      { id: 'ff-520', amount: 520, unit: 'Diamonds', priceETB: 650 },
      { id: 'ff-1060', amount: 1060, unit: 'Diamonds', priceETB: 1300, bestValue: true },
      { id: 'ff-2180', amount: 2180, unit: 'Diamonds', bonus: 218, priceETB: 2600 },
      { id: 'ff-5600', amount: 5600, unit: 'Diamonds', bonus: 700, priceETB: 6500 },
    ],
    memberships: [
      {
        id: 'ff-weekly',
        name: 'Weekly Membership',
        duration: '7 days',
        priceETB: 260,
        perks: [
          'Instant 450 Diamonds',
          'Daily 30 Diamonds (7 days = 210)',
          'Exclusive login reward crate',
          'Booyah Pass XP boost',
        ],
      },
      {
        id: 'ff-monthly',
        name: 'Monthly Membership',
        duration: '30 days',
        priceETB: 650,
        highlight: true,
        perks: [
          'Instant 2,600 Diamonds',
          'Daily 60 Diamonds (30 days = 1,800)',
          'Premium crate ticket x2',
          '10% XP boost all month',
          'Exclusive monthly skin',
        ],
      },
    ],
    passes: [
      {
        id: 'ff-booyah',
        name: 'Booyah Pass',
        season: 'Season 31',
        priceETB: 650,
        reward: 'Full reward track Lv 1\u2013100: 2 bundles, weapon skins, vehicle skin, Desert Eagle skin, Gloo Wall skin',
        maxLevel: 100,
        highlight: true,
      },
      {
        id: 'ff-booyah-bundle',
        name: 'Booyah Pass Bundle',
        season: 'Season 31',
        priceETB: 1300,
        reward: 'Instant Lv 50 unlock + all Booyah Pass rewards + exclusive emote',
        maxLevel: 100,
      },
    ],
    crateItems: [
      { id: 'ff-crate-bundle', name: 'Character Bundle Crate', type: 'Outfit', priceETB: 520, rarity: 'epic' },
      { id: 'ff-crate-weapon', name: 'Weapon Skin Crate', type: 'Weapon Skin', priceETB: 390, rarity: 'rare' },
      { id: 'ff-crate-vehicle', name: 'Vehicle Skin Crate', type: 'Vehicle', priceETB: 650, rarity: 'legendary' },
      { id: 'ff-crate-emote', name: 'Emote Pack', type: 'Emote', priceETB: 195, rarity: 'common' },
    ],
    perks: ['Instant ID top-up via Codashop', 'Member-exclusive skins', 'Booyah Pass unlocks'],
    whatYouCanBuy: [
      'Diamonds for in-game purchases',
      'Booyah Pass (seasonal reward track)',
      'Weekly & Monthly memberships',
      'Character bundles & outfits',
      'Weapon skins (AK, M4, MP40, etc.)',
      'Vehicle skins & parachute skins',
      'Emotes & lobby avatars',
      'Crate tickets for random rewards',
      'Level-up passes (5 diamonds per level)',
    ],
  },
  {
    id: 'pubg',
    name: 'PUBG Mobile',
    tagline: '100-player battle royale — last one standing',
    publisher: 'KRAFTON / Tencent',
    platform: 'Mobile & PC',
    color: 'from-primary-500/30 to-ink-700/10',
    accent: '#11bdf7',
    iconKey: 'crosshair',
    coverImage: ARENA_IMAGE,
    logoInitials: 'PB',
    topUpLabel: 'Unknown Cash (UC)',
    topUpUnit: 'UC',
    topUpIcon: 'coins',
    rating: 4.7,
    activePlayers: '60M+',
    description:
      'The original 100-player battle royale. parachute in, loot up, survive the blue zone. UC buys the Royale Pass, weapon skins, vehicle skins, outfits, and exclusive crate pulls.',
    packages: [
      { id: 'pb-60', amount: 60, unit: 'UC', priceETB: 130, popular: true },
      { id: 'pb-325', amount: 325, unit: 'UC', bonus: 25, priceETB: 650 },
      { id: 'pb-660', amount: 660, unit: 'UC', bonus: 60, priceETB: 1300, bestValue: true },
      { id: 'pb-1800', amount: 1800, unit: 'UC', bonus: 300, priceETB: 3250 },
      { id: 'pb-3850', amount: 3850, unit: 'UC', bonus: 850, priceETB: 6500 },
      { id: 'pb-8100', amount: 8100, unit: 'UC', bonus: 2100, priceETB: 13000 },
    ],
    memberships: [
      {
        id: 'pb-rp-prime',
        name: 'Royale Pass Prime',
        duration: 'Per Season',
        priceETB: 1300,
        perks: [
          'Unlocks full RP reward track',
          '600 UC value in rewards',
          'Exclusive emotes & outfits',
          'Mythic outfit crate',
        ],
      },
      {
        id: 'pb-rp-prime-plus',
        name: 'Royale Pass Prime Plus',
        duration: 'Per Season',
        priceETB: 3250,
        highlight: true,
        perks: [
          'Start at RP Rank 25 instantly',
          '1,800 UC value in rewards',
          'Instant rare skin unlocks',
          'Priority matchmaking queue',
          'Exclusive Prime Plus avatar frame',
        ],
      },
    ],
    passes: [
      {
        id: 'pb-rp-rankup',
        name: 'RP Rank Up Pack',
        season: 'Ace 8 Season',
        priceETB: 980,
        reward: 'Skip 50 RP tiers instantly + claim all skipped rewards',
        maxLevel: 100,
      },
      {
        id: 'pb-rp-mythic',
        name: 'Mythic Level Pack',
        season: 'Lv 1\u2013100',
        priceETB: 2400,
        reward: 'Mythic weapon skins + 1,200 UC + exclusive parachute trail',
        maxLevel: 100,
        highlight: true,
      },
    ],
    crateItems: [
      { id: 'pb-crate-outfit', name: 'Mythic Outfit Crate', type: 'Outfit', priceETB: 780, rarity: 'legendary' },
      { id: 'pb-crate-weapon', name: 'Weapon Skin Crate', type: 'Weapon Skin', priceETB: 520, rarity: 'epic' },
      { id: 'pb-crate-vehicle', name: 'Vehicle Skin Crate', type: 'Vehicle', priceETB: 980, rarity: 'legendary' },
      { id: 'pb-crate-emote', name: 'Premium Emote Pack', type: 'Emote', priceETB: 260, rarity: 'rare' },
    ],
    perks: ['Secure UC via Midasbuy', 'Royale Pass instant unlock', 'Region-locked safe delivery'],
    whatYouCanBuy: [
      'UC (Unknown Cash) for all purchases',
      'Royale Pass Prime & Prime Plus',
      'Weapon skins (M416, AKM, Kar98, etc.)',
      'Vehicle skins (cars, boats, planes)',
      'Character outfits & sets',
      'Parachute skins & trails',
      'Emotes & gestures',
      'Crate coupons for random skins',
      'RP rank-up packs (skip tiers)',
    ],
  },
  {
    id: 'eafc',
    name: 'EA Sports FC',
    tagline: "The world's football game — Ultimate Team & Career",
    publisher: 'EA Sports',
    platform: 'Mobile & PC',
    color: 'from-success-500/30 to-primary-500/10',
    accent: '#34d399',
    iconKey: 'football',
    coverImage: STADIUM_IMAGE,
    logoInitials: 'FC',
    topUpLabel: 'FC Points',
    topUpUnit: 'FC Points',
    topUpIcon: 'ball',
    rating: 4.6,
    activePlayers: '24M+',
    description:
      'Build your dream squad in Ultimate Team, manage in Career Mode, or hit the pitch in Clubs. FC Points buy player packs, Draft entries, evolutions, and stadium customization.',
    packages: [
      { id: 'fc-500', amount: 500, unit: 'FC Points', priceETB: 650, popular: true },
      { id: 'fc-1050', amount: 1050, unit: 'FC Points', priceETB: 1300 },
      { id: 'fc-2200', amount: 2200, unit: 'FC Points', bonus: 200, priceETB: 2600, bestValue: true },
      { id: 'fc-4750', amount: 4750, unit: 'FC Points', bonus: 500, priceETB: 5200 },
      { id: 'fc-12000', amount: 12000, unit: 'FC Points', bonus: 2000, priceETB: 13000 },
    ],
    memberships: [
      {
        id: 'fc-eaplay',
        name: 'EA Play',
        duration: 'Monthly',
        priceETB: 780,
        perks: [
          '10% off all FC Points',
          'Recurring Ultimate Team Draft Tokens',
          'Exclusive vanity items in The Grounds',
          '10-hour game trial access',
          'Member-only cosmetic rewards',
        ],
      },
      {
        id: 'fc-eaplay-pro',
        name: 'EA Play Pro',
        duration: 'Monthly',
        priceETB: 2200,
        highlight: true,
        perks: [
          '6,000 FC Points (distributed monthly)',
          'Unlimited full game access',
          'Premium season pass rewards',
          '10% off all FC Points',
          'Pro-only Ultimate Team packs',
        ],
      },
    ],
    passes: [
      {
        id: 'fc-ut-pass',
        name: 'Ultimate Team Premium Pass',
        season: 'Current Season',
        priceETB: 1300,
        reward: 'Rare gold players pack + 300 FC Points + Draft tokens + Evolutions slot',
        maxLevel: 50,
        highlight: true,
      },
      {
        id: 'fc-career',
        name: 'Career Mode Unlock Pack',
        season: 'All Leagues',
        priceETB: 650,
        reward: 'All league licenses + scout network + youth academy boost',
        maxLevel: 1,
      },
    ],
    crateItems: [
      { id: 'fc-pack-gold', name: 'Rare Gold Players Pack', type: 'Player Pack', priceETB: 520, rarity: 'rare' },
      { id: 'fc-pack-totw', name: 'Team of the Week Pack', type: 'Player Pack', priceETB: 780, rarity: 'epic' },
      { id: 'fc-pack-icon', name: 'Icon Player Pack', type: 'Player Pack', priceETB: 1950, rarity: 'legendary' },
      { id: 'fc-stadium', name: 'Stadium Customization Pack', type: 'Cosmetic', priceETB: 260, rarity: 'common' },
    ],
    perks: ['Instant FC Points delivery', 'Ultimate Team packs', 'Career mode unlocks'],
    whatYouCanBuy: [
      'FC Points for Ultimate Team',
      'Player packs (Gold, Silver, TOTW, Icon)',
      'EA Play & EA Play Pro subscriptions',
      'Draft entries for Ultimate Team',
      'Evolutions slots for player upgrades',
      'Stadium customization items',
      'Cosmetics for The Grounds',
      'Career mode league unlocks',
      'Premium season pass rewards',
    ],
  },
];

export const tournaments: Tournament[] = [
  {
    id: 't-ff-01',
    gameId: 'freefire',
    gameName: 'Free Fire',
    title: 'Addis Booyah Clash',
    date: '2026-11-08T16:00',
    prizePoolETB: 25000,
    entryFeeETB: 150,
    mode: '4v4 Squad',
    slotsTotal: 48,
    slotsFilled: 31,
    region: 'Addis Ababa · Online',
    status: 'filling',
    format: 'Single Elimination',
    organizer: 'GameZone ET',
  },
  {
    id: 't-pb-01',
    gameId: 'pubg',
    gameName: 'PUBG Mobile',
    title: 'Highland Chicken Dinner Cup',
    date: '2026-11-15T14:00',
    prizePoolETB: 50000,
    entryFeeETB: 250,
    mode: 'Squad (4)',
    slotsTotal: 100,
    slotsFilled: 64,
    region: 'Nationwide · Online',
    status: 'open',
    format: 'Points Format · 6 Maps',
    organizer: 'GameZone ET x Habesha Esports',
  },
  {
    id: 't-fc-01',
    gameId: 'eafc',
    gameName: 'EA Sports FC',
    title: 'Lalibela Football Masters',
    date: '2026-11-22T18:00',
    prizePoolETB: 18000,
    entryFeeETB: 100,
    mode: '1v1',
    slotsTotal: 32,
    slotsFilled: 32,
    region: 'Addis Ababa · Arena',
    status: 'full',
    format: 'Double Elimination',
    organizer: 'GameZone ET',
  },
  {
    id: 't-ff-02',
    gameId: 'freefire',
    gameName: 'Free Fire',
    title: 'Rift Valley Rampage',
    date: '2026-11-29T15:00',
    prizePoolETB: 32000,
    entryFeeETB: 180,
    mode: 'Solo',
    slotsTotal: 80,
    slotsFilled: 12,
    region: 'Online · Ethiopia',
    status: 'open',
    format: 'Battle Royale · 4 Rounds',
    organizer: 'GameZone ET',
  },
  {
    id: 't-pb-02',
    gameId: 'pubg',
    gameName: 'PUBG Mobile',
    title: 'Meskel Esports Showdown',
    date: '2026-12-06T13:00',
    prizePoolETB: 75000,
    entryFeeETB: 300,
    mode: 'Squad (4)',
    slotsTotal: 100,
    slotsFilled: 88,
    region: 'Addis Ababa · Hybrid',
    status: 'filling',
    format: 'Points · 8 Maps',
    organizer: 'GameZone ET x Ministry of Innovation',
  },
  {
    id: 't-fc-02',
    gameId: 'eafc',
    gameName: 'EA Sports FC',
    title: 'Axum Pro Clubs League',
    date: '2026-12-13T17:00',
    prizePoolETB: 22000,
    entryFeeETB: 120,
    mode: '1v1',
    slotsTotal: 16,
    slotsFilled: 4,
    region: 'Online · Ethiopia',
    status: 'open',
    format: 'League + Playoffs',
    organizer: 'GameZone ET',
  },
];

export const promos: Promo[] = [
  { id: 'p1', title: 'Booyah Pass Sale', subtitle: 'Season 31 — 10% off this week', badge: '-10%', accent: '#ff4516' },
  { id: 'p2', title: 'UC Flash Top-Up', subtitle: 'Extra bonus UC on 1800+ bundles', badge: '+BONUS', accent: '#11bdf7' },
  { id: 'p3', title: 'FC Points Mega Pack', subtitle: 'Bonus points on 4750+ purchases', badge: 'HOT', accent: '#34d399' },
  { id: 'p4', title: 'First Deposit Bonus', subtitle: 'Get 50 extra loyalty points', badge: 'NEW', accent: '#f5b200' },
];

export const liveActivity: { user: string; action: string; game: string; time: string }[] = [
  { user: 'SelamT', action: 'topped up 520 Diamonds', game: 'Free Fire', time: 'just now' },
  { user: 'Kaleb_ET', action: 'registered for Highland Cup', game: 'PUBG', time: '1 min ago' },
  { user: 'Hana', action: 'bought Monthly Membership', game: 'Free Fire', time: '2 min ago' },
  { user: 'YonasG', action: 'topped up 2200 FC Points', game: 'EA Sports FC', time: '3 min ago' },
  { user: 'MartaL', action: 'claimed Booyah Pass S31', game: 'Free Fire', time: '4 min ago' },
  { user: 'BiniPro', action: 'bought Royale Pass Prime Plus', game: 'PUBG', time: '6 min ago' },
  { user: 'EdenK', action: 'opened Icon Player Pack', game: 'EA Sports FC', time: '8 min ago' },
];

export const leaderboard: {
  rank: number;
  player: string;
  game: string;
  gameId: string;
  points: number;
  trend: 'up' | 'down' | 'same';
  wins: number;
  matches: number;
  kd: number;
  bestFinish: string;
  joinedDate: string;
}[] = [
  { rank: 1, player: 'AbyssiniaKing', game: 'Free Fire', gameId: 'freefire', points: 18420, trend: 'up', wins: 342, matches: 410, kd: 5.8, bestFinish: '1st — Booyah Masters S5', joinedDate: 'Jan 2023' },
  { rank: 2, player: 'BlueNileSniper', game: 'PUBG', gameId: 'pubg', points: 17980, trend: 'up', wins: 289, matches: 380, kd: 4.9, bestFinish: '1st — PMPL Ethiopia Qualifier', joinedDate: 'Mar 2023' },
  { rank: 3, player: 'LalibelaLegend', game: 'EA Sports FC', gameId: 'eafc', points: 16100, trend: 'same', wins: 201, matches: 260, kd: 0, bestFinish: '2nd — FC Pro Open Addis', joinedDate: 'Sep 2023' },
  { rank: 4, player: 'RiftRunner', game: 'Free Fire', gameId: 'freefire', points: 14250, trend: 'down', wins: 268, matches: 355, kd: 4.2, bestFinish: '1st — Clash Squad Cup', joinedDate: 'Feb 2023' },
  { rank: 5, player: 'WelloWarden', game: 'PUBG', gameId: 'pubg', points: 13890, trend: 'up', wins: 245, matches: 330, kd: 4.5, bestFinish: '3rd — Squad Survival S2', joinedDate: 'Apr 2023' },
  { rank: 6, player: 'GondarGunner', game: 'Free Fire', gameId: 'freefire', points: 12760, trend: 'down', wins: 220, matches: 310, kd: 3.8, bestFinish: '2nd — Lone Wolf Arena', joinedDate: 'Jun 2023' },
  { rank: 7, player: 'AwashAce', game: 'EA Sports FC', gameId: 'eafc', points: 11240, trend: 'up', wins: 178, matches: 240, kd: 0, bestFinish: '1st — Weekend League Elite', joinedDate: 'Aug 2023' },
  { rank: 8, player: 'SidamaStorm', game: 'PUBG', gameId: 'pubg', points: 10980, trend: 'same', wins: 162, matches: 290, kd: 3.5, bestFinish: 'Top 5 — Chicken Cup', joinedDate: 'Oct 2023' },
];

export const faqs: { q: string; a: string }[] = [
  {
    q: 'How fast is the top-up delivery?',
    a: 'Most top-ups are delivered instantly to your in-game ID after payment is confirmed via Telebirr, CBE Birr, or Chapa. Diamonds, UC, and FC Points typically arrive within 1\u20135 minutes.',
  },
  {
    q: 'Which payment methods do you support?',
    a: 'We support Telebirr, CBE Birr, Dashen Bank, Abyssinia Bank, Chapa, and major cards \u2014 all in Ethiopian Birr.',
  },
  {
    q: 'Do I need to create an account?',
    a: 'You can top up as a guest, but creating a free account unlocks a wallet, order history, tournament registration, and loyalty rewards.',
  },
  {
    q: 'Are tournaments online or in-person?',
    a: 'Most are online and open nationwide. Major finals are hosted as hybrid events in Addis Ababa with arena seating.',
  },
  {
    q: 'What happens if a tournament is cancelled?',
    a: 'Entry fees are fully refunded to your GameZone wallet, and you keep any participation rewards already earned.',
  },
  {
    q: 'Is this an official Garena, KRAFTON, or EA store?',
    a: 'GameZone ET is an authorized reseller. We deliver through official channels like Codashop and Midasbuy. We are not directly affiliated with the game publishers.',
  },
];

export function formatETB(n: number): string {
  return 'Br ' + n.toLocaleString('en-US');
}

export const rarityStyles: Record<CrateItem['rarity'], { label: string; color: string; border: string; bg: string }> = {
  common: { label: 'Common', color: 'text-slate-300', border: 'border-slate-500/40', bg: 'bg-slate-500/10' },
  rare: { label: 'Rare', color: 'text-primary-300', border: 'border-primary-400/40', bg: 'bg-primary-400/10' },
  epic: { label: 'Epic', color: 'text-accent-300', border: 'border-accent-400/40', bg: 'bg-accent-400/10' },
  legendary: { label: 'Legendary', color: 'text-gold-300', border: 'border-gold-400/40', bg: 'bg-gold-400/10' },
};

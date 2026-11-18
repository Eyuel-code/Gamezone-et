/**
 * GameZoneET Unified Data Engine & Persistence Store
 *
 * Manages reactive client state synchronized with Firebase Firestore for authenticated users:
 * - Products (Top-up packages for Free Fire, PUBG Mobile, EA SPORTS FC)
 * - Orders (Telebirr & CBE Birr checkouts)
 * - Tournaments & Brackets (Free-to-enter Ethiopian competitions)
 * - Tournament Registrations & Match Submissions
 * - Disputes
 * - News & Announcements
 * - User Profiles & Progression
 */

import { auth } from '@/lib/firebase';
import { ADMIN_EMAIL } from '@/lib/env';
import {
  createIdentityBindingInFirestore,
  deleteRegistrationFromFirestore,
  deleteTournamentFromFirestore,
  fetchAllAuditLogsFromFirestore,
  fetchAllDisputesFromFirestore,
  fetchAllHwidRecordsFromFirestore,
  fetchAllIdentityBindingsFromFirestore,
  fetchAllOrdersFromFirestore,
  fetchAllRegistrationsFromFirestore,
  fetchAllSecurityEventsFromFirestore,
  fetchAllSupportTicketsFromFirestore,
  fetchAllUsersFromFirestore,
  fetchHwidRecordFromFirestore,
  fetchTournamentLobbyFromFirestore,
  fetchTournamentsFromFirestore,
  lookupIdentityBindingFromFirestore,
  resolveDisputeInFirestore,
  revokeUserIdentityInFirestore,
  saveAuditLogToFirestore,
  saveDisputeToFirestore,
  saveOrderToFirestore,
  saveRegistrationToFirestore,
  saveSecurityEventToFirestore,
  saveSupportTicketToFirestore,
  saveTournamentLobbyToFirestore,
  saveTournamentToFirestore,
  syncUserProfileUpdateToFirestore,
  updateHwidStatusInFirestore,
  updateOrderStatusInFirestore,
  updateSupportTicketStatusInFirestore,
  updateUserBanInFirestore,
  upsertHwidRecordInFirestore,
} from '@/services/firestoreSync';
import {
  computeIdentityVerificationHash,
  evaluateFuzzyNameMatch,
  getCredentialCategory,
  type IdentityDocType,
  securityEngine,
  type SecurityPosture,
  type SecurityThreatEvent,
  sha256Hex,
  validateExclusiveIdentitySubmission,
  validateIdentityFormat,
} from '@/services/securityEngine';
import { maskIdentityInput } from '@/utils/masking';
import { formatEthiopianCity } from '@/utils/location';
import {
  type CalendarWeekBounds,
  type DailyWellnessState,
  getCalendarWeekBounds,
  getTodayCalendarKey,
  isRegistrationInWeek,
} from '@/services/wellnessEngine';

export type { IdentityDocType, SecurityThreatEvent };

export type NotificationType = 'success' | 'info' | 'warning' | 'error';

export interface UserNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: string;
  createdAtMs: number;
  read: boolean;
  targetPage?: string;
}

export interface UserAccount {
  id: string;
  username: string;
  gamerTag: string;
  email: string;
  fullName?: string;
  phone?: string;
  city?: string;
  favoriteGame?: string;
  walletBalance?: number;
  emailVerified?: boolean;
  role: 'admin' | 'gamer';
  avatar: string;
  rank: number;
  loyaltyPoints: number;
  gamesPlayed: number;
  highScore: number;
  favoriteGames: string[];
  achievements: { id: string; title: string; desc: string; date: string; icon: string }[];
  savedPlayerIds?: Record<string, string>;
  lastPaymentMethod?: 'telebirr' | 'cbe' | 'wallet';
  lastPage?: string;
  lastGameId?: string;
  profileCompleted?: boolean;
  notifications?: UserNotification[];
  identityVerified?: boolean;
  identityType?: IdentityDocType;
  identityMasked?: string;
  identityHash?: string;
  identityVerifiedAt?: string;
  identityMismatchWarnings?: number;
  lastIdentityMismatchAt?: string;
  isFlaggedForReview?: boolean;
  hwidHash?: string;
  knownHwidHashes?: string[];
  isBanned?: boolean;
  banReason?: string;
  dailyPlaytimeDate?: string;
  dailyPlaytimeSeconds?: number;
  dailyGameSeconds?: number;
  createdAt: string;
}

export interface ProductItem {
  id: string;
  gameId: 'freefire' | 'pubg' | 'eafc' | string;
  gameName: string;
  name: string;
  category: 'Diamonds' | 'UC' | 'FC Points' | 'Membership' | 'Pass';
  amount: number;
  unit: string;
  bonus?: number;
  priceETB: number;
  popular?: boolean;
  bestValue?: boolean;
  inStock: boolean;
  description: string;
}

export type PaymentStatus = 'pending' | 'success' | 'failed';
export type DeliveryStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

export interface OrderItem {
  id: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  gameId: string;
  gameName: string;
  productId: string;
  productName: string;
  playerId: string;
  playerZone?: string;
  amountETB: number;
  paymentMethod: 'telebirr' | 'cbe' | 'wallet';
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  createdAt: string;
  createdAtMs?: number;
  receiptRef: string;
  note: string;
}

export interface TournamentMatchParticipant {
  id: string;
  name: string;
  score?: number;
  isWinner?: boolean;
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  round: string;
  matchNumber: number;
  player1: TournamentMatchParticipant;
  player2: TournamentMatchParticipant;
  scheduledTime: string;
  status: 'scheduled' | 'pending_approval' | 'completed' | 'disputed';
  winnerId?: string;
  submittedScore?: string;
  reportedBy?: string;
  proofNote?: string;
}

export interface TournamentRoomCredentials {
  roomId: string;
  roomPassword: string;
  server: string;
  notes?: string;
  published: boolean;
  unlockMode: 'immediate' | 'at_start';
  unlockAt?: string;
  publishedAt?: string;
}

export interface TournamentEntity {
  id: string;
  gameId: 'freefire' | 'pubg' | 'eafc';
  gameName: string;
  title: string;
  banner: string;
  format: 'Single Elimination 1v1' | 'Squad Battle Royale' | 'Double Elimination';
  entryMode?: 'solo' | 'squad' | 'either';
  date: string;
  startTime: string;
  capacity: number;
  registeredCount: number;
  status: 'open' | 'filling' | 'full' | 'live' | 'completed';
  lobbyStatus?: 'waiting' | 'lobby_open' | 'in_progress' | 'completed';
  currentMatchLabel?: string;
  prizeRecognition: string;
  organizer: string;
  description: string;
  rules: string[];
  schedule: string[];
  faqs: { q: string; a: string }[];
  matches?: TournamentMatch[];
  roomCredentials?: TournamentRoomCredentials;
}

export interface TournamentRegistration {
  id: string;
  tournamentId: string;
  tournamentTitle: string;
  userId: string;
  gamerTag: string;
  gameId: string;
  playerId: string;
  teamName?: string;
  contactNumber: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  registeredAt: string;
  confirmationCode?: string;
  slotNumber?: number;
  entryType?: 'solo' | 'squad';
  squadMemberIds?: string[];
  identityHash?: string;
  identityMasked?: string;
  hwidHash?: string;
  weekKey?: string;
  createdAtMs?: number;
}

export interface IdentityBindingRecord {
  identityHash: string;
  userId: string;
  idType: IdentityDocType;
  maskedIdentifier: string;
  hwidHash?: string;
  verifiedAt: string;
}

export interface HwidRegistryRecord {
  hwidHash: string;
  lastUserId: string;
  associatedUserIds: string[];
  deviceSummary: string;
  flagged: boolean;
  blocked: boolean;
  flaggedReason?: string;
  updatedAt: string;
}

export interface AdminAuditLogEntry {
  id: string;
  adminUid: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  ipMasked: string;
  sessionFingerprint: string;
  prevHash: string;
  entryHash: string;
  timestamp: string;
  timestampMs: number;
}

export interface TournamentDispute {
  id: string;
  userId?: string;
  matchId: string;
  tournamentId: string;
  reportedBy: string;
  reason: string;
  description: string;
  status: 'open' | 'resolved' | 'dismissed';
  adminNotes?: string;
  createdAt: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  category: 'Free Fire' | 'PUBG Mobile' | 'EA SPORTS FC' | 'Ethiopian Esports' | 'Platform Update';
  summary: string;
  content: string;
  image: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  readTime: string;
  featured?: boolean;
}

export type SupportTicketCategory = 'support' | 'payment' | 'bug' | 'abuse';

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  email: string;
  category: SupportTicketCategory;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  adminNotes?: string;
  createdAt: string;
}

// -------------------------------------------------------------
// PLATFORM CATALOG & COMMUNITY SEED DATA
// -------------------------------------------------------------

const SEED_COMMUNITY_LEADERS: UserAccount[] = [
  {
    id: 'leader-abyssinia',
    username: 'abyssiniaking',
    gamerTag: 'AbyssiniaKing',
    email: '',
    role: 'gamer',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    rank: 1,
    loyaltyPoints: 24850,
    gamesPlayed: 642,
    highScore: 198450,
    favoriteGames: ['freefire', 'eafc'],
    achievements: [],
    createdAt: '2025-10-01',
  },
  {
    id: 'leader-driftqueen',
    username: 'driftqueen_et',
    gamerTag: 'DriftQueen_ET',
    email: '',
    role: 'gamer',
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
    rank: 2,
    loyaltyPoints: 19400,
    gamesPlayed: 589,
    highScore: 174200,
    favoriteGames: ['drift-boss'],
    achievements: [],
    createdAt: '2025-11-12',
  },
  {
    id: 'leader-bluenile',
    username: 'bluenilesniper',
    gamerTag: 'BlueNileSniper',
    email: '',
    role: 'gamer',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    rank: 3,
    loyaltyPoints: 15200,
    gamesPlayed: 524,
    highScore: 161800,
    favoriteGames: ['pubg', 'freefire'],
    achievements: [],
    createdAt: '2025-12-03',
  },
];

const SEED_PRODUCTS: ProductItem[] = [
  // Free Fire
  { id: 'ff-100', gameId: 'freefire', gameName: 'Free Fire', name: '100 Diamonds', category: 'Diamonds', amount: 100, unit: 'Diamonds', priceETB: 130, popular: true, inStock: true, description: 'Direct delivery to Free Fire Player ID' },
  { id: 'ff-310', gameId: 'freefire', gameName: 'Free Fire', name: '310 Diamonds', category: 'Diamonds', amount: 310, unit: 'Diamonds', priceETB: 390, inStock: true, description: 'Direct delivery to Free Fire Player ID' },
  { id: 'ff-520', gameId: 'freefire', gameName: 'Free Fire', name: '520 Diamonds', category: 'Diamonds', amount: 520, unit: 'Diamonds', priceETB: 650, inStock: true, description: 'Direct delivery to Free Fire Player ID' },
  { id: 'ff-1060', gameId: 'freefire', gameName: 'Free Fire', name: '1,060 Diamonds', category: 'Diamonds', amount: 1060, unit: 'Diamonds', priceETB: 1300, bestValue: true, inStock: true, description: 'Direct delivery to Free Fire Player ID' },
  { id: 'ff-2180', gameId: 'freefire', gameName: 'Free Fire', name: '2,180 Diamonds', category: 'Diamonds', amount: 2180, unit: 'Diamonds', bonus: 218, priceETB: 2600, inStock: true, description: 'Direct delivery + 218 Bonus Diamonds' },
  { id: 'ff-5600', gameId: 'freefire', gameName: 'Free Fire', name: '5,600 Diamonds', category: 'Diamonds', amount: 5600, unit: 'Diamonds', bonus: 700, priceETB: 6500, inStock: true, description: 'Direct delivery + 700 Bonus Diamonds' },
  { id: 'ff-weekly', gameId: 'freefire', gameName: 'Free Fire', name: 'Weekly Membership', category: 'Membership', amount: 450, unit: 'Days / Diamonds', priceETB: 260, inStock: true, description: 'Instant 450 Diamonds + 30 daily for 7 days' },
  { id: 'ff-monthly', gameId: 'freefire', gameName: 'Free Fire', name: 'Monthly Membership', category: 'Membership', amount: 2600, unit: 'Days / Diamonds', priceETB: 650, popular: true, inStock: true, description: 'Instant 2,600 Diamonds + 60 daily for 30 days' },
  { id: 'ff-booyah', gameId: 'freefire', gameName: 'Free Fire', name: 'Booyah Pass Premium', category: 'Pass', amount: 1, unit: 'Season Pass', priceETB: 520, inStock: true, description: 'Unlock premium cosmetics & seasonal weapon skins' },

  // PUBG Mobile
  { id: 'pubg-60', gameId: 'pubg', gameName: 'PUBG Mobile', name: '60 UC', category: 'UC', amount: 60, unit: 'UC', priceETB: 130, inStock: true, description: 'Direct delivery to PUBG Player ID' },
  { id: 'pubg-325', gameId: 'pubg', gameName: 'PUBG Mobile', name: '300 + 25 UC', category: 'UC', amount: 325, unit: 'UC', bonus: 25, priceETB: 650, popular: true, inStock: true, description: 'Direct delivery + 25 Bonus UC' },
  { id: 'pubg-660', gameId: 'pubg', gameName: 'PUBG Mobile', name: '600 + 60 UC', category: 'UC', amount: 660, unit: 'UC', bonus: 60, priceETB: 1300, bestValue: true, inStock: true, description: 'Perfect amount to unlock Royale Pass' },
  { id: 'pubg-1800', gameId: 'pubg', gameName: 'PUBG Mobile', name: '1,500 + 300 UC', category: 'UC', amount: 1800, unit: 'UC', bonus: 300, priceETB: 3250, inStock: true, description: 'Direct delivery + 300 Bonus UC' },
  { id: 'pubg-3850', gameId: 'pubg', gameName: 'PUBG Mobile', name: '3,000 + 850 UC', category: 'UC', amount: 3850, unit: 'UC', bonus: 850, priceETB: 6500, inStock: true, description: 'Direct delivery + 850 Bonus UC' },
  { id: 'pubg-rp', gameId: 'pubg', gameName: 'PUBG Mobile', name: 'Royale Pass Elite', category: 'Pass', amount: 1, unit: 'Pass', priceETB: 950, inStock: true, description: 'Access 100 tiers of elite tactical rewards' },

  // EA SPORTS FC
  { id: 'fc-1050', gameId: 'eafc', gameName: 'EA SPORTS FC', name: '1,050 FC Points', category: 'FC Points', amount: 1050, unit: 'FC Points', priceETB: 1300, popular: true, inStock: true, description: 'Direct delivery to EA FC Account ID' },
  { id: 'fc-2200', gameId: 'eafc', gameName: 'EA SPORTS FC', name: '2,200 FC Points', category: 'FC Points', amount: 2200, unit: 'FC Points', bonus: 200, priceETB: 2600, bestValue: true, inStock: true, description: 'Direct delivery + 200 Bonus FC Points' },
  { id: 'fc-5750', gameId: 'eafc', gameName: 'EA SPORTS FC', name: '5,750 FC Points', category: 'FC Points', amount: 5750, unit: 'FC Points', bonus: 750, priceETB: 6500, inStock: true, description: 'Direct delivery + 750 Bonus FC Points' },
  { id: 'fc-founder', gameId: 'eafc', gameName: 'EA SPORTS FC', name: 'Founder Season Pass', category: 'Pass', amount: 1, unit: 'Season Pass', priceETB: 1100, inStock: true, description: 'Exclusive Ethiopian club kits and player packs' },
];

const SEED_TOURNAMENTS: TournamentEntity[] = [
  {
    id: 't-ff-addis-championship',
    gameId: 'freefire',
    gameName: 'Free Fire',
    title: 'Addis Ababa Clash Squad Invitational 2026',
    banner: 'https://images.pexels.com/photos/7862508/pexels-photo-7862508.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    format: 'Single Elimination 1v1',
    entryMode: 'either',
    date: 'March 14, 2026',
    startTime: '7:00 PM (EAT Addis Ababa)',
    capacity: 16,
    registeredCount: 12,
    status: 'filling',
    lobbyStatus: 'in_progress',
    currentMatchLabel: 'In Progress · Match #6 (Semifinal 2)',
    prizeRecognition: 'Grand Champion Trophy Badge + 5,000 Platform XP + Verified Certificate',
    organizer: 'GameZoneET Esports Committee',
    description: 'The premier Free Fire 1v1 Clash Squad competition for Ethiopian mobile gamers. Free entry, verified Addis Ababa bracket, and live leaderboard progression.',
    roomCredentials: {
      roomId: 'GZ-FF-9042',
      roomPassword: 'ADDIS26',
      server: 'Africa (Addis Ababa)',
      notes: 'Bermuda Map • Gun properties OFF • Check in 15 min before start.',
      published: true,
      unlockMode: 'immediate',
      unlockAt: 'March 14, 2026 6:45 PM EAT',
      publishedAt: 'Active Lobby Drop',
    },
    rules: [
      'Strict 1v1 Clash Squad Custom Room rules (Bermuda Map, 7 Rounds to win).',
      'All weapons permitted except Grenade Launchers (M79). Gun property effects disabled for pure skill parity.',
      'Participants must check in on the GameZoneET match page 15 minutes prior to scheduled start.',
      'Match results must be screenshot-verified and submitted through the platform within 10 minutes of match completion.',
      'Zero tolerance for emulator software, toxic conduct, or unapproved third-party modifications.',
    ],
    schedule: [
      '6:45 PM EAT: Player Room Check-In & Ping Calibration',
      '7:00 PM EAT: Round 1 (8 Matches)',
      '7:45 PM EAT: Quarterfinals (4 Matches)',
      '8:30 PM EAT: Semifinals (2 Matches)',
      '9:15 PM EAT: Grand Finals & Champion Crowning Ceremony',
    ],
    faqs: [
      { q: 'Is there any entry fee?', a: 'No, entry is 100% free for all registered Ethiopian players as per GameZoneET charter.' },
      { q: 'How do I join the custom room?', a: 'Room ID and Password automatically unlock in your Profile and Tournament Bracket once published by the host.' },
      { q: 'What happens if my opponent disconnects?', a: 'Official waiting time is 5 minutes. If no reconnection occurs, submit a dispute report for administrator review.' },
    ],
    matches: [
      {
        id: 'm-qf-1',
        tournamentId: 't-ff-addis-championship',
        round: 'Quarterfinal 1',
        matchNumber: 1,
        player1: { id: 'p1', name: 'AbyssiniaKing', score: 7, isWinner: true },
        player2: { id: 'p2', name: 'Kidus_Pro', score: 4, isWinner: false },
        scheduledTime: '7:00 PM EAT',
        status: 'completed',
        winnerId: 'p1',
      },
      {
        id: 'm-qf-2',
        tournamentId: 't-ff-addis-championship',
        round: 'Quarterfinal 2',
        matchNumber: 2,
        player1: { id: 'p3', name: 'Selam_Gaming', score: 7, isWinner: true },
        player2: { id: 'p4', name: 'Bereket_Sniper', score: 5, isWinner: false },
        scheduledTime: '7:15 PM EAT',
        status: 'completed',
        winnerId: 'p3',
      },
      {
        id: 'm-qf-3',
        tournamentId: 't-ff-addis-championship',
        round: 'Quarterfinal 3',
        matchNumber: 3,
        player1: { id: 'p5', name: 'Yared_Apex', score: 6, isWinner: false },
        player2: { id: 'p6', name: 'Abinet_Headshot', score: 7, isWinner: true },
        scheduledTime: '7:30 PM EAT',
        status: 'completed',
        winnerId: 'p6',
      },
      {
        id: 'm-qf-4',
        tournamentId: 't-ff-addis-championship',
        round: 'Quarterfinal 4',
        matchNumber: 4,
        player1: { id: 'p7', name: 'Robel_Strike', score: 3, isWinner: false },
        player2: { id: 'p8', name: 'Natnael_Zone', score: 7, isWinner: true },
        scheduledTime: '7:45 PM EAT',
        status: 'completed',
        winnerId: 'p8',
      },
      {
        id: 'm-sf-1',
        tournamentId: 't-ff-addis-championship',
        round: 'Semifinal 1',
        matchNumber: 5,
        player1: { id: 'p1', name: 'AbyssiniaKing', score: 7, isWinner: true },
        player2: { id: 'p3', name: 'Selam_Gaming', score: 6, isWinner: false },
        scheduledTime: '8:15 PM EAT',
        status: 'completed',
        winnerId: 'p1',
      },
      {
        id: 'm-sf-2',
        tournamentId: 't-ff-addis-championship',
        round: 'Semifinal 2',
        matchNumber: 6,
        player1: { id: 'p6', name: 'Abinet_Headshot', score: 0 },
        player2: { id: 'p8', name: 'Natnael_Zone', score: 0 },
        scheduledTime: '8:45 PM EAT',
        status: 'scheduled',
      },
      {
        id: 'm-gf-1',
        tournamentId: 't-ff-addis-championship',
        round: 'Grand Finals',
        matchNumber: 7,
        player1: { id: 'p1', name: 'AbyssiniaKing' },
        player2: { id: 'tbd', name: 'Winner of Semifinal 2' },
        scheduledTime: '9:30 PM EAT',
        status: 'scheduled',
      },
    ],
  },
  {
    id: 't-pubg-highland-cup',
    gameId: 'pubg',
    gameName: 'PUBG Mobile',
    title: 'Ethiopian Highland Squad Royale Season 4',
    banner: 'https://images.pexels.com/photos/36899796/pexels-photo-36899796.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    format: 'Squad Battle Royale',
    entryMode: 'squad',
    date: 'March 21, 2026',
    startTime: '8:00 PM (EAT Addis Ababa)',
    capacity: 24,
    registeredCount: 18,
    status: 'open',
    lobbyStatus: 'waiting',
    currentMatchLabel: 'Round 1 · Erangel Drop Scheduled',
    prizeRecognition: 'Highland Royale Champion Banner + 8,000 Platform XP + Hall of Fame Induction',
    organizer: 'GameZoneET & Addis Gaming Alliance',
    description: '24 squads drop into Erangel for high-altitude supremacy. High-intensity combat with Ethiopian casters and live spectator rooms.',
    roomCredentials: {
      roomId: 'GZ-PUBG-4418',
      roomPassword: 'HIGHLAND4',
      server: 'Middle East / East Africa',
      notes: '4-player Squads • Mobile & Tablet only • Emulators prohibited.',
      published: false,
      unlockMode: 'at_start',
      unlockAt: 'March 21, 2026 7:45 PM EAT',
    },
    rules: [
      '4-player squad format (maximum 1 substitute per registered team).',
      'Map rotation: Erangel -> Miramar -> Sanhok.',
      'Scoring system: 10 points for WWCD, 1 point per confirmed squad elimination.',
      'Mobile devices only (iPads and tablets allowed, PC emulators strictly prohibited).',
    ],
    schedule: [
      '7:30 PM EAT: Squad Captains Briefing & Lobby Check-In',
      '8:00 PM EAT: Match 1 — Erangel (Highland drop)',
      '8:50 PM EAT: Match 2 — Miramar (Desert tactical)',
      '9:40 PM EAT: Match 3 — Sanhok (Rainforest showdown)',
      '10:30 PM EAT: Score tabulation & Winner announcement',
    ],
    faqs: [
      { q: 'Can solo players join a squad?', a: 'Yes! You can register solo or enter up to 3 squadmate Player IDs.' },
      { q: 'Where do room codes appear?', a: 'Once released by the tournament admin, Room ID and Password unlock in your Profile and Bracket modal.' },
    ],
    matches: [
      {
        id: 'pubg-r1-1',
        tournamentId: 't-pubg-highland-cup',
        round: 'Quarterfinal 1 (Lobby A)',
        matchNumber: 1,
        player1: { id: 'sq1', name: 'Addis Wolves' },
        player2: { id: 'sq2', name: 'Bole Tacticians' },
        scheduledTime: '8:00 PM EAT',
        status: 'scheduled',
      },
      {
        id: 'pubg-r1-2',
        tournamentId: 't-pubg-highland-cup',
        round: 'Quarterfinal 2 (Lobby B)',
        matchNumber: 2,
        player1: { id: 'sq3', name: 'BlueNile Squad' },
        player2: { id: 'sq4', name: 'Hawassa Storm' },
        scheduledTime: '8:00 PM EAT',
        status: 'scheduled',
      },
      {
        id: 'pubg-sf-1',
        tournamentId: 't-pubg-highland-cup',
        round: 'Semifinal 1 (Miramar)',
        matchNumber: 3,
        player1: { id: 'tbd1', name: 'Top 8 Lobby A' },
        player2: { id: 'tbd2', name: 'Top 8 Lobby B' },
        scheduledTime: '8:50 PM EAT',
        status: 'scheduled',
      },
      {
        id: 'pubg-gf-1',
        tournamentId: 't-pubg-highland-cup',
        round: 'Grand Finals (Sanhok)',
        matchNumber: 4,
        player1: { id: 'tbd3', name: 'Top 16 Qualifiers' },
        player2: { id: 'tbd4', name: 'Championship Lobby' },
        scheduledTime: '9:40 PM EAT',
        status: 'scheduled',
      },
    ],
  },
  {
    id: 't-eafc-addis-masters',
    gameId: 'eafc',
    gameName: 'EA SPORTS FC',
    title: 'EA SPORTS FC 26 Addis Masters Cup',
    banner: 'https://images.pexels.com/photos/30651230/pexels-photo-30651230.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    format: 'Single Elimination 1v1',
    entryMode: 'solo',
    date: 'March 28, 2026',
    startTime: '6:30 PM (EAT Addis Ababa)',
    capacity: 32,
    registeredCount: 22,
    status: 'open',
    lobbyStatus: 'waiting',
    currentMatchLabel: 'Round 1 · 1v1 Friendlies Ready',
    prizeRecognition: 'FC Master Gold Crest + 4,000 Platform XP + Profile Feature',
    organizer: 'GameZoneET FC Community',
    description: 'The premier tactical football showdown. 90-minute virtual matches with standard club teams (85 overall rated balance mode enabled).',
    roomCredentials: {
      roomId: 'GZ-EAFC-8820',
      roomPassword: 'ADDISFC26',
      server: 'EA Online Friendlies (85 OVR)',
      notes: '6-minute halves • Tactical Defending ON • Extra time & penalties enabled.',
      published: false,
      unlockMode: 'at_start',
      unlockAt: 'March 28, 2026 6:15 PM EAT',
    },
    rules: [
      '1v1 Head to Head Online Friendlies or FC Mobile Tournament mode.',
      'Match length: 6 minutes half length (12 minutes total).',
      'Tactical Defending required, Competitive Master switch ON.',
      'Extra time and penalty shootouts if tied after regular time.',
    ],
    schedule: [
      '6:00 PM EAT: Online Match Lobby Check-in',
      '6:30 PM EAT: Round of 32',
      '7:20 PM EAT: Round of 16',
      '8:10 PM EAT: Quarterfinals',
      '9:00 PM EAT: Semifinals & Finals',
    ],
    faqs: [
      { q: 'Can I pick any team?', a: 'Yes, any licensed club team in default 85-rated tactical balance mode.' },
    ],
    matches: [
      {
        id: 'fc-qf-1',
        tournamentId: 't-eafc-addis-masters',
        round: 'Quarterfinal 1',
        matchNumber: 1,
        player1: { id: 'fc1', name: 'AbyssiniaFC' },
        player2: { id: 'fc2', name: 'MerkatoStriker' },
        scheduledTime: '8:10 PM EAT',
        status: 'scheduled',
      },
      {
        id: 'fc-qf-2',
        tournamentId: 't-eafc-addis-masters',
        round: 'Quarterfinal 2',
        matchNumber: 2,
        player1: { id: 'fc3', name: 'PiassaMaestro' },
        player2: { id: 'fc4', name: 'BoleUnited' },
        scheduledTime: '8:10 PM EAT',
        status: 'scheduled',
      },
      {
        id: 'fc-sf-1',
        tournamentId: 't-eafc-addis-masters',
        round: 'Semifinal 1',
        matchNumber: 3,
        player1: { id: 'fc-tbd1', name: 'Winner QF1' },
        player2: { id: 'fc-tbd2', name: 'Winner QF2' },
        scheduledTime: '9:00 PM EAT',
        status: 'scheduled',
      },
      {
        id: 'fc-gf-1',
        tournamentId: 't-eafc-addis-masters',
        round: 'Grand Finals',
        matchNumber: 4,
        player1: { id: 'fc-tbd3', name: 'Winner SF1' },
        player2: { id: 'fc-tbd4', name: 'Winner SF2' },
        scheduledTime: '9:30 PM EAT',
        status: 'scheduled',
      },
    ],
  },
];

const SEED_NEWS: NewsArticle[] = [
  {
    id: 'news-ff-ob50',
    title: 'Garena Free Fire OB50 Update: New Weapon Balancing & Mobile Latency Improvements',
    category: 'Free Fire',
    summary: 'The newest OB50 patch brings reduced packet loss for East African servers and rebalanced EVO weapon attributes.',
    content: `Garena has deployed the long-awaited Free Fire OB50 update across African and Middle East servers. For Ethiopian players connecting through Ethio Telecom and Safaricom networks, the server routing adjustments significantly lower in-game jitter and ping spikes during prime evening hours.

Key Highlights of the OB50 Update:
1. MP40 & Shotgun Recoil Recalibration: Close-range burst weapons have received smoother handling curves, rewarding precise tap-firing over spray-and-pray tactics.
2. Clash Squad Round Economy: Buy phase timer adjusted to 20 seconds, allowing squad captains to coordinate tactical utility buys and armor upgrades.
3. Enhanced Low-Spec Performance: Optimized memory footprint for devices with 2GB to 3GB RAM, preventing frame drops in heated Bermuda final zones.

GameZoneET tournament organizers have confirmed all upcoming Clash Squad championships will run on the official OB50 tournament build.`,
    image: 'https://images.pexels.com/photos/7862508/pexels-photo-7862508.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    source: 'Garena Official Patch Notes & GameZoneET Analytics',
    sourceUrl: 'https://ff.garena.com',
    publishedAt: 'March 1, 2026',
    readTime: '3 min read',
    featured: true,
  },
  {
    id: 'news-telecom-gaming',
    title: 'Ethio Telecom & Mobile Gaming: 5G Expansion Opens New Horizons for Competitive Esports',
    category: 'Ethiopian Esports',
    summary: 'Addis Ababa 5G expansion and low-latency mobile towers enable lag-free competitive tournaments across Bole, Piassa, and Kazanchis.',
    content: `With mobile gaming adoption growing rapidly across Addis Ababa, Hawassa, and Dire Dawa, the availability of 4G Advanced and 5G network nodes has become a game-changer for local esports competitors.

Local gaming hubs in Addis Ababa report average in-game ping reductions from 110ms down to 48ms on optimized routes, enabling Ethiopian gamers to compete on equal footing with regional esports powerhouses.

GameZoneET is actively collaborating with community organizers to host zero-latency tournament viewing lounges and free community scrims powered by local network infrastructure.`,
    image: 'https://images.pexels.com/photos/9072394/pexels-photo-9072394.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    source: 'Ethiopian Esports Digest',
    sourceUrl: 'https://gamezone.et/news',
    publishedAt: 'February 27, 2026',
    readTime: '4 min read',
  },
  {
    id: 'news-pubg-highland-s4',
    title: 'PUBG Mobile Highland Cup Season 4 Registration Surges Past 500 Ethiopian Squads',
    category: 'PUBG Mobile',
    summary: 'Over 500 competitive squads from across Ethiopia have registered for the upcoming Erangel and Miramar weekend showdown.',
    content: `Competitive mobile battle royale in Ethiopia reaches new heights as registrations for the Highland Squad Royale Season 4 set an all-time record on the GameZoneET tournament platform.

The tournament features free registration, zero entry fees, verified Addis Ababa bracket seeding, and customized community recognition badges for top-tier squads.

Squad captains can inspect match schedules and submit match results directly through their GameZoneET profile.`,
    image: 'https://images.pexels.com/photos/36899796/pexels-photo-36899796.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    source: 'Addis Gaming Alliance',
    sourceUrl: 'https://gamezone.et/tournaments',
    publishedAt: 'February 24, 2026',
    readTime: '2 min read',
  },
  {
    id: 'news-eafc-mobile',
    title: 'EA SPORTS FC 26 Mobile: Addis Masters Tournament Kicks Off Next Week',
    category: 'EA SPORTS FC',
    summary: 'Virtual football fans in Ethiopia prepare for high-stakes 1v1 tactical matches featuring the new balanced 85-rated competitive standard.',
    content: `EA SPORTS FC continues to be a staple of Ethiopian gaming lounges from Merkato to Kazanchis. The upcoming Addis Masters Cup features single-elimination 1v1 friendlies where tactical setup and defensive timing dictate victory.

Tournament participants will be bracketed automatically in GameZoneET, with real-time match advancement and leaderboards tracking win rates and total goals scored.`,
    image: 'https://images.pexels.com/photos/30651230/pexels-photo-30651230.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    source: 'EA Sports Community Hub',
    sourceUrl: 'https://ea.com',
    publishedAt: 'February 20, 2026',
    readTime: '3 min read',
  },
];

// -------------------------------------------------------------
// DATABASE SERVICE CLASS
// -------------------------------------------------------------

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

const STORAGE_KEYS = {
  USERS: 'gzet_users_v4',
  PRODUCTS: 'gzet_products_v4',
  ORDERS: 'gzet_orders_v4',
  TOURNAMENTS: 'gzet_tournaments_v4',
  REGISTRATIONS: 'gzet_registrations_v4',
  DISPUTES: 'gzet_disputes_v4',
  SUPPORT_TICKETS: 'gzet_support_tickets_v4',
  NOTIFICATIONS: 'gzet_notifications_v4',
  NEWS: 'gzet_news_v4',
  CURRENT_USER_ID: 'gzet_current_uid_v4',
  IDENTITY_BINDINGS: 'gzet_identity_bindings_v4',
  HWID_REGISTRY: 'gzet_hwid_registry_v4',
  SECURITY_EVENTS: 'gzet_security_events_v4',
  AUDIT_LOGS: 'gzet_audit_logs_v4',
};

class GameZoneDatabase {
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.init();
    securityEngine.setThreatReporter((event) => {
      this.recordSecurityThreat(event);
    });
  }

  private init() {
    try {
      if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_COMMUNITY_LEADERS));
      }
      if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(SEED_PRODUCTS));
      }
      if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));
      }
      if (!localStorage.getItem(STORAGE_KEYS.TOURNAMENTS)) {
        localStorage.setItem(STORAGE_KEYS.TOURNAMENTS, JSON.stringify(SEED_TOURNAMENTS));
      }
      if (!localStorage.getItem(STORAGE_KEYS.NEWS)) {
        localStorage.setItem(STORAGE_KEYS.NEWS, JSON.stringify(SEED_NEWS));
      }
      if (!localStorage.getItem(STORAGE_KEYS.REGISTRATIONS)) {
        localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify([]));
      }
      if (!localStorage.getItem(STORAGE_KEYS.DISPUTES)) {
        localStorage.setItem(STORAGE_KEYS.DISPUTES, JSON.stringify([]));
      }
      if (!localStorage.getItem(STORAGE_KEYS.SUPPORT_TICKETS)) {
        localStorage.setItem(STORAGE_KEYS.SUPPORT_TICKETS, JSON.stringify([]));
      }
      if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
      }
      if (!localStorage.getItem(STORAGE_KEYS.IDENTITY_BINDINGS)) {
        localStorage.setItem(STORAGE_KEYS.IDENTITY_BINDINGS, JSON.stringify([]));
      }
      if (!localStorage.getItem(STORAGE_KEYS.HWID_REGISTRY)) {
        localStorage.setItem(STORAGE_KEYS.HWID_REGISTRY, JSON.stringify([]));
      }
      if (!localStorage.getItem(STORAGE_KEYS.SECURITY_EVENTS)) {
        localStorage.setItem(STORAGE_KEYS.SECURITY_EVENTS, JSON.stringify([]));
      }
      if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
        localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify([]));
      }
    } catch (e) {
      console.warn('GameZoneDatabase initialization in-memory fallback:', e);
    }
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('Database listener error:', err);
      }
    });
  }

  private get<T>(key: string, fallback: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      this.notify();
    } catch (e) {
      console.error(`Failed to set key ${key}:`, e);
    }
  }

  // Users
  public getUsers(): UserAccount[] {
    const raw = this.get<UserAccount[]>(STORAGE_KEYS.USERS, SEED_COMMUNITY_LEADERS);
    return raw.map((u) => (u?.city ? { ...u, city: formatEthiopianCity(u.city) } : u));
  }

  public getUserById(id: string): UserAccount | null {
    const users = this.getUsers();
    return users.find((u) => u.id === id) || null;
  }

  public getCurrentUser(): UserAccount | null {
    try {
      const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
      if (!currentId) return null;
      return this.getUserById(currentId);
    } catch {
      return null;
    }
  }

  public setCurrentUserId(id: string | null): void {
    try {
      if (id) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, id);
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
      }
    } catch (e) {
      console.error('Failed to update current user id:', e);
    }
    this.notify();
  }

  public upsertAuthenticatedUser(user: UserAccount): void {
    const normalizedUser = { ...user, city: formatEthiopianCity(user.city) };
    const existing = this.getUsers();
    const idx = existing.findIndex((u) => u.id === normalizedUser.id);
    const updated =
      idx >= 0 ? existing.map((u) => (u.id === normalizedUser.id ? normalizedUser : u)) : [...existing, normalizedUser];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, normalizedUser.id);
    this.notify();
  }

  public updateUser(updatedUser: UserAccount): void {
    const normalizedUser = { ...updatedUser, city: formatEthiopianCity(updatedUser.city) };
    const users = this.getUsers().map((u) => (u.id === normalizedUser.id ? normalizedUser : u));
    this.set(STORAGE_KEYS.USERS, users);
    void syncUserProfileUpdateToFirestore(normalizedUser).catch((err) => {
      console.error('Firestore user sync failed:', err);
    });
  }

  public updateDailyPlaytimeUsage(userId: string, usage: DailyWellnessState): void {
    const user = this.getUserById(userId);
    if (!user) return;
    const today = usage.dateKey || getTodayCalendarKey();
    const nextTotal = Math.max(0, Math.min(86400, Math.floor(usage.totalSeconds || 0)));
    const nextGame = Math.max(0, Math.min(86400, Math.floor(usage.gameSeconds || 0)));
    if (
      user.dailyPlaytimeDate === today &&
      (user.dailyPlaytimeSeconds || 0) === nextTotal &&
      (user.dailyGameSeconds || 0) === nextGame
    ) {
      return;
    }
    const updated: UserAccount = {
      ...user,
      dailyPlaytimeDate: today,
      dailyPlaytimeSeconds: nextTotal,
      dailyGameSeconds: nextGame,
    };
    const users = this.getUsers().map((u) => (u.id === userId ? updated : u));
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    } catch {
      // Ignore storage quota issues cleanly
    }
    void syncUserProfileUpdateToFirestore(updated).catch((err) => {
      console.error('Firestore daily playtime sync failed:', err);
    });
  }

  public isProfileComplete(user: UserAccount | null): boolean {
    if (!user) return false;
    const hasTag = (user.gamerTag || '').trim().length >= 3;
    const hasName = (user.fullName || '').trim().length >= 2;
    const hasPhone = (user.phone || '').replace(/\D/g, '').length >= 9;
    const hasCity = (user.city || '').trim().length >= 2;
    return hasTag && hasName && hasPhone && hasCity;
  }

  public updateMandatoryProfile(
    userId: string,
    input: {
      gamerTag: string;
      fullName: string;
      phone: string;
      city: string;
      favoriteGame: string;
      savedPlayerIds?: Record<string, string>;
      lastPaymentMethod?: 'telebirr' | 'cbe' | 'wallet';
    }
  ): UserAccount | null {
    const user = this.getUserById(userId);
    if (!user) return null;

    const formattedPhone = input.phone.trim().startsWith('+')
      ? input.phone.trim()
      : `+251 ${input.phone.trim().replace(/^\+?251|^0/, '')}`;

    const mergedPlayerIds = {
      ...(user.savedPlayerIds || {}),
      ...(input.savedPlayerIds || {}),
    };

    const updated: UserAccount = {
      ...user,
      gamerTag: input.gamerTag.trim().slice(0, 40) || user.gamerTag,
      fullName: input.fullName.trim().slice(0, 100) || user.fullName || user.gamerTag,
      phone: formattedPhone.slice(0, 32),
      city: formatEthiopianCity(input.city).slice(0, 80),
      favoriteGame: input.favoriteGame.trim().slice(0, 80) || user.favoriteGame,
      savedPlayerIds: mergedPlayerIds,
      lastPaymentMethod: input.lastPaymentMethod || user.lastPaymentMethod || 'telebirr',
      profileCompleted: true,
    };

    this.updateUser(updated);
    return updated;
  }

  public saveUserCheckpoint(
    userId: string,
    patch: {
      lastPage?: string;
      lastGameId?: string;
      lastPaymentMethod?: 'telebirr' | 'cbe' | 'wallet';
      playerIdForGame?: { gameId: string; playerId: string };
      phone?: string;
      fullName?: string;
    }
  ): void {
    const user = this.getUserById(userId);
    if (!user) return;

    const nextPlayerIds = { ...(user.savedPlayerIds || {}) };
    if (patch.playerIdForGame?.gameId && patch.playerIdForGame?.playerId?.trim()) {
      nextPlayerIds[patch.playerIdForGame.gameId] = patch.playerIdForGame.playerId.trim().slice(0, 64);
    }

    const updated: UserAccount = {
      ...user,
      lastPage: patch.lastPage ?? user.lastPage ?? 'home',
      lastGameId: patch.lastGameId ?? user.lastGameId ?? 'freefire',
      lastPaymentMethod: patch.lastPaymentMethod ?? user.lastPaymentMethod ?? 'telebirr',
      savedPlayerIds: nextPlayerIds,
      phone: patch.phone && patch.phone.trim().length >= 6 ? patch.phone.trim().slice(0, 32) : user.phone,
      fullName:
        patch.fullName && patch.fullName.trim().length >= 2 ? patch.fullName.trim().slice(0, 100) : user.fullName,
    };

    this.updateUser(updated);
  }

  // Notifications
  public getNotifications(): UserNotification[] {
    const user = this.getCurrentUser();
    if (user) {
      return user.notifications || [];
    }
    return this.get<UserNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
  }

  public addNotification(input: {
    title: string;
    message: string;
    type?: NotificationType;
    targetPage?: string;
  }): UserNotification {
    const notif: UserNotification = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: input.title.trim().slice(0, 100),
      message: input.message.trim().slice(0, 300),
      type: input.type || 'success',
      createdAt: `${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
      createdAtMs: Date.now(),
      read: false,
      targetPage: input.targetPage,
    };

    const user = this.getCurrentUser();
    if (user) {
      const nextList = [notif, ...(user.notifications || [])].slice(0, 30);
      this.updateUser({ ...user, notifications: nextList });
    } else {
      const guestList = [notif, ...this.get<UserNotification[]>(STORAGE_KEYS.NOTIFICATIONS, [])].slice(0, 30);
      this.set(STORAGE_KEYS.NOTIFICATIONS, guestList);
    }
    return notif;
  }

  public markNotificationRead(notifId: string): void {
    const user = this.getCurrentUser();
    if (user) {
      const nextList = (user.notifications || []).map((n) => (n.id === notifId ? { ...n, read: true } : n));
      this.updateUser({ ...user, notifications: nextList });
    } else {
      const guestList = this.get<UserNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []).map((n) =>
        n.id === notifId ? { ...n, read: true } : n
      );
      this.set(STORAGE_KEYS.NOTIFICATIONS, guestList);
    }
  }

  public markAllNotificationsRead(): void {
    const user = this.getCurrentUser();
    if (user) {
      const nextList = (user.notifications || []).map((n) => ({ ...n, read: true }));
      this.updateUser({ ...user, notifications: nextList });
    } else {
      const guestList = this.get<UserNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []).map((n) => ({
        ...n,
        read: true,
      }));
      this.set(STORAGE_KEYS.NOTIFICATIONS, guestList);
    }
  }

  public clearNotifications(): void {
    const user = this.getCurrentUser();
    if (user) {
      this.updateUser({ ...user, notifications: [] });
    } else {
      this.set(STORAGE_KEYS.NOTIFICATIONS, []);
    }
  }

  public redeemReward(
    rewardName: string,
    cost: number
  ): { success: boolean; message: string; user?: UserAccount } {
    const user = this.getCurrentUser();
    if (!user) {
      return { success: false, message: 'Please sign in to redeem loyalty rewards.' };
    }
    if ((user.loyaltyPoints || 0) < cost) {
      return { success: false, message: `You need ${cost.toLocaleString()} Loyalty XP to redeem ${rewardName}.` };
    }

    const walletBonus = rewardName.toLowerCase().includes('wallet credit') || rewardName === '100 Loyalty Points' ? 50 : 0;
    const rewardAchievement = {
      id: `reward-${Date.now()}`,
      title: `Perk: ${rewardName}`,
      desc:
        walletBonus > 0
          ? `Redeemed for ${cost.toLocaleString()} XP (+Br ${walletBonus} Wallet Credit)`
          : `Redeemed for ${cost.toLocaleString()} XP on GameZoneET`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      icon: 'gift',
    };
    const nextAchievements = [rewardAchievement, ...(user.achievements || [])].slice(0, 50);

    const updatedUser: UserAccount = {
      ...user,
      loyaltyPoints: user.loyaltyPoints - cost,
      walletBalance: (user.walletBalance || 0) + walletBonus,
      achievements: nextAchievements,
    };
    this.updateUser(updatedUser);
    return {
      success: true,
      message:
        walletBonus > 0
          ? `Redeemed ${rewardName}! Br ${walletBonus} credited to your wallet.`
          : `Redeemed ${rewardName}! Reward saved to your Profile badges.`,
      user: updatedUser,
    };
  }

  public createUser(newUser: Omit<UserAccount, 'id' | 'createdAt'>): UserAccount {
    const user: UserAccount = {
      ...newUser,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    const users = [...this.getUsers(), user];
    this.set(STORAGE_KEYS.USERS, users);
    this.setCurrentUserId(user.id);
    return user;
  }

  public hydrateUserOrders(uid: string, firestoreOrders: OrderItem[]): void {
    const otherOrders = this.getOrders().filter((o) => o.userId !== uid);
    const merged = [...firestoreOrders, ...otherOrders];
    this.set(STORAGE_KEYS.ORDERS, merged);
  }

  public hydrateUserRegistrations(uid: string, firestoreRegs: TournamentRegistration[]): void {
    const otherRegs = this.getRegistrations().filter((r) => r.userId !== uid);
    const merged = [...firestoreRegs, ...otherRegs];
    this.set(STORAGE_KEYS.REGISTRATIONS, merged);
  }

  public hydrateUserSupportTickets(uid: string, firestoreTickets: SupportTicket[]): void {
    const other = this.getSupportTickets().filter((t) => t.userId !== uid);
    this.set(STORAGE_KEYS.SUPPORT_TICKETS, [...firestoreTickets, ...other]);
  }

  public hydrateUserDisputes(uid: string, firestoreDisputes: TournamentDispute[]): void {
    const other = this.getDisputes().filter((d) => d.userId !== uid);
    this.set(STORAGE_KEYS.DISPUTES, [...firestoreDisputes, ...other]);
  }

  public async syncAdminCollectionsFromFirestore(): Promise<void> {
    const [orders, users, regs, tickets, disputes, bindings, hwids, secEvents, auditLogs] = await Promise.all([
      fetchAllOrdersFromFirestore(),
      fetchAllUsersFromFirestore(),
      fetchAllRegistrationsFromFirestore(),
      fetchAllSupportTicketsFromFirestore(),
      fetchAllDisputesFromFirestore(),
      fetchAllIdentityBindingsFromFirestore(),
      fetchAllHwidRecordsFromFirestore(),
      fetchAllSecurityEventsFromFirestore(),
      fetchAllAuditLogsFromFirestore(),
    ]);

    this.set(STORAGE_KEYS.ORDERS, orders);
    this.set(STORAGE_KEYS.REGISTRATIONS, regs);
    this.set(STORAGE_KEYS.SUPPORT_TICKETS, tickets);
    this.set(STORAGE_KEYS.DISPUTES, disputes);
    if (bindings.length > 0) this.set(STORAGE_KEYS.IDENTITY_BINDINGS, bindings);
    if (hwids.length > 0) this.set(STORAGE_KEYS.HWID_REGISTRY, hwids);
    if (secEvents.length > 0) this.set(STORAGE_KEYS.SECURITY_EVENTS, secEvents);
    if (auditLogs.length > 0) this.set(STORAGE_KEYS.AUDIT_LOGS, auditLogs);

    const existingUsers = this.getUsers();
    const mergedUsersMap = new Map<string, UserAccount>();
    for (const u of existingUsers) {
      mergedUsersMap.set(u.id, u);
    }
    for (const remoteUser of users) {
      const localMatch = mergedUsersMap.get(remoteUser.id);
      mergedUsersMap.set(remoteUser.id, {
        ...remoteUser,
        email: localMatch?.email || remoteUser.email,
        emailVerified: localMatch?.emailVerified ?? remoteUser.emailVerified,
        role: localMatch?.role === 'admin' ? 'admin' : remoteUser.role,
      });
    }
    this.set(STORAGE_KEYS.USERS, Array.from(mergedUsersMap.values()));
  }

  public clearSessionRecords(): void {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    this.set(STORAGE_KEYS.ORDERS, []);
    this.set(STORAGE_KEYS.REGISTRATIONS, []);
    this.set(STORAGE_KEYS.SUPPORT_TICKETS, []);
    this.set(STORAGE_KEYS.DISPUTES, []);
  }

  // Products
  public getProducts(gameId?: string): ProductItem[] {
    const products = this.get<ProductItem[]>(STORAGE_KEYS.PRODUCTS, SEED_PRODUCTS);
    return gameId ? products.filter((p) => p.gameId === gameId) : products;
  }

  public getProductById(id: string): ProductItem | null {
    return this.getProducts().find((p) => p.id === id) || null;
  }

  public createProduct(item: Omit<ProductItem, 'id'>): ProductItem {
    const newProduct: ProductItem = {
      ...item,
      id: `prod-${Date.now()}`,
    };
    const products = [...this.getProducts(), newProduct];
    this.set(STORAGE_KEYS.PRODUCTS, products);
    return newProduct;
  }

  public updateProduct(updated: ProductItem): void {
    const products = this.getProducts().map((p) => (p.id === updated.id ? updated : p));
    this.set(STORAGE_KEYS.PRODUCTS, products);
  }

  public deleteProduct(id: string): void {
    const products = this.getProducts().filter((p) => p.id !== id);
    this.set(STORAGE_KEYS.PRODUCTS, products);
  }

  // Orders (all saved orders + 2-month / 60-day history helpers)
  public getOrders(userId?: string): OrderItem[] {
    const orders = this.get<OrderItem[]>(STORAGE_KEYS.ORDERS, []);
    const list = userId ? orders.filter((o) => o.userId === userId) : orders;
    return [...list].sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
  }

  public getOrdersLastTwoMonths(userId?: string): OrderItem[] {
    const cutoff = Date.now() - SIXTY_DAYS_MS;
    return this.getOrders(userId).filter((o) => (o.createdAtMs || Date.now()) >= cutoff);
  }

  public getOrderById(id: string): OrderItem | null {
    return this.getOrders().find((o) => o.id === id) || null;
  }

  public createOrder(orderData: Omit<OrderItem, 'id' | 'createdAt' | 'createdAtMs'>): OrderItem {
    const nowMs = Date.now();
    const newOrder: OrderItem = {
      ...orderData,
      id: `ET-ORD-${Math.floor(100000 + Math.random() * 900000)}`,
      createdAt: `${new Date(nowMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${new Date(nowMs).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} EAT`,
      createdAtMs: nowMs,
    };
    const orders = [newOrder, ...this.getOrders()];
    this.set(STORAGE_KEYS.ORDERS, orders);

    // Sync order to Firestore if signed in
    void saveOrderToFirestore(newOrder).catch((err) => {
      console.error('Firestore order save failed:', err);
    });

    // Reward points to current user for non-wallet top-ups
    const user = this.getUserById(orderData.userId);
    if (user && orderData.paymentStatus === 'success' && orderData.gameId !== 'wallet') {
      const earnedPoints = Math.floor(orderData.amountETB / 10);
      this.updateUser({
        ...user,
        loyaltyPoints: user.loyaltyPoints + earnedPoints,
      });
    }

    return newOrder;
  }

  public updateOrderStatus(orderId: string, paymentStatus: PaymentStatus, deliveryStatus: DeliveryStatus): void {
    const orders = this.getOrders().map((o) => {
      if (o.id === orderId) {
        return { ...o, paymentStatus, deliveryStatus };
      }
      return o;
    });
    this.set(STORAGE_KEYS.ORDERS, orders);
    void updateOrderStatusInFirestore(orderId, paymentStatus, deliveryStatus).catch((err) => {
      console.error('Firestore order status update failed:', err);
    });
    void this.logAdminAudit(
      'ORDER_STATUS_UPDATE',
      'order',
      orderId,
      `Set payment=${paymentStatus}, delivery=${deliveryStatus}`
    );
  }

  public async syncTournamentsFromFirestore(uid?: string, isAdminUser = false): Promise<void> {
    try {
      const remoteTournaments = await fetchTournamentsFromFirestore();
      const remoteIds = new Set(remoteTournaments.map((t) => t.id));

      // Bootstrap seeded tournaments + lobbies to Firestore if an admin opens the app on a fresh DB
      if (isAdminUser) {
        const missingSeeds = SEED_TOURNAMENTS.filter((s) => !remoteIds.has(s.id));
        if (missingSeeds.length > 0) {
          await Promise.all(
            missingSeeds.map(async (seed) => {
              await saveTournamentToFirestore(seed).catch(() => {});
              if (seed.roomCredentials) {
                await saveTournamentLobbyToFirestore(seed.id, seed.roomCredentials).catch(() => {});
              }
            })
          );
        }
      }

      if (remoteTournaments.length > 0) {
        const local = this.getTournaments();
        const mergedMap = new Map<string, TournamentEntity>();
        for (const t of local) {
          mergedMap.set(t.id, t);
        }
        for (const rt of remoteTournaments) {
          const existing = mergedMap.get(rt.id);
          const mergedCreds = rt.roomCredentials
            ? existing?.roomCredentials?.roomId
              ? {
                  ...existing.roomCredentials,
                  published: rt.roomCredentials.published,
                  unlockMode: rt.roomCredentials.unlockMode,
                  unlockAt: rt.roomCredentials.unlockAt || existing.roomCredentials.unlockAt,
                }
              : rt.roomCredentials
            : existing?.roomCredentials
            ? { ...existing.roomCredentials, published: false }
            : undefined;
          mergedMap.set(rt.id, {
            ...existing,
            ...rt,
            roomCredentials: mergedCreds,
          });
        }
        this.set(STORAGE_KEYS.TOURNAMENTS, Array.from(mergedMap.values()));
      }

      if (uid) {
        const currentList = this.getTournaments();
        const targetIds = currentList
          .filter((t) => isAdminUser || (t.roomCredentials?.published && this.isUserRegisteredForTournament(uid, t.id)))
          .map((t) => t.id);

        if (targetIds.length > 0) {
          const lobbyResults = await Promise.all(
            targetIds.map(async (tid) => ({
              tid,
              creds: await fetchTournamentLobbyFromFirestore(tid),
            }))
          );
          const updated = this.getTournaments().map((t) => {
            const match = lobbyResults.find((r) => r.tid === t.id && r.creds);
            return match?.creds ? { ...t, roomCredentials: match.creds } : t;
          });
          this.set(STORAGE_KEYS.TOURNAMENTS, updated);
        }
      }
    } catch (err) {
      console.warn('Tournament Firestore sync skipped:', err);
    }
  }

  public generateDefaultBracketMatches(
    tournamentId: string,
    startTime: string
  ): TournamentMatch[] {
    return [
      {
        id: `${tournamentId}-qf-1`,
        tournamentId,
        round: 'Quarterfinal 1',
        matchNumber: 1,
        player1: { id: 'seed-1', name: 'Open Seed #1' },
        player2: { id: 'seed-2', name: 'Open Seed #2' },
        scheduledTime: startTime,
        status: 'scheduled',
      },
      {
        id: `${tournamentId}-qf-2`,
        tournamentId,
        round: 'Quarterfinal 2',
        matchNumber: 2,
        player1: { id: 'seed-3', name: 'Open Seed #3' },
        player2: { id: 'seed-4', name: 'Open Seed #4' },
        scheduledTime: startTime,
        status: 'scheduled',
      },
      {
        id: `${tournamentId}-qf-3`,
        tournamentId,
        round: 'Quarterfinal 3',
        matchNumber: 3,
        player1: { id: 'seed-5', name: 'Open Seed #5' },
        player2: { id: 'seed-6', name: 'Open Seed #6' },
        scheduledTime: startTime,
        status: 'scheduled',
      },
      {
        id: `${tournamentId}-qf-4`,
        tournamentId,
        round: 'Quarterfinal 4',
        matchNumber: 4,
        player1: { id: 'seed-7', name: 'Open Seed #7' },
        player2: { id: 'seed-8', name: 'Open Seed #8' },
        scheduledTime: startTime,
        status: 'scheduled',
      },
      {
        id: `${tournamentId}-sf-1`,
        tournamentId,
        round: 'Semifinal 1',
        matchNumber: 5,
        player1: { id: 'tbd-qf1', name: 'Winner QF 1' },
        player2: { id: 'tbd-qf2', name: 'Winner QF 2' },
        scheduledTime: startTime,
        status: 'scheduled',
      },
      {
        id: `${tournamentId}-sf-2`,
        tournamentId,
        round: 'Semifinal 2',
        matchNumber: 6,
        player1: { id: 'tbd-qf3', name: 'Winner QF 3' },
        player2: { id: 'tbd-qf4', name: 'Winner QF 4' },
        scheduledTime: startTime,
        status: 'scheduled',
      },
      {
        id: `${tournamentId}-gf-1`,
        tournamentId,
        round: 'Grand Finals',
        matchNumber: 7,
        player1: { id: 'tbd-sf1', name: 'Winner SF 1' },
        player2: { id: 'tbd-sf2', name: 'Winner SF 2' },
        scheduledTime: startTime,
        status: 'scheduled',
      },
    ];
  }

  public isRoomUnlockedForUser(
    tournament: TournamentEntity | null | undefined,
    userId?: string | null,
    isAdminUser = false
  ): {
    unlocked: boolean;
    reason: 'admin' | 'unlocked' | 'unregistered' | 'unpublished' | 'scheduled_lock';
    creds?: TournamentRoomCredentials;
  } {
    if (!tournament) return { unlocked: false, reason: 'unpublished' };
    const creds = tournament.roomCredentials;
    if (isAdminUser) {
      return { unlocked: true, reason: 'admin', creds };
    }
    if (!userId || !this.isUserRegisteredForTournament(userId, tournament.id)) {
      return { unlocked: false, reason: 'unregistered' };
    }
    if (!creds || !creds.published || !creds.roomId.trim()) {
      return { unlocked: false, reason: 'unpublished' };
    }
    if (creds.unlockMode === 'immediate' || tournament.status === 'live' || tournament.lobbyStatus === 'lobby_open' || tournament.lobbyStatus === 'in_progress') {
      return { unlocked: true, reason: 'unlocked', creds };
    }
    const parsedTime = creds.unlockAt ? Date.parse(creds.unlockAt) : NaN;
    if (!Number.isNaN(parsedTime) && Date.now() >= parsedTime) {
      return { unlocked: true, reason: 'unlocked', creds };
    }
    return { unlocked: false, reason: 'scheduled_lock', creds };
  }

  // Tournaments
  public getTournaments(gameId?: string): TournamentEntity[] {
    const stored = this.get<TournamentEntity[]>(STORAGE_KEYS.TOURNAMENTS, SEED_TOURNAMENTS);
    // Ensure seeded items inherit new lobby/credential defaults if loaded from older cache
    const tournaments = stored.map((t) => {
      const seedMatch = SEED_TOURNAMENTS.find((s) => s.id === t.id);
      if (!seedMatch) return t;
      return {
        ...seedMatch,
        ...t,
        entryMode: t.entryMode ?? seedMatch.entryMode,
        lobbyStatus: t.lobbyStatus ?? seedMatch.lobbyStatus,
        currentMatchLabel: t.currentMatchLabel ?? seedMatch.currentMatchLabel,
        roomCredentials: t.roomCredentials ?? seedMatch.roomCredentials,
        matches: t.matches && t.matches.length > 0 ? t.matches : seedMatch.matches,
      };
    });
    return gameId && gameId !== 'all' ? tournaments.filter((t) => t.gameId === gameId) : tournaments;
  }

  public getTournamentById(id: string): TournamentEntity | null {
    return this.getTournaments().find((t) => t.id === id) || null;
  }

  public createTournament(data: Omit<TournamentEntity, 'id'>): TournamentEntity {
    const id = `tourney-${Date.now()}`;
    const generatedMatches =
      data.matches && data.matches.length > 0
        ? data.matches
        : this.generateDefaultBracketMatches(id, data.startTime);

    const newTournament: TournamentEntity = {
      ...data,
      id,
      entryMode: data.entryMode || (data.format.toLowerCase().includes('squad') ? 'squad' : 'solo'),
      lobbyStatus: data.lobbyStatus || 'waiting',
      currentMatchLabel: data.currentMatchLabel || 'Round 1 · Registration Open',
      matches: generatedMatches,
      roomCredentials: data.roomCredentials || {
        roomId: `GZ-${data.gameId.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
        roomPassword: `ET${Math.floor(1000 + Math.random() * 9000)}`,
        server: 'Africa (Addis Ababa)',
        notes: 'Check in 15 minutes before start time EAT.',
        published: false,
        unlockMode: 'at_start',
        unlockAt: `${data.date} ${data.startTime}`,
      },
    };
    const tournaments = [newTournament, ...this.getTournaments()];
    this.set(STORAGE_KEYS.TOURNAMENTS, tournaments);

    void saveTournamentToFirestore(newTournament).catch((err) => {
      console.warn('Firestore tournament create sync skipped:', err);
    });
    if (newTournament.roomCredentials) {
      void saveTournamentLobbyToFirestore(id, newTournament.roomCredentials).catch((err) => {
        console.warn('Firestore lobby create sync skipped:', err);
      });
    }
    void this.logAdminAudit(
      'TOURNAMENT_CREATED',
      'tournament',
      id,
      `Created tournament "${newTournament.title}" (${newTournament.gameName}, cap=${newTournament.capacity})`
    );

    return newTournament;
  }

  public updateTournament(updated: TournamentEntity): void {
    const tournaments = this.getTournaments().map((t) => (t.id === updated.id ? updated : t));
    this.set(STORAGE_KEYS.TOURNAMENTS, tournaments);
    void saveTournamentToFirestore(updated).catch((err) => {
      console.warn('Firestore tournament update sync skipped:', err);
    });
  }

  public updateTournamentLobby(
    tournamentId: string,
    patch: Partial<TournamentRoomCredentials> & {
      lobbyStatus?: TournamentEntity['lobbyStatus'];
      currentMatchLabel?: string;
    }
  ): TournamentEntity | null {
    const target = this.getTournamentById(tournamentId);
    if (!target) return null;

    const existingCreds = target.roomCredentials || {
      roomId: `GZ-${target.gameId.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      roomPassword: `ET${Math.floor(1000 + Math.random() * 9000)}`,
      server: 'Africa (Addis Ababa)',
      published: false,
      unlockMode: 'at_start' as const,
    };

    const nextCreds: TournamentRoomCredentials = {
      ...existingCreds,
      ...patch,
      publishedAt:
        patch.published && !existingCreds.published
          ? `${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} EAT`
          : existingCreds.publishedAt,
    };

    const nextTournament: TournamentEntity = {
      ...target,
      lobbyStatus: patch.lobbyStatus ?? (nextCreds.published ? 'lobby_open' : target.lobbyStatus || 'waiting'),
      currentMatchLabel: patch.currentMatchLabel ?? target.currentMatchLabel,
      roomCredentials: nextCreds,
    };

    const tournaments = this.getTournaments().map((t) => (t.id === tournamentId ? nextTournament : t));
    this.set(STORAGE_KEYS.TOURNAMENTS, tournaments);

    void saveTournamentToFirestore(nextTournament).catch((err) => {
      console.warn('Firestore tournament lobby metadata sync skipped:', err);
    });
    void saveTournamentLobbyToFirestore(tournamentId, nextCreds).catch((err) => {
      console.warn('Firestore lobby credentials sync skipped:', err);
    });
    void this.logAdminAudit(
      nextCreds.published ? 'ROOM_CODE_PUBLISHED' : 'LOBBY_UPDATED',
      'tournament',
      tournamentId,
      `Lobby state="${nextTournament.lobbyStatus}", roomPublished=${String(nextCreds.published)}, unlockMode=${nextCreds.unlockMode}`
    );

    return nextTournament;
  }

  public deleteTournament(id: string): void {
    const existing = this.getTournamentById(id);
    const tournaments = this.getTournaments().filter((t) => t.id !== id);
    this.set(STORAGE_KEYS.TOURNAMENTS, tournaments);
    void deleteTournamentFromFirestore(id).catch((err) => {
      console.warn('Firestore tournament delete skipped:', err);
    });
    void this.logAdminAudit(
      'TOURNAMENT_DELETED',
      'tournament',
      id,
      `Deleted tournament "${existing?.title || id}"`
    );
  }

  // Tournament Registrations
  public getRegistrations(userId?: string): TournamentRegistration[] {
    const regs = this.get<TournamentRegistration[]>(STORAGE_KEYS.REGISTRATIONS, []);
    return userId ? regs.filter((r) => r.userId === userId) : regs;
  }

  public getRegistrationForTournament(userId: string, tournamentId: string): TournamentRegistration | null {
    return this.getRegistrations().find((r) => r.userId === userId && r.tournamentId === tournamentId) || null;
  }

  public isUserRegisteredForTournament(userId: string, tournamentId: string): boolean {
    return this.getRegistrations().some((r) => r.userId === userId && r.tournamentId === tournamentId);
  }

  public getWeeklyTournamentLimitStatus(
    user: UserAccount | null,
    excludeTournamentId?: string
  ): {
    limited: boolean;
    activeReg?: TournamentRegistration;
    week: CalendarWeekBounds;
    message?: string;
  } {
    const week = getCalendarWeekBounds();
    if (!user?.id) {
      return { limited: false, week };
    }
    const regs = this.getRegistrations();
    const activeReg = regs.find((r) => {
      if (r.status === 'cancelled') return false;
      if (excludeTournamentId && r.tournamentId === excludeTournamentId) return false;
      const matchesUser =
        r.userId === user.id || Boolean(user.identityHash && r.identityHash && r.identityHash === user.identityHash);
      if (!matchesUser) return false;
      return isRegistrationInWeek(r, week);
    });

    if (!activeReg) {
      return { limited: false, week };
    }

    return {
      limited: true,
      activeReg,
      week,
      message: `Weekly Cool-Down Active (1 Tournament / Mon–Sun): You are already registered for "${activeReg.tournamentTitle}" during ${week.rangeLabel}. To prevent burnout and ensure fair squad spots for Ethiopian players, your next tournament entry unlocks ${week.nextResetLabel}.`,
    };
  }

  public registerForTournament(
    data: Omit<TournamentRegistration, 'id' | 'registeredAt'>
  ): { success: boolean; message: string; reg?: TournamentRegistration } {
    const tournament = this.getTournamentById(data.tournamentId);
    if (!tournament) {
      return { success: false, message: 'Tournament not found.' };
    }

    const user = this.getUserById(data.userId);
    if (user?.isBanned) {
      return {
        success: false,
        message: `Account suspended from competitive play${user.banReason ? `: ${user.banReason}` : '.'}`,
      };
    }

    if (!user?.identityVerified || !user.identityHash || !user.identityType) {
      return {
        success: false,
        message: 'Identity Verification required: Bind either an Ethiopian Fayda/FIDO ID OR a Passport before entering tournaments.',
      };
    }

    if (
      user.identityType !== 'fayda_national_id' &&
      user.identityType !== 'ethiopian_fido' &&
      user.identityType !== 'passport'
    ) {
      return {
        success: false,
        message: 'Exclusive single credential type (Passport OR Ethiopian ID) is required to enter tournaments.',
      };
    }

    if (this.isUserRegisteredForTournament(data.userId, data.tournamentId)) {
      return { success: false, message: 'You have already registered for this competition!' };
    }

    const weeklyStatus = this.getWeeklyTournamentLimitStatus(user, data.tournamentId);
    if (weeklyStatus.limited) {
      return {
        success: false,
        message:
          weeklyStatus.message ||
          'Weekly Cool-Down Limit: You can register for 1 tournament per Monday–Sunday calendar week.',
      };
    }

    const allRegs = this.getRegistrations();
    const duplicateIdentityInTourney = allRegs.find(
      (r) =>
        r.tournamentId === data.tournamentId &&
        r.status !== 'cancelled' &&
        r.userId !== data.userId &&
        r.identityHash &&
        r.identityHash === user.identityHash
    );
    if (duplicateIdentityInTourney) {
      securityEngine.reportThreat({
        userId: data.userId,
        gamerTag: data.gamerTag,
        category: 'anti_smurf_id',
        severity: 'critical',
        summary: `Blocked duplicate verified ID registration attempt in "${tournament.title}".`,
        endpointOrSurface: 'TournamentRegistrationGate',
        blocked: true,
      });
      return {
        success: false,
        message: 'Anti-smurf gate: This verified ID is already entered in this tournament under another account.',
      };
    }

    const activeHwid = user.hwidHash || securityEngine.getCachedHwid().hwidHash;
    if (activeHwid) {
      const hwidRecord = this.getHwidRegistry().find((h) => h.hwidHash === activeHwid);
      if (hwidRecord?.blocked) {
        return {
          success: false,
          message: 'This device Hardware ID (HWID) is blocked from tournament participation due to anti-smurf enforcement.',
        };
      }
      const sameHwidInTourney = allRegs.find(
        (r) =>
          r.tournamentId === data.tournamentId &&
          r.status !== 'cancelled' &&
          r.userId !== data.userId &&
          r.hwidHash === activeHwid
      );
      if (sameHwidInTourney) {
        securityEngine.reportThreat({
          userId: data.userId,
          gamerTag: data.gamerTag,
          category: 'anti_smurf_hwid',
          severity: 'critical',
          summary: `Blocked multi-account smurf entry on same HWID (${activeHwid.slice(0, 10)}...) in "${tournament.title}".`,
          endpointOrSurface: 'AntiSmurfHWIDGate',
          blocked: true,
        });
        return {
          success: false,
          message: 'Anti-smurf HWID shield: Another account from this exact physical device is already registered in this bracket.',
        };
      }
    }

    if (tournament.registeredCount >= tournament.capacity) {
      return { success: false, message: 'This tournament has reached its maximum capacity.' };
    }

    const slotNumber = tournament.registeredCount + 1;
    const confirmationCode = `GZ-REG-${Math.floor(1000 + Math.random() * 9000)}`;
    const deterministicId = `${data.userId}_${data.tournamentId}`.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);

    const currentWeek = getCalendarWeekBounds();
    const newReg: TournamentRegistration = {
      ...data,
      id: deterministicId,
      confirmationCode,
      slotNumber,
      entryType: data.entryType || (data.teamName ? 'squad' : 'solo'),
      squadMemberIds: data.squadMemberIds?.filter((s) => s.trim().length > 0).slice(0, 4),
      identityHash: data.identityHash || user.identityHash,
      identityMasked: data.identityMasked || user.identityMasked,
      hwidHash: data.hwidHash || activeHwid || undefined,
      weekKey: currentWeek.weekKey,
      createdAtMs: Date.now(),
      registeredAt: `${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} EAT`,
    };

    const regs = [newReg, ...this.getRegistrations()];
    this.set(STORAGE_KEYS.REGISTRATIONS, regs);

    void saveRegistrationToFirestore(newReg)
      .then(async () => {
        if (tournament.roomCredentials?.published && !tournament.roomCredentials.roomId) {
          const creds = await fetchTournamentLobbyFromFirestore(tournament.id);
          if (creds) {
            const refreshed = this.getTournaments().map((item) =>
              item.id === tournament.id ? { ...item, roomCredentials: creds } : item
            );
            this.set(STORAGE_KEYS.TOURNAMENTS, refreshed);
          }
        }
      })
      .catch((err) => {
        console.error('Firestore registration save failed:', err);
      });

    const newCount = tournament.registeredCount + 1;
    const newStatus = newCount >= tournament.capacity ? 'full' : newCount > tournament.capacity * 0.7 ? 'filling' : tournament.status;

    // Seed participant into first available Open Seed bracket slot if any
    const displayLabel = newReg.teamName ? `${newReg.teamName} (${newReg.gamerTag})` : newReg.gamerTag;
    let seededBracket = false;
    const nextMatches = (tournament.matches || []).map((m) => {
      if (seededBracket || !m.round.includes('Quarterfinal')) return m;
      if (m.player1.name.startsWith('Open Seed')) {
        seededBracket = true;
        return { ...m, player1: { ...m.player1, id: newReg.userId, name: displayLabel } };
      }
      if (m.player2.name.startsWith('Open Seed')) {
        seededBracket = true;
        return { ...m, player2: { ...m.player2, id: newReg.userId, name: displayLabel } };
      }
      return m;
    });

    this.updateTournament({
      ...tournament,
      registeredCount: newCount,
      status: newStatus,
      matches: nextMatches,
    });

    return {
      success: true,
      message: `Slot #${slotNumber} confirmed for ${tournament.title}! Code: ${confirmationCode}`,
      reg: newReg,
    };
  }

  public cancelRegistration(registrationId: string): boolean {
    const reg = this.getRegistrations().find((r) => r.id === registrationId);
    if (!reg) return false;

    const tournament = this.getTournamentById(reg.tournamentId);
    if (tournament) {
      this.updateTournament({
        ...tournament,
        registeredCount: Math.max(0, tournament.registeredCount - 1),
        status: 'open',
      });
    }

    const filtered = this.getRegistrations().filter((r) => r.id !== registrationId);
    this.set(STORAGE_KEYS.REGISTRATIONS, filtered);
    void deleteRegistrationFromFirestore(registrationId).catch((err) => {
      console.error('Firestore registration delete failed:', err);
    });
    return true;
  }

  // Match Results & Advancements
  public submitMatchResult(matchId: string, tournamentId: string, reportedBy: string, score: string, proofNote?: string): void {
    const tourney = this.getTournamentById(tournamentId);
    if (!tourney || !tourney.matches) return;

    const updatedMatches = tourney.matches.map((m) => {
      if (m.id === matchId) {
        return {
          ...m,
          status: 'pending_approval' as const,
          submittedScore: score,
          reportedBy,
          proofNote: proofNote || 'Result reported by participant. Awaiting admin review.',
        };
      }
      return m;
    });

    this.updateTournament({ ...tourney, matches: updatedMatches });
  }

  public approveMatchResult(tournamentId: string, matchId: string, winnerId: string, p1Score: number, p2Score: number): void {
    const tourney = this.getTournamentById(tournamentId);
    if (!tourney || !tourney.matches) return;

    let winnerName = '';
    const updatedMatches = tourney.matches.map((m) => {
      if (m.id === matchId) {
        winnerName = winnerId === m.player1.id ? m.player1.name : m.player2.name;
        return {
          ...m,
          status: 'completed' as const,
          winnerId,
          player1: { ...m.player1, score: p1Score, isWinner: winnerId === m.player1.id },
          player2: { ...m.player2, score: p2Score, isWinner: winnerId === m.player2.id },
        };
      }
      return m;
    });

    // Advance winner name into next round placeholder if matching
    const completedMatch = tourney.matches.find((m) => m.id === matchId);
    const advancedMatches = updatedMatches.map((m) => {
      if (!completedMatch || !winnerName) return m;
      if (completedMatch.round === 'Quarterfinal 1' && m.round === 'Semifinal 1' && m.player1.name.includes('QF 1')) {
        return { ...m, player1: { id: winnerId, name: winnerName } };
      }
      if (completedMatch.round === 'Quarterfinal 2' && m.round === 'Semifinal 1' && m.player2.name.includes('QF 2')) {
        return { ...m, player2: { id: winnerId, name: winnerName } };
      }
      if (completedMatch.round === 'Quarterfinal 3' && m.round === 'Semifinal 2' && m.player1.name.includes('QF 3')) {
        return { ...m, player1: { id: winnerId, name: winnerName } };
      }
      if (completedMatch.round === 'Quarterfinal 4' && m.round === 'Semifinal 2' && m.player2.name.includes('QF 4')) {
        return { ...m, player2: { id: winnerId, name: winnerName } };
      }
      if (completedMatch.round === 'Semifinal 1' && m.round === 'Grand Finals' && m.player1.name.includes('SF 1')) {
        return { ...m, player1: { id: winnerId, name: winnerName } };
      }
      if (completedMatch.round === 'Semifinal 2' && m.round === 'Grand Finals' && (m.player2.name.includes('Semifinal 2') || m.player2.name.includes('SF 2'))) {
        return { ...m, player2: { id: winnerId, name: winnerName } };
      }
      return m;
    });

    const isGrandFinal = completedMatch?.round.includes('Grand Final');
    this.updateTournament({
      ...tourney,
      status: isGrandFinal ? 'completed' : tourney.status,
      lobbyStatus: isGrandFinal ? 'completed' : tourney.lobbyStatus,
      currentMatchLabel: isGrandFinal ? `Champion: ${winnerName}` : tourney.currentMatchLabel,
      matches: advancedMatches,
    });
    void this.logAdminAudit(
      'MATCH_WINNER_APPROVED',
      'match',
      matchId,
      `Approved ${winnerName} (${p1Score}-${p2Score}) in "${tourney.title}"`
    );
  }

  // Disputes
  public getDisputes(userId?: string): TournamentDispute[] {
    const list = this.get<TournamentDispute[]>(STORAGE_KEYS.DISPUTES, []);
    return userId ? list.filter((d) => d.userId === userId) : list;
  }

  public reportDispute(
    matchId: string,
    tournamentId: string,
    reportedBy: string,
    reason: string,
    description: string,
    userId?: string
  ): TournamentDispute {
    const activeUser = this.getCurrentUser();
    const resolvedUid = userId || activeUser?.id || 'guest';
    const newDispute: TournamentDispute = {
      id: `disp-${Date.now()}`,
      userId: resolvedUid,
      matchId,
      tournamentId,
      reportedBy,
      reason,
      description,
      status: 'open',
      adminNotes: '',
      createdAt: `${new Date().toLocaleDateString('en-US')} ${new Date().toLocaleTimeString('en-US')}`,
    };

    const disputes = [newDispute, ...this.getDisputes()];
    this.set(STORAGE_KEYS.DISPUTES, disputes);

    void saveDisputeToFirestore(newDispute).catch((err) => {
      console.error('Firestore dispute save failed:', err);
    });

    const tourney = this.getTournamentById(tournamentId);
    if (tourney && tourney.matches) {
      const updatedMatches = tourney.matches.map((m) => (m.id === matchId ? { ...m, status: 'disputed' as const } : m));
      this.updateTournament({ ...tourney, matches: updatedMatches });
    }

    return newDispute;
  }

  public resolveDispute(disputeId: string, status: 'resolved' | 'dismissed', adminNotes: string): void {
    const disputes = this.getDisputes().map((d) => (d.id === disputeId ? { ...d, status, adminNotes } : d));
    this.set(STORAGE_KEYS.DISPUTES, disputes);
    void resolveDisputeInFirestore(disputeId, status, adminNotes).catch((err) => {
      console.error('Firestore dispute update failed:', err);
    });
    void this.logAdminAudit(
      'DISPUTE_RESOLVED',
      'dispute',
      disputeId,
      `Marked dispute as ${status}: ${adminNotes.slice(0, 120)}`
    );
  }

  // Support Tickets & Incident Reports
  public getSupportTickets(userId?: string): SupportTicket[] {
    const tickets = this.get<SupportTicket[]>(STORAGE_KEYS.SUPPORT_TICKETS, []);
    return userId ? tickets.filter((t) => t.userId === userId) : tickets;
  }

  public createSupportTicket(input: {
    userId: string;
    userName: string;
    email: string;
    category: SupportTicketCategory;
    subject: string;
    message: string;
  }): SupportTicket {
    const ticket: SupportTicket = {
      id: `tkt-${Date.now()}`,
      userId: input.userId,
      userName: input.userName,
      email: input.email,
      category: input.category,
      subject: input.subject.trim(),
      message: input.message.trim(),
      status: 'open',
      adminNotes: '',
      createdAt: `${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} EAT`,
    };
    const tickets = [ticket, ...this.getSupportTickets()];
    this.set(STORAGE_KEYS.SUPPORT_TICKETS, tickets);

    void saveSupportTicketToFirestore(ticket).catch((err) => {
      console.error('Firestore support ticket save failed:', err);
    });

    return ticket;
  }

  public updateSupportTicketStatus(
    ticketId: string,
    status: 'open' | 'in_progress' | 'resolved',
    adminNotes: string
  ): void {
    const tickets = this.getSupportTickets().map((t) =>
      t.id === ticketId ? { ...t, status, adminNotes } : t
    );
    this.set(STORAGE_KEYS.SUPPORT_TICKETS, tickets);
    void updateSupportTicketStatusInFirestore(ticketId, status, adminNotes).catch((err) => {
      console.error('Firestore support ticket update failed:', err);
    });
    void this.logAdminAudit(
      'SUPPORT_TICKET_UPDATED',
      'ticket',
      ticketId,
      `Updated ticket status to ${status}`
    );
  }

  // News
  public getNews(): NewsArticle[] {
    return this.get<NewsArticle[]>(STORAGE_KEYS.NEWS, SEED_NEWS);
  }

  public getNewsById(id: string): NewsArticle | null {
    return this.getNews().find((n) => n.id === id) || null;
  }

  public createNews(article: Omit<NewsArticle, 'id'>): NewsArticle {
    const newArticle: NewsArticle = {
      ...article,
      id: `news-${Date.now()}`,
    };
    const news = [newArticle, ...this.getNews()];
    this.set(STORAGE_KEYS.NEWS, news);
    return newArticle;
  }

  public updateNews(updated: NewsArticle): void {
    const news = this.getNews().map((n) => (n.id === updated.id ? updated : n));
    this.set(STORAGE_KEYS.NEWS, news);
  }

  public deleteNews(id: string): void {
    const news = this.getNews().filter((n) => n.id !== id);
    this.set(STORAGE_KEYS.NEWS, news);
  }

  // -------------------------------------------------------------
  // CYBERSECURITY, IDENTITY DEDUPLICATION, HWID & AUDIT LOGGING
  // -------------------------------------------------------------

  public getIdentityBindings(): IdentityBindingRecord[] {
    return this.get<IdentityBindingRecord[]>(STORAGE_KEYS.IDENTITY_BINDINGS, []);
  }

  public getHwidRegistry(): HwidRegistryRecord[] {
    return this.get<HwidRegistryRecord[]>(STORAGE_KEYS.HWID_REGISTRY, []);
  }

  public getSecurityEvents(): SecurityThreatEvent[] {
    return this.get<SecurityThreatEvent[]>(STORAGE_KEYS.SECURITY_EVENTS, []);
  }

  public getAuditLogs(): AdminAuditLogEntry[] {
    return this.get<AdminAuditLogEntry[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  }

  public recordSecurityThreat(
    event: Omit<SecurityThreatEvent, 'id' | 'timestamp' | 'timestampMs'>
  ): SecurityThreatEvent {
    const nowMs = Date.now();
    const created: SecurityThreatEvent = {
      ...event,
      id: `sec-${nowMs}-${Math.floor(Math.random() * 900 + 100)}`,
      timestamp: `${new Date(nowMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${new Date(nowMs).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} EAT`,
      timestampMs: nowMs,
    };
    const nextList = [created, ...this.getSecurityEvents()].slice(0, 150);
    this.set(STORAGE_KEYS.SECURITY_EVENTS, nextList);
    void saveSecurityEventToFirestore(created);
    return created;
  }

  public async registerDeviceHwid(
    userId: string,
    gamerTag: string
  ): Promise<HwidRegistryRecord | null> {
    try {
      const { hwidHash, deviceSummary } = await securityEngine.ensureHwid();
      const existingList = this.getHwidRegistry();
      const localMatch = existingList.find((r) => r.hwidHash === hwidHash);
      const localUids = Array.from(new Set([...(localMatch?.associatedUserIds || []), userId])).slice(0, 10);
      const isMultiAccount = localUids.length > 1;

      const candidate: HwidRegistryRecord = {
        hwidHash,
        lastUserId: userId,
        associatedUserIds: localUids,
        deviceSummary,
        flagged: Boolean(localMatch?.flagged) || isMultiAccount,
        blocked: Boolean(localMatch?.blocked),
        flaggedReason:
          localMatch?.flaggedReason ||
          (isMultiAccount
            ? `Device HWID shared across ${localUids.length} distinct player accounts.`
            : undefined),
        updatedAt: `${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} EAT`,
      };

      const remoteSynced = await upsertHwidRecordInFirestore(candidate);
      const finalRecord = remoteSynced || candidate;

      const updatedRegistry = existingList.some((r) => r.hwidHash === hwidHash)
        ? existingList.map((r) => (r.hwidHash === hwidHash ? finalRecord : r))
        : [finalRecord, ...existingList];
      this.set(STORAGE_KEYS.HWID_REGISTRY, updatedRegistry);

      const user = this.getUserById(userId);
      if (user) {
        const known = Array.from(new Set([hwidHash, ...(user.knownHwidHashes || [])])).slice(0, 10);
        const hwidChanged = user.hwidHash !== hwidHash || (user.knownHwidHashes?.length || 0) !== known.length;
        if (hwidChanged) {
          this.updateUser({
            ...user,
            hwidHash,
            knownHwidHashes: known,
          });
        }
      }

      if (finalRecord.flagged && finalRecord.associatedUserIds.length > 1) {
        this.recordSecurityThreat({
          userId,
          gamerTag,
          category: 'anti_smurf_hwid',
          severity: finalRecord.blocked ? 'critical' : 'high',
          summary: `Multi-account HWID correlation: ${finalRecord.associatedUserIds.length} accounts seen on ${deviceSummary}.`,
          hwidHash,
          endpointOrSurface: 'HardwareFingerprintGate',
          blocked: finalRecord.blocked,
        });
      }

      return finalRecord;
    } catch {
      return null;
    }
  }

  public async verifyAndBindUserIdentity(
    userId: string,
    idType: IdentityDocType,
    rawValue: string,
    documentFullName?: string,
    exclusivityContext?: { ethiopianIdValue?: string; passportValue?: string }
  ): Promise<{
    success: boolean;
    message: string;
    user?: UserAccount;
    warningTriggered?: boolean;
    mismatchWarnings?: number;
    blockedAccount?: boolean;
  }> {
    const user = this.getUserById(userId);
    if (!user) {
      return { success: false, message: 'Signed-in profile required to verify identity.' };
    }
    if (user.isBanned) {
      return {
        success: false,
        blockedAccount: true,
        message: `Suspended accounts cannot bind identity credentials${user.banReason ? `: ${user.banReason}` : '.'}`,
      };
    }

    const activeCat = getCredentialCategory(idType);
    const exclusivityCheck = validateExclusiveIdentitySubmission({
      selectedDocType: idType,
      ethiopianIdValue:
        exclusivityContext?.ethiopianIdValue ?? (activeCat === 'ethiopian_id' ? rawValue : ''),
      passportValue:
        exclusivityContext?.passportValue ?? (activeCat === 'passport' ? rawValue : ''),
      existingBoundType: user.identityType,
      alreadyVerified: Boolean(user.identityVerified && user.identityHash),
    });

    if (!exclusivityCheck.valid) {
      if (exclusivityCheck.bothProvided || (user.identityVerified && user.identityHash)) {
        this.recordSecurityThreat({
          userId,
          gamerTag: user.gamerTag,
          category: 'anti_smurf_id',
          severity: 'high',
          summary:
            exclusivityCheck.error ||
            'Rejected credential exclusivity violation (attempted dual Passport + Ethiopian ID submission).',
          hwidHash: user.hwidHash || securityEngine.getCachedHwid().hwidHash || 'unknown',
          endpointOrSurface: 'ExclusiveCredentialGate',
          blocked: true,
        });
      }
      return {
        success: false,
        message: exclusivityCheck.error || 'Strict credential exclusivity validation failed.',
      };
    }

    const rateCheck = securityEngine.checkRateLimit(
      { key: `id-verify:${userId}`, maxRequests: 6, windowMs: 120_000, label: 'Identity Verification' },
      { userId, gamerTag: user.gamerTag }
    );
    if (!rateCheck.allowed) {
      return { success: false, message: rateCheck.message || 'Too many verification attempts.' };
    }

    const activeIdentifier = exclusivityCheck.activeValue;
    const formatCheck = validateIdentityFormat(idType, activeIdentifier);
    if (!formatCheck.valid) {
      return { success: false, message: formatCheck.error || 'Invalid identifier format.' };
    }

    // Fuzzy-match full name on ID/Passport against registered account name
    const cleanDocName = (documentFullName || '').trim();
    if (cleanDocName.length < 2) {
      return {
        success: false,
        message: 'Enter the full legal name printed on your Passport or Ethiopian Digital ID for verification.',
      };
    }

    const accountReferenceName = (user.fullName || user.gamerTag || '').trim();
    const nameMatch = evaluateFuzzyNameMatch(accountReferenceName, cleanDocName);
    if (!nameMatch.matched && nameMatch.level === 'massive_mismatch') {
      const nextWarnings = (user.identityMismatchWarnings || 0) + 1;
      const shouldBan = nextWarnings >= 3;
      const nowEAT = `${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} EAT`;
      const autoBanReason = `Auto-suspended after ${nextWarnings} repeated ID/Passport name mismatch offenses.`;

      const flaggedUser: UserAccount = {
        ...user,
        identityMismatchWarnings: nextWarnings,
        lastIdentityMismatchAt: nowEAT,
        isFlaggedForReview: true,
        isBanned: shouldBan ? true : Boolean(user.isBanned),
        banReason: shouldBan ? autoBanReason : user.banReason,
      };
      this.updateUser(flaggedUser);

      this.recordSecurityThreat({
        userId,
        gamerTag: user.gamerTag,
        category: 'name_mismatch',
        severity: shouldBan ? 'critical' : 'high',
        summary: `Strike ${nextWarnings}/3: ID name "${cleanDocName}" massively mismatches account name "${accountReferenceName}" (${Math.round(nameMatch.score * 100)}% similarity).${shouldBan ? ' Account auto-suspended.' : ''}`,
        hwidHash: user.hwidHash || securityEngine.getCachedHwid().hwidHash || 'unknown',
        endpointOrSurface: 'FuzzyNameIdentityGate',
        blocked: true,
      });

      const warningMessage = shouldBan
        ? `Security Block: Repeated ID name mismatch offenses (${nextWarnings}/3) detected ("${cleanDocName}" vs "${accountReferenceName}"). Your account is suspended pending admin review.`
        : `Security Warning (Strike ${nextWarnings}/3): The name on your document ("${cleanDocName}") does not match your account name ("${accountReferenceName}"). Repeated mismatched submissions will flag and restrict your account.`;

      this.addNotification({
        title: shouldBan
          ? 'Account Restricted: ID Name Mismatch'
          : `Security Warning: Name Mismatch (${nextWarnings}/3)`,
        message: warningMessage,
        type: shouldBan ? 'error' : 'warning',
        targetPage: 'profile',
      });

      return {
        success: false,
        warningTriggered: true,
        mismatchWarnings: nextWarnings,
        blockedAccount: shouldBan,
        user: flaggedUser,
        message: warningMessage,
      };
    }

    const identityHash = await computeIdentityVerificationHash(idType, activeIdentifier);
    const maskedIdentifier = maskIdentityInput(idType, activeIdentifier);

    // 1. Check local identity bindings & users & registrations
    const localBindings = this.getIdentityBindings();
    const localDupBinding = localBindings.find(
      (b) => b.identityHash === identityHash && b.userId !== userId
    );
    const localDupUser = this.getUsers().find(
      (u) => u.id !== userId && u.identityHash === identityHash
    );
    const localDupReg = this.getRegistrations().find(
      (r) => r.userId !== userId && r.identityHash === identityHash
    );

    // 2. Check remote Firestore deduplication registry
    const remoteDupBinding = await lookupIdentityBindingFromFirestore(identityHash);

    if (
      localDupBinding ||
      localDupUser ||
      localDupReg ||
      (remoteDupBinding && remoteDupBinding.userId !== userId)
    ) {
      this.recordSecurityThreat({
        userId,
        gamerTag: user.gamerTag,
        category: 'anti_smurf_id',
        severity: 'critical',
        summary: `Rejected duplicate ${idType} binding attempt (${maskedIdentifier}) already linked to another account.`,
        hwidHash: user.hwidHash || securityEngine.getCachedHwid().hwidHash || 'unknown',
        endpointOrSurface: 'IdentityDeduplicationEngine',
        blocked: true,
      });
      return {
        success: false,
        message:
          'Duplicate ID Detected: This National ID / FIDO token / Passport is already bound to another GameZoneET account. Multiple accounts per identity are strictly prohibited.',
      };
    }

    const { hwidHash } = await securityEngine.ensureHwid();
    const verifiedAt = `${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} EAT`;

    const bindingRecord: IdentityBindingRecord = {
      identityHash,
      userId,
      idType,
      maskedIdentifier,
      hwidHash,
      verifiedAt,
    };

    try {
      await createIdentityBindingInFirestore(bindingRecord);
    } catch (err) {
      // Firestore rule !exists(identity_bindings/{hash}) also blocks races atomically
      if (String(err).toLowerCase().includes('permission') || String(err).toLowerCase().includes('already')) {
        return {
          success: false,
          message: 'This identity credential is already registered in the Firestore deduplication registry.',
        };
      }
    }

    const nextBindings = [
      bindingRecord,
      ...localBindings.filter((b) => b.userId !== userId && b.identityHash !== identityHash),
    ];
    this.set(STORAGE_KEYS.IDENTITY_BINDINGS, nextBindings);

    const updatedUser: UserAccount = {
      ...user,
      identityVerified: true,
      identityType: idType,
      identityMasked: maskedIdentifier,
      identityHash,
      identityVerifiedAt: verifiedAt,
      hwidHash,
      knownHwidHashes: Array.from(new Set([hwidHash, ...(user.knownHwidHashes || [])])).slice(0, 10),
    };
    this.updateUser(updatedUser);

    this.addNotification({
      title: 'Verified ID Bound',
      message: `${maskedIdentifier} (${idType === 'passport' ? 'Passport Only' : 'Ethiopian Digital ID Only'}) is bound to your profile. Tournament registration is unlocked.`,
      type: 'success',
      targetPage: 'profile',
    });

    return {
      success: true,
      message: `Identity verified and bound (${maskedIdentifier}).`,
      user: updatedUser,
    };
  }

  public async checkTournamentAntiSmurfGate(
    userId: string,
    tournamentId: string
  ): Promise<{
    allowed: boolean;
    reason?: 'banned' | 'unverified_id' | 'duplicate_identity' | 'hwid_blocked' | 'hwid_smurf' | 'weekly_limit';
    message?: string;
  }> {
    const user = this.getUserById(userId);
    if (!user) {
      return { allowed: false, reason: 'unverified_id', message: 'Please sign in first.' };
    }
    if (user.isBanned) {
      return {
        allowed: false,
        reason: 'banned',
        message: `Your account is suspended from tournament play${user.banReason ? `: ${user.banReason}` : '.'}`,
      };
    }
    if (!user.identityVerified || !user.identityHash) {
      return {
        allowed: false,
        reason: 'unverified_id',
        message: 'Complete Ethiopian National ID / FIDO / Passport verification before joining tournaments.',
      };
    }

    const weeklyStatus = this.getWeeklyTournamentLimitStatus(user, tournamentId);
    if (weeklyStatus.limited) {
      return {
        allowed: false,
        reason: 'weekly_limit',
        message: weeklyStatus.message,
      };
    }

    const regs = this.getRegistrations();
    const dupIdReg = regs.find(
      (r) =>
        r.tournamentId === tournamentId &&
        r.status !== 'cancelled' &&
        r.userId !== userId &&
        r.identityHash === user.identityHash
    );
    if (dupIdReg) {
      return {
        allowed: false,
        reason: 'duplicate_identity',
        message: 'This verified ID is already entered in this tournament bracket.',
      };
    }

    const { hwidHash } = await securityEngine.ensureHwid();
    const localHwid = this.getHwidRegistry().find((h) => h.hwidHash === hwidHash);
    const remoteHwid = await fetchHwidRecordFromFirestore(hwidHash);
    const hwidRecord = remoteHwid || localHwid;

    if (hwidRecord?.blocked) {
      return {
        allowed: false,
        reason: 'hwid_blocked',
        message: 'Your device Hardware ID (HWID) has been blocked from competitive tournaments by an administrator.',
      };
    }

    const sameHwidInTourney = regs.find(
      (r) =>
        r.tournamentId === tournamentId &&
        r.status !== 'cancelled' &&
        r.userId !== userId &&
        r.hwidHash === hwidHash
    );
    if (sameHwidInTourney) {
      this.recordSecurityThreat({
        userId,
        gamerTag: user.gamerTag,
        category: 'anti_smurf_hwid',
        severity: 'critical',
        summary: `Blocked tournament smurf entry: HWID ${hwidHash.slice(0, 10)}... already active in ${tournamentId}.`,
        hwidHash,
        endpointOrSurface: 'TournamentAntiSmurfGate',
        blocked: true,
      });
      return {
        allowed: false,
        reason: 'hwid_smurf',
        message: 'Anti-smurf HWID defense: Another account on this physical device is already registered in this tournament.',
      };
    }

    return { allowed: true };
  }

  public setUserBanStatus(userId: string, isBanned: boolean, banReason = ''): UserAccount | null {
    const target = this.getUserById(userId);
    if (!target) return null;
    const cleanReason = isBanned
      ? banReason.trim() || 'Violated GameZoneET Anti-Smurf / Fair Play policy.'
      : '';
    const updated: UserAccount = {
      ...target,
      isBanned,
      banReason: cleanReason,
      isFlaggedForReview: isBanned ? Boolean(target.isFlaggedForReview) : false,
      identityMismatchWarnings: isBanned ? target.identityMismatchWarnings || 0 : 0,
    };
    const users = this.getUsers().map((u) => (u.id === userId ? updated : u));
    this.set(STORAGE_KEYS.USERS, users);
    void updateUserBanInFirestore(userId, isBanned, cleanReason).catch((err) => {
      console.error('Firestore ban update failed:', err);
    });
    void this.logAdminAudit(
      isBanned ? 'USER_BANNED' : 'USER_UNBANNED',
      'user',
      userId,
      isBanned
        ? `Suspended ${target.gamerTag} (${cleanReason})`
        : `Lifted suspension & cleared review flags on ${target.gamerTag}`
    );
    return updated;
  }

  public revokeUserIdentity(userId: string): UserAccount | null {
    const target = this.getUserById(userId);
    if (!target) return null;
    const prevHash = target.identityHash;
    const updated: UserAccount = {
      ...target,
      identityVerified: false,
      identityType: undefined,
      identityMasked: undefined,
      identityHash: undefined,
      identityVerifiedAt: undefined,
    };
    const users = this.getUsers().map((u) => (u.id === userId ? updated : u));
    this.set(STORAGE_KEYS.USERS, users);
    if (prevHash) {
      this.set(
        STORAGE_KEYS.IDENTITY_BINDINGS,
        this.getIdentityBindings().filter((b) => b.identityHash !== prevHash)
      );
    }
    void revokeUserIdentityInFirestore(userId, prevHash).catch((err) => {
      console.error('Firestore revoke identity failed:', err);
    });
    void this.logAdminAudit(
      'IDENTITY_REVOKED',
      'user',
      userId,
      `Revoked Verified ID badge for ${target.gamerTag}`
    );
    return updated;
  }

  public setHwidBlockStatus(hwidHash: string, blocked: boolean, reason?: string): void {
    const updatedReason = blocked
      ? reason || 'Blocked by GameZoneET Security Admin for multi-account smurfing.'
      : 'Cleared by GameZoneET Security Admin.';
    const list = this.getHwidRegistry().map((r) =>
      r.hwidHash === hwidHash
        ? { ...r, blocked, flagged: blocked ? true : r.flagged, flaggedReason: updatedReason }
        : r
    );
    this.set(STORAGE_KEYS.HWID_REGISTRY, list);
    void updateHwidStatusInFirestore(hwidHash, {
      blocked,
      flagged: blocked,
      flaggedReason: updatedReason,
    }).catch((err) => {
      console.error('Firestore HWID block update failed:', err);
    });
    void this.logAdminAudit(
      blocked ? 'HWID_BLOCKED' : 'HWID_UNBLOCKED',
      'hwid',
      hwidHash,
      `${blocked ? 'Blocked' : 'Unblocked'} hardware fingerprint ${hwidHash.slice(0, 12)}...`
    );
  }

  public async logAdminAudit(
    action: string,
    targetType: string,
    targetId: string,
    summary: string
  ): Promise<AdminAuditLogEntry | null> {
    const activeEmail = auth.currentUser?.email || this.getCurrentUser()?.email || '';
    const activeUid = auth.currentUser?.uid || this.getCurrentUser()?.id || '';
    if (!activeUid || activeEmail.trim().toLowerCase() !== ADMIN_EMAIL) {
      return null;
    }

    let ipMasked = 'local-session';
    let sessionFingerprint = navigator.userAgent.slice(0, 80);
    try {
      const res = await fetch('/api/security/session-meta');
      if (res.ok) {
        const meta = await res.json();
        ipMasked = String(meta.ipMasked || ipMasked);
        sessionFingerprint = String(meta.uaHash || sessionFingerprint);
      }
    } catch {
      // Keep client fallback
    }

    const currentLogs = this.getAuditLogs();
    const prevHash = currentLogs[0]?.entryHash || 'GENESIS_GAMEZONE_ET_2026';
    const nowMs = Date.now();
    const id = `aud-${nowMs}-${Math.floor(Math.random() * 900 + 100)}`;
    const timestamp = `${new Date(nowMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${new Date(nowMs).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} EAT`;

    const entryHash = await sha256Hex(
      `${prevHash}|${id}|${activeUid}|${activeEmail}|${action}|${targetType}|${targetId}|${summary}|${nowMs}`
    );

    const entry: AdminAuditLogEntry = {
      id,
      adminUid: activeUid,
      adminEmail: activeEmail,
      action,
      targetType,
      targetId,
      summary: summary.slice(0, 400),
      ipMasked,
      sessionFingerprint,
      prevHash,
      entryHash,
      timestamp,
      timestampMs: nowMs,
    };

    const nextLogs = [entry, ...this.getAuditLogs()].slice(0, 250);
    this.set(STORAGE_KEYS.AUDIT_LOGS, nextLogs);
    void saveAuditLogToFirestore(entry).catch((err) => {
      console.warn('Firestore audit log append skipped:', err);
    });
    return entry;
  }

  public logSecurityPostureChange(nextPosture: SecurityPosture): void {
    void this.logAdminAudit(
      'SECURITY_POSTURE_CHANGED',
      'system',
      'ddos_shield',
      `Admin switched DDoS & Rate-Limit Shield posture to ${nextPosture.toUpperCase()}`
    );
  }
}

export const db = new GameZoneDatabase();

/**
 * GameZoneET Competitive Esports Ranking System
 * Realistic Free Fire / PUBG inspired tier ranking with Ranked Points (RP)
 */

export type RankTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Heroic' | 'Grandmaster';

export interface RankInfo {
  tier: RankTier;
  division: string; // e.g. "III", "II", "I" or "Elite"
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
  minRP: number;
  maxRP: number;
  icon: string;
  title: string;
}

export const RANK_TIERS: RankInfo[] = [
  {
    tier: 'Bronze',
    division: 'I',
    badgeColor: 'text-amber-700',
    badgeBg: 'bg-amber-900/20',
    badgeBorder: 'border-amber-700/40',
    minRP: 0,
    maxRP: 999,
    icon: 'Shield',
    title: 'Bronze Operator',
  },
  {
    tier: 'Silver',
    division: 'I',
    badgeColor: 'text-slate-300',
    badgeBg: 'bg-slate-700/20',
    badgeBorder: 'border-slate-500/40',
    minRP: 1000,
    maxRP: 2499,
    icon: 'ShieldAlert',
    title: 'Silver Marksman',
  },
  {
    tier: 'Gold',
    division: 'I',
    badgeColor: 'text-amber-400',
    badgeBg: 'bg-amber-500/20',
    badgeBorder: 'border-amber-400/50',
    minRP: 2500,
    maxRP: 4999,
    icon: 'Award',
    title: 'Gold Combatant',
  },
  {
    tier: 'Platinum',
    division: 'I',
    badgeColor: 'text-cyan-300',
    badgeBg: 'bg-cyan-500/20',
    badgeBorder: 'border-cyan-400/50',
    minRP: 5000,
    maxRP: 8499,
    icon: 'Zap',
    title: 'Platinum Predator',
  },
  {
    tier: 'Diamond',
    division: 'I',
    badgeColor: 'text-primary-300',
    badgeBg: 'bg-primary-500/20',
    badgeBorder: 'border-primary-400/60',
    minRP: 8500,
    maxRP: 13999,
    icon: 'Sparkles',
    title: 'Diamond Elite',
  },
  {
    tier: 'Heroic',
    division: 'Elite',
    badgeColor: 'text-rose-400',
    badgeBg: 'bg-rose-500/20',
    badgeBorder: 'border-rose-400/60',
    minRP: 14000,
    maxRP: 21999,
    icon: 'Flame',
    title: 'Heroic Master',
  },
  {
    tier: 'Grandmaster',
    division: 'Top 100',
    badgeColor: 'text-amber-300',
    badgeBg: 'bg-gradient-to-r from-amber-500/30 via-rose-500/30 to-purple-500/30',
    badgeBorder: 'border-amber-300 shadow-glow-gold',
    minRP: 22000,
    maxRP: 999999,
    icon: 'Trophy',
    title: 'Ethiopian Grandmaster',
  },
];

export function getRankFromPoints(points: number): {
  currentTier: RankInfo;
  nextTier: RankInfo | null;
  progressPercent: number;
  rpToNext: number;
} {
  const currentTier =
    RANK_TIERS.slice().reverse().find((t) => points >= t.minRP) || RANK_TIERS[0];
  const currentIndex = RANK_TIERS.findIndex((t) => t.tier === currentTier.tier);
  const nextTier = currentIndex < RANK_TIERS.length - 1 ? RANK_TIERS[currentIndex + 1] : null;

  let progressPercent = 100;
  let rpToNext = 0;

  if (nextTier) {
    const range = nextTier.minRP - currentTier.minRP;
    const currentProgress = points - currentTier.minRP;
    progressPercent = Math.min(100, Math.max(0, Math.round((currentProgress / range) * 100)));
    rpToNext = Math.max(0, nextTier.minRP - points);
  }

  return {
    currentTier,
    nextTier,
    progressPercent,
    rpToNext,
  };
}

export function calculateMatchRankedPoints(
  score: number,
  options: {
    won?: boolean;
    kills?: number;
    distance?: number;
    goals?: number;
  } = {}
): {
  earnedRP: number;
  grade: 'S+' | 'S' | 'A' | 'B' | 'C';
  breakdown: { label: string; points: number }[];
} {
  const breakdown: { label: string; points: number }[] = [];

  // Base score conversion
  const baseRP = Math.max(15, Math.floor(score / 45));
  breakdown.push({ label: 'Combat & Skill Score', points: baseRP });

  let bonusRP = 0;

  if (options.won) {
    const winBonus = 75;
    bonusRP += winBonus;
    breakdown.push({ label: 'Match Victory / BOOYAH!', points: winBonus });
  }

  if (options.kills && options.kills > 0) {
    const killBonus = options.kills * 12;
    bonusRP += killBonus;
    breakdown.push({ label: `${options.kills} Squad Eliminations`, points: killBonus });
  }

  if (options.distance && options.distance > 500) {
    const distBonus = Math.floor(options.distance / 100) * 5;
    bonusRP += distBonus;
    breakdown.push({ label: `Distance Milestone (${options.distance}m)`, points: distBonus });
  }

  if (options.goals && options.goals >= 3) {
    const goalBonus = options.goals * 20;
    bonusRP += goalBonus;
    breakdown.push({ label: `${options.goals} Stadium Goals`, points: goalBonus });
  }

  const totalRP = baseRP + bonusRP;

  let grade: 'S+' | 'S' | 'A' | 'B' | 'C' = 'B';
  if (totalRP >= 150) grade = 'S+';
  else if (totalRP >= 100) grade = 'S';
  else if (totalRP >= 60) grade = 'A';
  else if (totalRP >= 35) grade = 'B';
  else grade = 'C';

  return {
    earnedRP: totalRP,
    grade,
    breakdown,
  };
}

import { useState, useMemo } from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus, Crown, Medal, Search, Gamepad2, Flame, Car, Swords, Sparkles, ArrowRight, ShieldCheck, User } from 'lucide-react';
import Reveal from '@/components/Reveal';
import { useReveal } from '@/hooks/useMotion';
import type { GamerProfile } from '@/components/AuthModal';
import type { PageId } from '@/hooks/useRouter';
import { getRankFromPoints, RANK_TIERS } from '@/services/ranking';
import UserAvatar from '@/components/UserAvatar';
import { formatEthiopianCity } from '@/utils/location';

interface GamingLeaderboardEntry {
  rank: number;
  player: string;
  avatar: string;
  city: string;
  gamesPlayed: number; // Primary ranking metric!
  totalScore: number;
  rp: number; // Ranked Points
  favoriteGame: string;
  category: 'fire' | 'racing' | 'action' | 'sports' | 'retro' | 'all';
  trend: 'up' | 'down' | 'same';
  hoursStreamed: number;
  winRate: string;
}

const GAMING_LEADERBOARD: GamingLeaderboardEntry[] = [
  {
    rank: 1,
    player: 'AbyssiniaKing',
    avatar: '👑',
    city: 'Addis Ababa (Bole)',
    gamesPlayed: 642,
    totalScore: 198450,
    rp: 24850,
    favoriteGame: 'Free Fire: Combat Arena 3D',
    category: 'fire',
    trend: 'up',
    hoursStreamed: 148,
    winRate: '68%',
  },
  {
    rank: 2,
    player: 'DriftQueen_ET',
    avatar: '🏎️',
    city: 'Hawassa',
    gamesPlayed: 589,
    totalScore: 174200,
    rp: 19400,
    favoriteGame: 'Speed Drift: Addis Night Highway',
    category: 'racing',
    trend: 'up',
    hoursStreamed: 132,
    winRate: '62%',
  },
  {
    rank: 3,
    player: 'BlueNileSniper',
    avatar: '🎯',
    city: 'Bahir Dar',
    gamesPlayed: 524,
    totalScore: 161800,
    rp: 15200,
    favoriteGame: 'Free Fire: Combat Arena 3D',
    category: 'fire',
    trend: 'same',
    hoursStreamed: 119,
    winRate: '59%',
  },
  {
    rank: 4,
    player: 'KrunkerKid_Addis',
    avatar: '⚡',
    city: 'Addis Ababa (Kazanchis)',
    gamesPlayed: 498,
    totalScore: 148900,
    rp: 12600,
    favoriteGame: 'Krunker Arena: Tactical FPS',
    category: 'action',
    trend: 'up',
    hoursStreamed: 104,
    winRate: '57%',
  },
  {
    rank: 5,
    player: 'RedSeaRacer',
    avatar: '🔥',
    city: 'Dire Dawa',
    gamesPlayed: 462,
    totalScore: 139400,
    rp: 9800,
    favoriteGame: 'Speed Drift: Addis Night Highway',
    category: 'racing',
    trend: 'down',
    hoursStreamed: 96,
    winRate: '54%',
  },
  {
    rank: 6,
    player: 'LalibelaLegend',
    avatar: '⚽',
    city: 'Gondar',
    gamesPlayed: 435,
    totalScore: 128500,
    rp: 7900,
    favoriteGame: 'Bole Shootout: Penalty Arena',
    category: 'sports',
    trend: 'same',
    hoursStreamed: 91,
    winRate: '58%',
  },
  {
    rank: 7,
    player: 'WelloWarden',
    avatar: '🐺',
    city: 'Dessie',
    gamesPlayed: 398,
    totalScore: 118400,
    rp: 6100,
    favoriteGame: 'Slope 3D: Hyper Velocity',
    category: 'action',
    trend: 'up',
    hoursStreamed: 84,
    winRate: '51%',
  },
  {
    rank: 8,
    player: 'Alok_Vibes',
    avatar: '🎧',
    city: 'Addis Ababa (Piassa)',
    gamesPlayed: 374,
    totalScore: 109200,
    rp: 4850,
    favoriteGame: 'Free Fire: Combat Arena 3D',
    category: 'fire',
    trend: 'down',
    hoursStreamed: 76,
    winRate: '49%',
  },
  {
    rank: 9,
    player: 'SidamaStorm',
    avatar: '⚡',
    city: 'Hawassa',
    gamesPlayed: 341,
    totalScore: 99400,
    rp: 3750,
    favoriteGame: 'Speed Drift: Addis Night Highway',
    category: 'racing',
    trend: 'up',
    hoursStreamed: 70,
    winRate: '48%',
  },
  {
    rank: 10,
    player: 'TekkenMaster_ET',
    avatar: '🥋',
    city: 'Adama (Nazret)',
    gamesPlayed: 318,
    totalScore: 92800,
    rp: 2900,
    favoriteGame: 'Tekken 3: King of Iron Fist',
    category: 'retro',
    trend: 'same',
    hoursStreamed: 64,
    winRate: '52%',
  },
];

interface LeaderboardPageProps {
  currentUser?: GamerProfile | null;
  onNavigate?: (page: PageId) => void;
  onOpenAuth?: () => void;
}

export default function LeaderboardPage({ currentUser, onNavigate, onOpenAuth }: LeaderboardPageProps) {
  const { ref, inView } = useReveal<HTMLDivElement>();
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Calculate current user's RP dynamically
  const userRP = useMemo(() => {
    if (!currentUser) return 0;
    const fromGames = (currentUser.gamesPlayed || 0) * 35;
    const fromScore = Math.floor((currentUser.highScore || 0) / 20);
    return fromGames + fromScore;
  }, [currentUser]);

  const userRankData = useMemo(() => getRankFromPoints(userRP), [userRP]);

  // Merge current user if signed in
  const fullLeaderboard = useMemo(() => {
    const list = [...GAMING_LEADERBOARD];
    if (currentUser) {
      const exists = list.find((p) => p.player.toLowerCase() === currentUser.gamerTag.toLowerCase());
      if (exists) {
        exists.gamesPlayed = Math.max(exists.gamesPlayed, currentUser.gamesPlayed || 0);
        exists.totalScore = Math.max(exists.totalScore, currentUser.highScore || 0);
        exists.rp = Math.max(exists.rp, userRP);
      } else {
        list.push({
          rank: currentUser.rank || 12,
          player: currentUser.gamerTag,
          avatar: currentUser.avatar || '',
          city: formatEthiopianCity(currentUser.city),
          gamesPlayed: currentUser.gamesPlayed || 0,
          totalScore: currentUser.highScore || 0,
          rp: userRP,
          favoriteGame: currentUser.favoriteGame || 'Free Fire & Battle Royale',
          category: 'fire',
          trend: 'up',
          hoursStreamed: Math.round((currentUser.gamesPlayed || 0) * 0.4),
          winRate: (currentUser.gamesPlayed || 0) > 0 ? '55%' : '0%',
        });
      }
    }
    // Sort strictly by games played (most active gamers on top!)
    list.sort((a, b) => b.gamesPlayed - a.gamesPlayed);
    return list.map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [currentUser, userRP]);

  const filtered = useMemo(() => {
    return fullLeaderboard.filter((p) => {
      const matchCategory = filter === 'all' || p.category === filter;
      const matchSearch =
        search.trim() === '' ||
        p.player.toLowerCase().includes(search.toLowerCase()) ||
        p.city.toLowerCase().includes(search.toLowerCase()) ||
        p.favoriteGame.toLowerCase().includes(search.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [fullLeaderboard, filter, search]);

  const podium = filtered.slice(0, 3);

  return (
    <div className="relative min-h-screen pt-20 pb-24">
      {/* Background radial fade */}
      <div className="absolute inset-0 -z-10 bg-radial-fade opacity-60 pointer-events-none" />

      {/* --- HERO SECTION --- */}
      <section className="relative overflow-hidden py-10 lg:py-14 border-b border-white/10">
        <div className="container-x">
          <Reveal className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-400/10 px-4 py-1.5 text-sm font-semibold text-gold-300">
              <Crown className="h-4 w-4 text-gold-400" />
              <span>Gamer Activity & Ranked Ladder</span>
            </span>

            <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white">
              Ethiopian <span className="text-gradient-gold">Ranked Ladder</span>
            </h1>

            <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
              Climb through <strong className="text-gold-300 font-bold">Bronze to Grandmaster</strong> tiers by playing 3D battles, racing, and sports on low-latency Ethiopian servers. Every match earns Ranked Points (RP) based on genuine skill!
            </p>

            <div className="mt-8 rounded-2xl border border-primary-400/30 bg-ink-900/90 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 text-left shadow-card">
              <div className="flex items-center gap-3.5">
                <UserAvatar
                  src={currentUser?.avatar}
                  name={currentUser?.gamerTag || 'Guest Player'}
                  size="lg"
                  className="rounded-2xl border border-primary-400/30 bg-primary-400/20"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-base font-bold text-white">
                      {currentUser ? currentUser.gamerTag : 'Guest Player'}
                    </p>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black border ${userRankData.currentTier.badgeBg} ${userRankData.currentTier.badgeColor} ${userRankData.currentTier.badgeBorder}`}>
                      {userRankData.currentTier.tier} {userRankData.currentTier.division}
                    </span>
                    <span className="rounded-full bg-gold-400/20 border border-gold-400/40 px-2 py-0.5 text-[10px] font-bold text-gold-300 font-mono">
                      {userRP.toLocaleString()} RP
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="w-36 sm:w-48 bg-white/10 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-primary-400 to-gold-400 h-full rounded-full transition-all"
                        style={{ width: `${userRankData.progressPercent}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {userRankData.nextTier ? `${userRankData.rpToNext} RP to ${userRankData.nextTier.tier}` : 'Max Tier Reached!'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('games')}
                    className="btn-primary py-2.5 px-5 text-sm font-bold shadow-glow flex items-center gap-2 cursor-pointer"
                  >
                    <Gamepad2 className="h-4 w-4" aria-hidden="true" />
                    Play 3D Games
                  </button>
                )}
                {!currentUser && onOpenAuth && (
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="btn-ghost py-2.5 px-4 text-sm font-semibold cursor-pointer"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
          </Reveal>

          {/* Tier Hierarchy Strip */}
          <div className="mt-10 overflow-x-auto pb-2 scrollbar-thin">
            <div className="min-w-[650px] flex items-center justify-between gap-2 bg-ink-950/80 p-3 rounded-2xl border border-white/10">
              {RANK_TIERS.map((tier) => (
                <div
                  key={tier.tier}
                  className={`flex-1 flex flex-col items-center p-2 rounded-xl border text-center transition-all ${
                    userRankData.currentTier.tier === tier.tier
                      ? 'border-gold-400 bg-gold-500/10 shadow-glow-gold'
                      : 'border-white/5 bg-white/[0.02]'
                  }`}
                >
                  <span className={`text-xs font-black uppercase tracking-wider ${tier.badgeColor}`}>
                    {tier.tier}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                    {tier.minRP >= 1000 ? `${(tier.minRP / 1000).toFixed(tier.minRP % 1000 === 0 ? 0 : 1)}k+ RP` : '0+ RP'}
                  </span>
                  {userRankData.currentTier.tier === tier.tier && (
                    <span className="mt-1 px-1.5 py-0.2 rounded bg-gold-400 text-ink-950 text-[9px] font-black uppercase">
                      Current
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --- PODIUM & LEADERBOARD TABLE --- */}
      <section className="py-8">
        <div className="container-x">
          <Reveal>
            {/* Filter Tabs */}
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <div role="group" aria-label="Filter leaderboard by game category" className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  aria-pressed={filter === 'all'}
                  onClick={() => setFilter('all')}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                    filter === 'all'
                      ? 'border-gold-400 bg-gold-400/20 text-gold-300 shadow-glow-gold'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:text-white'
                  }`}
                >
                  <Trophy className="h-4 w-4" aria-hidden="true" /> All Gaming Categories
                </button>
                <button
                  type="button"
                  aria-pressed={filter === 'fire'}
                  onClick={() => setFilter('fire')}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                    filter === 'fire'
                      ? 'border-accent-400 bg-accent-400/20 text-accent-300 shadow-glow-accent'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:text-white'
                  }`}
                >
                  <Flame className="h-4 w-4 text-accent-400" aria-hidden="true" /> Fire &amp; Battle Royale
                </button>
                <button
                  type="button"
                  aria-pressed={filter === 'racing'}
                  onClick={() => setFilter('racing')}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                    filter === 'racing'
                      ? 'border-primary-400 bg-primary-400/20 text-primary-300 shadow-glow'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:text-white'
                  }`}
                >
                  <Car className="h-4 w-4 text-primary-400" aria-hidden="true" /> Car Racing
                </button>
                <button
                  type="button"
                  aria-pressed={filter === 'action'}
                  onClick={() => setFilter('action')}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                    filter === 'action'
                      ? 'border-emerald-400 bg-emerald-400/20 text-emerald-300'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:text-white'
                  }`}
                >
                  <Swords className="h-4 w-4 text-emerald-400" aria-hidden="true" /> Shooting &amp; Combat
                </button>
              </div>

              <div className="relative ml-auto w-full sm:w-auto mt-2 sm:mt-0">
                <label htmlFor="leaderboard-search" className="sr-only">
                  Search gamer, city, or game
                </label>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" aria-hidden="true" />
                <input
                  id="leaderboard-search"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search gamer, city or game..."
                  className="w-full sm:w-64 rounded-xl border border-white/15 bg-ink-900/80 py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-gold-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Top 3 Podium (Ranked by Games Played & RP) */}
            {podium.length >= 3 && (
              <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
                {/* 2nd Place */}
                {(() => {
                  const pRank = getRankFromPoints(podium[1].rp);
                  return (
                    <div className="card order-2 sm:order-1 p-5 border border-slate-400/30 bg-ink-900/80 text-center flex flex-col items-center justify-between">
                      <div>
                        <div className="flex items-center justify-center gap-2">
                          <span className="inline-flex rounded-full bg-slate-400/20 px-3 py-1 text-xs font-bold text-slate-300 border border-slate-400/30">
                            🥈 Rank #2
                          </span>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black border ${pRank.currentTier.badgeBg} ${pRank.currentTier.badgeColor} ${pRank.currentTier.badgeBorder}`}>
                            {pRank.currentTier.tier}
                          </span>
                        </div>
                        <div className="mt-3 flex justify-center">
                          <UserAvatar src={podium[1].avatar} name={podium[1].player} size="lg" className="rounded-2xl" />
                        </div>
                        <h3 className="mt-2 text-lg font-bold text-white font-display">{podium[1].player}</h3>
                        <p className="text-xs text-slate-400">{podium[1].city}</p>
                      </div>
                      <div className="mt-4 w-full pt-3 border-t border-white/10">
                        <div className="flex justify-between items-center text-xs text-slate-400 px-2">
                          <span>Plays: <strong className="text-white">{podium[1].gamesPlayed}</strong></span>
                          <span>RP: <strong className="text-gold-300 font-mono">{podium[1].rp.toLocaleString()}</strong></span>
                        </div>
                        <p className="text-[11px] text-primary-400 mt-1 truncate">{podium[1].favoriteGame}</p>
                      </div>
                    </div>
                  );
                })()}

                {/* 1st Place Champion */}
                {(() => {
                  const pRank = getRankFromPoints(podium[0].rp);
                  return (
                    <div className="card order-1 sm:order-2 p-6 border-2 border-gold-400/60 bg-gradient-to-b from-gold-500/15 via-ink-900/90 to-ink-900 text-center flex flex-col items-center justify-between shadow-glow-gold relative -mt-3">
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-400 px-4 py-1 text-xs font-black text-ink-950 shadow-glow-gold uppercase tracking-wider">
                          <Crown className="h-3.5 w-3.5 fill-ink-950" /> #1 Champion
                        </span>
                      </div>
                      <div className="mt-2">
                        <div className="flex justify-center">
                          <UserAvatar src={podium[0].avatar} name={podium[0].player} size="xl" className="rounded-2xl border-2 border-gold-400/50" />
                        </div>
                        <h3 className="mt-2 text-xl font-extrabold text-white font-display">{podium[0].player}</h3>
                        <div className="mt-1 flex items-center justify-center gap-2">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black border ${pRank.currentTier.badgeBg} ${pRank.currentTier.badgeColor} ${pRank.currentTier.badgeBorder}`}>
                            {pRank.currentTier.tier} {pRank.currentTier.division}
                          </span>
                          <span className="text-xs text-gold-300 font-mono font-bold">
                            {podium[0].rp.toLocaleString()} RP
                          </span>
                        </div>
                        <p className="text-xs text-gold-300/80 mt-1">{podium[0].city} • Ethiopia</p>
                      </div>
                      <div className="mt-4 w-full pt-3 border-t border-gold-400/20">
                        <p className="text-xs text-gold-300/80 uppercase font-semibold">Most Games Played</p>
                        <p className="font-display text-3xl font-black text-gold-400 mt-0.5">
                          {podium[0].gamesPlayed} <span className="text-xs font-normal text-slate-300">plays</span>
                        </p>
                        <p className="text-xs text-primary-300 mt-1 truncate">{podium[0].favoriteGame}</p>
                      </div>
                    </div>
                  );
                })()}

                {/* 3rd Place */}
                {(() => {
                  const pRank = getRankFromPoints(podium[2].rp);
                  return (
                    <div className="card order-3 p-5 border border-accent-400/30 bg-ink-900/80 text-center flex flex-col items-center justify-between">
                      <div>
                        <div className="flex items-center justify-center gap-2">
                          <span className="inline-flex rounded-full bg-accent-400/20 px-3 py-1 text-xs font-bold text-accent-300 border border-accent-400/30">
                            🥉 Rank #3
                          </span>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black border ${pRank.currentTier.badgeBg} ${pRank.currentTier.badgeColor} ${pRank.currentTier.badgeBorder}`}>
                            {pRank.currentTier.tier}
                          </span>
                        </div>
                        <div className="mt-3 flex justify-center">
                          <UserAvatar src={podium[2].avatar} name={podium[2].player} size="lg" className="rounded-2xl" />
                        </div>
                        <h3 className="mt-2 text-lg font-bold text-white font-display">{podium[2].player}</h3>
                        <p className="text-xs text-slate-400">{podium[2].city}</p>
                      </div>
                      <div className="mt-4 w-full pt-3 border-t border-white/10">
                        <div className="flex justify-between items-center text-xs text-slate-400 px-2">
                          <span>Plays: <strong className="text-white">{podium[2].gamesPlayed}</strong></span>
                          <span>RP: <strong className="text-gold-300 font-mono">{podium[2].rp.toLocaleString()}</strong></span>
                        </div>
                        <p className="text-[11px] text-primary-400 mt-1 truncate">{podium[2].favoriteGame}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Full Table */}
            <div ref={ref} className="glass-strong overflow-hidden rounded-2xl border border-white/10 shadow-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <caption className="sr-only">Ethiopian Gaming Hall of Fame Leaderboard</caption>
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                      <th scope="col" className="py-4 px-4 sm:px-6">Rank &amp; Gamer</th>
                      <th scope="col" className="py-4 px-4 text-left">Tier &amp; Ranked Points</th>
                      <th scope="col" className="py-4 px-4 text-right sm:text-center text-gold-400">Games Played</th>
                      <th scope="col" className="py-4 px-4 hidden md:table-cell">Top Game</th>
                      <th scope="col" className="py-4 px-4 hidden sm:table-cell">Region / City</th>
                      <th scope="col" className="py-4 px-4 text-right">Score</th>
                      <th scope="col" className="py-4 px-4 hidden lg:table-cell text-center">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {filtered.map((entry) => {
                      const isCurrentUser = currentUser && entry.player.toLowerCase() === currentUser.gamerTag.toLowerCase();
                      const tierData = getRankFromPoints(entry.rp);
                      return (
                        <tr
                          key={entry.player}
                          className={`transition-colors ${
                            isCurrentUser
                              ? 'bg-primary-400/15 border-l-4 border-primary-400'
                              : 'hover:bg-white/5'
                          }`}
                        >
                          {/* Rank & Gamer */}
                          <td className="py-4 px-4 sm:px-6">
                            <div className="flex items-center gap-3">
                              <span
                                className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg font-mono text-xs font-bold ${
                                  entry.rank === 1
                                    ? 'bg-gold-400 text-ink-950 font-black'
                                    : entry.rank === 2
                                    ? 'bg-slate-300 text-ink-950 font-bold'
                                    : entry.rank === 3
                                    ? 'bg-amber-600 text-white font-bold'
                                    : 'bg-white/10 text-slate-300'
                                }`}
                              >
                                {entry.rank}
                              </span>
                              <UserAvatar
                                src={entry.avatar}
                                name={entry.player}
                                size="sm"
                                className="shrink-0 rounded-lg"
                              />
                              <div>
                                <p className="font-bold text-white flex items-center gap-2">
                                  <span>{entry.player}</span>
                                  {isCurrentUser && (
                                    <span className="rounded-full bg-primary-400 px-2 py-0.2 text-[10px] text-ink-950 font-bold">
                                      YOU
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-slate-400 sm:hidden">{entry.city}</p>
                              </div>
                            </div>
                          </td>

                          {/* Tier & RP */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-black border ${tierData.currentTier.badgeBg} ${tierData.currentTier.badgeColor} ${tierData.currentTier.badgeBorder}`}>
                                {tierData.currentTier.tier}
                              </span>
                              <span className="font-mono text-xs font-bold text-gold-300">
                                {entry.rp.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">RP</span>
                              </span>
                            </div>
                          </td>

                          {/* Games Played (Main Metric) */}
                          <td className="py-4 px-4 text-right sm:text-center">
                            <span className="font-display text-lg font-black text-gold-400">
                              {entry.gamesPlayed}
                            </span>
                            <span className="block text-[10px] text-slate-400 sm:inline sm:ml-1">
                              plays
                            </span>
                          </td>

                          {/* Top Game */}
                          <td className="py-4 px-4 hidden md:table-cell">
                            <span className="rounded-lg bg-white/5 px-2.5 py-1 text-xs text-slate-200 border border-white/5 truncate max-w-[200px] inline-block">
                              {entry.favoriteGame}
                            </span>
                          </td>

                          {/* Region */}
                          <td className="py-4 px-4 hidden sm:table-cell text-xs text-slate-300">
                            {entry.city}
                          </td>

                          {/* Score */}
                          <td className="py-4 px-4 text-right font-mono text-sm font-semibold text-slate-200">
                            {entry.totalScore.toLocaleString()}
                          </td>

                          {/* Trend */}
                          <td className="py-4 px-4 hidden lg:table-cell text-center">
                            <div className="flex items-center justify-center gap-1 text-[11px]">
                              {entry.trend === 'up' && (
                                <>
                                  <TrendingUp className="h-4 w-4 text-success-400" aria-hidden="true" />
                                  <span className="text-success-400 font-semibold">Up</span>
                                </>
                              )}
                              {entry.trend === 'down' && (
                                <>
                                  <TrendingDown className="h-4 w-4 text-error-400" aria-hidden="true" />
                                  <span className="text-error-400 font-semibold">Down</span>
                                </>
                              )}
                              {entry.trend === 'same' && (
                                <>
                                  <Minus className="h-4 w-4 text-slate-400" aria-hidden="true" />
                                  <span className="text-slate-400">Even</span>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

import { useState, useMemo, useEffect, type ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  Flame,
  Car,
  Crosshair,
  Trophy,
  Sparkles,
  Gamepad2,
  Search,
  Play,
  Star,
  ShieldCheck,
  ArrowRight,
  Cpu,
  HeartPulse,
  Keyboard,
} from 'lucide-react';
import Reveal, { StaggerGrid, StaggerItem } from '@/components/Reveal';
import ResilientImage from '@/components/ResilientImage';
import { useTilt } from '@/hooks/useMotion';
import { ONLINE_GAMES, GAME_CATEGORIES, type OnlineGame } from '@/data/gamesCatalog';
import type { PageId } from '@/hooks/useRouter';
import type { GamerProfile } from '@/components/AuthModal';
import { DAILY_PLAYTIME_LIMIT_SECONDS, formatDurationShort, wellnessEngine } from '@/services/wellnessEngine';

function TiltCard({
  children,
  className = '',
  maxTilt = 6,
}: {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
}) {
  const { ref, onMove, onLeave } = useTilt<HTMLDivElement>(maxTilt);
  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`card-spotlight game-card-luminous ${className}`}
    >
      {children}
    </div>
  );
}

interface GamesPageProps {
  onPlayGame: (game: OnlineGame) => void;
  onNavigate: (page: PageId) => void;
  currentUser: GamerProfile | null;
}

export default function GamesPage({ onPlayGame, onNavigate }: GamesPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'latency'>('popular');
  const [dailyRemaining, setDailyRemaining] = useState<number>(() => wellnessEngine.getRemainingSeconds());

  useEffect(() => {
    setDailyRemaining(wellnessEngine.getRemainingSeconds());
    return wellnessEngine.subscribe(() => {
      setDailyRemaining(wellnessEngine.getRemainingSeconds());
    });
  }, []);

  const filteredGames = useMemo(() => {
    return ONLINE_GAMES.filter((game) => {
      const matchesCat = selectedCategory === 'all' || game.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        game.title.toLowerCase().includes(q) ||
        game.genre.toLowerCase().includes(q) ||
        game.tagline.toLowerCase().includes(q) ||
        game.categoryLabel.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    }).sort((a, b) => {
      if (sortBy === 'popular') return b.playsCount - a.playsCount;
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'latency') return a.latencyMs - b.latencyMs;
      return 0;
    });
  }, [selectedCategory, searchQuery, sortBy]);

  const featuredGames = useMemo(() => ONLINE_GAMES.filter((g) => g.featured), []);

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame':
        return <Flame className="h-4 w-4 text-accent-400" aria-hidden="true" />;
      case 'Car':
        return <Car className="h-4 w-4 text-sky-400" aria-hidden="true" />;
      case 'Crosshair':
        return <Crosshair className="h-4 w-4 text-emerald-400" aria-hidden="true" />;
      case 'Trophy':
        return <Trophy className="h-4 w-4 text-gold-400" aria-hidden="true" />;
      case 'Sparkles':
        return <Sparkles className="h-4 w-4 text-violet-400" aria-hidden="true" />;
      default:
        return <Gamepad2 className="h-4 w-4 text-sky-300" aria-hidden="true" />;
    }
  };

  return (
    <div className="relative min-h-screen pt-20 pb-24">
      {/* === HERO SECTION === */}
      <section className="relative overflow-hidden py-10 lg:py-14 border-b border-white/10">
        <div className="container-x">
          <Reveal className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/35 bg-sky-400/10 backdrop-blur-md px-4 py-1.5 text-sm font-semibold text-sky-200 mb-4">
              <Cpu className="h-4 w-4 text-sky-400" aria-hidden="true" />
              <span>Verified HTML5 &amp; 3D WebGL Arcade &bull; Zero External Redirects</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight text-shadow-glow">
              Play <span className="text-gradient">Verified Browser Games</span>
              <br />
              <span className="text-white">Right Inside GameZone ET</span>
            </h1>

            <p className="mt-5 text-base sm:text-xl text-slate-300 leading-relaxed max-w-3xl mx-auto font-normal">
              No downloads, no sign-in required, and no sketchy redirects. Launch curated <span className="text-sky-300 font-semibold">3D WebGL</span> and <span className="text-violet-300 font-semibold">HTML5 Canvas</span> titles directly inside our sandboxed In-App Arcade Player with instant Canvas fallbacks.
            </p>

            {/* Quick Stats */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left tabular-nums">
              <TiltCard className="glass rounded-2xl p-4">
                <p className="text-xs text-slate-400">Curated Arcade</p>
                <p className="font-display text-2xl font-bold text-white mt-0.5">{ONLINE_GAMES.length} Titles</p>
                <p className="text-[11px] text-emerald-400 mt-1">100% Verified Playable</p>
              </TiltCard>
              <TiltCard className="glass rounded-2xl p-4">
                <p className="text-xs text-slate-400">Instant Backup</p>
                <p className="font-display text-2xl font-bold text-emerald-400 mt-0.5">0 ms Canvas</p>
                <p className="text-[11px] text-slate-400 mt-1">Auto fallback built in</p>
              </TiltCard>
              <TiltCard className="glass rounded-2xl p-4">
                <p className="text-xs text-slate-400">Play Anytime</p>
                <p className="font-display text-2xl font-bold text-sky-300 mt-0.5">No Login Needed</p>
                <p className="text-[11px] text-slate-400 mt-1">Guest &amp; ranked support</p>
              </TiltCard>
              <TiltCard className="glass rounded-2xl p-4">
                <p className="text-xs text-slate-400">Daily Cap Left</p>
                <p className="font-display text-2xl font-bold text-gold-400 mt-0.5">{formatDurationShort(dailyRemaining)}</p>
                <p className="text-[11px] text-gold-300/80 mt-1">2h healthy limit</p>
              </TiltCard>
            </div>

            {/* Leaderboard & Wellness Strip */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl glass-strong border border-gold-400/30 p-4 sm:p-5 text-left">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold-400/20 text-gold-300 border border-gold-400/40">
                  <Trophy className="h-6 w-6 text-gold-400" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white font-display">
                    Most Active Gamer Leaderboard
                  </h2>
                  <p className="text-xs text-slate-300">
                    Record your in-browser scores to climb the Ethiopian Hall of Fame and earn Loyalty XP.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('leaderboard')}
                className="btn-ghost py-2.5 px-4 text-sm font-semibold border-gold-400/40 text-gold-300 flex items-center gap-2 cursor-pointer"
              >
                <span>View Games Leaderboard</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl glass border border-emerald-400/25 px-4 py-3 text-left text-xs tabular-nums">
              <div className="flex items-center gap-2.5 text-slate-200">
                <HeartPulse className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
                <span>
                  <strong className="text-white">Daily 2-Hour Healthy Play Cap:</strong>{' '}
                  <span className="font-mono text-emerald-300 font-bold">
                    {formatDurationShort(dailyRemaining)}
                  </span>{' '}
                  remaining of {formatDurationShort(DAILY_PLAYTIME_LIMIT_SECONDS)} today.
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('wellness')}
                className="inline-flex items-center gap-1.5 font-semibold text-emerald-300 hover:text-emerald-200 cursor-pointer"
              >
                <span>Open Health &amp; Wellness</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* === TOP WORLD-PUBLISHED & PLAY IN-BROWSER SHOWCASE === */}
      <section className="py-12 border-b border-white/10">
        <div className="container-x">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-400/35 mb-2">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> IN-APP SANDBOXED WEBGL &amp; HTML5
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display flex items-center gap-2.5">
                <Flame className="h-7 w-7 text-sky-400" aria-hidden="true" />
                Top World-Published &amp; Play In-Browser
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Play open-source 3D WebGL &amp; HTML5 hits like SWOOOP 3D, Master Archer, HexGL, TANX, FIDE Chess, and 2048 right inside GameZone ET.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/15 backdrop-blur-md border border-emerald-500/30 px-3 py-1.5 rounded-xl shrink-0">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span>Zero-Redirect Verified</span>
            </div>
          </div>

          <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredGames.map((game, idx) => (
              <StaggerItem key={game.id} className="h-full">
                <TiltCard className="glass-strong group relative h-full overflow-hidden rounded-3xl flex flex-col justify-between">
                  <div>
                    <div className="relative h-52 overflow-hidden bg-[#0c1024]">
                      <ResilientImage
                        src={game.coverImage}
                        alt={game.title}
                        fallbackLabel={game.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" aria-hidden="true" />

                      <div className="absolute top-3 left-3 flex gap-1.5">
                        <span className="rounded-full bg-gradient-to-r from-cyan-500/85 via-violet-500/85 to-fuchsia-500/85 px-3 py-1 text-xs font-black text-white shadow-md tabular-nums">
                          #{idx + 1} {game.badge}
                        </span>
                      </div>

                      <div className="absolute top-3 right-3 flex items-center gap-1.5 tabular-nums">
                        <span className="rounded-full bg-black/75 backdrop-blur-md px-2.5 py-1 text-[10px] font-mono font-bold text-sky-300 border border-sky-400/40">
                          {game.categoryLabel}
                        </span>
                      </div>

                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-cyan-300">
                          {game.genre}
                        </span>
                        <span className="text-amber-400 font-bold flex items-center gap-1 tabular-nums">
                          <span aria-hidden="true">★</span> {game.rating.toFixed(1)}{' '}
                          <span className="sr-only">out of 5 stars</span>
                        </span>
                      </div>
                    </div>

                    <div className="p-5 relative z-10">
                      <h3 className="text-lg font-bold text-white font-display">
                        <button
                          type="button"
                          onClick={() => onPlayGame(game)}
                          aria-label={`Play ${game.title}`}
                          className="text-left hover:text-sky-300 transition-colors cursor-pointer"
                        >
                          {game.title}
                        </button>
                      </h3>
                      <p className="mt-1 text-xs text-slate-300 leading-relaxed line-clamp-2">
                        {game.description}
                      </p>

                      <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-300 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-sky-300">
                          <Keyboard className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">{game.controlsHint}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Fallback Engine:</span>
                          <span className="font-semibold text-emerald-400">{game.fallback.label}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-0 relative z-10">
                    <button
                      type="button"
                      onClick={() => onPlayGame(game)}
                      aria-label={`Play ${game.title} in arcade modal`}
                      className="btn-glow-cyan w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                      Play In-Browser Now
                    </button>
                  </div>
                </TiltCard>
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* === FULL CURATED GAMES CATALOG === */}
      <section className="py-10">
        <div className="container-x">
          {/* Category Tabs */}
          <div
            role="group"
            aria-label="Game categories"
            className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none"
          >
            {GAME_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`nav-luminous-item relative flex items-center gap-2 whitespace-nowrap rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'border-sky-400 text-white shadow-glow'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="games-category-pill"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      aria-hidden="true"
                      className="absolute inset-0 -z-10 rounded-2xl bg-sky-400/20"
                    />
                  )}
                  {getCategoryIcon(cat.icon)}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search & Sort Filters */}
          <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <label htmlFor="games-search-input" className="sr-only">
                Search games by name, category, or genre
              </label>
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                id="games-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chess, racing, 3D WebGL, puzzle, retro..."
                className="w-full rounded-2xl glass py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:border-primary-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <label htmlFor="games-sort-select" className="text-xs text-slate-400 hidden sm:inline">
                Sort:
              </label>
              <select
                id="games-sort-select"
                aria-label="Sort games"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'popular' | 'rating' | 'latency')}
                className="rounded-xl glass py-2.5 px-3 text-xs sm:text-sm text-white focus:border-primary-400 focus:outline-none cursor-pointer"
              >
                <option value="popular" className="bg-ink-950">Most Popular</option>
                <option value="rating" className="bg-ink-950">Highest Rated</option>
                <option value="latency" className="bg-ink-950">Instant Local First</option>
              </select>
              <span
                role="status"
                aria-live="polite"
                className="text-xs font-mono text-slate-400 tabular-nums"
              >
                {filteredGames.length} games
              </span>
            </div>
          </div>

          {/* Full-Width Games Grid */}
          <h2 className="sr-only">Full Curated Online Games Catalog</h2>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredGames.map((game) => (
              <TiltCard
                key={game.id}
                className="glass group relative flex flex-col overflow-hidden rounded-2xl"
              >
                <div className="relative h-44 overflow-hidden bg-[#0c1024]">
                  <ResilientImage
                    src={game.coverImage}
                    alt={game.title}
                    fallbackLabel={game.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-108"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-black/30" aria-hidden="true" />

                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    {game.badge && (
                      <span className="rounded-lg bg-gradient-to-r from-cyan-500/85 via-violet-500/85 to-fuchsia-500/85 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                        {game.badge}
                      </span>
                    )}
                    <span className="rounded-lg bg-black/75 backdrop-blur-md px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-white/10 tabular-nums">
                      {game.latencyMs === 0 ? '0ms Local' : `${game.latencyMs}ms`}
                    </span>
                  </div>

                  <div className="absolute top-2.5 right-2.5 rounded-lg bg-black/75 backdrop-blur-md px-2 py-0.5 text-xs font-bold text-gold-300 flex items-center gap-1 border border-white/10 tabular-nums">
                    <Star className="h-3 w-3 fill-gold-400 text-gold-400" aria-hidden="true" />
                    {game.rating.toFixed(1)}
                  </div>
                </div>

                <div className="flex flex-col flex-1 p-4 relative z-10">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="font-semibold text-sky-300 truncate max-w-[155px]">
                      {game.categoryLabel}
                    </span>
                    <span className="font-mono tabular-nums">
                      {Math.round(game.playsCount / 1000)}k plays
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white font-display line-clamp-1">
                    <button
                      type="button"
                      onClick={() => onPlayGame(game)}
                      aria-label={`Play ${game.title}`}
                      className="text-left hover:text-sky-300 transition-colors cursor-pointer"
                    >
                      {game.title}
                    </button>
                  </h3>

                  <p className="mt-1 text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {game.tagline}
                  </p>

                  <div className="mt-auto pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400 truncate">
                      {game.controls}
                    </span>
                    <button
                      type="button"
                      aria-label={`Play ${game.title}`}
                      onClick={() => onPlayGame(game)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#00d2ff]/20 to-[#8b5cf6]/25 border border-sky-400/40 px-3.5 py-1.5 text-xs font-bold text-white cursor-pointer"
                    >
                      <Play className="h-3 w-3 fill-current" aria-hidden="true" />
                      Play
                    </button>
                  </div>
                </div>
              </TiltCard>
            ))}
          </div>

          {filteredGames.length === 0 && (
            <div className="py-16 text-center">
              <Gamepad2 className="mx-auto h-12 w-12 text-slate-500" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-bold text-white">No games found</h3>
              <p className="text-sm text-slate-400">
                Try searching for &quot;chess&quot;, &quot;racing&quot;, &quot;2048&quot;, or reset filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className="btn-primary mt-4 py-2 px-5 text-sm cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

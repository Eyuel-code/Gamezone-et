import { useState, useMemo, useEffect, type ReactNode } from 'react';
import {
  Flame,
  Car,
  Crosshair,
  Trophy,
  Sparkles,
  Gamepad2,
  Search,
  Play,
  ShieldCheck,
  ArrowRight,
  HeartPulse,
  Keyboard,
  Layers,
  SlidersHorizontal,
  Accessibility,
  RotateCcw,
} from 'lucide-react';
import Reveal from '@/components/Reveal';
import ResilientImage from '@/components/ResilientImage';
import GameEmbedFacade from '@/components/GameEmbedFacade';
import { useTilt } from '@/hooks/useMotion';
import {
  ONLINE_GAMES,
  GAME_CATEGORIES,
  ACCESSIBILITY_FILTERS,
  type OnlineGame,
  type GameFilterCategory,
  type AccessibilityFilterId,
} from '@/data/gamesCatalog';
import type { PageId } from '@/hooks/useRouter';
import type { GamerProfile } from '@/components/AuthModal';
import { DAILY_PLAYTIME_LIMIT_SECONDS, formatDurationShort, wellnessEngine } from '@/services/wellnessEngine';

function TiltCard({
  children,
  className = '',
  maxTilt = 5,
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
  const [selectedCategory, setSelectedCategory] = useState<GameFilterCategory>('all');
  const [activeA11yFilters, setActiveA11yFilters] = useState<AccessibilityFilterId[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'latency'>('popular');
  const [dailyRemaining, setDailyRemaining] = useState<number>(() => wellnessEngine.getRemainingSeconds());

  const featuredGames = useMemo(() => ONLINE_GAMES.filter((g) => g.featured), []);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const featuredGame = featuredGames[featuredIndex] ?? ONLINE_GAMES[0];

  useEffect(() => {
    setDailyRemaining(wellnessEngine.getRemainingSeconds());
    return wellnessEngine.subscribe(() => {
      setDailyRemaining(wellnessEngine.getRemainingSeconds());
    });
  }, []);

  const toggleA11yFilter = (filterId: AccessibilityFilterId) => {
    setActiveA11yFilters((prev) =>
      prev.includes(filterId) ? prev.filter((id) => id !== filterId) : [...prev, filterId]
    );
  };

  const resetAllFilters = () => {
    setSelectedCategory('all');
    setActiveA11yFilters([]);
    setSearchQuery('');
  };

  const filteredGames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ONLINE_GAMES.filter((game) => {
      const matchesCat =
        selectedCategory === 'all'
          ? true
          : selectedCategory === 'casual'
          ? game.isCasual
          : game.category === selectedCategory;

      const matchesA11y = activeA11yFilters.every((filterKey) => Boolean(game[filterKey]));

      const matchesSearch =
        q === '' ||
        game.title.toLowerCase().includes(q) ||
        game.genre.toLowerCase().includes(q) ||
        game.tagline.toLowerCase().includes(q) ||
        game.categoryLabel.toLowerCase().includes(q) ||
        game.accessibilityTags.some((tag) => tag.toLowerCase().includes(q));

      return matchesCat && matchesA11y && matchesSearch;
    }).sort((a, b) => {
      if (sortBy === 'popular') return b.playsCount - a.playsCount;
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'latency') return a.latencyMs - b.latencyMs;
      return 0;
    });
  }, [selectedCategory, activeA11yFilters, searchQuery, sortBy]);

  const hasActiveFilters =
    selectedCategory !== 'all' || activeA11yFilters.length > 0 || searchQuery.trim() !== '';

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame':
        return <Flame className="h-4 w-4 text-accent-400 shrink-0" aria-hidden="true" />;
      case 'Car':
        return <Car className="h-4 w-4 text-sky-400 shrink-0" aria-hidden="true" />;
      case 'Crosshair':
        return <Crosshair className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />;
      case 'Trophy':
        return <Trophy className="h-4 w-4 text-gold-400 shrink-0" aria-hidden="true" />;
      case 'Sparkles':
        return <Sparkles className="h-4 w-4 text-violet-400 shrink-0" aria-hidden="true" />;
      case 'Layers':
        return <Layers className="h-4 w-4 text-cyan-400 shrink-0" aria-hidden="true" />;
      default:
        return <Gamepad2 className="h-4 w-4 text-sky-300 shrink-0" aria-hidden="true" />;
    }
  };

  return (
    <div className="relative min-h-screen pt-20 pb-24">
      {/* === COMPACT HEADER & HEALTHY PLAY BAR === */}
      <section className="relative overflow-hidden pt-8 pb-8 border-b border-white/10">
        <div className="container-x">
          <Reveal className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-wider text-sky-300">
                Verified HTML5 &amp; 3D WebGL Arcade · Zero External Redirects
              </p>
              <h1 className="mt-2 font-display text-3xl sm:text-5xl font-extrabold text-white leading-tight text-balance">
                Play <span className="text-gradient">Inclusive Browser Games</span> Anytime
              </h1>
              <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                Lightweight 16:9 previews load zero game data until you press Play. Filter by genre, one-button controls, colorblind-friendly visuals, or low-data mobile titles.
              </p>
            </div>

            {/* Compact Utility Actions & Daily Play Cap */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 tabular-nums">
              <div className="rounded-xl glass border border-emerald-400/25 px-3.5 py-2 text-xs text-slate-200 flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
                <span>
                  Daily Cap:{' '}
                  <strong className="font-mono text-emerald-300">
                    {formatDurationShort(dailyRemaining)}
                  </strong>{' '}
                  <span className="text-slate-400">/ {formatDurationShort(DAILY_PLAYTIME_LIMIT_SECONDS)}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('leaderboard')}
                className="btn-ghost py-2 px-3.5 text-xs font-bold border-gold-400/40 text-gold-300 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Leaderboard</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('wellness')}
                className="btn-ghost py-2 px-3.5 text-xs font-bold border-emerald-400/35 text-emerald-300 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Wellness</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* === CLEAN FEATURED GAME HERO CARD === */}
      <section className="py-8 border-b border-white/10" aria-label="Featured browser game">
        <div className="container-x">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-300">
              <Flame className="h-4 w-4 text-sky-400 shrink-0" aria-hidden="true" />
              <span>Featured Showcase</span>
              <span className="text-slate-500" aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Click-to-Play Facade
              </span>
            </div>

            {/* Featured Switcher Tabs */}
            <div
              role="group"
              aria-label="Switch featured game"
              className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none"
            >
              {featuredGames.map((fg, idx) => {
                const isSelected = idx === featuredIndex;
                return (
                  <button
                    key={fg.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setFeaturedIndex(idx)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                      isSelected
                        ? 'border-sky-400 bg-sky-500/20 text-white'
                        : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/25 hover:text-white'
                    }`}
                  >
                    {fg.title.split(':')[0]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="glass-strong group rounded-3xl border border-white/15 p-4 sm:p-6 lg:p-7">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* 16:9 Click-to-Play Preview Stage */}
              <div className="lg:col-span-7 min-w-0">
                <GameEmbedFacade game={featuredGame} onExpandModal={onPlayGame} />
              </div>

              {/* Clean Featured Metadata & Launch Controls */}
              <div className="lg:col-span-5 min-w-0 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-slate-300 tabular-nums">
                    <span className="text-sky-300 uppercase tracking-wider font-bold">
                      {featuredGame.badge || 'FEATURED'}
                    </span>
                    <span className="text-slate-500" aria-hidden="true">·</span>
                    <span>{featuredGame.categoryLabel}</span>
                    <span className="text-slate-500" aria-hidden="true">·</span>
                    <span className="text-amber-400 font-bold">★ {featuredGame.rating.toFixed(1)}</span>
                    <span className="text-slate-500" aria-hidden="true">·</span>
                    <span className="font-mono text-emerald-400">
                      {featuredGame.latencyMs === 0 ? '0ms Local' : `${featuredGame.latencyMs}ms`}
                    </span>
                  </div>

                  <h2 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold text-white text-balance">
                    {featuredGame.title}
                  </h2>

                  <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">
                    {featuredGame.description}
                  </p>
                </div>

                {/* Unboxed Accessibility & Device Metadata */}
                <div className="space-y-2 pt-3 border-t border-white/10 text-xs">
                  <div className="flex items-start gap-2 text-sky-300">
                    <Keyboard className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="text-slate-200">{featuredGame.controlsHint}</span>
                  </div>
                  <div className="flex items-start gap-2 text-emerald-300">
                    <Accessibility className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="text-slate-200 font-medium">
                      {featuredGame.accessibilityTags.join(' · ')}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Fallback Ready:{' '}
                    <span className="text-emerald-400 font-semibold">{featuredGame.fallback.label}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => onPlayGame(featuredGame)}
                    className="btn-glow-cyan inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-black uppercase tracking-wider text-white cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Play className="h-4 w-4 fill-current shrink-0" aria-hidden="true" />
                    <span>Launch Full Arcade</span>
                  </button>
                  <span className="text-xs text-slate-400 font-mono tabular-nums">
                    {Math.round(featuredGame.playsCount / 1000)}k+ sessions
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* === FULL CURATED GAMES CATALOG === */}
      <section className="py-10">
        <div className="container-x">
          {/* Row 1: Category Filter Pills */}
          <div className="flex flex-col gap-4">
            <div
              role="group"
              aria-label="Game categories"
              className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none"
            >
              {GAME_CATEGORIES.map((cat) => {
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-2 whitespace-nowrap shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
                      active
                        ? 'border-sky-400 bg-sky-500/20 text-white shadow-glow'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/30 hover:text-white'
                    }`}
                  >
                    {getCategoryIcon(cat.icon)}
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Row 2: Accessibility & Low-Data Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div
                role="group"
                aria-label="Accessibility and data filters"
                className="flex flex-wrap items-center gap-2"
              >
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-1">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                  <span>Accessibility:</span>
                </span>
                {ACCESSIBILITY_FILTERS.map((filter) => {
                  const active = activeA11yFilters.includes(filter.id);
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      aria-pressed={active}
                      title={filter.description}
                      onClick={() => toggleA11yFilter(filter.id)}
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                        active
                          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                          : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/25 hover:text-white'
                      }`}
                    >
                      <span>{filter.label}</span>
                    </button>
                  );
                })}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="inline-flex items-center gap-1 whitespace-nowrap shrink-0 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" aria-hidden="true" />
                    <span>Clear Filters</span>
                  </button>
                )}
              </div>

              <span
                role="status"
                aria-live="polite"
                className="text-xs font-mono text-slate-400 tabular-nums"
              >
                {filteredGames.length} of {ONLINE_GAMES.length} games
              </span>
            </div>

            {/* Row 3: Search & Sort */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <label htmlFor="games-search-input" className="sr-only">
                  Search games by name, accessibility tag, or genre
                </label>
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
                <input
                  id="games-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chess, racing, one-button, lightweight..."
                  className="w-full rounded-xl glass py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:border-primary-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2.5">
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
              </div>
            </div>
          </div>

          {/* === RESPONSIVE 16:9 GAME CARDS GRID === */}
          <h2 className="sr-only">Full Curated Online Games Catalog</h2>
          <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredGames.map((game) => (
              <TiltCard
                key={game.id}
                className="glass group relative flex flex-col overflow-hidden rounded-2xl border border-white/10"
              >
                {/* 16:9 Game Thumbnail */}
                <button
                  type="button"
                  onClick={() => onPlayGame(game)}
                  aria-label={`Play ${game.title}`}
                  className="relative aspect-video w-full overflow-hidden bg-[#0c1024] block text-left cursor-pointer"
                >
                  <ResilientImage
                    src={game.thumbnailUrl || game.coverImage}
                    alt={game.title}
                    fallbackLabel={game.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-transparent to-black/25"
                    aria-hidden="true"
                  />
                  <span className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                    <span className="text-sky-300 uppercase tracking-wide truncate">
                      {game.categoryLabel}
                    </span>
                    <span className="text-gold-300 tabular-nums shrink-0">
                      ★ {game.rating.toFixed(1)}
                    </span>
                  </span>
                </button>

                <div className="flex flex-col flex-1 p-4 relative z-10">
                  <h3 className="text-base font-bold text-white font-display line-clamp-1">
                    <button
                      type="button"
                      onClick={() => onPlayGame(game)}
                      className="text-left hover:text-sky-300 transition-colors cursor-pointer"
                    >
                      {game.title}
                    </button>
                  </h3>

                  <p className="mt-1 text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {game.tagline}
                  </p>

                  {/* Clear Accessibility & Device Tags */}
                  <p className="mt-2.5 text-[11px] font-medium text-emerald-300 leading-snug">
                    {game.accessibilityTags.join(' · ')}
                  </p>

                  <div className="mt-auto pt-3 mt-3 border-t border-white/10 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400 truncate font-mono tabular-nums">
                      {game.latencyMs === 0 ? '0ms Local' : `${game.latencyMs}ms`} · {game.controls}
                    </span>
                    <button
                      type="button"
                      aria-label={`Play ${game.title}`}
                      onClick={() => onPlayGame(game)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#00d2ff]/20 to-[#8b5cf6]/25 border border-sky-400/40 px-3.5 py-1.5 text-xs font-bold text-white hover:border-sky-300 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Play className="h-3 w-3 fill-current shrink-0" aria-hidden="true" />
                      <span>Play</span>
                    </button>
                  </div>
                </div>
              </TiltCard>
            ))}
          </div>

          {filteredGames.length === 0 && (
            <div className="py-16 text-center">
              <Gamepad2 className="mx-auto h-12 w-12 text-slate-500" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-bold text-white">No games match these filters</h3>
              <p className="text-sm text-slate-400 mt-1">
                Try clearing an accessibility filter or searching for &quot;chess&quot;, &quot;2048&quot;, or &quot;racing&quot;.
              </p>
              <button
                type="button"
                onClick={resetAllFilters}
                className="btn-primary mt-4 py-2 px-5 text-sm cursor-pointer whitespace-nowrap"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

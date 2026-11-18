import { useState } from 'react';
import {
  Flame,
  Crosshair,
  Trophy,
  Zap,
  ChevronRight,
  Sparkles,
  Star,
  ArrowRight,
  Users,
  TrendingUp,
  ShieldCheck,
  Gamepad2,
  Newspaper,
  CreditCard,
  ShoppingBag,
} from 'lucide-react';
import FreeFireHeroStage from '@/components/FreeFireHeroStage';
import Reveal from '@/components/Reveal';
import { useCountUp, useReveal, useTilt } from '@/hooks/useMotion';
import { games } from '@/data/catalog';
import { db } from '@/services/db';
import type { PageId } from '@/hooks/useRouter';

const platformStats = [
  { label: 'Registered Ethiopian Gamers', value: 12800, suffix: '+', icon: Users, note: 'Ethiopia' },
  { label: 'Free Tournaments Hosted', value: 34, suffix: '', icon: Trophy, note: 'Zero Entry Fee' },
  { label: 'Orders Delivered', value: 9200, suffix: '+', icon: Sparkles, note: 'Telebirr & CBE' },
  { label: 'Playable HTML5 Games', value: 62, suffix: '', icon: Gamepad2, note: 'Zero GPU Needed' },
];

const gameIcons: Record<string, typeof Flame> = {
  flame: Flame,
  crosshair: Crosshair,
  football: Crosshair,
};

export default function HomePage({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const { ref: statsRef, inView } = useReveal<HTMLDivElement>();
  const tournaments = db.getTournaments();

  return (
    <div className="relative min-h-screen overflow-hidden pt-16">
      {/* === HERO === */}
      <section id="home-hero" className="relative overflow-hidden">

        <div className="container-x relative flex min-h-[calc(100vh-4rem)] flex-col justify-center py-16">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            {/* Left: copy */}
            <div className="lg:col-span-6 z-10">
              <div className="animate-fade-up inline-flex items-center gap-2.5 rounded-full border border-primary-400/35 bg-primary-400/10 px-5 py-2 text-sm sm:text-base font-semibold text-primary-200">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success-400" />
                </span>
                Ethiopia's #1 Game Top-Up & Esports Platform
              </div>

              <h1
                className="animate-fade-up mt-6 font-display text-4xl font-extrabold leading-[1.08] text-white text-shadow-glow sm:text-5xl lg:text-6xl"
                style={{ animationDelay: '0.1s' }}
              >
                Top up. Compete.
                <br />
                <span className="text-primary-400">Discover</span>{' '}
                <span className="text-white">your next</span>{' '}
                <span className="text-accent-400">game.</span>
              </h1>

              <p
                className="animate-fade-up mt-6 max-w-xl text-lg sm:text-xl leading-relaxed text-slate-300 font-normal"
                style={{ animationDelay: '0.2s' }}
              >
                Your gaming destination in Ethiopia. Access legitimate game products in <span className="font-bold text-white">Ethiopian Birr</span> via Telebirr &amp; CBE Birr, join free tournaments, and play curated 3D WebGL &amp; HTML5 browser games in one place.
              </p>

              <div className="animate-fade-up mt-8 flex flex-wrap items-center gap-3 sm:gap-4" style={{ animationDelay: '0.3s' }}>
                <button
                  onClick={() => onNavigate('topup')}
                  className="btn-primary text-base font-bold px-6 py-3.5 shadow-glow cursor-pointer"
                >
                  <Zap className="h-5 w-5" /> Explore Game Top-Ups
                </button>
                <button
                  onClick={() => onNavigate('tournaments')}
                  className="btn-ghost text-base font-bold px-5 py-3.5 cursor-pointer"
                >
                  <Trophy className="h-5 w-5 text-gold-400" /> Browse Tournaments
                </button>
                <button
                  onClick={() => onNavigate('games')}
                  className="relative group overflow-hidden px-5 py-3.5 rounded-xl font-bold text-sm sm:text-base text-white bg-gradient-to-r from-accent-500 to-amber-500 shadow-lg shadow-accent-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer border border-white/20"
                >
                  <Flame className="h-4 w-4 text-yellow-200 fill-yellow-300" />
                  <span>Play Browser Arcade</span>
                </button>
              </div>

              {/* game pills */}
              <div className="animate-fade-up mt-10 flex flex-wrap gap-2.5" style={{ animationDelay: '0.4s' }}>
                {games.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => onNavigate('topup')}
                    className="chip group transition-colors hover:border-primary-300/50 hover:bg-primary-400/10 hover:text-white px-3.5 py-1.5 text-xs font-semibold cursor-pointer"
                  >
                    {g.iconKey === 'flame' && <Flame className="h-3.5 w-3.5 text-accent-400" />}
                    {g.iconKey === 'crosshair' && <Crosshair className="h-3.5 w-3.5 text-primary-400" />}
                    {g.iconKey === 'football' && <span className="text-success-400 text-xs">⚽</span>}
                    {g.name}
                    <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Unconstrained 3D Free Fire Character & Throne Stage */}
            <div className="lg:col-span-6 relative z-10 flex items-center justify-center">
              <div className="w-full">
                <FreeFireHeroStage />
              </div>
            </div>
          </div>

          {/* Platform Statistics */}
          <div ref={statsRef} className="mt-16">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-3 px-1">
              <span>PLATFORM OVERVIEW</span>
              <span>Ethiopia Esports &amp; Game Store</span>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {platformStats.map((s, i) => (
                <StatCard key={s.label} stat={s} active={inView} delay={i * 0.1} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* === THREE CORE PILLARS SECTION === */}
      <section className="relative py-16 border-t border-b border-white/10">
        <div className="container-x">
          <Reveal className="mx-auto max-w-2xl text-center mb-10">
            <span className="chip border-primary-400/30 bg-primary-400/10 text-primary-200">
              <Sparkles className="h-3.5 w-3.5" /> Three Core Pillars
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">
              Everything Ethiopian Gamers Need
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-400">
              Built specifically for Ethiopian mobile and PC players with local mobile money and lightweight browser games.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pillar 1: Top-Ups */}
            <button
              type="button"
              onClick={() => onNavigate('topup')}
              className="glass card-spotlight group relative rounded-2xl p-7 cursor-pointer flex flex-col justify-between text-left w-full"
            >
              <div>
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary-500/20 text-primary-400 mb-4 group-hover:scale-110 transition-transform">
                  <CreditCard className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary-400 block mb-1">
                  Pillar 1
                </span>
                <h3 className="font-display text-xl font-bold text-white group-hover:text-primary-300 transition-colors">
                  Game Top-Ups &amp; Memberships
                </h3>
                <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                  Purchase diamonds, UC, and FC Points directly in Ethiopian Birr via Telebirr and CBE Birr without sharing passwords.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-primary-400 font-bold w-full">
                <span>Explore Packages</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </div>
            </button>

            {/* Pillar 2: Tournaments */}
            <button
              type="button"
              onClick={() => onNavigate('tournaments')}
              className="glass card-spotlight group relative rounded-2xl p-7 cursor-pointer flex flex-col justify-between text-left w-full"
            >
              <div>
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-gold-400/20 text-gold-400 mb-4 group-hover:scale-110 transition-transform">
                  <Trophy className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-gold-400 block mb-1">
                  Pillar 2
                </span>
                <h3 className="font-display text-xl font-bold text-white group-hover:text-gold-300 transition-colors">
                  Free Esports Tournaments
                </h3>
                <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                  100% free-to-enter tournaments for Free Fire, PUBG Mobile, and EA FC. Interactive brackets, Addis Ababa match schedules, and official leaderboards.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-gold-400 font-bold w-full">
                <span>View Brackets</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </div>
            </button>

            {/* Pillar 3: HTML5 Games */}
            <button
              type="button"
              onClick={() => onNavigate('games')}
              className="glass card-spotlight group relative rounded-2xl p-7 cursor-pointer flex flex-col justify-between text-left w-full"
            >
              <div>
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent-500/20 text-accent-400 mb-4 group-hover:scale-110 transition-transform">
                  <Gamepad2 className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-accent-400 block mb-1">
                  Pillar 3
                </span>
                <h3 className="font-display text-xl font-bold text-white group-hover:text-accent-300 transition-colors">
                  Playable HTML5 Game Library
                </h3>
                <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                  Curated, zero-download HTML5 &amp; 3D WebGL games playable directly in your browser. Designed for older laptops and mobile phones with instant Canvas backups.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-accent-400 font-bold w-full">
                <span>Play Now</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* === FEATURED GAMES === */}
      <section className="relative py-20">
        <div className="container-x">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="chip border-primary-400/30 bg-primary-400/10 text-primary-200">
              <Gamepad2 className="h-3.5 w-3.5" /> Supported Titles
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold text-white sm:text-4xl">
              Three Games. <span className="text-gradient">One Platform.</span>
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-slate-400">
              Initial supported competitive titles in Ethiopia, expandable via admin dashboard.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {games.map((g, i) => (
              <Reveal key={g.id} delay={i * 120} as="article">
                <GameCard game={g} onTopUp={() => onNavigate('topup')} />
              </Reveal>
            ))}
          </div>

          {/* Cloud Gaming Hardware-Free Banner */}
          <div className="mt-12 relative overflow-hidden rounded-3xl border border-accent-500/30 bg-gradient-to-r from-ink-900/90 via-ink-950 to-primary-950/60 p-7 sm:p-9 shadow-2xl">
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-accent-400/30 bg-accent-400/10 px-3.5 py-1 text-xs font-semibold text-accent-300">
                  <Flame className="h-3.5 w-3.5" />
                  <span>Curated Free WebGL &amp; HTML5 Games &bull; Zero Redirects</span>
                </div>
                <h3 className="mt-3 font-display text-2xl sm:text-3xl font-extrabold text-white">
                  Lacking High-End Hardware? <span className="text-gradient">Play Directly in Browser!</span>
                </h3>
                <p className="mt-2 text-slate-300 text-xs sm:text-sm leading-relaxed">
                  No high-end graphic cards or massive downloads required. Play racing, arcade, puzzles, and strategy chess directly inside GameZone ET with responsive touch and keyboard controls.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto shrink-0">
                <button
                  onClick={() => onNavigate('games')}
                  className="px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-accent-500 to-amber-500 hover:brightness-110 shadow-glow transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
                >
                  <Flame className="h-4 w-4" /> Open Browser Arcade
                </button>
                <button
                  onClick={() => onNavigate('leaderboard')}
                  className="px-5 py-3 rounded-xl font-semibold text-slate-200 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
                >
                  <Trophy className="h-4 w-4 text-gold-400" /> Leaderboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* === UPCOMING TOURNAMENTS PREVIEW === */}
      <section className="relative py-16 bg-white/[0.01]">
        <div className="container-x">
          <Reveal className="flex items-end justify-between gap-4 mb-8">
            <div>
              <span className="chip border-gold-400/30 bg-gold-400/10 text-gold-200">
                <Trophy className="h-3.5 w-3.5" /> Live Competitions
              </span>
              <h2 className="mt-3 font-display text-2xl sm:text-3xl font-bold text-white">
                Upcoming Free <span className="text-gradient-gold">Events</span>
              </h2>
            </div>
            <button
              onClick={() => onNavigate('tournaments')}
              className="text-xs text-primary-400 hover:underline flex items-center gap-1 font-bold"
            >
              View all tournaments <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tournaments.slice(0, 3).map((t, i) => (
              <Reveal key={t.id} delay={i * 80}>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-primary-400 uppercase">{t.gameName}</span>
                    <span className="rounded-full bg-success-500/20 text-success-400 px-2 py-0.5 font-bold text-[10px]">
                      Free Entry
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-white text-base">{t.title}</h3>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div>Date: {t.date} ({t.startTime})</div>
                    <div>Format: {t.format}</div>
                  </div>
                  <button
                    onClick={() => onNavigate('tournaments')}
                    className="w-full rounded-xl bg-white/10 hover:bg-white/20 py-2 text-xs font-bold text-white transition-colors"
                  >
                    Inspect Bracket
                  </button>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ stat, active, delay }: { stat: typeof platformStats[number]; active: boolean; delay: number }) {
  const v = useCountUp(stat.value, active);
  const Icon = stat.icon;
  return (
    <div
      className={`glass card-spotlight animate-fade-up rounded-2xl p-5 ${active ? 'animate-count-pop' : 'opacity-0'}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5 text-primary-400" />
        <span className="rounded bg-white/10 text-[9px] font-bold text-slate-300 px-1.5 py-0.5 uppercase">
          {stat.note}
        </span>
      </div>
      <p className="mt-3 font-mono text-2xl font-bold text-white sm:text-3xl tabular-nums">
        {v.toLocaleString()}
        {stat.suffix}
      </p>
      <p className="mt-1 text-xs text-slate-300 sm:text-sm">{stat.label}</p>
    </div>
  );
}

function GameCard({ game, onTopUp }: { game: typeof games[number]; onTopUp: () => void }) {
  const { ref, onMove, onLeave } = useTilt<HTMLDivElement>(8);
  const Icon = gameIcons[game.iconKey];

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="preserve-3d glass card-spotlight group relative h-full overflow-hidden rounded-2xl"
    >
      <div className="relative h-40 overflow-hidden">
        <img
          src={game.coverImage}
          alt=""
          className="h-full w-full object-cover opacity-50 transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 to-transparent" />
        <div className="absolute left-4 top-4 flex items-center gap-3">
          <span
            className="grid h-12 w-12 place-items-center rounded-xl font-display text-lg font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${game.accent}, #0a0c1b)`, boxShadow: `0 0 20px -4px ${game.accent}80` }}
          >
            {game.logoInitials}
          </span>
        </div>
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="font-display text-xl font-bold text-white">{game.name}</h3>
          <p className="text-xs text-slate-300">{game.tagline}</p>
        </div>
      </div>

      <div className="p-5" style={{ transform: 'translateZ(20px)' }}>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1"><Star className="h-3 w-3 text-gold-400" /> {game.rating}</span>
          <span>·</span>
          <span>{game.activePlayers}</span>
          <span>·</span>
          <span>{game.platform}</span>
        </div>
        <p className="mt-3 text-sm text-slate-400 line-clamp-2">{game.description}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {game.whatYouCanBuy.slice(0, 3).map((item) => (
            <span key={item} className="rounded-md bg-white/5 px-2 py-1 text-xs text-slate-400">{item}</span>
          ))}
        </div>
        <button
          onClick={onTopUp}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-ink-950 transition-all hover:scale-[1.02] cursor-pointer"
          style={{ background: game.accent }}
        >
          <Icon className="h-4 w-4" /> Top Up {game.name}
        </button>
      </div>
    </div>
  );
}

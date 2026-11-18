import { useState, useEffect, useMemo, Suspense, type ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  Trophy, Calendar, Users, Gamepad2, Flame, Crosshair,
  Check, ShieldCheck, Zap, Timer, Award, Radio, KeyRound, Lock, CalendarClock,
} from 'lucide-react';
import { db, type TournamentEntity } from '@/services/db';
import { isAuthorizedAdminUser } from '@/services/authService';
import Reveal, { StaggerGrid, StaggerItem } from '@/components/Reveal';
import ResilientImage from '@/components/ResilientImage';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useTilt } from '@/hooks/useMotion';
import { lazyWithRetry } from '@/utils/lazyWithRetry';

const TournamentBracketModal = lazyWithRetry(() => import('@/components/TournamentBracketModal'));
const TournamentRegisterModal = lazyWithRetry(() => import('@/components/TournamentRegisterModal'));
const MatchResultModal = lazyWithRetry(() =>
  import('@/components/TournamentActionModals').then((m) => ({ default: m.MatchResultModal }))
);
const TournamentDisputeModal = lazyWithRetry(() =>
  import('@/components/TournamentActionModals').then((m) => ({ default: m.TournamentDisputeModal }))
);

function TiltTournamentArticle({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const { ref, onMove, onLeave } = useTilt<HTMLElement>(6);
  return (
    <article
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`card-spotlight ${className}`}
    >
      {children}
    </article>
  );
}

const gameIcons: Record<string, any> = { freefire: Flame, pubg: Crosshair, eafc: Gamepad2 };

const statusStyles: Record<string, { label: string; cls: string; dot: string }> = {
  open: { label: 'Open', cls: 'border-success-400/40 bg-success-400/10 text-success-400', dot: 'bg-success-400' },
  filling: { label: 'Filling Fast', cls: 'border-gold-400/40 bg-gold-400/10 text-gold-300', dot: 'bg-gold-400' },
  full: { label: 'Full', cls: 'border-error-400/40 bg-error-400/10 text-error-400', dot: 'bg-error-400' },
  live: { label: 'Live Now', cls: 'border-accent-500/50 bg-accent-500/15 text-accent-300', dot: 'bg-accent-500' },
  completed: { label: 'Completed', cls: 'border-white/20 bg-white/5 text-slate-400', dot: 'bg-slate-500' },
};

export default function TournamentsPage({
  currentUser,
  onNotify,
}: {
  currentUser?: any;
  onNotify?: (
    msg: string,
    opts?: { title?: string; type?: 'success' | 'info' | 'warning' | 'error'; targetPage?: any; persist?: boolean }
  ) => void;
}) {
  const [tournaments, setTournaments] = useState<TournamentEntity[]>(() => db.getTournaments());
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal states
  const [bracketModalTournament, setBracketModalTournament] = useState<TournamentEntity | null>(null);
  const [registerModalTournament, setRegisterModalTournament] = useState<TournamentEntity | null>(null);
  const [actionMatchId, setActionMatchId] = useState<string | null>(null);
  const [actionTourneyId, setActionTourneyId] = useState<string | null>(null);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);

  const isAdmin = isAuthorizedAdminUser(currentUser);

  useEffect(() => {
    return db.subscribe(() => {
      const latest = db.getTournaments();
      setTournaments(latest);
      setBracketModalTournament((prev) => (prev ? latest.find((x) => x.id === prev.id) || prev : null));
    });
  }, []);

  const filteredTournaments = tournaments.filter((t) => {
    const matchesGame = selectedGameFilter === 'all' || t.gameId === selectedGameFilter;
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesGame && matchesStatus;
  });

  const nextTournament = useMemo(() => {
    const upcoming = tournaments.filter((t) => t.status === 'open' || t.status === 'filling' || t.status === 'live');
    return upcoming[0] ?? tournaments[0];
  }, [tournaments]);

  const weeklyLimit = db.getWeeklyTournamentLimitStatus(currentUser);

  const handleOpenBracket = (t: TournamentEntity) => {
    setBracketModalTournament(t);
    if (currentUser?.id && t.roomCredentials?.published && !t.roomCredentials.roomId) {
      void db.syncTournamentsFromFirestore(currentUser.id, isAdmin);
    }
  };

  const handleOpenRegister = (t: TournamentEntity) => {
    setRegisterModalTournament(t);
  };

  const handleOpenDispute = (matchId: string, tourneyId: string) => {
    setActionMatchId(matchId);
    setActionTourneyId(tourneyId);
    setDisputeModalOpen(true);
  };

  const handleOpenResultSubmit = (matchId: string, tourneyId: string) => {
    setActionMatchId(matchId);
    setActionTourneyId(tourneyId);
    setResultModalOpen(true);
  };

  return (
    <div className="relative min-h-screen pt-20 pb-16">
      {/* Header */}
      <section className="relative overflow-hidden py-12">
        <div className="absolute inset-0 -z-10 bg-radial-fade" />
        <div className="container-x">
          <Reveal className="text-center">
            <span className="chip border-gold-400/30 bg-gold-400/10 text-gold-200">
              <Trophy className="h-3.5 w-3.5" /> Ethiopian Esports Arena
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">
              Free <span className="text-gradient-gold">Tournaments & Brackets</span>
            </h1>
            <p className="mt-4 text-slate-400 max-w-2xl mx-auto">
              100% free entry. Compete in verified custom rooms, advance through single-elimination brackets, and earn Ethiopian recognition badges and leaderboard points.
            </p>
          </Reveal>

          {/* Stats Bar */}
          <Reveal delay={100} className="mt-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass rounded-2xl p-5 text-center">
                <ShieldCheck className="mx-auto h-6 w-6 text-success-400" />
                <p className="mt-2 font-mono text-xl font-bold text-white">100% Free</p>
                <p className="text-xs text-slate-400">Zero entry fees & zero wagering</p>
              </div>
              <div className="glass rounded-2xl p-5 text-center">
                <Zap className="mx-auto h-6 w-6 text-primary-400" />
                <p className="mt-2 font-mono text-xl font-bold text-white">
                  {tournaments.filter((t) => t.status === 'open' || t.status === 'filling' || t.status === 'live').length} Active
                </p>
                <p className="text-xs text-slate-400">Addis Ababa scheduled cups</p>
              </div>
              <div className="glass rounded-2xl p-5 text-center">
                <Users className="mx-auto h-6 w-6 text-accent-400" />
                <p className="mt-2 font-mono text-xl font-bold text-white">
                  {tournaments.reduce((s, t) => s + t.registeredCount, 0)} Gamers
                </p>
                <p className="text-xs text-slate-400">Registered competitors</p>
              </div>
            </div>
          </Reveal>

          {/* Next event countdown */}
          {nextTournament && (
            <Reveal delay={150} className="mt-5">
              <CountdownBanner
                tournament={nextTournament}
                currentUser={currentUser}
                isAdmin={isAdmin}
                onOpenBracket={() => handleOpenBracket(nextTournament)}
              />
            </Reveal>
          )}

          {weeklyLimit.limited && (
            <div
              role="status"
              className="mt-4 rounded-2xl border border-amber-400/35 bg-amber-500/10 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-100"
            >
              <div className="flex items-center gap-2.5">
                <CalendarClock className="h-4 w-4 text-amber-300 shrink-0" aria-hidden="true" />
                <span>
                  <strong className="text-white">Weekly Tournament Cool-Down Active (1/Week):</strong>{' '}
                  Entered in <strong className="text-amber-200">{weeklyLimit.activeReg?.tournamentTitle}</strong> ({weeklyLimit.week.rangeLabel}). Next slot unlocks {weeklyLimit.week.nextResetLabel}.
                </span>
              </div>
              <span className="font-mono text-[11px] text-amber-300">Healthy Competitive Pacing</span>
            </div>
          )}

          {/* Filters */}
          <div className="mt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-4">
            {/* Game Selector Filter */}
            <div role="group" aria-label="Filter tournaments by game" className="flex flex-wrap items-center gap-1.5 w-full md:w-auto max-w-full pb-1 sm:pb-0">
              {[
                { id: 'all', label: 'All Titles' },
                { id: 'freefire', label: 'Free Fire' },
                { id: 'pubg', label: 'PUBG Mobile' },
                { id: 'eafc', label: 'EA SPORTS FC' },
              ].map((gf) => {
                const active = selectedGameFilter === gf.id;
                return (
                  <button
                    key={gf.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedGameFilter(gf.id)}
                    className={`relative rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                      active
                        ? 'text-ink-950'
                        : 'border border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="tournaments-game-filter"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        aria-hidden="true"
                        className="absolute inset-0 -z-10 rounded-xl bg-primary-500 shadow-glow"
                      />
                    )}
                    {gf.label}
                  </button>
                );
              })}
            </div>

            {/* Status Filter */}
            <div role="group" aria-label="Filter tournaments by status" className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <span className="text-xs font-semibold text-slate-400">Status:</span>
              {['all', 'open', 'filling', 'live', 'completed'].map((st) => {
                const active = statusFilter === st;
                return (
                  <button
                    key={st}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setStatusFilter(st)}
                    className={`relative rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-colors cursor-pointer ${
                      active
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="tournaments-status-filter"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        aria-hidden="true"
                        className="absolute inset-0 -z-10 rounded-lg bg-white/15 border border-white/15"
                      />
                    )}
                    {st}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Tournaments Grid */}
      <section className="py-6">
        <div className="container-x">
          <StaggerGrid
            key={`${selectedGameFilter}-${statusFilter}`}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {filteredTournaments.map((t) => {
              const Icon = gameIcons[t.gameId] || Gamepad2;
              const status = statusStyles[t.status] || statusStyles.open;
              const pct = Math.min(100, Math.round((t.registeredCount / t.capacity) * 100));
              const registration = currentUser?.id ? db.getRegistrationForTournament(currentUser.id, t.id) : null;
              const isRegistered = Boolean(registration);
              const roomGate = db.isRoomUnlockedForUser(t, currentUser?.id, isAdmin);

              return (
                <StaggerItem key={t.id} className="h-full">
                <TiltTournamentArticle
                  className="h-full rounded-2xl border border-white/10 glass-tournament-transparent overflow-hidden flex flex-col justify-between hover:border-white/20 transition-all shadow-card"
                >
                  {/* Top Banner */}
                  <div className="relative h-40 overflow-hidden">
                    <ResilientImage src={t.banner} alt={t.title} fallbackLabel={t.gameName} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
                    <div className="top-3 left-3 right-3 absolute flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 rounded-full bg-ink-950/80 backdrop-blur-md border border-white/10 px-2.5 py-0.5 text-xs font-bold text-white">
                        <Icon className="h-3.5 w-3.5 text-primary-400" />
                        {t.gameName}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                          0 ETB · FREE
                        </span>
                        <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${status.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden="true" />
                          {status.label}
                        </span>
                      </div>
                    </div>

                    <div className="absolute bottom-3 left-4 right-4">
                      <h3 className="font-display text-lg font-bold text-white line-clamp-1">{t.title}</h3>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5 text-xs">
                      {t.currentMatchLabel && (
                        <div className="inline-flex items-center gap-1.5 rounded-lg border border-primary-400/30 bg-primary-500/10 px-2.5 py-1 text-[11px] font-bold text-primary-300">
                          <Radio className="h-3 w-3 animate-pulse shrink-0" />
                          <span className="line-clamp-1">{t.currentMatchLabel}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-slate-300">
                        <Calendar className="h-4 w-4 text-primary-400 shrink-0" />
                        <span>{t.date} • {t.startTime}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <ShieldCheck className="h-4 w-4 text-primary-400 shrink-0" />
                        <span>Format: <strong>{t.format}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Award className="h-4 w-4 text-gold-400 shrink-0" />
                        <span className="text-gold-300 font-medium line-clamp-1">{t.prizeRecognition}</span>
                      </div>
                    </div>

                    {isRegistered && (
                      <div className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 p-2.5 text-[11px] space-y-1">
                        <div className="flex items-center justify-between text-emerald-300 font-bold">
                          <span className="font-mono">
                            {registration?.confirmationCode || 'CONFIRMED'} · Slot #{registration?.slotNumber ?? '-'}
                          </span>
                          {roomGate.unlocked ? (
                            <span className="inline-flex items-center gap-1 text-primary-300">
                              <KeyRound className="h-3 w-3" /> Room Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-300">
                              <Lock className="h-3 w-3" /> Room Locked
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                        <span aria-live="polite">{t.registeredCount} / {t.capacity} Slots Filled</span>
                        <span className="font-mono font-bold text-white">{pct}% Full</span>
                      </div>
                      <div
                        role="progressbar"
                        aria-label={`${t.title} slots filled`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={pct}
                        className="h-2 rounded-full bg-white/10 overflow-hidden"
                      >
                        <div
                          className="h-full bg-gradient-to-r from-primary-400 to-accent-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-white/5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenBracket(t)}
                        className="btn-ghost flex-1 rounded-xl py-2.5 px-3 text-xs font-bold text-white text-center cursor-pointer"
                      >
                        View Bracket
                      </button>

                      {isRegistered ? (
                        <button
                          type="button"
                          onClick={() => handleOpenBracket(t)}
                          className="flex-1 rounded-xl bg-success-500/20 border border-success-500/40 py-2.5 text-xs font-bold text-success-300 text-center flex items-center justify-center gap-1 hover:bg-success-500/30 cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" /> {roomGate.unlocked ? 'Open Room' : 'Registered'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={t.status === 'full' || t.status === 'completed'}
                          onClick={() => handleOpenRegister(t)}
                          className={`flex-1 rounded-xl py-2.5 px-3 text-xs font-bold ${
                            t.status === 'full' || t.status === 'completed'
                              ? 'no-heat bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed'
                              : 'btn-primary cursor-pointer'
                          }`}
                        >
                          {t.status === 'full' ? 'Slots Full' : 'Register Free'}
                        </button>
                      )}
                    </div>
                  </div>
                </TiltTournamentArticle>
                </StaggerItem>
              );
            })}
          </StaggerGrid>
        </div>
      </section>

      {/* Interactive Bracket Modal */}
      {bracketModalTournament && (
        <Suspense fallback={null}>
          <TournamentBracketModal
            isOpen={!!bracketModalTournament}
            onClose={() => setBracketModalTournament(null)}
            tournament={bracketModalTournament}
            currentUser={currentUser}
            onOpenDispute={handleOpenDispute}
            onSubmitResult={handleOpenResultSubmit}
          />
        </Suspense>
      )}

      {/* Free Registration Modal */}
      {registerModalTournament && (
        <Suspense fallback={null}>
          <TournamentRegisterModal
            isOpen={!!registerModalTournament}
            onClose={() => setRegisterModalTournament(null)}
            tournament={registerModalTournament}
            currentUser={currentUser}
            onSuccess={(msg) => {
              if (onNotify) onNotify(msg);
            }}
            onNotify={onNotify}
          />
        </Suspense>
      )}

      {/* Match Result Submission Modal */}
      {resultModalOpen && (
        <Suspense fallback={null}>
          <MatchResultModal
            isOpen={resultModalOpen}
            onClose={() => setResultModalOpen(false)}
            matchId={actionMatchId || ''}
            tournamentId={actionTourneyId || ''}
            currentUser={currentUser}
            onSuccess={(msg) => {
              if (onNotify) onNotify(msg);
            }}
          />
        </Suspense>
      )}

      {/* Dispute Modal */}
      {disputeModalOpen && (
        <Suspense fallback={null}>
          <TournamentDisputeModal
            isOpen={disputeModalOpen}
            onClose={() => setDisputeModalOpen(false)}
            matchId={actionMatchId || ''}
            tournamentId={actionTourneyId || ''}
            currentUser={currentUser}
            onSuccess={(msg) => {
              if (onNotify) onNotify(msg);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

function CountdownBanner({
  tournament,
  currentUser,
  isAdmin,
  onOpenBracket,
}: {
  tournament: TournamentEntity;
  currentUser?: any;
  isAdmin: boolean;
  onOpenBracket: () => void;
}) {
  const { pushVisualAlert } = useAccessibility();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const target = new Date(tournament.date).getTime();
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  const isImminent = diff <= 15 * 60 * 1000;
  const roomGate = db.isRoomUnlockedForUser(tournament, currentUser?.id, isAdmin);

  const units = [
    { label: 'Days', value: days },
    { label: 'Hours', value: hours },
    { label: 'Mins', value: mins },
    { label: 'Secs', value: secs },
  ];

  // Screen-reader friendly summary that updates per minute rather than every second
  const srCountdownSummary =
    diff === 0
      ? `${tournament.title} is live now. Custom room status is available in the bracket.`
      : `Next competition ${tournament.title} starts in ${days} days, ${hours} hours, and ${mins} minutes.`;

  return (
    <section
      aria-label="Next tournament countdown and visual alert"
      className="glass-strong relative overflow-hidden rounded-2xl p-5 border border-gold-400/30"
    >
      <div className="sr-only" role="timer" aria-live="polite" aria-atomic="true">
        {srCountdownSummary}
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 92% 10%, rgba(245, 158, 11, 0.16), transparent 45%)',
        }}
        aria-hidden="true"
      />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gold-400/15 text-gold-300" aria-hidden="true">
            <Timer className="h-6 w-6" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <span className="rounded bg-[#00f0ff]/15 border border-[#00f0ff]/45 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#00f0ff]">
                VISUAL TIMER
              </span>
              {isImminent && (
                <span className="rounded bg-[#b000ff]/25 border border-[#b000ff] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                  {roomGate.unlocked ? 'ROOM CREDENTIALS READY' : 'STARTING SOON'}
                </span>
              )}
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-300">
              Next Live Competition Starts In
            </p>
            <p className="font-display text-lg font-bold text-white">{tournament.title}</p>
            <p className="text-xs text-slate-400">
              {tournament.gameName} • {tournament.startTime}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {/* Visual ticking clock hidden from AT to avoid 1-second spam; sr-only timer handles AT */}
          <div className="flex flex-wrap gap-2" aria-hidden="true">
            {units.map((u) => (
              <div
                key={u.label}
                className="min-w-[3.25rem] rounded-xl border border-white/10 bg-ink-900/60 px-2.5 py-1.5 text-center"
              >
                <p className="font-mono text-xl font-bold text-white tabular-nums">
                  {u.value.toString().padStart(2, '0')}
                </p>
                <p className="text-[9px] uppercase tracking-wider text-slate-400">{u.label}</p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              if (roomGate.unlocked && roomGate.creds) {
                pushVisualAlert({
                  kind: 'room_code',
                  badge: 'ROOM CODE LIVE',
                  title: `${tournament.title} (${tournament.startTime})`,
                  message: `Custom Room open on ${roomGate.creds.server}. Join 10 minutes before kickoff.`,
                  roomId: roomGate.creds.roomId,
                  roomPassword: roomGate.creds.roomPassword,
                  actionLabel: 'Inspect Bracket',
                  onAction: onOpenBracket,
                });
              } else {
                pushVisualAlert({
                  kind: 'countdown',
                  badge: diff === 0 ? 'CHECK-IN OPEN' : 'COUNTDOWN VISUAL ALERT',
                  title: `${tournament.title} (${tournament.startTime})`,
                  message:
                    roomGate.reason === 'unregistered'
                      ? `Reminder active: ${days}d ${hours}h ${mins}m remaining. Register for free to unlock your private custom room ID & password.`
                      : `Reminder active: ${days}d ${hours}h ${mins}m remaining. Your room credentials will unlock prior to match start.`,
                  actionLabel: 'Inspect Bracket',
                  onAction: onOpenBracket,
                });
              }
            }}
            className="rounded-xl border border-[#00f0ff]/60 bg-[#00f0ff]/15 px-3.5 py-2 text-xs font-bold text-[#00f0ff] hover:bg-[#00f0ff]/25 cursor-pointer"
          >
            Visual Alert Pop-Up
          </button>

          <button
            type="button"
            onClick={onOpenBracket}
            className="rounded-xl bg-gold-400 px-4 py-2 text-xs font-bold text-ink-950 hover:bg-gold-300 shadow-glow cursor-pointer"
          >
            View Bracket
          </button>
        </div>
      </div>
    </section>
  );
}

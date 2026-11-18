import { useEffect, useState, type ReactNode } from 'react';
import {
  Activity,
  ArrowLeft,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  Droplets,
  Eye,
  Flame,
  Hand,
  HeartPulse,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Trophy,
  Wind,
} from 'lucide-react';
import type { PageId } from '@/hooks/useRouter';
import { db, type UserAccount } from '@/services/db';
import {
  DAILY_PLAYTIME_LIMIT_SECONDS,
  type DailyWellnessState,
  formatDurationHMS,
  formatDurationShort,
  getSecondsUntilMidnight,
  wellnessEngine,
} from '@/services/wellnessEngine';
import MindfulCompanionChat from '@/components/MindfulCompanionChat';
import Reveal, { StaggerGrid, StaggerItem } from '@/components/Reveal';
import { useTilt } from '@/hooks/useMotion';

function WellnessTiltCard({
  children,
  className = '',
  maxTilt = 5,
}: {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
}) {
  const { ref, onMove, onLeave } = useTilt<HTMLElement>(maxTilt);
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

interface HealthWellnessPageProps {
  currentUser: UserAccount | null;
  onNavigate: (page: PageId) => void;
  onNotify?: (
    message: string,
    opts?: { title?: string; type?: 'success' | 'info' | 'warning' | 'error'; targetPage?: PageId; persist?: boolean }
  ) => void;
}

const DIGITAL_DETOX_CARDS = [
  {
    icon: Clock,
    title: 'Sustainable 45 / 15 Cadence',
    cadence: 'Every 45 min',
    summary:
      'Step out of ranked lobbies for 15 minutes every 45 minutes of intense focus. Reaction speed drops noticeably after 60 continuous minutes without a visual break.',
    checklist: [
      'Cap active gaming at 2h 00m per day (enforced automatically)',
      'Stand up between matches instead of queuing immediately',
      'Leave devices outside the bed zone 45 minutes before sleep',
    ],
  },
  {
    icon: Eye,
    title: '20-20-20 Eye-Strain Shield',
    cadence: 'Every 20 min',
    summary:
      'Looking at high-contrast HUDs lowers blink rate by up to 60%, causing dry eyes and tension headaches. Relax your focal muscles on a regular beat.',
    checklist: [
      'Every 20 minutes, look at an object 20 feet (6m) away for 20 seconds',
      'Match screen brightness to room lighting rather than max contrast',
      'Blink slowly 5 times after closing a match scoreboard',
    ],
  },
  {
    icon: Moon,
    title: 'Sleep Hygiene & Next-Day Reflexes',
    cadence: 'Night routine',
    summary:
      'Consistent 7.5–8.5 hour sleep improves aim precision and decision timing far more than late-night grinding on a fatigued brain.',
    checklist: [
      'Avoid high-adrenaline squad scrims in the final hour before bed',
      'Enable warm night-shift filtering after 8:00 PM EAT',
      'End the night on a calm cooldown rather than chasing one last win',
    ],
  },
];

const ERGONOMIC_GUIDES = [
  {
    id: 'wrists',
    icon: Hand,
    title: 'Thumb, Wrist & Tendon Release',
    duration: '60 sec',
    steps: [
      'Extend one arm forward palm-up and gently draw fingers back for 15 seconds per hand.',
      'Rotate both wrists in slow circles 8 times clockwise and 8 times counter-clockwise.',
      'Shake out fingers loosely at your sides to release mobile grip tension.',
    ],
  },
  {
    id: 'posture',
    icon: Activity,
    title: 'Neck & Spine Alignment',
    duration: '45 sec',
    steps: [
      'Lift phone or monitor closer to eye height so your neck isn’t crane-tilted downward.',
      'Draw shoulder blades gently down and back, holding for 3 slow nasal breaths.',
      'Keep both feet flat on the floor with elbows relaxed near 90–100 degrees.',
    ],
  },
  {
    id: 'hydration',
    icon: Droplets,
    title: 'Hydration & Micro-Movement',
    duration: 'Every match',
    steps: [
      'Keep a full water bottle within reach and drink 3–4 sips between matches.',
      'Do 10 bodyweight calf raises or walk across the room to boost circulation.',
      'Replace sugary energy drinks after afternoon hours with plain water or herbal tea.',
    ],
  },
];

const TILT_RECOVERY_CARDS = [
  {
    title: 'The 2-Loss Pause Rule',
    tag: 'Match Discipline',
    description:
      'Two consecutive frustrating losses trigger tunnel vision and impulsive rushes. Close the queue for at least 20 minutes before deciding whether to play again.',
    prompt: 'I just hit 2 rough losses in a row and feel tilted. Help me follow the 2-loss pause rule calmly.',
  },
  {
    title: 'Separate Worth from Rank',
    tag: 'Mindset Grounding',
    description:
      'One unlucky drop, lag spike, or bad scoreboard does not erase your skill or identity. Treat tough games as match film to learn one adjustment and move forward.',
    prompt: 'A bad match and lag spike ruined my mood. Remind me how to separate my self-worth from ranked points.',
  },
  {
    title: 'Calm Nervous System Reset',
    tag: 'Post-Match Decompression',
    description:
      'When your heart is pounding from clutch rounds, physiological sighs (two quick inhales through the nose, one long exhale through the mouth) drop arousal fast.',
    prompt: 'My heart is racing after an intense clutch loss. Guide me through physiological sighs and grounding.',
  },
];

export default function HealthWellnessPage({
  currentUser,
  onNavigate,
  onNotify,
}: HealthWellnessPageProps) {
  const [wellness, setWellness] = useState<DailyWellnessState>(() => wellnessEngine.getState());
  const [midnightSeconds, setMidnightSeconds] = useState<number>(() => getSecondsUntilMidnight());
  const [breathMode, setBreathMode] = useState<'box' | 'relax'>('box');
  const [breathRunning, setBreathRunning] = useState(false);
  const [breathSec, setBreathSec] = useState(0);
  const [eyeTimerSec, setEyeTimerSec] = useState<number | null>(null);
  const [completedErgonomicIds, setCompletedErgonomicIds] = useState<string[]>([]);
  const [queuedCoachPrompt, setQueuedCoachPrompt] = useState<string | null>(null);

  useEffect(() => {
    setWellness(wellnessEngine.getState());
    const unsub = wellnessEngine.subscribe(() => {
      setWellness(wellnessEngine.getState());
    });
    const tick = window.setInterval(() => {
      setMidnightSeconds(getSecondsUntilMidnight());
    }, 1000);
    return () => {
      unsub();
      window.clearInterval(tick);
    };
  }, []);

  useEffect(() => {
    if (!breathRunning) {
      setBreathSec(0);
      return;
    }
    const cycleLen = breathMode === 'box' ? 16 : 19;
    const id = window.setInterval(() => {
      setBreathSec((prev) => (prev + 1) % cycleLen);
    }, 1000);
    return () => window.clearInterval(id);
  }, [breathRunning, breathMode]);

  useEffect(() => {
    if (eyeTimerSec === null) return;
    if (eyeTimerSec <= 0) {
      setEyeTimerSec(null);
      const next = wellnessEngine.logStretchBreak();
      setWellness(next);
      onNotify?.('20-20-20 Eye Rest complete! Logged as a healthy wellness break.', {
        title: 'Eye Care Complete',
        type: 'success',
        persist: false,
      });
      return;
    }
    const id = window.setTimeout(() => {
      setEyeTimerSec((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => window.clearTimeout(id);
  }, [eyeTimerSec, onNotify]);

  const weeklyStatus = db.getWeeklyTournamentLimitStatus(currentUser);
  const usedPct = Math.min(
    100,
    Math.round((wellness.totalSeconds / DAILY_PLAYTIME_LIMIT_SECONDS) * 100)
  );
  const remainingSec = Math.max(0, DAILY_PLAYTIME_LIMIT_SECONDS - wellness.totalSeconds);

  const getBreathLabel = () => {
    if (!breathRunning) return breathMode === 'box' ? 'Box Breathing (4-4-4-4)' : 'Calm 4-7-8 Breath';
    if (breathMode === 'box') {
      if (breathSec < 4) return `Inhale · ${4 - breathSec}s`;
      if (breathSec < 8) return `Hold · ${8 - breathSec}s`;
      if (breathSec < 12) return `Exhale · ${12 - breathSec}s`;
      return `Hold empty · ${16 - breathSec}s`;
    }
    if (breathSec < 4) return `Inhale · ${4 - breathSec}s`;
    if (breathSec < 11) return `Hold gently · ${11 - breathSec}s`;
    return `Long exhale · ${19 - breathSec}s`;
  };

  const handleLogStretch = (id: string, label: string) => {
    if (!completedErgonomicIds.includes(id)) {
      setCompletedErgonomicIds((prev) => [...prev, id]);
    }
    const next = wellnessEngine.logStretchBreak();
    setWellness(next);
    onNotify?.(`${label} logged (${next.stretchBreaksLogged} healthy breaks today).`, {
      title: 'Wellness Break Recorded',
      type: 'success',
      persist: false,
    });
  };

  return (
    <div className="relative min-h-screen pt-20 pb-24">
      {/* Top Hero & Live Wellness Telemetry */}
      <section className="relative py-10 lg:py-12">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-primary-400" aria-hidden="true" />
              <span>Back to Dashboard</span>
            </button>

            <div className="flex items-center gap-2 text-xs text-emerald-300 font-semibold">
              <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <span>2h Daily Cap &amp; 1-Tournament/Week Fair Play Protection Active</span>
            </div>
          </div>

          <Reveal>
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300 mb-3">
                <HeartPulse className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                <span>Responsible Gaming &amp; Digital Wellness Portal</span>
              </div>
              <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-white leading-tight text-shadow-glow">
                Health, Balance &amp; <span className="text-gradient">Mindful Play</span>
              </h1>
              <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
                Peak esports performance starts with clear eyes, relaxed hands, steady sleep, and emotional calm. Monitor your 2-hour daily screen cap, weekly tournament pace, ergonomic breaks, and talk anytime with Mindful Companion.
              </p>
            </div>
          </Reveal>

          {/* 3-Column Live Wellness Overview */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-5 tabular-nums">
            {/* Daily 2-Hour Playtime Cap Card */}
            <div className="card-spotlight glass-strong rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary-300 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-primary-400" aria-hidden="true" />
                    Daily 2-Hour Cap
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-300">
                    {usedPct}% Used
                  </span>
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-mono text-2xl sm:text-3xl font-extrabold text-white">
                    {formatDurationHMS(wellness.totalSeconds)}
                  </span>
                  <span className="text-xs font-mono text-slate-400">/ 02:00:00</span>
                </div>

                <div className="mt-3 h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      usedPct >= 90
                        ? 'bg-gradient-to-r from-amber-400 to-rose-400'
                        : 'bg-gradient-to-r from-emerald-400 via-cyan-400 to-primary-400'
                    }`}
                    style={{ width: `${usedPct}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
                <span>
                  Remaining today:{' '}
                  <strong className="font-mono text-emerald-300">
                    {formatDurationShort(remainingSec)}
                  </strong>
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  Resets in {formatDurationHMS(midnightSeconds)}
                </span>
              </div>
            </div>

            {/* Weekly Tournament Cool-Down Limit Card */}
            <div className="card-spotlight glass-strong rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-amber-400" aria-hidden="true" />
                    Weekly Tournament Pace
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-300">
                    {weeklyStatus.limited ? '1 / 1 Entered' : '0 / 1 Entered'}
                  </span>
                </div>

                <div className="mt-3">
                  <p className="font-display text-xl font-extrabold text-white">
                    {weeklyStatus.limited
                      ? 'Weekly Slot Active'
                      : '1 Weekly Entry Available'}
                  </p>
                  <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                    {weeklyStatus.limited && weeklyStatus.activeReg
                      ? `Registered in ${weeklyStatus.activeReg.tournamentTitle}. Limiting entries to 1 per Mon–Sun week prevents burnout and keeps squads fair.`
                      : 'Verified players may join 1 tournament per Monday–Sunday calendar week for healthy pacing and fair bracket access.'}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-400">
                  Window: <strong className="text-slate-200">{weeklyStatus.week.rangeLabel}</strong>
                </span>
                <span className="text-amber-300 font-mono text-[11px]">
                  Next cycle: {weeklyStatus.week.nextResetLabel}
                </span>
              </div>
            </div>

            {/* Guided Breathing & Eye Reset Tool */}
            <div className="card-spotlight glass-strong rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                    <Wind className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                    Quick Reset Studio
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-300">
                    {wellness.stretchBreaksLogged} Breaks Today
                  </span>
                </div>

                <p className="mt-3 font-display text-xl font-extrabold text-white">
                  {getBreathLabel()}
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  {eyeTimerSec !== null
                    ? `Look 20 feet away · ${eyeTimerSec}s left`
                    : 'Run a guided breathing cadence or 20-second eye relaxation timer anytime.'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBreathRunning((r) => !r)}
                  className="rounded-xl bg-emerald-500/20 border border-emerald-400/40 px-3.5 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/30 transition-colors cursor-pointer"
                >
                  {breathRunning ? 'Stop Breath' : 'Start Breath'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBreathRunning(false);
                    setBreathMode((m) => (m === 'box' ? 'relax' : 'box'));
                  }}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white cursor-pointer"
                >
                  Mode: {breathMode === 'box' ? '4-4-4-4' : '4-7-8'}
                </button>
                <button
                  type="button"
                  onClick={() => setEyeTimerSec((s) => (s === null ? 20 : null))}
                  className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 cursor-pointer"
                >
                  {eyeTimerSec !== null ? `Eyes: ${eyeTimerSec}s` : '20s Eye Rest'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="divider-glow" />

      {/* SECTION 1: DIGITAL DETOX & BALANCE TIPS */}
      <section className="py-12">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-7">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary-300 flex items-center gap-1.5">
                <Sun className="h-4 w-4 text-primary-400" aria-hidden="true" />
                Digital Detox &amp; Balance
              </span>
              <h2 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-white">
                Healthy Gaming Cadence, Eyes &amp; Sleep
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md">
              Short structured pauses keep reflexes sharp without sacrificing rest, school, or work energy.
            </p>
          </div>

          <StaggerGrid className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {DIGITAL_DETOX_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <StaggerItem key={card.title} className="h-full">
                  <WellnessTiltCard className="glass h-full rounded-3xl p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-500/15 border border-primary-400/30 text-primary-300">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <span className="text-xs font-mono font-semibold text-primary-300">
                          {card.cadence}
                        </span>
                      </div>
                      <h3 className="font-display text-lg font-bold text-white">{card.title}</h3>
                      <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {card.summary}
                      </p>
                    </div>

                    <ul className="mt-4 pt-4 border-t border-white/10 space-y-2 text-xs text-slate-300">
                      {card.checklist.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <CheckCircle2
                            className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </WellnessTiltCard>
                </StaggerItem>
              );
            })}
          </StaggerGrid>
        </div>
      </section>

      <div className="divider-glow" />

      {/* SECTION 2: ERGONOMIC & PHYSICAL HEALTH */}
      <section className="py-12">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-7">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                Ergonomic &amp; Physical Health
              </span>
              <h2 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-white">
                Wrist Stretches, Posture &amp; Hydration Check-Ins
              </h2>
            </div>
            <span className="text-xs font-mono text-emerald-300 tabular-nums">
              Completed today: {wellness.stretchBreaksLogged} physical resets
            </span>
          </div>

          <StaggerGrid className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {ERGONOMIC_GUIDES.map((guide) => {
              const Icon = guide.icon;
              const done = completedErgonomicIds.includes(guide.id);
              return (
                <StaggerItem key={guide.id} className="h-full">
                  <WellnessTiltCard className="glass h-full rounded-3xl p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <span className="text-xs font-mono font-semibold text-slate-300">
                          {guide.duration}
                        </span>
                      </div>
                      <h3 className="font-display text-lg font-bold text-white">{guide.title}</h3>
                      <ol className="mt-3 space-y-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {guide.steps.map((step, i) => (
                          <li key={step} className="flex items-start gap-2">
                            <span className="font-mono text-xs font-bold text-emerald-400 shrink-0 mt-0.5">
                              0{i + 1}.
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleLogStretch(guide.id, guide.title)}
                      className={`mt-5 w-full rounded-xl py-2.5 px-4 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                        done
                          ? 'border border-emerald-400/40 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
                          : 'border border-white/15 bg-white/[0.06] text-white hover:border-emerald-400/40 hover:bg-emerald-500/15'
                      }`}
                    >
                      <CalendarCheck2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                      <span>{done ? 'Completed — Log Another Break' : 'Mark Stretch Complete (+1 Break)'}</span>
                    </button>
                  </WellnessTiltCard>
                </StaggerItem>
              );
            })}
          </StaggerGrid>
        </div>
      </section>

      <div className="divider-glow" />

      {/* SECTION 3: EMOTIONAL WELL-BEING & TILT RECOVERY */}
      <section className="py-12">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-7">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-amber-400" aria-hidden="true" />
                Emotional Well-Being &amp; Tilt Recovery
              </span>
              <h2 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-white">
                Recover Calmly From Competitive Stress &amp; Losses
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md">
              Select any scenario below to open a tailored calming session with Mindful Companion.
            </p>
          </div>

          <StaggerGrid className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            {TILT_RECOVERY_CARDS.map((card) => (
              <StaggerItem key={card.title} className="h-full">
                <WellnessTiltCard className="glass h-full rounded-3xl p-6 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                      {card.tag}
                    </span>
                    <h3 className="mt-1.5 font-display text-lg font-bold text-white">
                      {card.title}
                    </h3>
                    <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {card.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setQueuedCoachPrompt(card.prompt);
                      document.getElementById('mindful-companion-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/35 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2.5 text-xs font-bold text-amber-200 transition-colors cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Talk Through This With Coach</span>
                  </button>
                </WellnessTiltCard>
              </StaggerItem>
            ))}
          </StaggerGrid>

          {/* SECTION 4: DEDICATED MINDFUL COMPANION CHATBOT */}
          <div id="mindful-companion-section">
            <MindfulCompanionChat
              gamerTag={currentUser?.gamerTag}
              dailySecondsUsed={wellness.totalSeconds}
              dailyLimitSeconds={DAILY_PLAYTIME_LIMIT_SECONDS}
              weeklyTournamentUsed={weeklyStatus.limited}
              externalMoodPrompt={queuedCoachPrompt}
              onMoodPromptConsumed={() => setQueuedCoachPrompt(null)}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

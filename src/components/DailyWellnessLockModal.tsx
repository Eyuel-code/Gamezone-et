import { useEffect, useRef, useState } from 'react';
import {
  Clock,
  Coffee,
  Eye,
  HeartPulse,
  Moon,
  ShieldCheck,
  Sun,
  Wind,
  BookOpen,
} from 'lucide-react';
import {
  type DailyWellnessState,
  formatDurationHMS,
  formatDurationShort,
  getSecondsUntilMidnight,
} from '@/services/wellnessEngine';
import { useAccessibility } from '@/context/AccessibilityContext';

interface DailyWellnessLockModalProps {
  open: boolean;
  wellnessState: DailyWellnessState;
  gamerTag?: string;
}

type BreathStep = 'Inhale slowly (4s)' | 'Hold gently (7s)' | 'Exhale completely (8s)';

export default function DailyWellnessLockModal({
  open,
  wellnessState,
  gamerTag,
}: DailyWellnessLockModalProps) {
  const { reduceMotion } = useAccessibility();
  const [midnightSeconds, setMidnightSeconds] = useState<number>(() => getSecondsUntilMidnight());
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathTick, setBreathTick] = useState(0); // 19-second cycle: 0..3 inhale, 4..10 hold, 11..18 exhale
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setMidnightSeconds(getSecondsUntilMidnight());
    const id = window.setInterval(() => {
      setMidnightSeconds(getSecondsUntilMidnight());
    }, 1000);
    return () => window.clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open || !breathingActive) {
      setBreathTick(0);
      return;
    }
    const id = window.setInterval(() => {
      setBreathTick((prev) => (prev + 1) % 19);
    }, 1000);
    return () => window.clearInterval(id);
  }, [open, breathingActive]);

  // Trap Tab / Shift+Tab focus strictly inside the non-dismissible alertdialog and block Escape
  useEffect(() => {
    if (!open) return;
    const prevFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const getFocusable = () => {
      const container = dialogRef.current;
      if (!container) return [];
      return Array.from(
        container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
    };

    window.setTimeout(() => {
      const list = getFocusable();
      if (list[0]) list[0].focus();
      else dialogRef.current?.focus();
    }, 10);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.key === 'Tab') {
        const list = getFocusable();
        if (list.length === 0) {
          e.preventDefault();
          dialogRef.current?.focus();
          return;
        }
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      prevFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const breathPhase: BreathStep =
    breathTick < 4
      ? 'Inhale slowly (4s)'
      : breathTick < 11
      ? 'Hold gently (7s)'
      : 'Exhale completely (8s)';
  const breathCountdown =
    breathTick < 4 ? 4 - breathTick : breathTick < 11 ? 11 - breathTick : 19 - breathTick;
  const breathScale =
    breathTick < 4
      ? 1 + (breathTick + 1) * 0.08
      : breathTick < 11
      ? 1.32
      : 1.32 - (breathTick - 10) * 0.04;

  const offlineIdeas = [
    {
      icon: Sun,
      title: 'Step Outside & Reset',
      desc: 'Take a 15-minute walk in fresh air and let your eyes focus on distant horizon lines.',
    },
    {
      icon: BookOpen,
      title: 'Study or Deep Focus',
      desc: 'Channel your competitive focus into homework, reading, coding, or a personal skill.',
    },
    {
      icon: Coffee,
      title: 'Hydrate & Stretch',
      desc: 'Drink a full glass of water, roll your shoulders back, and rest your wrists.',
    },
    {
      icon: Moon,
      title: 'Protect Tonight’s Sleep',
      desc: 'Stepping away early lowers blue-light eye strain and sharpens tomorrow’s reaction speed.',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-ink-950/92 backdrop-blur-2xl animate-fade-in"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="daily-wellness-lock-title"
      aria-describedby="daily-wellness-lock-desc"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative w-full max-w-2xl rounded-3xl glass-strong border border-emerald-400/35 p-6 sm:p-8 shadow-2xl focus:outline-none my-auto"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 shadow-glow">
              <HeartPulse className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                Daily Responsible Gaming Cap Reached
              </p>
              <h2
                id="daily-wellness-lock-title"
                className="font-display text-xl sm:text-2xl font-extrabold text-white"
              >
                Time to Rest &amp; Recharge{gamerTag ? `, ${gamerTag}` : ''}
              </h2>
            </div>
          </div>

          <div className="rounded-2xl border border-primary-400/30 bg-primary-500/10 px-4 py-2.5 text-left sm:text-right shrink-0">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-primary-300">
              Unlocks At Midnight
            </span>
            <span
              className="font-mono text-xl font-black text-white tabular-nums"
              aria-live="polite"
            >
              {formatDurationHMS(midnightSeconds)}
            </span>
          </div>
        </div>

        <p id="daily-wellness-lock-desc" className="mt-5 text-sm text-slate-200 leading-relaxed">
          You’ve completed <strong className="text-white">2 hours of active engagement</strong> on GameZone ET today. To protect your focus, eyes, and long-term performance, in-browser game access is gently paused until tomorrow.
        </p>

        {/* Comforting Daily Session Stats */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
              <Clock className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              <span>Total Active Today</span>
            </div>
            <p className="mt-1.5 font-mono text-lg font-extrabold text-emerald-300">
              {formatDurationHMS(wellnessState.totalSeconds)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">2h 00m daily wellness cap</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
              <Eye className="h-3.5 w-3.5 text-primary-400" aria-hidden="true" />
              <span>In-Browser Games</span>
            </div>
            <p className="mt-1.5 font-mono text-lg font-extrabold text-primary-300">
              {formatDurationShort(wellnessState.gameSeconds)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Platform browsing: {formatDurationShort(wellnessState.platformSeconds)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
              <span>Healthy Streak</span>
            </div>
            <p className="mt-1.5 font-mono text-lg font-extrabold text-amber-300">
              {wellnessState.stretchBreaksLogged} Breaks
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Daily limit locks cleanly at 2h</p>
          </div>
        </div>

        {/* Guided 4-7-8 Calm Breathing Exercise usable directly during cooldown */}
        <div className="mt-5 rounded-2xl border border-cyan-400/25 bg-cyan-500/[0.07] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-cyan-400/40 bg-cyan-500/20 text-cyan-200 transition-transform duration-700"
              style={{ transform: reduceMotion ? 'none' : `scale(${breathingActive ? breathScale : 1})` }}
            >
              <Wind className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                {breathingActive ? `${breathPhase} · ${breathCountdown}s` : '1-Minute 4-7-8 Eye & Mind Reset'}
              </p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {breathingActive
                  ? 'Soften your shoulders, unclench your jaw, and look away from the screen.'
                  : 'Lower heart rate and relax eye muscles before stepping away from your desk.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBreathingActive((v) => !v)}
            className="shrink-0 rounded-xl border border-cyan-400/40 bg-cyan-500/20 hover:bg-cyan-500/30 px-4 py-2 text-xs font-bold text-cyan-200 transition-colors cursor-pointer"
          >
            {breathingActive ? 'Pause Breathing' : 'Start Guided Breath'}
          </button>
        </div>

        {/* Off-screen healthy prompts */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {offlineIdeas.map((idea) => {
            const Icon = idea.icon;
            return (
              <div
                key={idea.title}
                className="rounded-2xl border border-white/10 bg-white/[0.025] p-3.5 flex items-start gap-3"
              >
                <Icon className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h3 className="text-xs font-bold text-white">{idea.title}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{idea.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <span>
            GameZone ET Responsible Gaming Protection · Non-dismissible until 00:00 local midnight reset
          </span>
          <span className="font-mono text-emerald-300 tabular-nums">
            Resets in {formatDurationHMS(midnightSeconds)}
          </span>
        </div>
      </div>
    </div>
  );
}

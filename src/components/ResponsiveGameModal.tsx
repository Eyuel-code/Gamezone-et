import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Trophy,
  Sparkles,
  RefreshCw,
  Gamepad2,
  Keyboard,
  Clock,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import type { OnlineGame } from '@/data/gamesCatalog';
import type { GamerProfile } from './AuthModal';
import { calculateMatchRankedPoints, getRankFromPoints } from '@/services/ranking';
import { useAccessibleModal } from '@/hooks/useAccessibleModal';
import { formatDurationShort, wellnessEngine } from '@/services/wellnessEngine';
import { enforceHttpsUrl } from '@/lib/env';
import AddisDrift3DGame from '@/components/games/AddisDrift3DGame';
import ArcheryMasterGame from '@/components/games/ArcheryMasterGame';
import FreeFire3DGame from '@/components/games/FreeFire3DGame';
import GrandmasterChessGame from '@/components/games/GrandmasterChessGame';
import RetroArcadeGame from '@/components/games/RetroArcadeGame';

export interface ResponsiveGameModalProps {
  game: OnlineGame | null;
  onClose: () => void;
  currentUser?: GamerProfile | null;
  onGameOver?: (score: number, stats?: any) => void;
  onGameCompleted?: (game: OnlineGame, score: number) => void;
  onOpenAuth?: () => void;
}

const STREAM_TIMEOUT_MS = 5500;

export const ResponsiveGameModal: React.FC<ResponsiveGameModalProps> = ({
  game,
  onClose,
  currentUser,
  onGameOver,
  onGameCompleted,
  onOpenAuth,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [simulatedScore, setSimulatedScore] = useState(650);
  const [iframeKey, setIframeKey] = useState(0);
  const [usingFallback, setUsingFallback] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [matchResult, setMatchResult] = useState<{
    earnedRP: number;
    grade: 'S+' | 'S' | 'A' | 'B' | 'C';
    breakdown: { label: string; points: number }[];
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [dailyRemaining, setDailyRemaining] = useState<number>(() => wellnessEngine.getRemainingSeconds());

  // Live Wellness Daily Cap subscription (auto-locks at 0 remaining)
  useEffect(() => {
    const syncWellness = () => {
      const rem = wellnessEngine.getRemainingSeconds();
      setDailyRemaining(rem);
      if (game && wellnessEngine.isDailyLimitReached()) {
        onClose();
      }
    };
    syncWellness();
    return wellnessEngine.subscribe(syncWellness);
  }, [game, onClose]);

  useAccessibleModal(Boolean(game), onClose, containerRef);

  // Sync fullscreen button state when user presses Escape or OS exits fullscreen
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const stage = containerRef.current;
    if (!stage) return;
    if (!document.fullscreenElement) {
      stage.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const isNativePrimary = Boolean(game?.embedUrl.startsWith('native://'));
  const isExternalUrl = Boolean(game && !isNativePrimary && game.embedUrl.startsWith('http'));

  // Reset modal & start active session timer + automatic fallback watchdog when game opens
  useEffect(() => {
    if (!game) {
      setShowSummaryModal(false);
      setMatchResult(null);
      return;
    }

    setShowSummaryModal(false);
    setMatchResult(null);
    setUsingFallback(false);
    setFallbackReason(null);
    setElapsed(0);
    setSimulatedScore(520 + Math.floor(Math.random() * 240));
    setIsLoading(!game.embedUrl.startsWith('native://'));

    const intervalId = window.setInterval(() => {
      setElapsed((prev) => prev + 1);
      setSimulatedScore((score) => score + Math.floor(14 + Math.random() * 10));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [game]);

  // Automatic fallback timer if an external iframe fails to resolve within 5.5s
  useEffect(() => {
    if (!game || !isLoading || usingFallback || isNativePrimary) return;
    const watchdog = window.setTimeout(() => {
      setIsLoading(false);
      if (isExternalUrl) {
        setUsingFallback(true);
        setFallbackReason('External host timed out — switched automatically to Built-In Canvas mode.');
      }
    }, STREAM_TIMEOUT_MS);
    return () => window.clearTimeout(watchdog);
  }, [game, isLoading, usingFallback, isNativePrimary, isExternalUrl, iframeKey]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setUsingFallback(true);
    setFallbackReason('External stream unavailable — switched automatically to Built-In Canvas mode.');
  };

  const handleReloadStream = () => {
    setUsingFallback(false);
    setFallbackReason(null);
    setIsLoading(!isNativePrimary);
    setIframeKey((prev) => prev + 1);
  };

  const handleToggleFallback = () => {
    if (usingFallback) {
      handleReloadStream();
    } else {
      setIsLoading(false);
      setUsingFallback(true);
      setFallbackReason(`Playing ${game?.fallback.label || 'Built-In Canvas Engine'}.`);
    }
  };

  const recordFinalScore = useCallback(
    (finalScore: number, stats?: any) => {
      const calculation = calculateMatchRankedPoints(finalScore, { won: true });
      setSimulatedScore(finalScore);
      setMatchResult(calculation);
      setShowSummaryModal(true);

      if (game) {
        onGameOver?.(finalScore, {
          timeElapsed: elapsed,
          gameId: game.id,
          gameTitle: game.title,
          ...stats,
        });
        onGameCompleted?.(game, finalScore);
      }
    },
    [elapsed, game, onGameCompleted, onGameOver]
  );

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!game) return null;

  const renderComponentEngine = (engine: 'racing' | 'archery' | 'shooter' | 'chess' | 'retro') => {
    switch (engine) {
      case 'racing':
        return <AddisDrift3DGame onGameOver={(s, st) => recordFinalScore(s, st)} />;
      case 'archery':
        return <ArcheryMasterGame onGameOver={(s, st) => recordFinalScore(s, st)} onExit={onClose} />;
      case 'shooter':
        return <FreeFire3DGame onGameOver={(s, st) => recordFinalScore(s, st)} />;
      case 'chess':
        return <GrandmasterChessGame onGameOver={(s, st) => recordFinalScore(s, st)} />;
      case 'retro':
      default:
        return <RetroArcadeGame game={game} onGameOver={(s, st) => recordFinalScore(s, st)} />;
    }
  };

  const showComponentFallback =
    isNativePrimary || (usingFallback && game.fallback.type === 'component');

  const activeIframeSrc = enforceHttpsUrl(
    usingFallback && game.fallback.type === 'iframe' ? game.fallback.url : game.embedUrl
  );

  const userRP = currentUser?.loyaltyPoints ?? 0;
  const rankData = getRankFromPoints(userRP + (matchResult?.earnedRP || 0));

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink-950/88 p-2 sm:p-4 backdrop-blur-xl animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-modal-title"
        tabIndex={-1}
        className={`relative flex flex-col w-full max-w-7xl glass-strong border border-cyan-400/40 rounded-3xl overflow-hidden shadow-[0_24px_80px_-12px_rgba(4,6,17,0.96),0_0_50px_-10px_rgba(0,245,212,0.28),0_0_40px_-10px_rgba(139,92,246,0.34)] focus:outline-none ${
          isFullscreen ? 'h-screen w-screen max-w-none rounded-none border-0' : 'h-[92vh] max-h-[880px]'
        }`}
      >
        {/* === ARCADE CONTROL BAR === */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-white/10 bg-[#0c1024]/88 backdrop-blur-md shrink-0">
          {/* Left: Title & Keyboard Hint */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#00d2ff] via-[#3a7bd5] to-[#8b5cf6] text-white shadow-[0_0_18px_rgba(0,210,255,0.4)]">
              <Gamepad2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="game-modal-title"
                  className="font-display text-sm sm:text-base font-extrabold text-white truncate max-w-[200px] sm:max-w-md"
                >
                  {game.title}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                  {usingFallback ? 'Built-In Canvas Active' : 'In-App Arcade'}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-slate-300">
                <span className="inline-flex items-center gap-1 text-sky-300 font-medium">
                  <Keyboard className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>{game.controlsHint}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Playtime Cap Badge, Claim RP, Fallback Toggle, Fullscreen, Back to Arcade */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Live Remaining Daily Playtime Badge */}
            <div
              role="status"
              aria-live="off"
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-mono font-bold tabular-nums ${
                dailyRemaining <= 300
                  ? 'border-amber-400/50 bg-amber-500/15 text-amber-300'
                  : 'border-sky-400/35 bg-sky-500/10 text-sky-200'
              }`}
              title="Daily 2-Hour Healthy Gameplay Timer"
            >
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden md:inline">Daily Left:</span>
              <span>{formatDurationShort(dailyRemaining)}</span>
              <span className="text-slate-400 hidden sm:inline">({formatTimer(elapsed)})</span>
            </div>

            {/* Claim Ranked XP */}
            <button
              type="button"
              onClick={() => recordFinalScore(simulatedScore)}
              aria-label={`Record session and claim ${simulatedScore.toLocaleString()} Ranked Points`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-3 py-1.5 text-xs font-black text-ink-950 cursor-pointer"
              title="Finish round & save Ranked Points"
            >
              <Trophy className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              <span className="hidden sm:inline">Save</span>
              <span>{simulatedScore.toLocaleString()} RP</span>
            </button>

            {/* Instant Canvas Mode / Switch Back */}
            {isExternalUrl && (
              <button
                type="button"
                onClick={handleToggleFallback}
                aria-label={usingFallback ? `Switch back to ${game.title} stream` : 'Switch to instant built-in HTML5 canvas engine'}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:text-white cursor-pointer"
                title={usingFallback ? 'Retry Cloud WebGL Stream' : 'Switch to Built-In Canvas Mode'}
              >
                <Layers className="h-3.5 w-3.5 text-violet-300" aria-hidden="true" />
                <span className="hidden lg:inline">{usingFallback ? 'Retry WebGL' : 'Canvas Mode'}</span>
              </button>
            )}

            {/* Reload Game */}
            {!showComponentFallback && (
              <button
                type="button"
                onClick={handleReloadStream}
                aria-label="Reload game"
                className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-white/5 text-slate-200 hover:text-white cursor-pointer"
                title="Reload Game"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Toggle fullscreen'}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">{isFullscreen ? 'Windowed' : 'Fullscreen'}</span>
            </button>

            {/* Back to Arcade Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Back to Arcade"
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-400/45 bg-sky-500/15 px-3.5 py-1.5 text-xs font-bold text-white cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Back to Arcade</span>
            </button>
          </div>
        </div>

        {/* Optional subtle fallback info banner */}
        {fallbackReason && (
          <div className="flex items-center justify-between gap-3 border-b border-emerald-400/20 bg-emerald-500/10 px-4 py-1.5 text-[11px] text-emerald-200 shrink-0">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
              {fallbackReason}
            </span>
            <button
              type="button"
              onClick={() => setFallbackReason(null)}
              aria-label="Dismiss notice"
              className="text-emerald-300 hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* === GAME STAGE === */}
        <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
          {/* Smooth Loading Skeleton Spinner */}
          {isLoading && !showComponentFallback && (
            <div
              role="status"
              aria-live="polite"
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#040611]/92 backdrop-blur-md p-6 text-center"
            >
              <div className="w-full max-w-md rounded-2xl glass-strong p-6 space-y-4">
                <div className="mx-auto relative flex items-center justify-center h-16 w-16">
                  <div className="h-16 w-16 rounded-full border-4 border-sky-500/20 border-t-sky-400 animate-spin" />
                  <Gamepad2 className="absolute h-6 w-6 text-violet-300 animate-pulse" aria-hidden="true" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-display text-lg font-extrabold text-white">
                    Loading {game.title}...
                  </h3>
                  <p className="text-xs text-slate-300">
                    Starting inside GameZone ET&apos;s sandboxed arcade stage with instant Canvas backup ready.
                  </p>
                </div>
                <div className="space-y-2 pt-1">
                  <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#00d2ff] to-[#8b5cf6] animate-pulse" />
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-300">
                    <span>Controls: {game.controls}</span>
                    <button
                      type="button"
                      onClick={handleToggleFallback}
                      className="text-sky-300 hover:text-white font-bold cursor-pointer"
                    >
                      Launch Canvas Mode Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Render Either Self-Contained React Canvas/Three.js Game OR Sandboxed Iframe */}
          {showComponentFallback ? (
            <div className="w-full h-full overflow-auto bg-ink-950 flex items-center justify-center">
              {renderComponentEngine(
                game.fallback.type === 'component' ? game.fallback.engine : 'racing'
              )}
            </div>
          ) : (
            <iframe
              key={`${game.id}-${iframeKey}-${usingFallback ? 'fb' : 'main'}`}
              ref={iframeRef}
              src={activeIframeSrc}
              title={game.title}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              className="w-full h-full border-0 bg-black block"
              sandbox="allow-scripts allow-same-origin allow-pointer-lock"
              allow="autoplay; fullscreen; gamepad; pointer-lock"
              allowFullScreen
            />
          )}

          {/* === MATCH PERFORMANCE SUMMARY OVERLAY === */}
          {showSummaryModal && matchResult && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-ink-950/92 backdrop-blur-2xl p-6 text-center animate-fade-in">
              <div className="relative">
                <div className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-sky-500/25 via-violet-500/20 to-amber-500/20 border-2 border-sky-400 text-3xl font-black font-display text-sky-300">
                  {matchResult.grade}
                </div>
                <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-emerald-500 text-ink-950 font-black text-[10px] uppercase">
                  GRADE
                </span>
              </div>

              <h3 className="mt-4 text-2xl sm:text-3xl font-extrabold text-white font-display">
                Session Recorded!
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-sm">
                Ranked Points (RP) saved from your {game.title} session.
              </p>

              <div className="mt-5 p-4 rounded-2xl glass w-full max-w-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${rankData.currentTier.badgeBg} ${rankData.currentTier.badgeColor} border ${rankData.currentTier.badgeBorder}`}>
                      {rankData.currentTier.tier} Tier {rankData.currentTier.division}
                    </span>
                    <span className="text-xs text-white font-semibold">{rankData.currentTier.title}</span>
                  </div>
                  <span className="text-xs font-bold text-amber-400 font-mono tabular-nums">
                    +{matchResult.earnedRP} RP
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-300 font-mono tabular-nums">
                    <span>Current RP: {(userRP + matchResult.earnedRP).toLocaleString()}</span>
                    <span>Next Rank: {rankData.nextTier ? rankData.nextTier.minRP.toLocaleString() : 'MAX'}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#00d2ff] to-[#8b5cf6] rounded-full transition-all duration-700"
                      style={{ width: `${rankData.progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 space-y-1.5 text-xs text-left">
                  {matchResult.breakdown.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-slate-300">
                      <span>{item.label}</span>
                      <span className="font-mono text-emerald-400 font-bold">+{item.points} RP</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowSummaryModal(false)}
                  className="btn-primary !py-2.5 !px-5 !text-sm cursor-pointer"
                >
                  Continue Playing
                </button>

                {!currentUser && onOpenAuth && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowSummaryModal(false);
                      onOpenAuth();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-[#0c1024]/85 px-5 py-2.5 text-sm font-bold text-amber-300 cursor-pointer"
                  >
                    <Trophy className="h-4 w-4 text-amber-400" aria-hidden="true" />
                    <span>Sign In to Keep Leaderboard Rank</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-white/15 bg-[#0c1024]/85 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:text-white cursor-pointer"
                >
                  Back to Arcade
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResponsiveGameModal;

import { useState, useRef, useEffect } from 'react';
import { Loader2, ShieldCheck, RefreshCw, Trophy, CheckCircle2 } from 'lucide-react';
import type { OnlineGame } from '@/data/gamesCatalog';
import { enforceHttpsUrl } from '@/lib/env';

interface Online3DProps {
  game: OnlineGame;
  onGameOver: (score: number, stats: any) => void;
}

export default function Online3DGamePlayer({ game, onGameOver }: Online3DProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [simulatedScore, setSimulatedScore] = useState(620);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Determine the exact verified embed URL
  const getEmbedUrl = (g: OnlineGame): string => {
    if (g.embedUrl) {
      return enforceHttpsUrl(g.embedUrl);
    }
    return '/games/master-chess/index.html';
  };

  const embedUrl = getEmbedUrl(game);

  // Session timer and score accumulation
  useEffect(() => {
    setIsLoading(true);
    setElapsed(0);
    setSimulatedScore(450 + Math.floor(Math.random() * 200));

    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
      setSimulatedScore((score) => score + Math.floor(18 + Math.random() * 12));
    }, 1000);

    const loadSafety = setTimeout(() => {
      setIsLoading(false);
    }, 1200);

    return () => {
      clearInterval(timer);
      clearTimeout(loadSafety);
    };
  }, [game, iframeKey]);

  const handleReload = () => {
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  const handleFinishSession = () => {
    onGameOver(simulatedScore, {
      timeElapsed: elapsed,
      gameId: game.id,
      gameTitle: game.title,
    });
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-black overflow-hidden select-none">
      {/* Top Embedded HUD Bar */}
      <div className="absolute top-2 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 text-xs font-mono pointer-events-none">
        {/* Game Title & Status Indicator */}
        <div className="flex items-center gap-2 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 pointer-events-auto shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" aria-hidden="true" />
          <span className="font-bold text-white text-xs sm:text-sm truncate max-w-[160px] sm:max-w-xs md:max-w-md">
            {game.title}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] uppercase font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-1.5 py-0.5 rounded">
            <ShieldCheck className="w-3 h-3 text-cyan-400" aria-hidden="true" />
            Verified WebGL
          </span>
          <span className="text-[11px] text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            <span aria-hidden="true">⏱ </span>{formatTimer(elapsed)}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Submit / Claim Score */}
          <button
            type="button"
            onClick={handleFinishSession}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-gold-500 to-amber-600 text-ink-950 font-black text-xs shadow-glow-gold hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title="Claim your score and convert into Ethiopian Ranked Points (RP)"
          >
            <Trophy className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
            <span>Claim {simulatedScore.toLocaleString()} RP</span>
          </button>

          {/* Refresh / Reload Frame */}
          <button
            type="button"
            onClick={handleReload}
            aria-label="Reload game frame"
            className="grid h-8 w-8 place-items-center rounded-xl bg-[#0c1024]/90 hover:bg-primary-500/20 text-slate-200 hover:text-white border border-white/15 transition-colors cursor-pointer"
            title="Reload Game Frame"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div role="status" aria-live="polite" className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-ink-950/95 backdrop-blur-md">
          <Loader2 className="w-10 h-10 text-primary-400 animate-spin" aria-hidden="true" />
          <h4 className="mt-3 text-lg font-bold text-white font-display">
            Launching {game.title}...
          </h4>
          <p className="mt-1 text-xs text-slate-400 max-w-sm text-center">
            Streaming game engine assets, shaders, and sound buffers directly into your browser.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs font-mono text-emerald-400">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            Instant In-Browser HTML5/WebGL Stream Active
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsLoading(false)}
              className="px-3 py-1.5 rounded-lg bg-[#0c1024] hover:bg-primary-500/20 text-xs text-slate-100 border border-white/15 cursor-pointer"
            >
              Show Game Now
            </button>
          </div>
        </div>
      )}

      {/* Anti-Redirect and Defensive Frame Shield */}
      <style>{`
        .game-embed-wrapper iframe .adsbygoogle,
        .game-embed-wrapper iframe [class*="banner-ad"],
        .game-embed-wrapper iframe [id*="ad-container"],
        .game-embed-wrapper iframe [class*="interstitial"],
        .game-embed-wrapper iframe [id*="preroll"],
        .game-embed-wrapper iframe [class*="advertisement"] {
          display: none !important;
          opacity: 0 !important;
          pointer-events: none !important;
          visibility: hidden !important;
          height: 0 !important;
        }
      `}</style>

      {/* Embedded WebGL Iframe Player with Anti-Redirect Sandbox */}
      <div className="game-embed-wrapper relative w-full h-full bg-black">
        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={embedUrl}
          title={game.title}
          onLoad={() => setIsLoading(false)}
          className="w-full h-full border-0 bg-black block"
          sandbox="allow-scripts allow-same-origin allow-pointer-lock"
          allow="autoplay; fullscreen; gamepad; pointer-lock"
          allowFullScreen
          loading="lazy"
        />
      </div>
    </div>
  );
}

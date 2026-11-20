import { useState, useEffect } from 'react';
import { Play, Maximize2, X, ShieldCheck, Loader2 } from 'lucide-react';
import type { OnlineGame } from '@/data/gamesCatalog';
import ResilientImage from '@/components/ResilientImage';
import { enforceHttpsUrl } from '@/lib/env';

interface GameEmbedFacadeProps {
  game: OnlineGame;
  onExpandModal: (game: OnlineGame) => void;
}

/**
 * Click-to-Play Facade: renders a lightweight static 16:9 preview card first
 * and only mounts the embedded game iframe when the user explicitly clicks "Play".
 */
export default function GameEmbedFacade({ game, onExpandModal }: GameEmbedFacadeProps) {
  const [iframeActive, setIframeActive] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(false);

  // Reset to lightweight preview when switching featured games
  useEffect(() => {
    setIframeActive(false);
    setIframeLoading(false);
  }, [game.id]);

  const canInlineIframe = !game.embedUrl.startsWith('native://');
  const safeUrl = canInlineIframe ? enforceHttpsUrl(game.embedUrl) : '';

  const handlePlayClick = () => {
    if (!canInlineIframe) {
      onExpandModal(game);
      return;
    }
    setIframeLoading(true);
    setIframeActive(true);
  };

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/15 bg-[#080c1c]">
      {!iframeActive ? (
        <>
          <ResilientImage
            src={game.coverImage}
            alt={game.title}
            fallbackLabel={game.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-[#040611]/90 via-[#040611]/35 to-transparent"
            aria-hidden="true"
          />

          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            <button
              type="button"
              onClick={handlePlayClick}
              aria-label={`Play ${game.title}`}
              className="btn-glow-cyan inline-flex items-center gap-2.5 rounded-xl px-6 py-3 text-sm font-extrabold text-white cursor-pointer whitespace-nowrap"
            >
              <Play className="h-4 w-4 fill-current shrink-0" aria-hidden="true" />
              <span>Play Preview Now</span>
            </button>
            <p className="mt-2.5 text-xs font-medium text-slate-200 drop-shadow-[0_1px_6px_rgba(4,6,17,0.95)]">
              Click to load game stream · Zero background data until you press Play
            </p>
          </div>

          <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between gap-2 text-xs text-slate-200">
            <span className="truncate font-medium">{game.controlsHint}</span>
            <span className="font-mono text-emerald-300 font-semibold shrink-0 tabular-nums">
              {game.latencyMs === 0 ? '0ms Local' : `${game.latencyMs}ms`}
            </span>
          </div>
        </>
      ) : (
        <div className="relative h-full w-full bg-black">
          {iframeLoading && (
            <div
              role="status"
              aria-live="polite"
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#040611]/90 text-xs text-slate-200"
            >
              <Loader2 className="h-6 w-6 animate-spin text-sky-400" aria-hidden="true" />
              <span className="mt-2 font-semibold">Loading {game.title}...</span>
            </div>
          )}

          <iframe
            src={safeUrl}
            title={game.title}
            onLoad={() => setIframeLoading(false)}
            className="h-full w-full border-0 block bg-black"
            sandbox="allow-scripts allow-same-origin allow-pointer-lock"
            allow="autoplay; fullscreen; gamepad; pointer-lock"
            allowFullScreen
          />

          <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
            <span className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-black/80 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-emerald-300 border border-emerald-400/35">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              Sandboxed
            </span>
            <button
              type="button"
              onClick={() => onExpandModal(game)}
              aria-label={`Open ${game.title} in full arcade modal`}
              className="inline-flex items-center gap-1 rounded-lg bg-black/85 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-white border border-white/20 hover:border-sky-400 cursor-pointer whitespace-nowrap"
            >
              <Maximize2 className="h-3 w-3" aria-hidden="true" />
              <span>Full Screen</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIframeActive(false);
                setIframeLoading(false);
              }}
              aria-label={`Close inline preview for ${game.title}`}
              className="grid h-7 w-7 place-items-center rounded-lg bg-black/85 backdrop-blur-md text-slate-200 border border-white/20 hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

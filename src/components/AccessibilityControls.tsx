import {
  Eye,
  Sparkles,
  Type,
  RotateCcw,
  Accessibility,
  PauseCircle,
  PlayCircle,
  Volume2,
  Square,
} from 'lucide-react';
import { useAccessibility, type TextScaleOption } from '@/context/AccessibilityContext';

const SCALE_OPTIONS: { value: TextScaleOption; label: string; desc: string }[] = [
  { value: 1, label: '100%', desc: 'Standard text size (16px)' },
  { value: 1.125, label: '112%', desc: 'Large text size (18px)' },
  { value: 1.25, label: '125%', desc: 'Extra large text size (20px)' },
  { value: 1.5, label: '150%', desc: 'Accessibility zoomed text size (24px)' },
];

export default function AccessibilityControls({ compact = false }: { compact?: boolean }) {
  const {
    highContrast,
    toggleHighContrast,
    reduceMotion,
    toggleReduceMotion,
    backgroundPaused,
    toggleBackgroundPaused,
    readAloud,
    toggleReadAloud,
    ttsSupported,
    isSpeaking,
    readMainContent,
    stopSpeaking,
    textScale,
    setTextScale,
    resetAccessibility,
  } = useAccessibility();

  const hasCustomSettings =
    highContrast || reduceMotion || backgroundPaused || readAloud || textScale !== 1;

  return (
    <section
      aria-label="Accessibility Settings"
      className={compact ? 'space-y-2.5' : 'space-y-3'}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/35">
            <Accessibility className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-white">
            Accessibility
          </span>
        </div>
        {hasCustomSettings && (
          <button
            type="button"
            onClick={resetAccessibility}
            className="inline-flex min-h-[28px] items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold text-[#00f0ff] hover:bg-[#00f0ff]/10 transition-colors cursor-pointer"
            aria-label="Reset accessibility settings to defaults"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Reset
          </button>
        )}
      </div>

      {/* High Contrast Switch */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#0a0a0c]/80 px-3 py-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <Eye className="h-3.5 w-3.5 text-[#00f0ff] shrink-0" aria-hidden="true" />
            <span id="a11y-hc-label">High Contrast</span>
          </div>
          {!compact && (
            <p id="a11y-hc-desc" className="text-[11px] text-slate-400 mt-0.5">
              Sharper borders &amp; brighter text legibility
            </p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={highContrast}
          aria-labelledby="a11y-hc-label"
          aria-describedby={compact ? undefined : 'a11y-hc-desc'}
          onClick={toggleHighContrast}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors cursor-pointer ${
            highContrast
              ? 'border-[#00f0ff] bg-[#00f0ff]/30'
              : 'border-white/20 bg-white/10'
          }`}
        >
          <span className="sr-only">Toggle High Contrast Mode</span>
          <span
            aria-hidden="true"
            className={`inline-block h-4.5 w-4.5 transform rounded-full transition-transform ${
              highContrast
                ? 'translate-x-6 bg-[#00f0ff] shadow-[0_0_8px_#00f0ff]'
                : 'translate-x-1 bg-slate-300'
            }`}
          />
        </button>
      </div>

      {/* Reduce Motion Switch */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#0a0a0c]/80 px-3 py-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <Sparkles className="h-3.5 w-3.5 text-[#b000ff] shrink-0" aria-hidden="true" />
            <span id="a11y-rm-label">Reduce Motion</span>
          </div>
          {!compact && (
            <p id="a11y-rm-desc" className="text-[11px] text-slate-400 mt-0.5">
              Disables 3D tilts, transitions &amp; marquee scroll
            </p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={reduceMotion}
          aria-labelledby="a11y-rm-label"
          aria-describedby={compact ? undefined : 'a11y-rm-desc'}
          onClick={toggleReduceMotion}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors cursor-pointer ${
            reduceMotion
              ? 'border-[#b000ff] bg-[#b000ff]/35'
              : 'border-white/20 bg-white/10'
          }`}
        >
          <span className="sr-only">Toggle Reduce Motion Mode</span>
          <span
            aria-hidden="true"
            className={`inline-block h-4.5 w-4.5 transform rounded-full transition-transform ${
              reduceMotion
                ? 'translate-x-6 bg-[#e299ff] shadow-[0_0_8px_#b000ff]'
                : 'translate-x-1 bg-slate-300'
            }`}
          />
        </button>
      </div>

      {/* Pause Background Motion Switch */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#0a0a0c]/80 px-3 py-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
            {backgroundPaused ? (
              <PlayCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden="true" />
            ) : (
              <PauseCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden="true" />
            )}
            <span id="a11y-bg-label">Pause Background Video</span>
          </div>
          {!compact && (
            <p id="a11y-bg-desc" className="text-[11px] text-slate-400 mt-0.5">
              Freezes ambient hero video &amp; ember particles
            </p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={backgroundPaused || reduceMotion}
          aria-labelledby="a11y-bg-label"
          aria-describedby={compact ? undefined : 'a11y-bg-desc'}
          onClick={toggleBackgroundPaused}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors cursor-pointer ${
            backgroundPaused || reduceMotion
              ? 'border-amber-400 bg-amber-500/35'
              : 'border-white/20 bg-white/10'
          }`}
        >
          <span className="sr-only">Pause or play ambient background motion</span>
          <span
            aria-hidden="true"
            className={`inline-block h-4.5 w-4.5 transform rounded-full transition-transform ${
              backgroundPaused || reduceMotion
                ? 'translate-x-6 bg-amber-300 shadow-[0_0_8px_#f59e0b]'
                : 'translate-x-1 bg-slate-300'
            }`}
          />
        </button>
      </div>

      {/* Read Aloud / Web Speech TTS Control */}
      <div className="rounded-xl border border-white/10 bg-[#0a0a0c]/80 px-3 py-2 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
              <Volume2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
              <span id="a11y-tts-label">Read Page &amp; AI Aloud</span>
            </div>
            {!compact && (
              <p id="a11y-tts-desc" className="text-[11px] text-slate-400 mt-0.5">
                {ttsSupported
                  ? 'Speaks AI replies & page text via Speech Synthesis'
                  : 'Browser Speech Synthesis unavailable on this device'}
              </p>
            )}
          </div>
          <button
            type="button"
            role="switch"
            disabled={!ttsSupported}
            aria-checked={readAloud}
            aria-labelledby="a11y-tts-label"
            aria-describedby={compact ? undefined : 'a11y-tts-desc'}
            onClick={toggleReadAloud}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors cursor-pointer disabled:opacity-40 ${
              readAloud
                ? 'border-emerald-400 bg-emerald-500/35'
                : 'border-white/20 bg-white/10'
            }`}
          >
            <span className="sr-only">Toggle Read Aloud Speech Synthesis</span>
            <span
              aria-hidden="true"
              className={`inline-block h-4.5 w-4.5 transform rounded-full transition-transform ${
                readAloud
                  ? 'translate-x-6 bg-emerald-300 shadow-[0_0_8px_#34d399]'
                  : 'translate-x-1 bg-slate-300'
              }`}
            />
          </button>
        </div>

        {ttsSupported && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={isSpeaking ? stopSpeaking : readMainContent}
              className="flex-1 min-h-[28px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-200 hover:bg-emerald-500/25 cursor-pointer"
            >
              {isSpeaking ? (
                <>
                  <Square className="h-3 w-3 fill-current" aria-hidden="true" />
                  Stop Reading
                </>
              ) : (
                <>
                  <Volume2 className="h-3 w-3" aria-hidden="true" />
                  Read Current Page
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Text Scaling Selector */}
      <div className="rounded-xl border border-white/10 bg-[#0a0a0c]/80 px-3 py-2 space-y-1.5">
        <div className="flex items-center justify-between">
          <span id="a11y-scale-label" className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <Type className="h-3.5 w-3.5 text-[#00f0ff] shrink-0" aria-hidden="true" />
            Text Size
          </span>
          <span className="font-mono text-[10px] text-[#00f0ff] font-bold">
            {Math.round(textScale * 100)}%
          </span>
        </div>
        <div
          role="radiogroup"
          aria-labelledby="a11y-scale-label"
          className="grid grid-cols-4 gap-1.5"
        >
          {SCALE_OPTIONS.map((opt) => {
            const active = textScale === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={opt.desc}
                onClick={() => setTextScale(opt.value)}
                className={`min-h-[28px] rounded-lg py-1 text-[11px] font-bold font-mono transition-colors cursor-pointer border ${
                  active
                    ? 'border-[#00f0ff] bg-[#00f0ff]/20 text-[#00f0ff]'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:text-white hover:border-white/25'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { RotateCcw, Flame, Trophy, Sparkles, Volume2, VolumeX, Shield, Swords } from 'lucide-react';

/**
 * FreeFireHeroStage
 * 
 * An unconstrained, "outside the box" Free Fire cinematic animation.
 * Features real Free Fire character movements from Garena Free Fire:
 * 1. Acrobatic Combat Roll / Slide with flame sparks
 * 2. Epic Golden Fire Aura Farming with energy pillar & lightning
 * 3. Graceful Throne Seating where the character sits proudly
 * 4. Automatic stop into a dignified, living seated posture
 * 5. Holographic MP40 Predatory Cobra EVO Gun overlay & glowing embers
 */

type Phase = 'roll' | 'aura' | 'throne' | 'settled';

export default function FreeFireHeroStage() {
  const [phase, setPhase] = useState<Phase>('roll');
  const [character, setCharacter] = useState<'alok' | 'wolfrahh'>('alok');
  const [isMuted, setIsMuted] = useState(true);
  const [auraLevel, setAuraLevel] = useState(100);

  const rollVideoRef = useRef<HTMLVideoElement>(null);
  const auraVideoRef = useRef<HTMLVideoElement>(null);
  const throneVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Play a specific video with error resilience
  const playVideo = useCallback((v: HTMLVideoElement | null) => {
    if (!v) return;
    v.currentTime = 0;
    const playPromise = v.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay policy fallback: mute and retry
        v.muted = true;
        v.play().catch(() => {});
      });
    }
  }, []);

  // Sequence Controller
  const startFullSequence = useCallback(() => {
    setPhase('roll');
    if (rollVideoRef.current) {
      playVideo(rollVideoRef.current);
    }
  }, [playVideo]);

  // Handle phase transitions
  const onRollEnded = () => {
    setPhase('aura');
    if (auraVideoRef.current) {
      playVideo(auraVideoRef.current);
    }
  };

  const onAuraEnded = () => {
    setPhase('throne');
    if (throneVideoRef.current) {
      playVideo(throneVideoRef.current);
    }
  };

  const onThroneEnded = () => {
    // STOP the animation after the person sits in a graceful manner
    setPhase('settled');
    if (throneVideoRef.current) {
      // Hold on the proud, grateful seated frame
      throneVideoRef.current.pause();
      throneVideoRef.current.currentTime = throneVideoRef.current.duration - 0.05;
    }
  };

  // Jump directly to specific poses
  const jumpToPose = (targetPhase: Phase) => {
    setPhase(targetPhase);
    if (targetPhase === 'roll') {
      playVideo(rollVideoRef.current);
    } else if (targetPhase === 'aura') {
      playVideo(auraVideoRef.current);
    } else if (targetPhase === 'throne' || targetPhase === 'settled') {
      if (throneVideoRef.current) {
        if (targetPhase === 'settled') {
          throneVideoRef.current.currentTime = Math.max(0, throneVideoRef.current.duration - 0.1);
          throneVideoRef.current.pause();
        } else {
          playVideo(throneVideoRef.current);
        }
      }
    }
  };

  // Canvas floating embers & aura rings particle loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 700);

    const onResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth || 600;
      height = canvas.height = canvas.parentElement.clientHeight || 700;
    };
    window.addEventListener('resize', onResize);

    // Particle pool
    const particles = Array.from({ length: 42 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -0.8 - Math.random() * 2.2,
      size: 1.5 + Math.random() * 3.5,
      alpha: 0.2 + Math.random() * 0.8,
      color: Math.random() > 0.4 ? '#ff9900' : '#ff3300',
    }));

    let pulseTime = 0;

    const render = () => {
      pulseTime += 0.035;
      ctx.clearRect(0, 0, width, height);

      // Floor aura reflection glow (unconstrained radial gradient)
      const cx = width * 0.52;
      const cy = height * 0.76;
      const glowGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, width * 0.48);
      const intensity = phase === 'aura' ? 0.45 : phase === 'roll' ? 0.35 : 0.25;
      glowGrad.addColorStop(0, `rgba(255, 120, 20, ${intensity})`);
      glowGrad.addColorStop(0.4, `rgba(245, 178, 0, ${intensity * 0.6})`);
      glowGrad.addColorStop(0.8, `rgba(17, 189, 247, ${intensity * 0.2})`);
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, width * 0.48, 0, Math.PI * 2);
      ctx.fill();

      // Energy shockwaves during aura farming
      if (phase === 'aura' || phase === 'roll') {
        const ringRadius = ((pulseTime * 45) % 180) + 40;
        const ringAlpha = Math.max(0, 1 - ringRadius / 220);
        ctx.strokeStyle = `rgba(255, 180, 40, ${ringAlpha * 0.8})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(cx, cy, ringRadius, ringRadius * 0.35, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Golden embers drifting upward
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < 0) {
          p.y = height + 10;
          p.x = cx + (Math.random() - 0.5) * 260;
        }

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * (0.6 + Math.sin(pulseTime * 3 + p.x) * 0.4);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1.0;

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, [phase]);

  // Initial video start
  useEffect(() => {
    const timer = setTimeout(() => {
      startFullSequence();
    }, 600);
    return () => clearTimeout(timer);
  }, [startFullSequence]);

  return (
    <div className="relative w-full h-[620px] sm:h-[680px] lg:h-[750px] flex items-center justify-center pointer-events-auto select-none">
      {/* Background Particle & Floor Aura Canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      />

      {/* Floating Status Badges — Out of the Box */}
      <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-20 flex flex-wrap items-center gap-2 sm:gap-2.5 pointer-events-none">
        <span className="inline-flex items-center gap-1.5 sm:gap-2 rounded-2xl border border-gold-400/40 bg-ink-950/80 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-base font-bold text-gold-300 backdrop-blur-xl shadow-glow-gold">
          <Trophy className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5 text-gold-400 shrink-0" />
          <span className="truncate">{character === 'alok' ? 'DJ Alok' : 'Wolfrahh'} • Throne of Champions</span>
        </span>
        <span className="hidden sm:inline-flex items-center gap-2 rounded-2xl border border-accent-400/40 bg-ink-950/80 px-3.5 py-2 text-sm font-bold text-accent-300 backdrop-blur-xl shadow-glow-accent">
          <Flame className="h-4 w-4 text-accent-400 animate-pulse" />
          MP40 Predatory Cobra EVO
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-2xl border border-primary-400/30 bg-ink-950/80 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-primary-300 backdrop-blur-xl">
          <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary-400 shrink-0" />
          Aura: {phase === 'settled' ? '100% Graceful Idle' : phase.toUpperCase()}
        </span>
      </div>

      {/* Real Free Fire Character Video Elements with Soft Feather Mask (Zero Box / No Rectangle) */}
      <div
        className="relative z-10 w-full max-w-[460px] h-[380px] sm:h-[540px] lg:h-[660px] xl:h-[690px] flex items-center justify-center"
        style={{
          // Feather mask that erases any rectangular border, allowing character & aura to bleed into page
          maskImage: 'radial-gradient(ellipse 65% 72% at 50% 50%, black 50%, rgba(0,0,0,0.85) 70%, transparent 98%)',
          WebkitMaskImage: 'radial-gradient(ellipse 65% 72% at 50% 50%, black 50%, rgba(0,0,0,0.85) 70%, transparent 98%)',
        }}
      >
        {/* Phase 1: Acrobatic Combat Roll / Ground Slide */}
        <video
          ref={rollVideoRef}
          src="/assets/ff_roll.mp4"
          playsInline
          muted={isMuted}
          onEnded={onRollEnded}
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            phase === 'roll' ? 'opacity-100 scale-105' : 'hidden opacity-0'
          }`}
          style={{ mixBlendMode: 'screen', filter: 'contrast(1.15) brightness(1.1)' }}
        />

        {/* Phase 2: Golden Fire Aura Farming with Pillar & Lightning */}
        <video
          ref={auraVideoRef}
          src="/assets/ff_aura.mp4"
          playsInline
          muted={isMuted}
          onEnded={onAuraEnded}
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            phase === 'aura' ? 'opacity-100 scale-105' : 'hidden opacity-0'
          }`}
          style={{ mixBlendMode: 'screen', filter: 'contrast(1.2) brightness(1.15)' }}
        />

        {/* Phase 3 & 4: Throne Sitting & Living Seated Graceful Stop */}
        <video
          ref={throneVideoRef}
          src="/assets/ff_throne.mp4"
          playsInline
          muted={isMuted}
          onEnded={onThroneEnded}
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            phase === 'throne' || phase === 'settled' ? 'opacity-100 scale-105' : 'hidden opacity-0'
          }`}
          style={{ mixBlendMode: 'screen', filter: 'contrast(1.15) brightness(1.08)' }}
        />

        {/* Glowing EVO Gun Holographic Reticle when seated */}
        {phase === 'settled' && (
          <div className="pointer-events-none absolute inset-x-8 bottom-16 flex flex-col items-center justify-center animate-fade-up">
            <div className="flex items-center gap-2 rounded-xl border border-gold-400/50 bg-ink-950/90 px-4 py-2 shadow-glow-gold backdrop-blur-md">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold-400" />
              </span>
              <span className="font-display text-sm font-bold tracking-wider text-gold-300">
                CHAMPION SEATED • AURA MAX
              </span>
            </div>
            <p className="mt-1 font-mono text-xs text-slate-400">
              Holding MP40 Predatory Cobra EVO • Free Fire Lobby Throne
            </p>
          </div>
        )}
      </div>

      {/* Interactive Bottom Control Dock */}
      <div className="absolute bottom-4 inset-x-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-ink-900/90 px-5 py-3.5 shadow-card backdrop-blur-2xl">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={startFullSequence}
            className="btn-primary text-sm sm:text-base font-bold px-4.5 py-2.5 shadow-glow flex items-center gap-2 cursor-pointer"
            title="Replay full roll, aura farming & throne sequence"
          >
            <RotateCcw className="h-4.5 w-4.5" />
            Replay Full Sequence
          </button>

          <button
            onClick={() => jumpToPose('throne')}
            className={`rounded-xl border px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              phase === 'throne' || phase === 'settled'
                ? 'border-gold-400 bg-gold-400/20 text-gold-300'
                : 'border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Seated Golden Throne
          </button>

          <button
            onClick={() => jumpToPose('aura')}
            className={`rounded-xl border px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              phase === 'aura'
                ? 'border-accent-400 bg-accent-400/20 text-accent-300'
                : 'border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Aura Farming
          </button>

          <button
            onClick={() => jumpToPose('roll')}
            className={`rounded-xl border px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              phase === 'roll'
                ? 'border-primary-400 bg-primary-400/20 text-primary-300'
                : 'border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Acrobatic Roll
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Character Switcher */}
          <button
            onClick={() => setCharacter((c) => (c === 'alok' ? 'wolfrahh' : 'alok'))}
            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-200 hover:border-gold-400/50 hover:text-white transition-colors cursor-pointer"
            title="Switch character"
          >
            <Swords className="h-4 w-4 text-gold-400" />
            {character === 'alok' ? 'Hero: Alok' : 'Hero: Wolfrahh'}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              const nextMuted = !isMuted;
              setIsMuted(nextMuted);
              if (rollVideoRef.current) rollVideoRef.current.muted = nextMuted;
              if (auraVideoRef.current) auraVideoRef.current.muted = nextMuted;
              if (throneVideoRef.current) throneVideoRef.current.muted = nextMuted;
            }}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title={isMuted ? 'Unmute Free Fire aura audio' : 'Mute audio'}
          >
            {isMuted ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5 text-gold-400" />}
          </button>
        </div>
      </div>
    </div>
  );
}

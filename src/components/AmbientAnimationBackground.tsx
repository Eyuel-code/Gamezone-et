import { useEffect, useRef } from 'react';
import { useAccessibility } from '@/context/AccessibilityContext';

interface AmbientAnimationBackgroundProps {
  /**
   * 'hero' anchors directly behind the main tournament hero container (absolute inset-0)
   * 'fixed' covers the full viewport behind the page (fixed inset-0)
   */
  variant?: 'hero' | 'fixed';
}

// Cropped version removes the top "2021 - 2025" letterbox bar while preserving the full animation.
// Easy 1-line rollback: change back to '/assets/ff_throne.mp4'
const THRONE_VIDEO_SRC = '/assets/ff_throne_clean.mp4';

/**
 * Ambient Free Fire Throne (seated character on chair) background layer.
 * - Plays ONLY the seated-on-chair throne segment in a continuous silent loop
 * - Strictly non-interactive (pointer-events: none), muted, and zero playback/control overlays
 * - Feathered radial mask + screen blend dissolves dark video edges so only the moving seated character appears
 * - Automatically pauses when Reduce Motion accessibility mode is active
 */
export default function AmbientAnimationBackground({ variant = 'hero' }: AmbientAnimationBackgroundProps) {
  const { reduceMotion, backgroundPaused } = useAccessibility();
  const shouldPause = reduceMotion || backgroundPaused;

  const throneVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const video = throneVideoRef.current;
    if (!video) return;

    if (shouldPause) {
      video.pause();
      return;
    }

    video.muted = true;
    const p = video.play();
    if (p !== undefined) {
      p.catch(() => {
        // Ignore autoplay restriction errors cleanly in silent ambient background
      });
    }
  }, [shouldPause]);

  // Subtle ambient ember glow canvas around the seated character
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const updateSize = () => {
      const parent = canvas.parentElement;
      canvas.width = variant === 'hero' && parent ? parent.clientWidth || window.innerWidth : window.innerWidth;
      canvas.height = variant === 'hero' && parent ? parent.clientHeight || 520 : window.innerHeight;
    };
    updateSize();

    const onResize = () => updateSize();
    window.addEventListener('resize', onResize);

    const embers = Array.from({ length: 24 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.7,
      vy: -0.35 - Math.random() * 0.95,
      size: 1.2 + Math.random() * 2.0,
      alpha: 0.16 + Math.random() * 0.36,
      color: Math.random() > 0.45 ? '#f59e0b' : '#00f0ff',
    }));

    let pulse = 0;
    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (shouldPause) return;

      pulse += 0.024;
      const cx = width * 0.56;
      const cy = height * 0.55;
      const grad = ctx.createRadialGradient(cx, cy, 18, cx, cy, Math.max(width, height) * 0.48);
      grad.addColorStop(0, 'rgba(245, 158, 11, 0.16)');
      grad.addColorStop(0.45, 'rgba(139, 92, 246, 0.1)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      for (const p of embers) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -12) {
          p.y = height + 12;
          p.x = Math.random() * width;
        }
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        ctx.globalAlpha = p.alpha * (0.65 + Math.sin(pulse * 2.5 + p.x) * 0.35);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, [shouldPause, variant]);

  const positionClass =
    variant === 'hero'
      ? 'absolute inset-0 z-0 pointer-events-none select-none overflow-hidden rounded-3xl'
      : 'fixed inset-0 z-0 pointer-events-none select-none overflow-hidden';

  return (
    <div className={positionClass} aria-hidden="true">
      {/* Only the seated-on-chair throne video segment, positioned directly behind the hero card */}
      <div
        className="absolute inset-0 flex items-center justify-center opacity-[0.88] sm:opacity-[0.94]"
        style={{
          maskImage:
            'radial-gradient(ellipse 74% 88% at 50% 50%, rgba(0,0,0,1) 46%, rgba(0,0,0,0.72) 76%, transparent 98%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 74% 88% at 50% 50%, rgba(0,0,0,1) 46%, rgba(0,0,0,0.72) 76%, transparent 98%)',
        }}
      >
        <video
          ref={throneVideoRef}
          src={THRONE_VIDEO_SRC}
          autoPlay={!shouldPause}
          loop
          muted
          playsInline
          preload="metadata"
          tabIndex={-1}
          disablePictureInPicture
          className="h-[104%] w-auto max-w-none min-w-[340px] object-contain object-center"
          style={{
            mixBlendMode: 'screen',
            filter: 'contrast(1.2) brightness(1.12) saturate(1.18)',
          }}
        />
      </div>

      {/* Atmospheric ember particle overlay */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-75" />

      {/* Subtle transparent black directional tint so hero text stays crisp while character shines through */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(0, 0, 0, 0.34) 0%, rgba(0, 0, 0, 0.14) 55%, rgba(0, 0, 0, 0.22) 100%)',
        }}
      />
    </div>
  );
}

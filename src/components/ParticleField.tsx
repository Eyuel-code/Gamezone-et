import { useEffect, useRef } from 'react';
import { useAccessibility } from '@/context/AccessibilityContext';

/**
 * Interactive Kinetic Cursor Micro-Particle & Constellation Canvas Backdrop.
 * - Ambient starfield constellation with gentle multi-stop hues
 * - High-performance pooled cursor trail emitting tiny glowing micro-particles
 *   (warm amber, soft rose, electric violet, neon cyan) that drift, fade & disperse organically
 * - Automatically pauses & clears animations when Reduce Motion is enabled.
 */
export default function ParticleField({ fixed = false }: { fixed?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { reduceMotion } = useAccessibility();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Rich intentional palette: warm amber, soft rose, electric violet, neon cyan
    const TRAIL_PALETTE = [
      '245, 158, 11', // Warm Amber
      '251, 113, 133', // Soft Rose
      '168, 85, 247', // Electric Violet
      '0, 240, 255', // Cyber Cyan
    ] as const;

    const AMBIENT_HUES = [38, 348, 268, 192] as const;

    type AmbientParticle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      hue: number;
      alpha: number;
    };

    type TrailParticle = {
      active: boolean;
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      life: number;
      maxLife: number;
      rgb: string;
    };

    let particles: AmbientParticle[] = [];
    const MAX_TRAIL = 140;
    const trailPool: TrailParticle[] = Array.from({ length: MAX_TRAIL }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 1.5,
      life: 0,
      maxLife: 1,
      rgb: TRAIL_PALETTE[0],
    }));
    let trailCursor = 0;

    const mouse = { x: -9999, y: -9999, lastX: -9999, lastY: -9999, active: false };

    const spawnTrail = (x: number, y: number, dx: number, dy: number) => {
      const speed = Math.min(Math.hypot(dx, dy), 48);
      const count = speed > 16 ? 3 : speed > 4 ? 2 : 1;

      for (let k = 0; k < count; k++) {
        const slot = trailPool[trailCursor];
        trailCursor = (trailCursor + 1) % MAX_TRAIL;

        const angle = Math.random() * Math.PI * 2;
        const spread = 0.35 + Math.random() * 0.95;

        slot.active = true;
        slot.x = x + (Math.random() - 0.5) * 8;
        slot.y = y + (Math.random() - 0.5) * 8;
        slot.vx = dx * 0.045 + Math.cos(angle) * spread;
        slot.vy = dy * 0.045 + Math.sin(angle) * spread - 0.18; // gentle warm updraft
        slot.size = 1.2 + Math.random() * 2.2;
        slot.life = 1;
        slot.maxLife = 36 + Math.random() * 30;
        slot.rgb = TRAIL_PALETTE[Math.floor(Math.random() * TRAIL_PALETTE.length)];
      }
    };

    const resize = () => {
      w = canvas.clientWidth || window.innerWidth;
      h = canvas.clientHeight || window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(Math.floor((w * h) / 16500), 82);
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.65 + 0.65,
        hue: AMBIENT_HUES[Math.floor(Math.random() * AMBIENT_HUES.length)],
        alpha: Math.random() * 0.42 + 0.28,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // 1. Ambient constellation nodes
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!reduceMotion) {
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0) p.x = w;
          if (p.x > w) p.x = 0;
          if (p.y < 0) p.y = h;
          if (p.y > h) p.y = 0;

          if (mouse.active) {
            const dx = p.x - mouse.x;
            const dy = p.y - mouse.y;
            const dist = Math.hypot(dx, dy);

            if (dist < 170) {
              const strength = 1 - dist / 170;
              ctx.strokeStyle = `hsla(${p.hue}, 90%, 68%, ${0.28 * strength})`;
              ctx.lineWidth = 0.75 * strength + 0.25;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(mouse.x, mouse.y);
              ctx.stroke();

              if (dist > 4 && dist < 85) {
                p.x += (dx / dist) * 0.42 * strength;
                p.y += (dy / dist) * 0.42 * strength;
              }
            }
          }
        }

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const pdx = p.x - q.x;
          const pdy = p.y - q.y;
          const pdist = pdx * pdx + pdy * pdy;
          if (pdist < 8800) {
            const pStrength = 1 - Math.sqrt(pdist) / 94;
            ctx.strokeStyle = `hsla(${p.hue}, 82%, 68%, ${0.075 * pStrength})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 90%, 72%, ${p.alpha})`;
        ctx.fill();
      }

      // 2. Kinetic cursor micro-particle trail (additive glow without shadowBlur overhead)
      if (!reduceMotion) {
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < MAX_TRAIL; i++) {
          const t = trailPool[i];
          if (!t.active) continue;

          t.x += t.vx;
          t.y += t.vy;
          t.vx *= 0.962;
          t.vy = t.vy * 0.962 - 0.012;
          t.life -= 1 / t.maxLife;

          if (t.life <= 0) {
            t.active = false;
            continue;
          }

          // Smooth quadratic alpha decay
          const alpha = t.life * t.life;
          const radius = t.size * (0.45 + 0.55 * t.life);

          // Soft ambient outer halo
          ctx.beginPath();
          ctx.arc(t.x, t.y, radius * 2.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${t.rgb}, ${(alpha * 0.16).toFixed(3)})`;
          ctx.fill();

          // Luminous inner core
          ctx.beginPath();
          ctx.arc(t.x, t.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${t.rgb}, ${(alpha * 0.85).toFixed(3)})`;
          ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        raf = requestAnimationFrame(draw);
      }
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = e.clientX - rect.left;
      const ny = e.clientY - rect.top;
      const dx = mouse.active ? nx - mouse.lastX : 0;
      const dy = mouse.active ? ny - mouse.lastY : 0;

      mouse.x = nx;
      mouse.y = ny;
      mouse.lastX = nx;
      mouse.lastY = ny;
      mouse.active = true;

      if (!reduceMotion) {
        spawnTrail(nx, ny, dx, dy);
      }
    };

    const onLeave = () => {
      mouse.active = false;
    };

    resize();
    window.addEventListener('resize', resize);
    if (!reduceMotion) {
      window.addEventListener('pointermove', onMove, { passive: true });
      document.addEventListener('mouseleave', onLeave);
    }

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, [reduceMotion]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none ${fixed ? 'fixed' : 'absolute'} inset-0 h-full w-full opacity-85`}
      aria-hidden="true"
    />
  );
}

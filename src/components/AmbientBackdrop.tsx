import { useEffect, useRef } from 'react';
import ParticleField from './ParticleField';
import FloatingShapes from './FloatingShapes';
import arenaBackdrop from '@/assets/images/esports_arena_backdrop_1794303447399.jpg';
import { useAccessibility } from '@/context/AccessibilityContext';
import { initVisualMotionEngine } from '@/utils/visualMotionEngine';

/**
 * Global Full-Cover Interactive Backdrop, Cyberpunk Obsidian & Royal Violet Mesh & Motion System.
 * - Pre-composited CSS radial-gradient mesh layers (zero expensive blur(90px) fill-rate overhead)
 * - Direct DOM attribute updates on reticle so pointer hover causes zero React re-renders
 * - Mounts the zero-overhead magnetic hover & viewport section reveal engine
 * Respects user Reduce Motion preference in AccessibilityContext.
 */
export default function AmbientBackdrop() {
  const bgLayerRef = useRef<HTMLDivElement | null>(null);
  const spotlightRef = useRef<HTMLDivElement | null>(null);
  const reticleRef = useRef<HTMLDivElement | null>(null);
  const { reduceMotion } = useAccessibility();

  useEffect(() => {
    const cleanupMotion = initVisualMotionEngine();
    return () => cleanupMotion();
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
      if (bgLayerRef.current) {
        bgLayerRef.current.style.transform = 'scale(1.04)';
      }
      if (spotlightRef.current) {
        spotlightRef.current.style.background = 'none';
      }
      return;
    }

    let raf = 0;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let reticleX = targetX;
    let reticleY = targetY;
    let lastInteractive = false;

    const onPointerMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;

      const el = e.target as HTMLElement | null;
      const interactive = Boolean(
        el?.closest('button, a, input, select, [role="button"], .cursor-pointer, .card-spotlight')
      );
      if (interactive !== lastInteractive) {
        lastInteractive = interactive;
        reticleRef.current?.setAttribute('data-hovered', interactive ? 'true' : 'false');
      }
    };

    const animate = () => {
      currentX += (targetX - currentX) * 0.085;
      currentY += (targetY - currentY) * 0.085;
      reticleX += (targetX - reticleX) * 0.24;
      reticleY += (targetY - reticleY) * 0.24;

      const nx = currentX / window.innerWidth - 0.5;
      const ny = currentY / window.innerHeight - 0.5;

      if (bgLayerRef.current) {
        bgLayerRef.current.style.transform = `translate3d(${(nx * -22).toFixed(2)}px, ${(ny * -16).toFixed(2)}px, 0) scale(1.08)`;
      }

      if (spotlightRef.current) {
        spotlightRef.current.style.background = `radial-gradient(620px circle at ${currentX.toFixed(1)}px ${currentY.toFixed(1)}px, rgba(56, 189, 248, 0.14), rgba(139, 92, 246, 0.14) 36%, rgba(245, 158, 11, 0.08) 62%, transparent 78%)`;
      }

      if (reticleRef.current) {
        reticleRef.current.style.transform = `translate3d(${reticleX.toFixed(1)}px, ${reticleY.toFixed(1)}px, 0) translate(-50%, -50%)`;
      }

      raf = requestAnimationFrame(animate);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, [reduceMotion]);

  return (
    <>
      {/* === FIXED FULL-COVER CYBERPUNK OBSIDIAN & ROYAL VIOLET BACKDROP === */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#040611]" aria-hidden="true">
        {/* Full-Cover Background Image with Cursor Parallax */}
        <div
          ref={bgLayerRef}
          className="absolute inset-0 h-full w-full transition-transform duration-75 ease-out will-change-transform"
          style={{ transform: 'scale(1.08)' }}
        >
          <img
            src={arenaBackdrop}
            alt=""
            decoding="async"
            className="h-full w-full object-cover object-center opacity-28 brightness-90 contrast-115 saturate-125"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Cosmic Obsidian #040611 Scrim */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(4, 6, 17, 0.72) 0%, rgba(12, 16, 36, 0.56) 48%, rgba(4, 6, 17, 0.94) 100%)',
          }}
        />

        {/* High-Saturation Zero-Blur Pre-Composited Ambient Radial Mesh Lighting */}
        <div
          className={`absolute inset-0 ${reduceMotion ? '' : 'gz-mesh-animate'}`}
          style={{
            backgroundImage: [
              'radial-gradient(circle at 15% 20%, rgba(56, 189, 248, 0.22), transparent 45%)',
              'radial-gradient(circle at 85% 15%, rgba(139, 92, 246, 0.28), transparent 50%)',
              'radial-gradient(circle at 50% 85%, rgba(245, 158, 11, 0.14), transparent 50%)',
            ].join(', '),
          }}
        />

        {/* Subtle Technical Grid Mesh */}
        <div className="absolute inset-0 bg-grid opacity-25" />

        {/* Dynamic Cursor-Following Multi-Tone Spotlight */}
        <div ref={spotlightRef} className="absolute inset-0 transition-opacity duration-300" />

        {/* Interactive Particle Constellations, Cursor Trail & Floating 3D Geometric Shapes */}
        <ParticleField fixed />
        <FloatingShapes />
      </div>

      {/* === SMOOTH TRAILING CURSOR RETICLE (Desktop Only, Zero React Re-renders) === */}
      {!reduceMotion && (
        <div
          ref={reticleRef}
          data-hovered="false"
          className="group pointer-events-none fixed left-0 top-0 z-[9998] hidden lg:flex items-center justify-center rounded-full border transition-[width,height,border-color,background-color,box-shadow] duration-200 h-7 w-7 border-violet-400/50 bg-transparent shadow-[0_0_16px_rgba(139,92,246,0.24)] data-[hovered=true]:h-11 data-[hovered=true]:w-11 data-[hovered=true]:border-amber-400/80 data-[hovered=true]:bg-violet-500/12 data-[hovered=true]:shadow-[0_0_24px_rgba(245,158,11,0.45),0_0_18px_rgba(139,92,246,0.42)]"
          aria-hidden="true"
        >
          <span className="rounded-full transition-all duration-200 h-1 w-1 bg-cyan-300 group-data-[hovered=true]:h-1.5 group-data-[hovered=true]:w-1.5 group-data-[hovered=true]:bg-amber-300" />
        </div>
      )}
    </>
  );
}

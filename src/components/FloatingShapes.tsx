import { useEffect, useRef } from 'react';
import { useAccessibility } from '@/context/AccessibilityContext';

/**
 * Floating 3D-ish geometric shapes that drift, rotate, and react gently to cursor depth.
 * Uses direct DOM transforms inside rAF so pointer tracking causes ZERO React re-renders.
 */
const shapes = [
  { left: '6%', top: '18%', size: 88, shape: 'cube', dur: 12, delay: 0, depth: 18 },
  { left: '84%', top: '14%', size: 74, shape: 'ring', dur: 14, delay: 1.5, depth: 26 },
  { left: '72%', top: '72%', size: 62, shape: 'cube', dur: 16, delay: 0.8, depth: 14 },
  { left: '16%', top: '76%', size: 82, shape: 'ring', dur: 18, delay: 2, depth: 22 },
  { left: '48%', top: '10%', size: 54, shape: 'cube', dur: 13, delay: 1, depth: 12 },
];

export default function FloatingShapes() {
  const { reduceMotion: reduce } = useAccessibility();
  const shapeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const targetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (reduce) {
      shapeRefs.current.forEach((el) => {
        if (el) el.style.transform = '';
      });
      return;
    }

    let raf = 0;
    let currentX = 0;
    let currentY = 0;

    const onMove = (e: PointerEvent) => {
      targetRef.current.x = e.clientX / window.innerWidth - 0.5;
      targetRef.current.y = e.clientY / window.innerHeight - 0.5;
    };

    const tick = () => {
      currentX += (targetRef.current.x - currentX) * 0.06;
      currentY += (targetRef.current.y - currentY) * 0.06;

      for (let i = 0; i < shapes.length; i++) {
        const el = shapeRefs.current[i];
        if (el) {
          const depth = shapes[i].depth;
          el.style.transform = `translate3d(${(currentX * depth).toFixed(2)}px, ${(currentY * depth).toFixed(2)}px, 0)`;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
    };
  }, [reduce]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {shapes.map((s, i) => (
        <div
          key={i}
          ref={(el) => {
            shapeRefs.current[i] = el;
          }}
          className="absolute will-change-transform"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
          }}
        >
          <div
            className="h-full w-full"
            style={{
              animation: reduce
                ? undefined
                : `float-slow ${s.dur}s ease-in-out ${s.delay}s infinite`,
            }}
          >
            {s.shape === 'cube' ? (
              <div
                className="relative h-full w-full"
                style={{
                  transform: 'rotateX(55deg) rotateZ(45deg)',
                  transformStyle: 'preserve-3d',
                  animation: reduce ? undefined : `spin-slow ${s.dur * 2}s linear infinite`,
                }}
              >
                <div className="absolute inset-0 border border-cyan-400/25 bg-cyan-400/5" />
                <div
                  className="absolute inset-0 border border-violet-400/25 bg-violet-500/5"
                  style={{ transform: 'translateZ(18px)' }}
                />
              </div>
            ) : (
              <div
                className="h-full w-full rounded-full border-2 border-violet-400/25"
                style={{
                  animation: reduce ? undefined : `spin-slow ${s.dur}s linear infinite`,
                  boxShadow: '0 0 32px -6px rgba(139, 92, 246, 0.32) inset',
                }}
              >
                <div className="absolute inset-3 rounded-full border border-cyan-400/20" />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

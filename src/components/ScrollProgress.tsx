import { useEffect, useState } from 'react';

/**
 * Thin warm-to-electric gradient progress bar fixed to the top of the viewport.
 */
export default function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      setProgress(max > 0 ? (doc.scrollTop / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-[3px] pointer-events-none" aria-hidden="true">
      <div
        className="h-full"
        style={{
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #fbbf24 0%, #fb7185 35%, #a855f7 68%, #22d3ee 100%)',
          transition: 'width 180ms cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: '0 0 14px rgba(245, 158, 11, 0.55), 0 0 8px rgba(168, 85, 247, 0.45)',
        }}
      />
    </div>
  );
}

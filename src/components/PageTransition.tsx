import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useAccessibility } from '@/context/AccessibilityContext';

/**
 * Choreographed route transition wrapper powered by Motion's AnimatePresence.
 * Respects Reduce Motion accessibility preferences cleanly.
 */
export default function PageTransition({ pageKey, children }: { pageKey: string; children: ReactNode }) {
  const { reduceMotion } = useAccessibility();
  const osReduced = useReducedMotion();

  if (reduceMotion || osReduced) {
    return (
      <div key={pageKey} className="opacity-100">
        {children}
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pageKey}
        initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -8, scale: 0.99 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className="will-change-[opacity,transform,filter]"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

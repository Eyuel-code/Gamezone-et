import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useAccessibility } from '@/context/AccessibilityContext';

interface Props {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section' | 'li' | 'article';
  id?: string;
}

const MOTION_TAGS = {
  div: motion.div,
  section: motion.section,
  li: motion.li,
  article: motion.article,
} as const;

/**
 * Viewport scroll-reveal entrance powered by Motion (blur(6px) -> crisp resolve).
 * Immediately displays content without transforms or blur when Reduce Motion is active.
 */
export default function Reveal({ children, className = '', delay = 0, as = 'div', id }: Props) {
  const { reduceMotion } = useAccessibility();
  const osReduced = useReducedMotion();
  const isReduced = reduceMotion || Boolean(osReduced);

  if (isReduced) {
    const PlainTag = as;
    return (
      <PlainTag id={id} data-gz-section="visible" className={className}>
        {children}
      </PlainTag>
    );
  }

  const MotionTag = MOTION_TAGS[as];

  return (
    <MotionTag
      id={id}
      data-gz-section="visible"
      initial={{ opacity: 0, y: 20, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{
        duration: 0.56,
        delay: delay / 1000,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
    >
      {children}
    </MotionTag>
  );
}

const STAGGER_GRID_VARIANTS = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.065,
      delayChildren: 0.04,
    },
  },
};

const STAGGER_ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 18, scale: 0.985, filter: 'blur(5px)' },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.48,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

export function StaggerGrid({
  children,
  className = '',
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const { reduceMotion } = useAccessibility();
  const osReduced = useReducedMotion();
  const isReduced = reduceMotion || Boolean(osReduced);

  if (isReduced) {
    return (
      <div id={id} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      id={id}
      variants={STAGGER_GRID_VARIANTS}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.05 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const { reduceMotion } = useAccessibility();
  const osReduced = useReducedMotion();
  const isReduced = reduceMotion || Boolean(osReduced);

  if (isReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div variants={STAGGER_ITEM_VARIANTS} className={className}>
      {children}
    </motion.div>
  );
}

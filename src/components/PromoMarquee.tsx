import { Sparkles } from 'lucide-react';
import { promos } from '@/data/catalog';
import { useAccessibility } from '@/context/AccessibilityContext';

/**
 * Promotional announcement marquee.
 * Stops scrolling and renders a clean responsive grid when Reduce Motion is enabled.
 */
export default function PromoMarquee() {
  const { reduceMotion } = useAccessibility();
  const items = reduceMotion ? promos : [...promos, ...promos, ...promos];

  return (
    <section
      aria-label="Platform promotions and payment highlights"
      className="relative overflow-hidden border-y border-white/10 bg-ink-900/50 py-4"
    >
      <div
        className={
          reduceMotion
            ? 'container-x flex flex-wrap items-center justify-center gap-3'
            : 'flex w-max animate-marquee gap-4'
        }
      >
        {items.map((p, i) => {
          const isDuplicate = !reduceMotion && i >= promos.length;
          return (
            <div
              key={`${p.title}-${i}`}
              aria-hidden={isDuplicate ? 'true' : undefined}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-2.5"
            >
              <span
                className="grid h-8 w-8 place-items-center rounded-lg text-xs font-bold text-ink-950"
                style={{ background: p.accent }}
              >
                {p.badge}
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{p.title}</p>
                <p className="text-xs text-slate-400">{p.subtitle}</p>
              </div>
              <Sparkles className="h-4 w-4 text-gold-400" aria-hidden="true" />
            </div>
          );
        })}
      </div>
    </section>
  );
}

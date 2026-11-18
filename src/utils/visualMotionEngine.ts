/**
 * Lightweight, high-performance DOM motion controller for:
 * 1. Cursor-tracking heat-border coordinates (--mx, --my) on buttons and cards
 * 2. Smooth magnetic hover pull (--mag-x, --mag-y) with spring settle
 * 3. Viewport IntersectionObserver fade-in / slide-up for <section> elements
 *
 * Strictly compositor-only (CSS custom properties -> transform/opacity) and
 * completely disabled when Reduce Motion is enabled or on coarse/touch pointers.
 */

const INTERACTIVE_SELECTOR = [
  '.nav-luminous-item:not(.no-heat)',
  '.sidebar-luminous-item:not(.no-heat)',
  '.btn-primary:not(.no-heat)',
  '.btn-accent:not(.no-heat)',
  '.btn-ghost:not(.no-heat)',
  '.btn-glow-gold:not(.no-heat)',
  '.btn-glow-cyan:not(.no-heat)',
  '.btn-glow-accent:not(.no-heat)',
  '.btn-heat:not(.no-heat)',
  '.btn-help-launcher:not(.no-heat)',
  '.btn-ai-launcher:not(.no-heat)',
  '.card-spotlight:not(.no-heat)',
  '.card-hover:not(.no-heat)',
  '.card-hover-gold:not(.no-heat)',
  '[aria-label="Live Ethiopian Activity Feed"] > div',
].join(', ');

function isReducedMotion(): boolean {
  if (typeof document === 'undefined') return true;
  if (document.documentElement.dataset.a11yMotion === 'reduced') return true;
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

function isFinePointer(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.matchMedia?.('(hover: hover) and (pointer: fine)').matches);
}

export function initVisualMotionEngine(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  let activeEl: HTMLElement | null = null;
  let rafId = 0;
  let pendingClientX = 0;
  let pendingClientY = 0;
  let hasPendingMove = false;

  const resetElement = (el: HTMLElement | null) => {
    if (!el) return;
    el.style.setProperty('--mag-x', '0px');
    el.style.setProperty('--mag-y', '0px');
    el.removeAttribute('data-gz-hovered');
  };

  const applyPointerUpdate = () => {
    rafId = 0;
    if (!hasPendingMove) return;
    hasPendingMove = false;

    if (isReducedMotion() || !isFinePointer()) {
      resetElement(activeEl);
      activeEl = null;
      return;
    }

    const targetUnderPointer = document.elementFromPoint(pendingClientX, pendingClientY) as HTMLElement | null;
    const matched = targetUnderPointer?.closest(INTERACTIVE_SELECTOR) as HTMLElement | null;

    if (activeEl && activeEl !== matched) {
      resetElement(activeEl);
    }

    if (!matched || matched.hasAttribute('disabled') || matched.getAttribute('aria-disabled') === 'true') {
      activeEl = null;
      return;
    }

    activeEl = matched;
    const rect = matched.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const localX = pendingClientX - rect.left;
    const localY = pendingClientY - rect.top;

    matched.style.setProperty('--mx', `${localX.toFixed(1)}px`);
    matched.style.setProperty('--my', `${localY.toFixed(1)}px`);
    matched.setAttribute('data-gz-hovered', 'true');

    // Subtle magnetic hover pull — skip wide/fullscreen containers or modals so text never blurs
    const insideModal = Boolean(matched.closest('[role="dialog"]'));
    const isCard =
      matched.classList.contains('card-spotlight') ||
      matched.classList.contains('card-hover') ||
      matched.classList.contains('card-hover-gold') ||
      matched.classList.contains('card');

    const isPositioned =
      matched.classList.contains('absolute') || matched.classList.contains('fixed');

    if (!insideModal && !isPositioned && rect.width <= 460 && rect.height <= 420 && !matched.dataset.noMagnetic) {
      const nx = (localX / rect.width - 0.5) * 2; // -1 .. 1
      const ny = (localY / rect.height - 0.5) * 2; // -1 .. 1
      const strength = isCard ? 3.5 : 5.5;
      matched.style.setProperty('--mag-x', `${(nx * strength).toFixed(2)}px`);
      matched.style.setProperty('--mag-y', `${(ny * strength).toFixed(2)}px`);
    } else {
      matched.style.setProperty('--mag-x', '0px');
      matched.style.setProperty('--mag-y', '0px');
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    pendingClientX = e.clientX;
    pendingClientY = e.clientY;
    hasPendingMove = true;
    if (!rafId) {
      rafId = requestAnimationFrame(applyPointerUpdate);
    }
  };

  const onPointerLeaveWindow = () => {
    resetElement(activeEl);
    activeEl = null;
  };

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('mouseleave', onPointerLeaveWindow);
  window.addEventListener('blur', onPointerLeaveWindow);

  // Viewport scroll reveal observer for <section> blocks
  const observed = new WeakSet<Element>();
  const intersectionObs =
    typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(
          (entries, observer) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                (entry.target as HTMLElement).setAttribute('data-gz-section', 'visible');
                observer.unobserve(entry.target);
              }
            });
          },
          { threshold: 0.08, rootMargin: '0px 0px -6% 0px' }
        )
      : null;

  const scanSections = () => {
    const sections = document.querySelectorAll('main section');
    const vh = window.innerHeight || 900;
    const reduced = isReducedMotion();

    sections.forEach((sec) => {
      if (observed.has(sec)) return;
      observed.add(sec);

      const el = sec as HTMLElement;
      const rect = el.getBoundingClientRect();

      if (reduced || rect.top < vh * 0.92 || el.dataset.gzSection === 'visible') {
        el.setAttribute('data-gz-section', 'visible');
        return;
      }

      el.setAttribute('data-gz-section', 'pending');
      intersectionObs?.observe(el);
    });
  };

  scanSections();

  const mainEl = document.getElementById('main-content');
  const mutationObs =
    typeof MutationObserver !== 'undefined' && mainEl
      ? new MutationObserver(() => {
          scanSections();
        })
      : null;

  if (mutationObs && mainEl) {
    mutationObs.observe(mainEl, { childList: true, subtree: true });
  }

  return () => {
    if (rafId) cancelAnimationFrame(rafId);
    resetElement(activeEl);
    window.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('mouseleave', onPointerLeaveWindow);
    window.removeEventListener('blur', onPointerLeaveWindow);
    intersectionObs?.disconnect();
    mutationObs?.disconnect();
  };
}

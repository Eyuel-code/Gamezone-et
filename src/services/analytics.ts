declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let initializedId: string | null = null;

export function getAnalyticsMeasurementId(): string {
  const gaId = (import.meta.env.VITE_GA_MEASUREMENT_ID || '').trim();
  const fbId = (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '').trim();
  return gaId || fbId;
}

export function initAnalytics(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const measurementId = getAnalyticsMeasurementId();
  if (!measurementId || initializedId === measurementId) return;

  initializedId = measurementId;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, { send_page_view: false });

  if (!document.querySelector(`script[data-ga-id="${measurementId}"]`)) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.setAttribute('data-ga-id', measurementId);
    document.head.appendChild(script);
  }
}

export function trackPageView(pageId: string, pageTitle: string): void {
  if (typeof window === 'undefined') return;
  const measurementId = getAnalyticsMeasurementId();
  if (!measurementId || typeof window.gtag !== 'function') return;

  window.gtag('event', 'page_view', {
    page_title: pageTitle,
    page_path: pageId === 'home' ? '/' : `/${pageId}`,
    page_location: window.location.href,
  });
}

export function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, params || {});
}

import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const RELOAD_STORAGE_KEY = 'gz_dynamic_import_reload_at';
const RELOAD_COOLDOWN_MS = 15_000;

export function isDynamicImportError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('Loading chunk') ||
    message.includes('Outdated Optimize Dep')
  );
}

/**
 * Wraps React.lazy with automatic transient retries and a one-time safe page reload
 * when a Vite dev restart or fresh deployment invalidates previously loaded module URLs.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  retries = 2
): LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const mod = await importer();
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.removeItem(RELOAD_STORAGE_KEY);
          } catch {
            // Ignore storage errors in restricted contexts
          }
        }
        return mod;
      } catch (err) {
        lastError = err;
        if (!isDynamicImportError(err)) {
          throw err;
        }
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
        }
      }
    }

    if (typeof window !== 'undefined' && isDynamicImportError(lastError)) {
      try {
        const lastReload = Number(sessionStorage.getItem(RELOAD_STORAGE_KEY) || 0);
        const now = Date.now();
        if (!lastReload || now - lastReload > RELOAD_COOLDOWN_MS) {
          sessionStorage.setItem(RELOAD_STORAGE_KEY, String(now));
          window.location.reload();
          // Return a never-resolving promise while the browser navigates on reload
          return await new Promise<{ default: T }>(() => {});
        }
      } catch {
        // Fall through to ErrorBoundary if sessionStorage or reload is blocked
      }
    }

    throw lastError;
  });
}

import { useState, useCallback, useEffect } from 'react';

export type PageId =
  | 'home'
  | 'dashboard'
  | 'games'
  | 'topup'
  | 'tournaments'
  | 'leaderboard'
  | 'news'
  | 'rewards'
  | 'orders'
  | 'profile'
  | 'admin'
  | 'wallet'
  | 'support'
  | 'wellness'
  | 'auth';

export const PAGES: { id: PageId; label: string }[] = [
  { id: 'home', label: 'Dashboard' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'topup', label: 'Top-Up' },
  { id: 'tournaments', label: 'Tournaments' },
  { id: 'games', label: 'Games' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'news', label: 'News' },
  { id: 'rewards', label: 'Rewards' },
  { id: 'orders', label: 'My Orders' },
  { id: 'profile', label: 'Profile' },
  { id: 'admin', label: 'Admin' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'support', label: 'Support' },
  { id: 'wellness', label: 'Health & Wellness' },
  { id: 'auth', label: 'Sign In' },
];

const PATH_ALIASES: Record<string, PageId> = {
  '': 'home',
  signin: 'auth',
  signup: 'auth',
  auth: 'auth',
  'top-up': 'topup',
  health: 'wellness',
  'health-wellness': 'wellness',
};

function resolvePageFromLocation(): PageId {
  const hash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
  const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '').trim().toLowerCase();
  const slug = hash || pathname;
  if (slug in PATH_ALIASES) {
    return PATH_ALIASES[slug];
  }
  const valid = PAGES.find((p) => p.id === slug);
  return valid ? valid.id : 'home';
}

export function useRouter() {
  const [page, setPage] = useState<PageId>(() => resolvePageFromLocation());
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  const navigate = useCallback((to: PageId) => {
    setPage((prev) => {
      const fromIdx = PAGES.findIndex((p) => p.id === prev);
      const toIdx = PAGES.findIndex((p) => p.id === to);
      setDirection(toIdx >= fromIdx ? 'forward' : 'back');
      return to;
    });
  }, []);

  // Browser back/forward support via hash and pathname
  useEffect(() => {
    const onRouteChange = () => {
      setPage(resolvePageFromLocation());
    };
    window.addEventListener('hashchange', onRouteChange);
    window.addEventListener('popstate', onRouteChange);
    return () => {
      window.removeEventListener('hashchange', onRouteChange);
      window.removeEventListener('popstate', onRouteChange);
    };
  }, []);

  const navigateWithHash = useCallback(
    (to: PageId) => {
      window.location.hash = `/${to}`;
      navigate(to);
    },
    [navigate]
  );

  return { page, direction, navigate: navigateWithHash };
}

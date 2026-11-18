import { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { MotionConfig } from 'motion/react';
import { AlertTriangle, ArrowRight, Ban, RotateCcw, X } from 'lucide-react';
import Navbar from '@/components/Navbar';
import AmbientBackdrop from '@/components/AmbientBackdrop';
import ScrollProgress from '@/components/ScrollProgress';
import PageTransition from '@/components/PageTransition';
import Footer from '@/components/Footer';
import ToastStack, { type Toast } from '@/components/ToastStack';
import PromoMarquee from '@/components/PromoMarquee';
import VisualAlertBanner from '@/components/VisualAlertBanner';
import { useAccessibility } from '@/context/AccessibilityContext';
import DashboardPage from '@/pages/DashboardPage';
import type { GamerProfile } from '@/components/AuthModal';
import type { OnlineGame } from '@/data/gamesCatalog';
import { PAGES, useRouter, type PageId } from '@/hooks/useRouter';
import { db, type UserAccount, type NotificationType } from '@/services/db';
import { initAuthObserver, isAuthorizedAdminUser, signOutAccount } from '@/services/authService';
import { securityEngine } from '@/services/securityEngine';
import { type DailyWellnessState, wellnessEngine } from '@/services/wellnessEngine';
import { lazyWithRetry } from '@/utils/lazyWithRetry';

const GamesPage = lazyWithRetry(() => import('@/pages/GamesPage'));
const TopUpPage = lazyWithRetry(() => import('@/pages/TopUpPage'));
const TournamentsPage = lazyWithRetry(() => import('@/pages/TournamentsPage'));
const LeaderboardPage = lazyWithRetry(() => import('@/pages/LeaderboardPage'));
const NewsPage = lazyWithRetry(() => import('@/pages/NewsPage'));
const RewardsPage = lazyWithRetry(() => import('@/pages/RewardsPage'));
const OrdersPage = lazyWithRetry(() => import('@/pages/OrdersPage'));
const ProfilePage = lazyWithRetry(() => import('@/pages/ProfilePage'));
const AdminPage = lazyWithRetry(() => import('@/pages/AdminPage'));
const WalletPage = lazyWithRetry(() => import('@/pages/WalletPage'));
const SupportPage = lazyWithRetry(() => import('@/pages/SupportPage'));
const HealthWellnessPage = lazyWithRetry(() => import('@/pages/HealthWellnessPage'));
const AuthPage = lazyWithRetry(() => import('@/pages/AuthPage'));

const EsportsAiAssistant = lazyWithRetry(() => import('@/components/EsportsAiAssistant'));
const PlatformHelpModal = lazyWithRetry(() => import('@/components/PlatformHelpModal'));
const AuthModal = lazyWithRetry(() => import('@/components/AuthModal'));
const GamePlayerModal = lazyWithRetry(() => import('@/components/GamePlayerModal'));
const DailyWellnessLockModal = lazyWithRetry(() => import('@/components/DailyWellnessLockModal'));

function RouteLoadingFallback() {
  return (
    <div className="container-x pt-28 pb-20" role="status" aria-live="polite">
      <div className="glass rounded-3xl p-8 flex items-center justify-center gap-3 text-sm text-slate-300">
        <span className="h-5 w-5 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" aria-hidden="true" />
        <span>Loading view...</span>
      </div>
    </div>
  );
}

const RESUMABLE_PAGES: PageId[] = [
  'topup',
  'tournaments',
  'games',
  'orders',
  'wallet',
  'profile',
  'support',
  'rewards',
  'wellness',
];

export default function App() {
  const { page, navigate } = useRouter();
  const { reduceMotion } = useAccessibility();
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(() => db.getCurrentUser()?.loyaltyPoints ?? 0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // User State from reactive database service (starts signed out for new visitors)
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => db.getCurrentUser());

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [aiExternalPrompt, setAiExternalPrompt] = useState<{ text?: string; nonce: number } | null>(null);
  const [activeGame, setActiveGame] = useState<OnlineGame | null>(null);
  const activeGameRef = useRef<OnlineGame | null>(null);
  const [wellnessState, setWellnessState] = useState<DailyWellnessState>(() => wellnessEngine.getState());

  useEffect(() => {
    activeGameRef.current = activeGame;
  }, [activeGame]);

  // Checkpoint / Mandatory profile banner state
  const [dismissedIncompleteBanner, setDismissedIncompleteBanner] = useState(false);
  const [resumePageOffer, setResumePageOffer] = useState<PageId | null>(null);
  const capturedResumeForUid = useRef<string | null>(null);

  // Sync Firebase Authentication state + reactive local store + security integrity + wellness tracker
  useEffect(() => {
    void db.syncTournamentsFromFirestore();
    void securityEngine.ensureHwid();
    const stopMonitor = securityEngine.startBehaviorIntegrityMonitor(() => ({
      userId: db.getCurrentUser()?.id,
      gamerTag: db.getCurrentUser()?.gamerTag,
    }));
    wellnessEngine.hydrateFromUser(db.getCurrentUser());
    const stopWellnessTracker = wellnessEngine.startSessionTracker({
      isPlayingGame: () => Boolean(activeGameRef.current),
      getUserId: () => db.getCurrentUser()?.id,
      onSyncUserUsage: (usage) => {
        const uid = db.getCurrentUser()?.id;
        if (uid) {
          db.updateDailyPlaytimeUsage(uid, usage);
        }
      },
    });
    const unsubscribeWellness = wellnessEngine.subscribe(() => {
      const next = wellnessEngine.getState();
      setWellnessState(next);
      if (next.locked && activeGameRef.current) {
        setActiveGame(null);
      }
    });
    const unsubscribeAuth = initAuthObserver();
    const unsubscribeDb = db.subscribe(() => {
      const u = db.getCurrentUser();
      setCurrentUser(u);
      setLoyaltyPoints(u?.loyaltyPoints ?? 0);
      wellnessEngine.hydrateFromUser(u);
      if (!u) {
        capturedResumeForUid.current = null;
        setResumePageOffer(null);
        setDismissedIncompleteBanner(false);
      }
    });
    return () => {
      stopMonitor();
      stopWellnessTracker();
      unsubscribeWellness();
      unsubscribeAuth();
      unsubscribeDb();
    };
  }, []);

  // Capture saved resume destination once per signed-in session when landing on Dashboard/Home
  useEffect(() => {
    if (!currentUser?.id) return;
    if (capturedResumeForUid.current === currentUser.id) return;
    capturedResumeForUid.current = currentUser.id;
    const saved = currentUser.lastPage as PageId | undefined;
    if (saved && RESUMABLE_PAGES.includes(saved) && (page === 'home' || page === 'dashboard')) {
      setResumePageOffer(saved);
    }
  }, [currentUser?.id, currentUser?.lastPage, page]);

  // Persist last active page checkpoint to Firestore for signed-in users
  useEffect(() => {
    const uid = currentUser?.id;
    if (!uid) return;
    if (!RESUMABLE_PAGES.includes(page)) return;
    if (resumePageOffer === page) {
      setResumePageOffer(null);
    }
    const latest = db.getCurrentUser();
    if (latest && latest.lastPage !== page) {
      db.saveUserCheckpoint(uid, { lastPage: page });
    }
  }, [page, currentUser?.id, resumePageOffer]);

  const isAdmin = isAuthorizedAdminUser(currentUser);

  // Strictly block unauthorized users or guests from entering the Admin Portal route
  useEffect(() => {
    if (page === 'admin' && !isAdmin) {
      navigate('home');
    }
  }, [page, isAdmin, navigate]);

  // Scroll to top on page change (respects Reduce Motion)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [page, reduceMotion]);

  const pushToast = useCallback(
    (
      message: string,
      opts?: { title?: string; type?: NotificationType; targetPage?: PageId; persist?: boolean }
    ) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [
        ...prev,
        { id, message, title: opts?.title, type: opts?.type || 'success' },
      ]);

      if (opts?.persist !== false) {
        db.addNotification({
          title: opts?.title || 'GameZoneET Notification',
          message,
          type: opts?.type || 'success',
          targetPage: opts?.targetPage,
        });
      }

      if (
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted' &&
        typeof document !== 'undefined' &&
        document.hidden
      ) {
        try {
          new Notification(opts?.title || 'GameZoneET', { body: message });
        } catch {
          // Ignore notification errors in restricted browser contexts
        }
      }
    },
    []
  );

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Auth Handlers — navigate cleanly to dedicated Sign-In & Sign-Up page
  const handleOpenAuth = useCallback((mode: 'signin' | 'signup' = 'signin') => {
    setAuthModalMode(mode);
    setAuthModalOpen(false);
    navigate('auth');
  }, [navigate]);

  const handleLogin = useCallback((profile: GamerProfile) => {
    const u = db.getCurrentUser();
    if (u) {
      setCurrentUser(u);
      pushToast(`Welcome back, ${u.gamerTag}! Rank #${u.rank}`, {
        title: 'Signed In',
        type: 'success',
        targetPage: 'profile',
      });
    } else {
      pushToast(`Signed in as ${profile.gamerTag}!`, {
        title: 'Signed In',
        type: 'success',
      });
    }
  }, [pushToast]);

  const handleLogout = useCallback(async () => {
    try {
      await signOutAccount();
    } catch (err) {
      console.error('Sign out error:', err);
    }
    setCurrentUser(null);
    setLoyaltyPoints(0);
    pushToast('You have signed out. Browse top-ups or play free games anytime!', {
      title: 'Signed Out',
      type: 'info',
      persist: false,
    });
  }, [pushToast]);

  // Game Engine Handlers
  const handlePlayGame = useCallback(
    (game: OnlineGame) => {
      if (wellnessEngine.isDailyLimitReached()) {
        pushToast(
          'Daily 2-hour healthy gameplay limit reached. Please rest, study, or step outside until tomorrow’s reset.',
          {
            title: 'Daily Wellness Break Active',
            type: 'warning',
            targetPage: 'wellness',
          }
        );
        return;
      }
      setActiveGame(game);
    },
    [pushToast]
  );

  const handleGameCompleted = useCallback((game: OnlineGame, score: number) => {
    const earnedPoints = Math.max(10, Math.floor(score / 35));
    if (currentUser) {
      const updatedGamesPlayed = (currentUser.gamesPlayed || 0) + 1;
      const isNewBest = score > (currentUser.highScore || 0);
      const updatedHighScore = Math.max(currentUser.highScore || 0, score);

      let newRank = currentUser.rank || 99;
      if (updatedHighScore > 5000 || updatedGamesPlayed > 200) newRank = Math.min(newRank, 2);
      else if (updatedHighScore > 2500 || updatedGamesPlayed > 100) newRank = Math.min(newRank, 3);
      else if (updatedHighScore > 1000 || updatedGamesPlayed > 20) newRank = Math.min(newRank, 4);

      const updatedUser: UserAccount = {
        ...currentUser,
        gamesPlayed: updatedGamesPlayed,
        highScore: updatedHighScore,
        rank: newRank,
        loyaltyPoints: currentUser.loyaltyPoints + earnedPoints,
      };

      db.updateUser(updatedUser);
      if (isNewBest) {
        pushToast(`NEW PERSONAL HIGH SCORE! ${score.toLocaleString()} in ${game.title}! Earned +${earnedPoints} Loyalty XP.`, {
          title: 'New High Score!',
          type: 'success',
          targetPage: 'leaderboard',
        });
      } else {
        pushToast(`Match finished! Score: ${score.toLocaleString()} in ${game.title}. Earned +${earnedPoints} Loyalty XP.`, {
          title: 'Match Recorded',
          type: 'success',
          targetPage: 'games',
        });
      }
    } else {
      pushToast(`Match finished! Score: ${score.toLocaleString()} in ${game.title}. Sign in to save XP & leaderboard rank.`, {
        title: 'Guest Match Finished',
        type: 'info',
        targetPage: 'auth',
      });
    }
  }, [currentUser, pushToast]);

  const handlePurchase = useCallback((label: string, priceETB: number) => {
    const earned = Math.floor(priceETB / 10);
    pushToast(`Top-up confirmed — ${label}. Earned +${earned} Loyalty XP!`, {
      title: 'Top-Up Confirmed',
      type: 'success',
      targetPage: 'orders',
      persist: false, // Detailed order notification is saved inside CheckoutModal
    });
  }, [pushToast]);

  const handleWalletDeposit = useCallback(
    (amount: number, method: 'telebirr' | 'cbe' = 'telebirr') => {
      if (!currentUser) {
        pushToast('Please sign in or create an account to deposit funds into your wallet.', {
          title: 'Sign In Required',
          type: 'warning',
          targetPage: 'auth',
          persist: false,
        });
        handleOpenAuth('signin');
        return;
      }

      const receiptRef = `WLT-${method.toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`;
      const earnedXP = Math.floor(amount / 50);
      const newBalance = (currentUser.walletBalance ?? 0) + amount;

      // Save wallet deposit as a persistent payment record for 2+ month retention in Firestore
      db.createOrder({
        userId: currentUser.id,
        customerName: currentUser.fullName || currentUser.gamerTag,
        customerPhone: currentUser.phone || '+251911000000',
        gameId: 'wallet',
        gameName: 'GameZoneET Wallet',
        productId: 'wallet-deposit',
        productName: 'Wallet Deposit',
        playerId: currentUser.gamerTag,
        amountETB: amount,
        paymentMethod: method,
        paymentStatus: 'success',
        deliveryStatus: 'completed',
        receiptRef,
        note: `Wallet credit via ${method === 'telebirr' ? 'Telebirr' : 'CBE Birr'}. Saved to payment history.`,
      });

      db.updateUser({
        ...currentUser,
        walletBalance: newBalance,
        loyaltyPoints: currentUser.loyaltyPoints + earnedXP,
        lastPaymentMethod: method,
        lastPage: 'wallet',
      });

      pushToast(
        `Deposited Br ${amount.toLocaleString()} via ${method === 'telebirr' ? 'Telebirr' : 'CBE Birr'} (Ref: ${receiptRef}). Earned +${earnedXP} XP.`,
        {
          title: 'Wallet Deposit Saved',
          type: 'success',
          targetPage: 'wallet',
        }
      );
    },
    [currentUser, handleOpenAuth, pushToast]
  );

  const showIncompleteBanner =
    Boolean(currentUser) &&
    !db.isProfileComplete(currentUser) &&
    !dismissedIncompleteBanner &&
    page !== 'profile' &&
    page !== 'auth';

  const resumeLabel = resumePageOffer
    ? PAGES.find((p) => p.id === resumePageOffer)?.label || resumePageOffer
    : '';

  const currentPageLabel = PAGES.find((p) => p.id === page)?.label || 'GameZone ET';

  return (
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
    <div className="relative isolate min-h-screen overflow-x-hidden">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        Navigated to {currentPageLabel}
      </div>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <AmbientBackdrop />
      <ScrollProgress />
      <Navbar
        currentPage={page}
        onNavigate={navigate}
        loyaltyPoints={loyaltyPoints}
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
      />
      <VisualAlertBanner />

      <main id="main-content" tabIndex={-1} className="relative z-10 focus:outline-none">
        {currentUser?.isBanned && (
          <div className="container-x pt-24 -mb-16 relative z-30">
            <div
              role="alert"
              className="rounded-2xl border border-error-500/50 bg-error-950/90 backdrop-blur-xl px-4 py-3 flex items-center gap-3 text-xs text-error-100 shadow-card"
            >
              <Ban className="h-4 w-4 text-error-400 shrink-0" />
              <span>
                <strong className="text-white">Account Restricted:</strong> Competitive tournament registration and identity binding are disabled for this account
                {currentUser.banReason ? ` (${currentUser.banReason})` : '.'}
              </span>
            </div>
          </div>
        )}

        {/* Dismissible Continue-Where-You-Left-Off & Mandatory Info Banners */}
        {(showIncompleteBanner || (currentUser && resumePageOffer && (page === 'home' || page === 'dashboard'))) && (
          <div className="container-x pt-24 -mb-16 relative z-20 space-y-2">
            {showIncompleteBanner && (
              <div className="rounded-2xl border border-amber-400/45 bg-[#0c1024]/82 backdrop-blur-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-card">
                <div className="flex items-center gap-2.5 text-xs">
                  <AlertTriangle className="h-4 w-4 text-gold-400 shrink-0" aria-hidden="true" />
                  <span className="text-slate-200">
                    <strong className="text-white">Complete your mandatory gamer info:</strong> Save your name, mobile phone, city &amp; Game IDs so checkouts and rewards stay synced.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => navigate('profile')}
                    className="inline-flex min-h-[30px] items-center gap-1 rounded-lg bg-gold-400 px-3 py-1.5 text-[11px] font-black text-ink-950 hover:bg-gold-300 cursor-pointer"
                  >
                    Complete Now <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDismissedIncompleteBanner(true)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
                    aria-label="Dismiss profile reminder"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {currentUser && resumePageOffer && (page === 'home' || page === 'dashboard') && (
              <div className="rounded-2xl border border-cyan-400/40 bg-[#0c1024]/82 backdrop-blur-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-card">
                <div className="flex items-center gap-2.5 text-xs">
                  <RotateCcw className="h-4 w-4 text-primary-400 shrink-0" aria-hidden="true" />
                  <span className="text-slate-200">
                    Welcome back, <strong className="text-white">{currentUser.gamerTag}</strong> — continue where you left off in <strong className="text-primary-300">{resumeLabel}</strong>.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      const target = resumePageOffer;
                      setResumePageOffer(null);
                      navigate(target);
                    }}
                    className="inline-flex min-h-[30px] items-center gap-1 rounded-lg bg-primary-500 px-3 py-1.5 text-[11px] font-bold text-ink-950 hover:bg-primary-400 cursor-pointer"
                  >
                    Continue to {resumeLabel} <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setResumePageOffer(null)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
                    aria-label="Dismiss resume shortcut"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <PageTransition pageKey={page}>
          <Suspense fallback={<RouteLoadingFallback />}>
            {(page === 'home' || page === 'dashboard' || (page === 'admin' && !isAdmin)) && (
              <DashboardPage
                onNavigate={navigate}
                currentUser={currentUser}
                onPlayGame={handlePlayGame}
                onOpenAuth={handleOpenAuth}
                onNotify={pushToast}
              />
            )}
            {page === 'games' && <GamesPage onPlayGame={handlePlayGame} onNavigate={navigate} currentUser={currentUser as any} />}
            {page === 'topup' && <TopUpPage onPurchase={handlePurchase} onNavigateToOrders={() => navigate('orders')} />}
            {page === 'tournaments' && <TournamentsPage currentUser={currentUser} onNotify={pushToast} />}
            {page === 'leaderboard' && <LeaderboardPage currentUser={currentUser as any} onNavigate={navigate} onOpenAuth={() => handleOpenAuth('signup')} />}
            {page === 'news' && <NewsPage />}
            {page === 'rewards' && (
              <RewardsPage
                loyaltyPoints={loyaltyPoints}
                onRedeem={(name, cost) => {
                  const res = db.redeemReward(name, cost);
                  pushToast(res.message, {
                    title: res.success ? 'Reward Redeemed' : 'Unable to Redeem',
                    type: res.success ? 'success' : 'warning',
                    targetPage: res.success ? 'wallet' : 'rewards',
                    persist: res.success,
                  });
                }}
              />
            )}
            {page === 'orders' && <OrdersPage onNavigateToTopUp={() => navigate('topup')} />}
            {page === 'profile' && (
              <ProfilePage
                onNavigateToTournaments={() => navigate('tournaments')}
                onNavigateToOrders={() => navigate('orders')}
                onNavigateToTopUp={() => navigate('topup')}
                onOpenAuth={() => handleOpenAuth('signin')}
                onNotify={(msg, type = 'success') =>
                  pushToast(msg, {
                    title:
                      type === 'error'
                        ? 'Account Restricted'
                        : type === 'warning'
                        ? 'Security Warning'
                        : 'Profile Updated',
                    type,
                    persist: false,
                  })
                }
              />
            )}
            {page === 'admin' && isAdmin && <AdminPage currentUser={currentUser} onOpenAuth={() => handleOpenAuth('signin')} />}
            {page === 'wallet' && (
              <WalletPage
                balance={currentUser?.walletBalance ?? 0}
                onDeposit={handleWalletDeposit}
                currentUser={currentUser}
                onOpenAuth={() => handleOpenAuth('signin')}
              />
            )}
            {page === 'support' && (
              <SupportPage
                currentUser={currentUser}
                onOpenAuth={() => handleOpenAuth('signin')}
                onNotify={pushToast}
              />
            )}
            {page === 'wellness' && (
              <HealthWellnessPage
                currentUser={currentUser}
                onNavigate={navigate}
                onNotify={pushToast}
              />
            )}
            {page === 'auth' && (
              <AuthPage
                initialMode={authModalMode}
                currentUser={currentUser}
                onNavigate={navigate}
                onNotify={pushToast}
              />
            )}
          </Suspense>
        </PageTransition>

        {(page === 'home' || page === 'dashboard') && <PromoMarquee />}
      </main>

      <Footer onNavigate={navigate} onNotify={pushToast} />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <Suspense fallback={null}>
        <EsportsAiAssistant
          currentUser={currentUser}
          currentPage={page}
          onNavigate={navigate}
          onOpenHelp={() => setHelpModalOpen(true)}
          helpOpen={helpModalOpen}
          externalPrompt={aiExternalPrompt}
        />
      </Suspense>
      {helpModalOpen && (
        <Suspense fallback={null}>
          <PlatformHelpModal
            isOpen={helpModalOpen}
            onClose={() => setHelpModalOpen(false)}
            onNavigate={navigate}
            onAskAi={(prompt) => {
              setHelpModalOpen(false);
              setAiExternalPrompt({ text: prompt, nonce: Date.now() });
            }}
          />
        </Suspense>
      )}

      {authModalOpen && (
        <Suspense fallback={null}>
          <AuthModal
            isOpen={authModalOpen}
            onClose={() => setAuthModalOpen(false)}
            currentUser={currentUser as any}
            onLogin={handleLogin}
            onLogout={handleLogout}
            initialMode={authModalMode}
          />
        </Suspense>
      )}

      {activeGame && !wellnessState.locked && (
        <Suspense fallback={null}>
          <GamePlayerModal
            game={activeGame}
            onClose={() => setActiveGame(null)}
            currentUser={currentUser as any}
            onGameCompleted={handleGameCompleted}
            onOpenAuth={() => handleOpenAuth('signup')}
          />
        </Suspense>
      )}

      {wellnessState.locked && (
        <Suspense fallback={null}>
          <DailyWellnessLockModal
            open={wellnessState.locked}
            wellnessState={wellnessState}
            gamerTag={currentUser?.gamerTag}
          />
        </Suspense>
      )}
    </div>
    </MotionConfig>
  );
}

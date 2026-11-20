import { useState, useMemo, useEffect, Suspense, type ReactNode, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { motion } from 'motion/react';
import {
  Flame,
  Crosshair,
  Trophy,
  Zap,
  Gamepad2,
  Users,
  Search,
  Bell,
  Wallet,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Clock,
  Play,
  CheckCircle2,
  Calendar,
  Gift,
  Newspaper,
  ShoppingBag,
  Headphones,
  Sliders,
  Menu,
  X,
  Radio,
  ExternalLink,
  Award,
  Layers,
  ChevronDown,
  KeyRound,
  Lock,
  HeartPulse,
  Pause,
} from 'lucide-react';
import { formatDurationShort, wellnessEngine } from '@/services/wellnessEngine';
import { formatETB } from '@/data/catalog';
import { ONLINE_GAMES, type OnlineGame } from '@/data/gamesCatalog';
import { db, type ProductItem, type TournamentEntity, type UserAccount, type OrderItem, type UserNotification, type NewsArticle } from '@/services/db';
import { isAuthorizedAdminUser } from '@/services/authService';
import type { PageId } from '@/hooks/useRouter';
import UserAvatar from '@/components/UserAvatar';
import ResilientImage from '@/components/ResilientImage';
import { lazyWithRetry } from '@/utils/lazyWithRetry';

const CheckoutModal = lazyWithRetry(() => import('@/components/CheckoutModal'));
const TournamentRegisterModal = lazyWithRetry(() => import('@/components/TournamentRegisterModal'));
const TournamentBracketModal = lazyWithRetry(() => import('@/components/TournamentBracketModal'));
const MatchResultModal = lazyWithRetry(() =>
  import('@/components/TournamentActionModals').then((m) => ({ default: m.MatchResultModal }))
);
const TournamentDisputeModal = lazyWithRetry(() =>
  import('@/components/TournamentActionModals').then((m) => ({ default: m.TournamentDisputeModal }))
);
import Reveal, { StaggerGrid, StaggerItem } from '@/components/Reveal';
import { useTilt } from '@/hooks/useMotion';
import { useAccessibility } from '@/context/AccessibilityContext';
import AmbientAnimationBackground from '@/components/AmbientAnimationBackground';
import gamingLoungeCover from '@/assets/images/gaming_lounge_cover_1794303448404.jpg';

function TiltSpotlightCard({
  children,
  className = '',
  onClick,
  ariaLabel,
  maxTilt = 6,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
  maxTilt?: number;
}) {
  const { ref, onMove, onLeave } = useTilt<HTMLDivElement>(maxTilt);
  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };
  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      className={`card-spotlight ${className}`}
    >
      {children}
    </div>
  );
}

interface DashboardPageProps {
  onNavigate: (page: PageId) => void;
  currentUser: UserAccount | null;
  onPlayGame?: (game: OnlineGame) => void;
  onOpenAuth?: (mode: 'signin' | 'signup') => void;
  onNotify?: (
    message: string,
    opts?: { title?: string; type?: 'success' | 'info' | 'warning' | 'error'; targetPage?: PageId; persist?: boolean }
  ) => void;
}

export default function DashboardPage({
  onNavigate,
  currentUser,
  onPlayGame,
  onOpenAuth,
  onNotify,
}: DashboardPageProps) {
  const { pushVisualAlert, backgroundPaused, toggleBackgroundPaused, reduceMotion } = useAccessibility();

  // Mobile drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [communityPanelOpen, setCommunityPanelOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setCommunityPanelOpen(false);
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Selected modals
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutProduct, setCheckoutProduct] = useState<ProductItem | null>(null);
  const [checkoutGameId, setCheckoutGameId] = useState<'freefire' | 'pubg' | 'eafc'>('freefire');

  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [bracketModalOpen, setBracketModalOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<TournamentEntity | null>(null);
  const [actionMatchId, setActionMatchId] = useState<string | null>(null);
  const [actionTourneyId, setActionTourneyId] = useState<string | null>(null);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);

  // Notifications popup & reactive DB state
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>(() => db.getNotifications());

  // Track claimed challenge IDs for the current session
  const [claimedIds, setClaimedIds] = useState<string[]>([]);

  // Reactive DB subscriptions
  const [tournaments, setTournaments] = useState(() => db.getTournaments());
  const [products, setProducts] = useState(() => db.getProducts());
  const [users, setUsers] = useState(() => db.getUsers());
  const [newsList, setNewsList] = useState<NewsArticle[]>(() => db.getNews());
  const [userOrders, setUserOrders] = useState(() => (currentUser ? db.getOrders(currentUser.id) : []));
  const [userRegs, setUserRegs] = useState(() => (currentUser ? db.getRegistrations(currentUser.id) : []));
  const [dailyRemaining, setDailyRemaining] = useState<number>(() => wellnessEngine.getRemainingSeconds());

  useEffect(() => {
    setDailyRemaining(wellnessEngine.getRemainingSeconds());
    return wellnessEngine.subscribe(() => {
      setDailyRemaining(wellnessEngine.getRemainingSeconds());
    });
  }, []);

  useEffect(() => {
    setUserOrders(currentUser ? db.getOrders(currentUser.id) : []);
    setUserRegs(currentUser ? db.getRegistrations(currentUser.id) : []);
    setNotifications(db.getNotifications());
    return db.subscribe(() => {
      const latestTourneys = db.getTournaments();
      setTournaments(latestTourneys);
      setSelectedTournament((prev) => (prev ? latestTourneys.find((x) => x.id === prev.id) || prev : null));
      setProducts(db.getProducts());
      setUsers(db.getUsers());
      setNewsList(db.getNews());
      setNotifications(db.getNotifications());
      const active = db.getCurrentUser();
      setUserOrders(active ? db.getOrders(active.id) : []);
      setUserRegs(active ? db.getRegistrations(active.id) : []);
    });
  }, [currentUser]);

  const challenges = useMemo(() => {
    const completedTopUps = userOrders.filter((o) => o.paymentStatus === 'success').length;
    const regCount = userRegs.length;
    const playedCount = currentUser?.gamesPlayed || 0;
    return [
      {
        id: 'ch-1',
        title: 'Complete First Top-Up',
        desc: 'Finish a Telebirr or CBE Birr top-up for your Player ID',
        progress: Math.min(1, completedTopUps),
        total: 1,
        reward: 150,
        claimed: claimedIds.includes('ch-1'),
      },
      {
        id: 'ch-2',
        title: 'Esports Contender',
        desc: 'Register for any free competitive tournament',
        progress: Math.min(1, regCount),
        total: 1,
        reward: 200,
        claimed: claimedIds.includes('ch-2'),
      },
      {
        id: 'ch-3',
        title: 'Arcade Master',
        desc: 'Play 3 matches in the HTML5 game room',
        progress: Math.min(3, playedCount),
        total: 3,
        reward: 100,
        claimed: claimedIds.includes('ch-3'),
      },
    ];
  }, [userOrders, userRegs, currentUser, claimedIds]);

  // Filtered catalog
  const popularTopUps = useMemo(() => {
    return products.filter((p) => p.popular || p.id === 'ff-100' || p.id === 'pubg-60' || p.id === 'fc-500' || p.id === 'ff-weekly').slice(0, 4);
  }, [products]);

  // Featured Tournament
  const featuredTournament = useMemo(() => {
    return tournaments.find((t) => t.id === 't-ff-addis-championship') || tournaments[0];
  }, [tournaments]);

  // Featured Games (Top 6 master in-website games with 5 difficulty levels & instant 0ms load)
  const featuredGames = useMemo(() => {
    return ONLINE_GAMES.slice(0, 6);
  }, []);

  // Leaderboard ranking list
  const topGamers = useMemo(() => {
    return [...users].sort((a, b) => b.loyaltyPoints - a.loyaltyPoints).slice(0, 5);
  }, [users]);

  // Quick top-up handler
  const handleQuickTopUp = (product: ProductItem) => {
    setCheckoutProduct(product);
    const validGameId = (['freefire', 'pubg', 'eafc'].includes(product.gameId) ? product.gameId : 'freefire') as 'freefire' | 'pubg' | 'eafc';
    setCheckoutGameId(validGameId);
    setCheckoutModalOpen(true);
  };

  // Quick challenge claim
  const handleClaimChallenge = (id: string, reward: number) => {
    if (!currentUser) {
      onNotify?.(`Sign in or create an account to claim +${reward} Loyalty XP!`);
      onOpenAuth?.('signin');
      return;
    }
    if (claimedIds.includes(id)) return;
    setClaimedIds((prev) => [...prev, id]);
    db.updateUser({
      ...currentUser,
      loyaltyPoints: currentUser.loyaltyPoints + reward,
    });
    onNotify?.(`Claimed +${reward} Loyalty XP! New balance: ${currentUser.loyaltyPoints + reward} XP`);
  };

  // Quick Register
  const handleOpenRegister = (tourney: TournamentEntity) => {
    setSelectedTournament(tourney);
    setRegisterModalOpen(true);
  };

  // Quick Bracket
  const handleOpenBracket = (tourney: TournamentEntity) => {
    setSelectedTournament(tourney);
    setBracketModalOpen(true);
    if (currentUser?.id && tourney.roomCredentials?.published && !tourney.roomCredentials.roomId) {
      void db.syncTournamentsFromFirestore(currentUser.id, isAuthorizedAdminUser(currentUser));
    }
  };

  // Search filter
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    const matchedGames = ONLINE_GAMES.filter((g) => g.title.toLowerCase().includes(q) || g.genre.toLowerCase().includes(q)).slice(0, 3);
    const matchedProducts = products.filter((p) => p.name.toLowerCase().includes(q) || p.gameName.toLowerCase().includes(q)).slice(0, 3);
    const matchedTourneys = tournaments.filter((t) => t.title.toLowerCase().includes(q) || t.gameName.toLowerCase().includes(q)).slice(0, 3);
    return { games: matchedGames, products: matchedProducts, tourneys: matchedTourneys };
  }, [searchQuery, products, tournaments]);

  // Unread notifications count
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllNotificationsRead = () => {
    db.markAllNotificationsRead();
  };

  return (
    <div className="relative min-h-screen bg-transparent text-slate-100 flex flex-col pt-16">
      {/* Top 3-Column Dashboard Stage (Sidebars + Transparent Tournament Hero) */}
      <div className="relative z-10 w-full max-w-[1920px] mx-auto flex">
        
        {/* ========================================================================= */}
        {/* COLUMN A: LEFT VERTICAL SIDEBAR                                           */}
        {/* ========================================================================= */}
        <aside
          aria-label="Dashboard navigation sidebar"
          className={`
            fixed inset-y-0 left-0 z-40 w-64 glass-sidebar border-r border-white/10 flex flex-col justify-between pt-20 pb-4 transition-transform duration-300 lg:static lg:translate-x-0 lg:pt-4
            ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          {/* Mobile close button */}
          <div className="flex items-center justify-between px-4 pb-3 lg:hidden">
            <span className="font-display font-bold text-white text-base">Navigation</span>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close dashboard navigation"
              className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="px-3 space-y-1 overflow-y-auto flex-1">
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Main Dashboard
            </div>

            <button
              type="button"
              aria-current="page"
              onClick={() => { onNavigate('home'); setMobileMenuOpen(false); }}
              className="sidebar-luminous-item relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white border border-primary-400/35 cursor-pointer"
            >
              <motion.span
                layoutId="sidebar-active-pill"
                transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                aria-hidden="true"
                className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-primary-500/25 via-violet-500/18 to-amber-500/15"
              />
              <Layers className="w-4 h-4 text-primary-400 shrink-0" />
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => { onNavigate('topup'); setMobileMenuOpen(false); }}
              className="sidebar-luminous-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:text-white border border-transparent hover:border-amber-400/30 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Game Top-Up</span>
            </button>

            <button
              type="button"
              onClick={() => { onNavigate('tournaments'); setMobileMenuOpen(false); }}
              className="sidebar-luminous-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:text-white border border-transparent hover:border-emerald-400/30 cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Tournaments</span>
            </button>

            <button
              type="button"
              onClick={() => { onNavigate('games'); setMobileMenuOpen(false); }}
              className="sidebar-luminous-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:text-white border border-transparent hover:border-cyan-400/30 cursor-pointer"
            >
              <Gamepad2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Browse Games</span>
            </button>

            <button
              type="button"
              onClick={() => { onNavigate('leaderboard'); setMobileMenuOpen(false); }}
              className="sidebar-luminous-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:text-white border border-transparent hover:border-indigo-400/30 cursor-pointer"
            >
              <TrendingUp className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Leaderboards</span>
            </button>

            <div className="pt-4 pb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Community &amp; Account
            </div>

            <button
              type="button"
              onClick={() => { onNavigate('news'); setMobileMenuOpen(false); }}
              className="sidebar-luminous-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:text-white border border-transparent hover:border-primary-400/25 cursor-pointer"
            >
              <Newspaper className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Gaming News</span>
            </button>

            <button
              type="button"
              onClick={() => { onNavigate('orders'); setMobileMenuOpen(false); }}
              className="sidebar-luminous-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:text-white border border-transparent hover:border-primary-400/25 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-slate-400 shrink-0" />
              <span>My Orders &amp; Receipts</span>
            </button>

            <button
              type="button"
              onClick={() => { onNavigate('rewards'); setMobileMenuOpen(false); }}
              className="sidebar-luminous-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:text-white border border-transparent hover:border-amber-400/25 cursor-pointer"
            >
              <Gift className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Rewards &amp; Loyalty</span>
            </button>

            <button
              type="button"
              onClick={() => { onNavigate('support'); setMobileMenuOpen(false); }}
              className="sidebar-luminous-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:text-white border border-transparent hover:border-primary-400/25 cursor-pointer"
            >
              <Headphones className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Support &amp; FAQ</span>
            </button>

            <button
              type="button"
              onClick={() => { onNavigate('wellness'); setMobileMenuOpen(false); }}
              className="sidebar-luminous-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-emerald-200 hover:text-white border border-emerald-500/25 hover:border-emerald-400/50 cursor-pointer"
            >
              <HeartPulse className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
              <span className="truncate">Health &amp; Wellness</span>
              <span className="ml-auto font-mono text-[11px] text-emerald-300/90 tabular-nums shrink-0">
                {formatDurationShort(dailyRemaining)}
              </span>
            </button>
          </div>

          {/* User profile card at bottom of sidebar */}
          <div className="p-3 border-t border-white/10 mt-2">
            {currentUser ? (
              <div className="glass rounded-2xl p-3 flex items-center gap-3">
                <UserAvatar
                  src={currentUser.avatar}
                  name={currentUser.gamerTag}
                  size="md"
                  className="w-10 h-10 rounded-xl border border-primary-500/40"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                    <span>{currentUser.gamerTag}</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-primary-500/20 text-primary-300 uppercase">
                      {currentUser.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 tabular-nums">
                    <span>Rank #{currentUser.rank}</span>
                    <span className="text-primary-400 font-semibold">{currentUser.loyaltyPoints} XP</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass rounded-2xl p-3 text-center">
                <p className="text-xs text-slate-300 font-medium mb-2">Join Ethiopian Gamers</p>
                <button
                  type="button"
                  onClick={() => onOpenAuth?.('signin')}
                  className="btn-primary w-full py-2 px-3 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Sign In / Register
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Backdrop for mobile drawer */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
            className="fixed inset-0 bg-black/70 z-30 lg:hidden"
          />
        )}

        {/* ========================================================================= */}
        {/* COLUMN B: CENTRAL HERO STAGE (Over Ambient Seated Character Animation)    */}
        {/* ========================================================================= */}
        <section
          aria-label="Dashboard overview"
          className="flex-1 min-w-0 flex flex-col px-4 sm:px-6 lg:px-8 py-6 space-y-6"
        >
          
          {/* Header Row: Search, Mobile toggle, Notifications, Quick Indicators */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            
            {/* Search Bar */}
            <div className="relative flex-1 max-w-xl" role="search" aria-label="Search packages, tournaments, and games">
              <div className="relative">
                <label htmlFor="dashboard-search-input" className="sr-only">
                  Search Free Fire diamonds, PUBG UC, tournaments, or HTML5 games
                </label>
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
                <input
                  id="dashboard-search-input"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search Free Fire diamonds, PUBG UC, tournaments, or HTML5 games"
                  placeholder="Search Free Fire diamonds, PUBG UC, tournaments, HTML5 games..."
                  className="w-full pl-10 pr-10 py-2.5 glass rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search query"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              {/* Instant Search Dropdown */}
              {searchResults && (
                <div
                  role="region"
                  aria-label="Search results"
                  aria-live="polite"
                  className="absolute left-0 right-0 top-full mt-2 glass-strong rounded-2xl shadow-2xl z-50 p-3 space-y-3 max-h-96 overflow-y-auto"
                >
                  {searchResults.products.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 px-1">Top-Up Packages</div>
                      {searchResults.products.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { handleQuickTopUp(p); setSearchQuery(''); }}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/10 cursor-pointer text-xs text-left"
                        >
                          <span className="font-medium text-white">{p.gameName} — {p.name}</span>
                          <span className="font-bold text-amber-400">{formatETB(p.priceETB)}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.tourneys.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 px-1">Tournaments</div>
                      {searchResults.tourneys.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => { handleOpenRegister(t); setSearchQuery(''); }}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/10 cursor-pointer text-xs text-left"
                        >
                          <span className="font-medium text-white">{t.title}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Free Entry</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.games.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 px-1">Playable Games</div>
                      {searchResults.games.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => { onPlayGame?.(g); setSearchQuery(''); }}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/10 cursor-pointer text-xs text-left"
                        >
                          <span className="font-medium text-white">{g.title} ({g.genre})</span>
                          <span className="text-primary-400 font-bold flex items-center gap-1"><Play className="w-3 h-3" aria-hidden="true" /> Play</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.products.length === 0 && searchResults.tourneys.length === 0 && searchResults.games.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No exact matches found for &ldquo;{searchQuery}&rdquo;. Try searching for &ldquo;diamonds&rdquo;, &ldquo;pubg&rdquo;, or &ldquo;2048&rdquo;.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions: Mobile Menu, Community Drawer Toggle, Notifications, Wallet pill */}
            <div className="flex items-center justify-between sm:justify-end gap-2.5">
              {/* Mobile Menu trigger */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open dashboard navigation sidebar"
                aria-expanded={mobileMenuOpen}
                className="lg:hidden p-2 rounded-xl glass text-slate-200 hover:text-white cursor-pointer"
                title="Open Navigation"
              >
                <Menu className="w-5 h-5" aria-hidden="true" />
              </button>

              {/* Mobile Arena Dispatch Panel trigger */}
              <button
                type="button"
                onClick={() => setCommunityPanelOpen(true)}
                aria-label="Open Arena Dispatch panel"
                aria-expanded={communityPanelOpen}
                className="xl:hidden p-2 rounded-xl glass text-slate-200 hover:text-white flex items-center gap-1 text-xs cursor-pointer"
                title="Open Arena Dispatch"
              >
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" aria-hidden="true" />
                <span className="hidden sm:inline">Dispatch</span>
              </button>

              {/* Notifications Bell */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  aria-label={
                    unreadCount > 0
                      ? `Dashboard notifications (${unreadCount} unread)`
                      : 'Dashboard notifications'
                  }
                  aria-expanded={notificationsOpen}
                  aria-haspopup="true"
                  className="relative p-2.5 rounded-xl glass text-slate-300 hover:text-white hover:border-primary-400/50 transition-colors cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" aria-hidden="true" />
                  {unreadCount > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center tabular-nums"
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {notificationsOpen && (
                  <div
                    role="region"
                    aria-label="Notifications list"
                    className="fixed inset-x-3 top-20 sm:inset-x-auto sm:top-auto sm:absolute sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-80 max-h-[calc(100vh-5.5rem)] overflow-y-auto glass-strong rounded-2xl shadow-2xl z-50 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <span className="text-xs font-bold text-white">Notifications</span>
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-[10px] text-primary-400 hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-72 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-5 text-center text-xs text-slate-400">
                          No notifications yet. Order receipts and match updates appear here.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              db.markNotificationRead(n.id);
                              setNotificationsOpen(false);
                              if (n.targetPage) {
                                onNavigate(n.targetPage as PageId);
                              }
                            }}
                            className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors cursor-pointer ${
                              n.read
                                ? 'bg-white/[0.03] text-slate-400'
                                : 'bg-primary-500/10 text-slate-200 border border-primary-500/25'
                            }`}
                          >
                            <div className="font-semibold text-white">{n.title}</div>
                            <div className="text-[11px] text-slate-300 mt-0.5">{n.message}</div>
                            <div className="text-[9px] text-slate-400 mt-1">{n.createdAt}</div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Wallet pill — Semantic button + aria-live polite balance */}
              <button
                type="button"
                onClick={() => onNavigate('wallet')}
                aria-label={`GameZoneET Wallet Balance: ${(currentUser?.walletBalance ?? 0).toLocaleString()} ETB. Open wallet`}
                className="flex items-center gap-2 px-3 py-2 glass rounded-xl cursor-pointer hover:border-primary-400/50 transition-colors"
                title="Your GameZoneET Wallet Balance"
              >
                <Wallet className="w-4 h-4 text-amber-400" aria-hidden="true" />
                <span aria-live="polite" aria-atomic="true" className="text-xs tabular-nums">
                  <span className="font-bold text-white">
                    {(currentUser?.walletBalance ?? 0).toLocaleString()}
                  </span>{' '}
                  <span className="text-[10px] text-slate-400 font-semibold">ETB</span>
                </span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* FEATURED HERO BANNER (0% Fill Transparent Over Seated Character Layer)    */}
          {/* ========================================================================= */}
          <div className="relative rounded-3xl overflow-hidden glass-tournament-transparent border border-primary-400/35 p-6 sm:p-8 lg:p-10 min-h-[480px] lg:min-h-[540px] flex items-center">
            {/* Seated-on-chair character animation positioned directly behind tournament card & info boxes */}
            <AmbientAnimationBackground variant="hero" />

            <div className="relative z-10 w-full grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 min-w-0 space-y-4 hero-text-scrim rounded-2xl p-2 sm:p-3">
                
                {/* Clean Unboxed Kicker Metadata */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wide drop-shadow-[0_1px_8px_rgba(2,6,23,0.95)]">
                  <span className="text-[#00f5d4] uppercase font-bold tracking-wider">Free Fire Esports</span>
                  <span aria-hidden="true" className="text-slate-400">·</span>
                  <span className="text-emerald-300">0 ETB Free Entry</span>
                  <span aria-hidden="true" className="text-slate-400">·</span>
                  <span className="text-rose-300">Live Registration</span>
                </div>

                {/* Tournament Title & Transparent Description Over Seated Character */}
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white font-display tracking-tight leading-tight text-shadow-glow">
                    Addis Ababa Free Fire Invitational 2026
                  </h1>
                  <p className="text-slate-100 text-sm sm:text-base mt-2 max-w-2xl font-normal leading-relaxed drop-shadow-[0_2px_12px_rgba(2,6,23,0.98)]">
                    Compete against top Ethiopian squads in the 64-team knockout bracket with custom room codes delivered straight to your tournament lobby.
                  </p>
                </div>

                {/* Key Metrics Chips */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 tabular-nums drop-shadow-[0_2px_10px_rgba(2,6,23,0.95)]">
                  <div>
                    <div className="text-[11px] uppercase font-semibold text-slate-300 tracking-wider">Prize Recognition</div>
                    <div className="text-xl sm:text-2xl font-black text-amber-400">15,000 ETB Trophy</div>
                  </div>
                  <div className="w-px h-8 bg-white/25" aria-hidden="true" />
                  <div>
                    <div className="text-[11px] uppercase font-semibold text-slate-300 tracking-wider">Bracket Slots</div>
                    <div className="text-xl sm:text-2xl font-black text-white" aria-live="polite">
                      {featuredTournament ? `${featuredTournament.registeredCount} / ${featuredTournament.capacity}` : '48 / 64 Teams'}
                    </div>
                  </div>
                  <div className="w-px h-8 bg-white/25" aria-hidden="true" />
                  <div>
                    <div className="text-[11px] uppercase font-semibold text-slate-300 tracking-wider">Format</div>
                    <div className="text-xl sm:text-2xl font-black text-primary-400">Squad BR Knockout</div>
                  </div>
                </div>

                {/* CTA Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-3">
                  {(() => {
                    const heroReg =
                      currentUser?.id && featuredTournament
                        ? db.getRegistrationForTournament(currentUser.id, featuredTournament.id)
                        : null;
                    if (heroReg && featuredTournament) {
                      return (
                        <button
                          type="button"
                          onClick={() => handleOpenBracket(featuredTournament)}
                          className="btn-glow-cyan px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                          Registered · Slot #{heroReg.slotNumber ?? '-'}
                        </button>
                      );
                    }
                    return (
                      <button
                        type="button"
                        onClick={() => featuredTournament && handleOpenRegister(featuredTournament)}
                        className="btn-glow-cyan px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 cursor-pointer"
                      >
                        <Trophy className="w-4 h-4" aria-hidden="true" />
                        Register Team (Free)
                      </button>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => featuredTournament && handleOpenBracket(featuredTournament)}
                    className="btn-ghost px-5 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 cursor-pointer"
                  >
                    <Layers className="w-4 h-4 text-primary-400" aria-hidden="true" />
                    View Tournament Bracket
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const gate = db.isRoomUnlockedForUser(
                        featuredTournament,
                        currentUser?.id,
                        isAuthorizedAdminUser(currentUser)
                      );
                      if (gate.unlocked && gate.creds) {
                        pushVisualAlert({
                          kind: 'room_code',
                          badge: 'ROOM CODE DROP',
                          title: `${featuredTournament?.title || 'Addis Free Fire Cup'} — Lobby Ready`,
                          message: `Custom Room open on ${gate.creds.server}. Join 10 minutes before kickoff; visual alert active for Deaf & Hard-of-Hearing players.`,
                          roomId: gate.creds.roomId,
                          roomPassword: gate.creds.roomPassword,
                          actionLabel: 'Open Bracket',
                          onAction: () => featuredTournament && handleOpenBracket(featuredTournament),
                        });
                      } else {
                        pushVisualAlert({
                          kind: 'countdown',
                          badge: 'LOBBY ACCESS STATUS',
                          title: `${featuredTournament?.title || 'Addis Free Fire Cup'}`,
                          message:
                            gate.reason === 'unregistered'
                              ? 'Register free to claim your slot confirmation badge and unlock custom Room ID & Password prior to kickoff.'
                              : `Your registration is confirmed! Custom room credentials unlock prior to ${featuredTournament?.startTime || 'match kickoff'}.`,
                          actionLabel: gate.reason === 'unregistered' ? 'Register Free' : 'Open Bracket',
                          onAction: () => {
                            if (featuredTournament) {
                              if (gate.reason === 'unregistered') handleOpenRegister(featuredTournament);
                              else handleOpenBracket(featuredTournament);
                            }
                          },
                        });
                      }
                    }}
                    className="px-4 py-3 rounded-xl font-semibold text-xs text-[#00f0ff] border border-[#00f0ff]/45 bg-transparent hover:bg-[#00f0ff]/15 transition-colors flex items-center gap-1.5 cursor-pointer drop-shadow-[0_1px_8px_rgba(2,6,23,0.95)]"
                    aria-label="Preview visual match room code drop alert"
                  >
                    <Radio className="w-3.5 h-3.5" aria-hidden="true" />
                    Room Code Alert
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate('topup')}
                    className="px-4 py-3 rounded-xl font-semibold text-sm text-amber-300 hover:text-amber-200 hover:bg-amber-500/15 transition-colors flex items-center gap-1.5 cursor-pointer drop-shadow-[0_1px_8px_rgba(2,6,23,0.95)]"
                  >
                    <Zap className="w-4 h-4 text-amber-400" aria-hidden="true" />
                    Top-Up Diamonds
                  </button>

                  {!reduceMotion && (
                    <button
                      type="button"
                      onClick={toggleBackgroundPaused}
                      aria-pressed={backgroundPaused}
                      className="px-3.5 py-2.5 rounded-xl font-semibold text-xs text-slate-200 border border-white/25 bg-[#0c1024]/55 hover:bg-[#0c1024]/85 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer drop-shadow-[0_1px_8px_rgba(2,6,23,0.95)]"
                    >
                      {backgroundPaused ? (
                        <>
                          <Play className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                          <span>Resume Bg Motion</span>
                        </>
                      ) : (
                        <>
                          <Pause className="w-3.5 h-3.5 text-primary-300" aria-hidden="true" />
                          <span>Pause Bg Motion</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Transparent Tournament Visual Info Box */}
              <div className="lg:col-span-4 min-w-0 relative flex justify-center">
                {(() => {
                  const heroGate = db.isRoomUnlockedForUser(
                    featuredTournament,
                    currentUser?.id,
                    isAuthorizedAdminUser(currentUser)
                  );
                  const heroReg =
                    currentUser?.id && featuredTournament
                      ? db.getRegistrationForTournament(currentUser.id, featuredTournament.id)
                      : null;
                  return (
                    <TiltSpotlightCard className="w-full max-w-sm rounded-2xl overflow-hidden glass-tournament-transparent border border-white/25 p-4" maxTilt={8}>
                      <div className="relative rounded-xl overflow-hidden aspect-video mb-3 border border-white/20 bg-transparent">
                        <img
                          src={gamingLoungeCover}
                          alt="Tournament arena"
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover opacity-30 mix-blend-screen"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-transparent" />
                        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between gap-2 text-[11px] font-bold text-white drop-shadow-[0_1px_8px_rgba(2,6,23,0.95)]">
                          <span className="truncate">
                            {featuredTournament?.date || 'Match Day'}
                          </span>
                          <span className="text-amber-400 tabular-nums shrink-0">
                            {featuredTournament?.currentMatchLabel || 'Match #32'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs bg-transparent drop-shadow-[0_1px_8px_rgba(2,6,23,0.95)]">
                        <div className="flex items-center justify-between text-slate-200">
                          <span>Slots Filled:</span>
                          <span className="text-white font-semibold font-mono" aria-live="polite">
                            {featuredTournament
                              ? `${featuredTournament.registeredCount} / ${featuredTournament.capacity} Slots`
                              : '12 / 16 Slots'}
                          </span>
                        </div>
                        {/* Capacity progress */}
                        <div>
                          <div className="flex justify-between text-[11px] text-slate-200 mb-1 tabular-nums">
                            <span>Bracket Progress</span>
                            <span className="text-emerald-400 font-bold">
                              {featuredTournament
                                ? `${Math.round((featuredTournament.registeredCount / featuredTournament.capacity) * 100)}%`
                                : '75%'}
                            </span>
                          </div>
                          <div
                            role="progressbar"
                            aria-label="Featured tournament bracket progress"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={
                              featuredTournament
                                ? Math.min(100, Math.round((featuredTournament.registeredCount / featuredTournament.capacity) * 100))
                                : 75
                            }
                            className="h-2 w-full rounded-full bg-white/15 overflow-hidden"
                          >
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-primary-500 rounded-full"
                              style={{
                                width: featuredTournament
                                  ? `${Math.min(100, (featuredTournament.registeredCount / featuredTournament.capacity) * 100)}%`
                                  : '75%',
                              }}
                            />
                          </div>
                        </div>
                        {heroReg && (
                          <div className="flex items-center justify-between rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-mono text-emerald-300">
                            <span>{heroReg.confirmationCode || 'CONFIRMED'}</span>
                            <span>Slot #{heroReg.slotNumber ?? '-'}</span>
                          </div>
                        )}
                        <div className="pt-2 border-t border-white/15 text-[11px] text-slate-200 text-center flex items-center justify-center gap-1.5">
                          {heroGate.unlocked && heroGate.creds ? (
                            <>
                              <KeyRound className="w-3.5 h-3.5 text-primary-300 shrink-0" />
                              <span className="font-mono font-bold text-primary-200">
                                Room: {heroGate.creds.roomId} • Pass: {heroGate.creds.roomPassword}
                              </span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                              <span>
                                {heroGate.reason === 'unregistered'
                                  ? 'Register free to unlock verified Room ID'
                                  : 'Verified Room ID unlocks in your Profile & Bracket'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </TiltSpotlightCard>
                  );
                })()}
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* COLUMN C: RIGHT-SIDE COMMUNITY & ACTIVITY PANEL                          */}
        {/* ========================================================================= */}
        <aside
          aria-label="Community and live activity"
          className={`
            fixed inset-y-0 right-0 z-40 w-80 max-w-[calc(100vw-2rem)] sm:max-w-none glass-sidebar border-l border-white/10 p-5 flex flex-col justify-between pt-20 transition-transform duration-300 xl:static xl:translate-x-0 xl:pt-6
            ${communityPanelOpen ? 'translate-x-0' : 'translate-x-full xl:translate-x-0'}
          `}
        >
          {/* Mobile close button */}
          <div className="flex items-center justify-between pb-3 xl:hidden border-b border-white/10">
            <span className="font-display font-bold text-white text-base">Community Hub</span>
            <button
              type="button"
              onClick={() => setCommunityPanelOpen(false)}
              aria-label="Close community activity panel"
              className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-6 overflow-y-auto flex-1 pr-1">
            
            {/* Arena Dispatch Header (Real DB Tournament & News Status) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                  Arena Dispatch
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Bracket slots, tournament rooms &amp; Addis esports updates
              </p>
            </div>

            {/* Live Tournament & News Dispatch */}
            <div role="region" aria-label="Arena Dispatch & Tournament Watch" className="space-y-3">
              {tournaments.slice(0, 3).map((t) => {
                const statusColor =
                  t.status === 'live'
                    ? 'text-rose-300'
                    : t.status === 'full'
                    ? 'text-amber-300'
                    : t.status === 'completed'
                    ? 'text-slate-400'
                    : 'text-emerald-300';
                const statusLabel =
                  t.status === 'live'
                    ? 'LIVE'
                    : t.status === 'full'
                    ? 'FULL'
                    : t.status === 'completed'
                    ? 'DONE'
                    : 'OPEN · 0 ETB';

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setCommunityPanelOpen(false);
                      handleOpenBracket(t);
                    }}
                    className="card-spotlight w-full text-left p-3 rounded-xl text-xs space-y-1.5 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="font-semibold text-primary-300 truncate">{t.gameName}</span>
                      <span className={`font-bold uppercase tracking-wider shrink-0 ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <p className="text-white font-semibold line-clamp-1">{t.title}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 tabular-nums">
                      <span>{t.date}</span>
                      <span className="text-amber-300 font-bold">
                        {t.registeredCount}/{t.capacity} slots
                      </span>
                    </div>
                  </button>
                );
              })}

              {newsList[0] && (
                <button
                  type="button"
                  onClick={() => {
                    setCommunityPanelOpen(false);
                    onNavigate('news');
                  }}
                  className="card-spotlight w-full text-left p-3 rounded-xl text-xs space-y-1 cursor-pointer"
                >
                  <div className="flex items-center justify-between text-slate-400 text-[10px]">
                    <span className="font-semibold text-cyan-300">{newsList[0].category}</span>
                    <span>{newsList[0].publishedAt}</span>
                  </div>
                  <p className="text-slate-200 font-medium line-clamp-2">{newsList[0].title}</p>
                </button>
              )}
            </div>

            {/* Community Announcements */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Community
              </span>

              <div className="p-3.5 rounded-2xl glass space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary-300">
                  <Sparkles className="w-3.5 h-3.5 text-primary-400" />
                  Telegram Community
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Join 14,000+ Ethiopian gamers for squad matching and tournament room updates.
                </p>
                <a
                  href="https://t.me/GameZoneET"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-400 hover:text-primary-300 pt-1"
                >
                  Join @GameZoneET <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

          </div>

          {/* Bottom Help Tip */}
          <div className="pt-4 border-t border-white/10 text-center">
            <button
              type="button"
              onClick={() => onNavigate('support')}
              className="text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
            >
              <Headphones className="w-3.5 h-3.5" aria-hidden="true" /> Need Assistance? Open 24/7 Support
            </button>
          </div>
        </aside>

        {/* Backdrop for mobile community drawer */}
        {communityPanelOpen && (
          <div
            onClick={() => setCommunityPanelOpen(false)}
            aria-hidden="true"
            className="fixed inset-0 bg-black/70 z-30 xl:hidden"
          />
        )}
      </div>

      {/* ========================================================================= */}
      {/* FULL-WIDTH VIEWPORT LOWER SECTIONS (Edge-to-Edge Modular Scroll Flow)     */}
      {/* ========================================================================= */}
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-10 xl:px-12 pb-14">
        <div className="divider-glow my-2" aria-hidden="true" />

        {/* ========================================================================= */}
        {/* FULL-WIDTH SECTION 1: POPULAR MOBILE GAME TOP-UPS                         */}
        {/* ========================================================================= */}
        <Reveal as="section" className="w-full py-12 lg:py-14 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white font-display flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  Popular Mobile Game Top-Ups
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Instant delivery via Telebirr &amp; CBE Birr (ETB)</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('topup')}
                className="btn-heat px-3 py-1.5 rounded-xl text-xs font-bold text-primary-300 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                View all 19 packages <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {popularTopUps.map((p) => (
                <StaggerItem key={p.id} className="h-full">
                  <TiltSpotlightCard className="h-full rounded-2xl glass p-5 flex flex-col justify-between group">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5 text-[11px] font-bold">
                        <span className={`uppercase tracking-wider ${
                          p.gameId === 'freefire' ? 'text-amber-300' :
                          p.gameId === 'pubg' ? 'text-cyan-300' :
                          'text-emerald-300'
                        }`}>
                          {p.gameName}
                        </span>
                        {p.bonus && (
                          <span className="text-emerald-400 font-mono">
                            +{p.bonus}
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-white text-base group-hover:text-[#00f5d4] transition-colors">
                        {p.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {p.description}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Price</div>
                        <div className="font-bold text-white text-base tabular-nums">{formatETB(p.priceETB)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleQuickTopUp(p)}
                        className="btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Top Up</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </TiltSpotlightCard>
                </StaggerItem>
              ))}
            </StaggerGrid>
        </Reveal>

        <div className="divider-glow my-2" aria-hidden="true" />

        {/* ========================================================================= */}
        {/* FULL-WIDTH SECTION 2: WEEKLY CHALLENGES & TOP ETHIOPIAN GAMERS            */}
        {/* ========================================================================= */}
        <Reveal as="section" className="w-full py-12 lg:py-14">
          <div className="grid lg:grid-cols-12 gap-6">
            
            {/* Weekly Challenges (7 cols) */}
            <div className="lg:col-span-7 rounded-3xl glass-strong p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white font-display flex items-center gap-2">
                    <Gift className="w-4 h-4 text-primary-400" />
                    Weekly Gamer Challenges
                  </h2>
                  <p className="text-xs text-slate-400">Complete quests to level up your Ethiopian gamer rank</p>
                </div>
                <span className="text-xs font-bold text-[#00f5d4] uppercase tracking-wider">
                  Season 4
                </span>
              </div>

              <div className="space-y-3">
                {challenges.map((c) => (
                  <div
                    key={c.id}
                    className="card-spotlight p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-sm text-white">{c.title}</span>
                        <span className="text-xs font-bold text-amber-400 tabular-nums">
                          +{c.reward} XP
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{c.desc}</p>
                      
                      {/* Mini progress */}
                      <div className="flex items-center gap-2 mt-2.5 max-w-xs">
                        <div
                          role="progressbar"
                          aria-label={`${c.title} progress`}
                          aria-valuemin={0}
                          aria-valuemax={c.total}
                          aria-valuenow={c.progress}
                          className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden"
                        >
                          <div
                            className="h-full bg-primary-500 rounded-full"
                            style={{ width: `${Math.min(100, (c.progress / c.total) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                          {c.progress}/{c.total}
                        </span>
                      </div>
                    </div>

                    <div>
                      {c.claimed ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Claimed
                        </span>
                      ) : c.progress >= c.total ? (
                        <button
                          type="button"
                          onClick={() => handleClaimChallenge(c.id, c.reward)}
                          className="btn-primary px-4 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Claim XP
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">
                          In Progress
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Ethiopian Gamers Leaderboard Widget (5 cols) */}
            <div className="lg:col-span-5 rounded-3xl glass-strong p-6 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-white font-display flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      Top Ethiopian Gamers
                    </h2>
                    <p className="text-xs text-slate-400">Rankings updated from tournament &amp; game points</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('leaderboard')}
                    className="btn-heat px-2.5 py-1 rounded-lg text-xs font-bold text-primary-300 hover:text-white cursor-pointer"
                  >
                    Full Board
                  </button>
                </div>

                <div className="space-y-2.5">
                  {topGamers.map((u, idx) => (
                    <div
                      key={u.id}
                      className="card-spotlight flex items-center justify-between p-3 rounded-2xl"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-5 text-center font-bold text-xs tabular-nums ${
                          idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-slate-400'
                        }`}>
                          #{idx + 1}
                        </span>
                        <UserAvatar
                          src={u.avatar}
                          name={u.gamerTag}
                          size="xs"
                          className="w-8 h-8 rounded-xl border border-white/15"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                            <span>{u.gamerTag}</span>
                            {idx === 0 && <Award className="w-3 h-3 text-amber-400" />}
                          </div>
                          <div className="text-[10px] text-slate-400 tabular-nums">
                            {u.gamesPlayed || 0} games played
                          </div>
                        </div>
                      </div>

                      <div className="text-right tabular-nums">
                        <div className="font-bold text-xs text-primary-300">{u.loyaltyPoints} XP</div>
                        <div className="text-[9px] text-slate-400">Rank #{u.rank}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => onNavigate('games')}
                  className="btn-ghost w-full py-2.5 px-3 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Play In-Browser Games to Earn XP
                </button>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="divider-glow my-2" aria-hidden="true" />

        {/* ========================================================================= */}
        {/* FULL-WIDTH SECTION 3: TOP WORLD-PUBLISHED & PLAY IN-BROWSER SHOWCASE      */}
        {/* ========================================================================= */}
        <Reveal as="section" className="w-full py-12 lg:py-14 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white font-display flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-sky-400" aria-hidden="true" />
                  Top World-Published &amp; Play In-Browser
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verified 3D WebGL &amp; HTML5 Canvas games &bull; Play directly inside GameZone ET with zero redirects
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('games')}
                className="btn-heat px-3.5 py-2 rounded-xl text-xs font-bold text-sky-200 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                Browse all {ONLINE_GAMES.length} games <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <StaggerGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
              {featuredGames.map((game) => (
                <StaggerItem key={game.id} className="h-full">
                  <TiltSpotlightCard
                    onClick={() => onPlayGame?.(game)}
                    ariaLabel={`Play ${game.title} (${game.categoryLabel})`}
                    maxTilt={7}
                    className="h-full group rounded-2xl overflow-hidden glass game-card-luminous cursor-pointer flex flex-col justify-between"
                  >
                    <div className="relative aspect-video overflow-hidden bg-[#0c1024]">
                      <ResilientImage
                        src={game.coverImage}
                        alt={game.title}
                        fallbackLabel={game.title}
                        className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#040611] via-[#040611]/25 to-transparent" aria-hidden="true" />
                      <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[10px]">
                        <span className="font-bold text-sky-300 uppercase tracking-wide truncate">
                          {game.categoryLabel}
                        </span>
                        <span className="font-bold text-amber-400 flex items-center gap-0.5 tabular-nums shrink-0">
                          <span aria-hidden="true">★</span> {game.rating.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 relative z-10 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-xs text-white truncate group-hover:text-sky-300 transition-colors">
                          {game.title}
                        </h3>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {game.tagline || game.description}
                        </p>
                        <p className="text-[10px] font-medium text-emerald-300 truncate mt-1">
                          {game.accessibilityTags.slice(0, 2).join(' · ')}
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-slate-300 font-medium truncate">
                          {game.latencyMs === 0 ? '0ms Local' : 'In-App WebGL'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlayGame?.(game);
                          }}
                          aria-label={`Play ${game.title}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-sky-400/40 bg-sky-500/15 px-2.5 py-1 font-bold text-sky-200 hover:text-white cursor-pointer shrink-0"
                        >
                          <Play className="w-2.5 h-2.5 fill-current" aria-hidden="true" /> Play
                        </button>
                      </div>
                    </div>
                  </TiltSpotlightCard>
                </StaggerItem>
              ))}
            </StaggerGrid>
        </Reveal>

        <div className="divider-glow my-2" aria-hidden="true" />

        {/* ========================================================================= */}
        {/* FULL-WIDTH SECTION 4: UPCOMING ESPORTS TOURNAMENTS GRID                   */}
        {/* ========================================================================= */}
        <Reveal as="section" className="w-full py-12 lg:py-14 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white font-display flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-emerald-400" />
                  Upcoming Free Tournaments
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Zero entry fee · Verified custom rooms · Ethiopian squad prizes</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('tournaments')}
                className="btn-heat px-3 py-1.5 rounded-xl text-xs font-bold text-primary-300 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                All Tournaments <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <StaggerGrid className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tournaments.slice(0, 3).map((t) => {
                const reg = currentUser?.id ? db.getRegistrationForTournament(currentUser.id, t.id) : null;
                const gate = db.isRoomUnlockedForUser(t, currentUser?.id, isAuthorizedAdminUser(currentUser));
                const isClosed = t.status === 'full' || t.status === 'completed';

                return (
                  <StaggerItem key={t.id} className="h-full">
                    <TiltSpotlightCard className="h-full rounded-2xl glass-tournament-transparent p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2 text-[11px] font-bold">
                          <span className="text-emerald-300 uppercase tracking-wider">
                            {t.status === 'live'
                              ? 'LIVE NOW'
                              : t.status === 'full'
                              ? 'SLOTS FULL'
                              : t.status === 'completed'
                              ? 'COMPLETED'
                              : 'FREE · 0 ETB'}
                          </span>
                          <span className="font-extrabold text-amber-400 tabular-nums truncate">{t.prizeRecognition}</span>
                        </div>

                        <h3 className="font-bold text-white text-base mt-1 drop-shadow-[0_1px_6px_rgba(2,6,23,0.95)]">{t.title}</h3>
                        <p className="text-xs text-slate-200 mt-1 line-clamp-2 drop-shadow-[0_1px_6px_rgba(2,6,23,0.95)]">{t.description}</p>

                        {reg && (
                          <div className="mt-2.5 flex items-center justify-between rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-mono">
                            <span className="font-bold text-emerald-300">
                              {reg.confirmationCode || 'REGISTERED'} · Slot #{reg.slotNumber ?? '-'}
                            </span>
                            {gate.unlocked ? (
                              <span className="inline-flex items-center gap-1 font-bold text-primary-300">
                                <KeyRound className="h-3 w-3" /> Room Ready
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-bold text-amber-300">
                                <Lock className="h-3 w-3" /> Locked
                              </span>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 mt-3 text-[11px] text-slate-300">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Game</span>
                            <span className="font-semibold text-white">{t.gameName}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Format</span>
                            <span className="font-semibold text-white">{t.format}</span>
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="flex justify-between text-[10px] text-slate-300 mb-1 tabular-nums">
                            <span>Participants</span>
                            <span className="font-bold text-emerald-400" aria-live="polite">{t.registeredCount} / {t.capacity}</span>
                          </div>
                          <div
                            role="progressbar"
                            aria-label={`${t.title} participants`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.min(100, Math.round((t.registeredCount / t.capacity) * 100))}
                            className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden"
                          >
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${Math.min(100, (t.registeredCount / t.capacity) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-white/10 flex items-center gap-2.5">
                        {reg ? (
                          <button
                            type="button"
                            onClick={() => handleOpenBracket(t)}
                            className="btn-heat flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/30 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {gate.unlocked ? 'Open Room' : 'Registered'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isClosed}
                            onClick={() => handleOpenRegister(t)}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold ${
                              isClosed
                                ? 'no-heat bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed'
                                : 'btn-primary cursor-pointer'
                            }`}
                          >
                            {t.status === 'full' ? 'Slots Full' : t.status === 'completed' ? 'Completed' : 'Join Free'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenBracket(t)}
                          className="btn-ghost px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                        >
                          Bracket
                        </button>
                      </div>
                    </TiltSpotlightCard>
                  </StaggerItem>
                );
              })}
            </StaggerGrid>
        </Reveal>
      </div>

      {/* ========================================================================= */}
      {/* MODALS WIRED TO THE DASHBOARD (Lazy-loaded on demand)                     */}
      {/* ========================================================================= */}
      {checkoutModalOpen && (
        <Suspense fallback={null}>
          <CheckoutModal
            isOpen={checkoutModalOpen}
            onClose={() => setCheckoutModalOpen(false)}
            initialGameId={checkoutGameId}
            initialProduct={checkoutProduct}
            onOrderCompleted={(order: OrderItem) => {
              onNotify?.(`Order #${order.id} (${order.receiptRef}) confirmed via ${order.paymentMethod.toUpperCase()}!`);
            }}
            onNavigateToOrders={() => onNavigate('orders')}
          />
        </Suspense>
      )}

      {registerModalOpen && (
        <Suspense fallback={null}>
          <TournamentRegisterModal
            isOpen={registerModalOpen}
            onClose={() => setRegisterModalOpen(false)}
            tournament={selectedTournament}
            currentUser={currentUser}
            onSuccess={(msg) => onNotify?.(msg)}
            onNotify={onNotify}
          />
        </Suspense>
      )}

      {bracketModalOpen && (
        <Suspense fallback={null}>
          <TournamentBracketModal
            isOpen={bracketModalOpen}
            onClose={() => setBracketModalOpen(false)}
            tournament={selectedTournament}
            currentUser={currentUser}
            onOpenDispute={(matchId, tourneyId) => {
              setActionMatchId(matchId);
              setActionTourneyId(tourneyId);
              setDisputeModalOpen(true);
            }}
            onSubmitResult={(matchId, tourneyId) => {
              setActionMatchId(matchId);
              setActionTourneyId(tourneyId);
              setResultModalOpen(true);
            }}
          />
        </Suspense>
      )}

      {resultModalOpen && (
        <Suspense fallback={null}>
          <MatchResultModal
            isOpen={resultModalOpen}
            onClose={() => setResultModalOpen(false)}
            matchId={actionMatchId || ''}
            tournamentId={actionTourneyId || ''}
            currentUser={currentUser}
            onSuccess={(msg) => onNotify?.(msg)}
          />
        </Suspense>
      )}

      {disputeModalOpen && (
        <Suspense fallback={null}>
          <TournamentDisputeModal
            isOpen={disputeModalOpen}
            onClose={() => setDisputeModalOpen(false)}
            matchId={actionMatchId || ''}
            tournamentId={actionTourneyId || ''}
            currentUser={currentUser}
            onSuccess={(msg) => onNotify?.(msg)}
          />
        </Suspense>
      )}
    </div>
  );
}

import { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Gamepad2,
  Menu,
  X,
  Trophy,
  Home,
  Gift,
  BarChart3,
  Flame,
  User,
  LogIn,
  UserPlus,
  ShoppingBag,
  Newspaper,
  ShieldAlert,
  ChevronDown,
  LogOut,
  Sparkles,
  Bell,
  CheckCheck,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Accessibility,
  HeartPulse,
  Eye,
  PauseCircle,
} from 'lucide-react';
import type { PageId } from '@/hooks/useRouter';
import { isAuthorizedAdminUser, signOutAccount } from '@/services/authService';
import { db, type UserNotification } from '@/services/db';
import UserAvatar from '@/components/UserAvatar';
import AccessibilityControls from '@/components/AccessibilityControls';
import { useAccessibility } from '@/context/AccessibilityContext';

interface NavbarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  walletBalance?: number;
  loyaltyPoints: number;
  currentUser: any;
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
}

export default function Navbar({
  currentPage,
  onNavigate,
  loyaltyPoints,
  currentUser,
  onOpenAuth,
}: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [a11yOpen, setA11yOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>(() => db.getNotifications());
  const [browserPerm, setBrowserPerm] = useState<string>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const a11yRef = useRef<HTMLDivElement>(null);
  const {
    highContrast,
    toggleHighContrast,
    reduceMotion,
    toggleReduceMotion,
    textScale,
  } = useAccessibility();
  const hasA11yActive = highContrast || reduceMotion || textScale !== 1;

  const isAdmin = isAuthorizedAdminUser(currentUser);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const NAV: { id: PageId; label: string; icon: any }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'topup', label: 'Top-Up', icon: Gamepad2 },
    { id: 'tournaments', label: 'Tournaments', icon: Trophy },
    { id: 'games', label: 'Games', icon: Flame },
    { id: 'leaderboard', label: 'Leaderboard', icon: BarChart3 },
    { id: 'news', label: 'News', icon: Newspaper },
    { id: 'rewards', label: 'Rewards', icon: Gift },
    { id: 'orders', label: 'My Orders', icon: ShoppingBag },
    { id: 'wellness', label: 'Health & Wellness', icon: HeartPulse },
    ...(isAdmin ? [{ id: 'admin' as PageId, label: 'Admin', icon: ShieldAlert }] : []),
  ];

  useEffect(() => {
    setNotifications(db.getNotifications());
    return db.subscribe(() => {
      setNotifications(db.getNotifications());
    });
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close dropdowns on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (a11yRef.current && !a11yRef.current.contains(e.target as Node)) {
        setA11yOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserDropdownOpen(false);
        setNotifOpen(false);
        setA11yOpen(false);
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleEnableBrowserAlerts = async () => {
    if (typeof Notification === 'undefined') return;
    try {
      const perm = await Notification.requestPermission();
      setBrowserPerm(perm);
      if (perm === 'granted') {
        db.addNotification({
          title: 'Browser Alerts Enabled',
          message: 'You will receive alerts for orders, tournament matches, and support replies.',
          type: 'success',
        });
      }
    } catch {
      setBrowserPerm('denied');
    }
  };

  const go = (id: PageId) => {
    onNavigate(id);
    setOpen(false);
    setUserDropdownOpen(false);
    setNotifOpen(false);
    setA11yOpen(false);
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-ink-950/65 backdrop-blur-2xl border-b border-white/10 shadow-card py-1.5'
          : 'bg-ink-950/40 backdrop-blur-xl border-b border-white/10 py-2'
      }`}
    >
      <nav aria-label="Primary navigation" className="container-x flex h-16 items-center justify-between gap-2 sm:gap-4">
        {/* Logo */}
        <button
          type="button"
          onClick={() => go('home')}
          aria-label="GameZoneET Home"
          className="no-heat flex items-center gap-2 sm:gap-2.5 min-w-0 shrink-0 cursor-pointer text-left"
        >
          <span className="relative grid h-9 w-9 sm:h-10 sm:w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary-400 via-violet-500 to-accent-500 text-white">
            <Gamepad2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <span className="font-display text-base sm:text-xl font-extrabold tracking-tight text-white block leading-tight">
              GameZone<span className="text-primary-400">ET</span>
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-primary-300/80 block -mt-0.5">
              Ethiopia
            </span>
          </div>
        </button>

        {/* Desktop Navigation Links — Luminous Kinetic Pills */}
        <ul className="hidden xl:flex items-center gap-0.5">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = currentPage === n.id;
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => go(n.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`nav-luminous-item group relative flex items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-xs font-semibold cursor-pointer ${
                    active
                      ? 'text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="navbar-active-pill-xl"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      aria-hidden="true"
                      className="absolute inset-0 -z-10 rounded-xl border border-primary-400/35 bg-gradient-to-r from-primary-500/20 via-violet-500/18 to-amber-500/15 shadow-[0_0_18px_-4px_rgba(0,240,255,0.45)]"
                    />
                  )}
                  <Icon
                    className={`h-3.5 w-3.5 transition-colors ${
                      active ? 'text-primary-400' : 'text-slate-400 group-hover:text-cyan-300'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{n.label}</span>
                  {active && (
                    <motion.span
                      layoutId="navbar-active-underline-xl"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      aria-hidden="true"
                      className="absolute inset-x-2.5 -bottom-1 h-0.5 rounded-full bg-gradient-to-r from-primary-400 via-cyan-300 to-accent-400 shadow-[0_0_10px_#00f0ff]"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Medium Screen Nav (768px to 1280px) */}
        <ul className="hidden md:flex xl:hidden items-center gap-0.5">
          {NAV.slice(0, 5).map((n) => {
            const Icon = n.icon;
            const active = currentPage === n.id;
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => go(n.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`nav-luminous-item relative flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold cursor-pointer ${
                    active ? 'text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="navbar-active-pill-md"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      aria-hidden="true"
                      className="absolute inset-0 -z-10 rounded-lg border border-primary-400/35 bg-gradient-to-r from-primary-500/20 via-violet-500/18 to-amber-500/15"
                    />
                  )}
                  <Icon className={`h-3.5 w-3.5 ${active ? 'text-primary-400' : 'text-slate-400'}`} aria-hidden="true" />
                  <span>{n.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Right Action Cluster */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Loyalty XP Points Pill */}
          <button
            type="button"
            onClick={() => go('rewards')}
            aria-label={`Loyalty Points: ${(currentUser?.loyaltyPoints ?? loyaltyPoints ?? 0).toLocaleString()} XP. Open rewards`}
            className="hidden sm:flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-gold-400/50 hover:bg-white/10 cursor-pointer"
            title="Your Loyalty Points (Platform XP)"
          >
            <Trophy className="h-3.5 w-3.5 text-gold-400" aria-hidden="true" />
            <span className="font-mono text-xs font-bold text-gold-300">
              {(currentUser?.loyaltyPoints ?? loyaltyPoints ?? 0).toLocaleString()} XP
            </span>
          </button>

          {/* Global 1-Click Accessibility Toggles (High Contrast & Reduced Motion) */}
          <div className="hidden lg:flex items-center gap-1" role="group" aria-label="Quick accessibility toggles">
            <button
              type="button"
              onClick={toggleHighContrast}
              aria-pressed={highContrast}
              title="Toggle High Contrast Mode"
              className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                highContrast
                  ? 'border-[#00f0ff] bg-[#00f0ff]/20 text-white'
                  : 'border-white/15 bg-white/[0.04] text-slate-300 hover:border-white/30 hover:text-white'
              }`}
            >
              <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Contrast</span>
            </button>
            <button
              type="button"
              onClick={toggleReduceMotion}
              aria-pressed={reduceMotion}
              title="Toggle Reduced Motion Mode"
              className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                reduceMotion
                  ? 'border-[#00f0ff] bg-[#00f0ff]/20 text-white'
                  : 'border-white/15 bg-white/[0.04] text-slate-300 hover:border-white/30 hover:text-white'
              }`}
            >
              <PauseCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Reduce Motion</span>
            </button>
          </div>

          {/* Accessibility Settings Quick Widget (Always accessible for signed-in & guest users) */}
          <div className="relative" ref={a11yRef}>
            <button
              type="button"
              onClick={() => {
                setA11yOpen((v) => !v);
                setNotifOpen(false);
                setUserDropdownOpen(false);
              }}
              aria-label="Accessibility Settings"
              aria-expanded={a11yOpen}
              aria-haspopup="dialog"
              title="Accessibility Settings (High Contrast, Reduce Motion, Text Size)"
              className={`relative grid h-9 w-9 place-items-center rounded-xl border transition-colors cursor-pointer ${
                hasA11yActive || a11yOpen
                  ? 'border-[#00f0ff] bg-[#00f0ff]/15 text-[#00f0ff]'
                  : 'border-white/15 bg-white/[0.04] text-slate-200 hover:border-[#00f0ff]/60 hover:bg-white/10'
              }`}
            >
              <Accessibility className="h-4 w-4" aria-hidden="true" />
              {hasA11yActive && (
                <span
                  aria-hidden="true"
                  className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#00f0ff] ring-2 ring-[#0c1024]"
                />
              )}
            </button>

            {a11yOpen && (
              <div
                role="dialog"
                aria-label="Accessibility Settings"
                className="fixed inset-x-3 top-20 sm:inset-x-auto sm:top-auto sm:absolute sm:right-0 sm:mt-2 w-auto sm:w-80 max-h-[calc(100vh-5.5rem)] overflow-y-auto rounded-2xl border border-[#00f0ff]/45 bg-[#0c1024]/95 backdrop-blur-2xl p-3.5 shadow-2xl z-50 text-xs animate-scale-in"
              >
                <AccessibilityControls />
              </div>
            )}
          </div>

          {/* Notification Center Bell */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                setNotifOpen((v) => !v);
                setA11yOpen(false);
                setUserDropdownOpen(false);
              }}
              aria-expanded={notifOpen}
              aria-haspopup="true"
              className="relative grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-white/[0.04] text-slate-200 transition-colors hover:border-primary-400/50 hover:bg-white/10 cursor-pointer"
              aria-label={
                unreadCount > 0
                  ? `Notifications (${unreadCount} unread)`
                  : 'Notifications (no unread alerts)'
              }
              title="Notifications"
            >
              <Bell className="h-4 w-4 text-primary-300" aria-hidden="true" />
              {unreadCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent-500 px-1 text-[10px] font-black text-white shadow-glow"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div
                role="dialog"
                aria-label="Notifications panel"
                className="fixed inset-x-3 top-20 sm:inset-x-auto sm:top-auto sm:absolute sm:right-0 sm:mt-2 w-auto sm:w-96 max-h-[calc(100vh-5.5rem)] overflow-y-auto rounded-2xl border border-white/15 bg-ink-950/95 backdrop-blur-2xl p-3 shadow-2xl z-50 text-xs animate-scale-in"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-2">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary-400" aria-hidden="true" />
                    <span className="font-bold text-white text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-primary-500/20 px-2 py-0.5 text-[10px] font-bold text-primary-300">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => db.markAllNotificationsRead()}
                        aria-label="Mark all notifications as read"
                        className="inline-flex min-h-[28px] items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1 text-[10px] text-slate-300 hover:text-white cursor-pointer"
                        title="Mark all as read"
                      >
                        <CheckCheck className="h-3 w-3" aria-hidden="true" /> Read all
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={() => db.clearNotifications()}
                        aria-label="Clear all notifications"
                        className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:text-error-400 hover:bg-white/5 cursor-pointer"
                        title="Clear notifications"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>

                {browserPerm === 'default' && (
                  <button
                    type="button"
                    onClick={() => void handleEnableBrowserAlerts()}
                    className="mb-2 w-full rounded-xl border border-primary-400/30 bg-primary-500/10 px-3 py-2 text-left text-[11px] font-semibold text-primary-200 hover:bg-primary-500/20 cursor-pointer transition-colors"
                  >
                    Enable desktop/browser notifications for order &amp; match alerts &rarr;
                  </button>
                )}

                <div className="max-h-72 overflow-y-auto space-y-1.5 pr-0.5">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-slate-400">
                      No notifications yet. Order receipts, tournament updates, and replies appear here.
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const NIcon =
                        n.type === 'error'
                          ? AlertCircle
                          : n.type === 'warning'
                          ? AlertTriangle
                          : n.type === 'info'
                          ? Info
                          : CheckCircle2;
                      const iconColor =
                        n.type === 'error'
                          ? 'text-error-400'
                          : n.type === 'warning'
                          ? 'text-gold-400'
                          : n.type === 'info'
                          ? 'text-primary-400'
                          : 'text-success-400';

                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            db.markNotificationRead(n.id);
                            if (n.targetPage) {
                              go(n.targetPage as PageId);
                            }
                          }}
                          className={`w-full rounded-xl border p-2.5 text-left transition-colors cursor-pointer flex items-start gap-2.5 ${
                            n.read
                              ? 'border-white/5 bg-white/[0.01] text-slate-400'
                              : 'border-primary-400/25 bg-primary-500/10 text-slate-200'
                          }`}
                        >
                          <NIcon className={`h-4 w-4 shrink-0 mt-0.5 ${iconColor}`} aria-hidden="true" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-white truncate">
                                {!n.read && <span className="sr-only">Unread: </span>}
                                {n.title}
                              </span>
                              {!n.read && <span aria-hidden="true" className="h-2 w-2 rounded-full bg-primary-400 shrink-0" />}
                            </div>
                            <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{n.message}</p>
                            <span className="text-[10px] text-slate-500 mt-1 block">{n.createdAt}</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile / Sign In & Sign Up */}
          {currentUser ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setUserDropdownOpen(!userDropdownOpen);
                  setA11yOpen(false);
                  setNotifOpen(false);
                }}
                aria-expanded={userDropdownOpen}
                aria-haspopup="menu"
                aria-label={`Account menu for ${currentUser.gamerTag}`}
                className="flex items-center gap-2 rounded-xl border border-primary-400/40 bg-gradient-to-r from-primary-400/15 via-primary-400/10 to-accent-500/15 px-3 py-1.5 text-xs sm:text-sm font-bold text-white shadow-glow transition-all hover:border-primary-300 cursor-pointer"
              >
                <UserAvatar
                  src={currentUser.avatar}
                  name={currentUser.gamerTag}
                  size="xs"
                  className="h-6 w-6 rounded-full ring-1 ring-primary-300"
                />
                <span className="font-display tracking-tight truncate max-w-[90px] sm:max-w-none">
                  {currentUser.gamerTag}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              </button>

              {/* User Dropdown Menu */}
              {userDropdownOpen && (
                <div
                  role="menu"
                  aria-label="User account and accessibility menu"
                  className="fixed inset-x-3 top-20 sm:inset-x-auto sm:top-auto sm:absolute sm:right-0 sm:mt-2 w-auto sm:w-72 rounded-2xl border border-white/10 bg-ink-950/95 backdrop-blur-2xl p-2.5 shadow-2xl z-50 text-xs animate-scale-in max-h-[calc(100vh-5.5rem)] overflow-y-auto"
                >
                  <div className="p-2.5 border-b border-white/10 mb-1.5">
                    <span className="font-bold text-white block text-sm">{currentUser.gamerTag}</span>
                    <span className="text-slate-400 block text-[11px] truncate">{currentUser.email}</span>
                    <span className="mt-1.5 inline-block rounded-full bg-primary-500/20 text-primary-300 font-bold px-2 py-0.5 text-[10px] uppercase">
                      Role: {isAdmin ? 'Admin' : 'Gamer'}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => go('profile')}
                      className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-slate-200 hover:text-white hover:bg-white/10 text-left font-medium cursor-pointer"
                    >
                      <User className="h-4 w-4 text-primary-400" aria-hidden="true" /> My Profile &amp; Badges
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => go('orders')}
                      className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-slate-200 hover:text-white hover:bg-white/10 text-left font-medium cursor-pointer"
                    >
                      <ShoppingBag className="h-4 w-4 text-accent-400" aria-hidden="true" /> My Orders &amp; Receipts
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => go('wellness')}
                      className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-slate-200 hover:text-white hover:bg-white/10 text-left font-medium cursor-pointer"
                    >
                      <HeartPulse className="h-4 w-4 text-emerald-400" aria-hidden="true" /> Health &amp; Wellness
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => go('admin')}
                        className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-slate-200 hover:text-white hover:bg-white/10 text-left font-medium cursor-pointer"
                      >
                        <ShieldAlert className="h-4 w-4 text-gold-400" aria-hidden="true" /> Admin Dashboard
                      </button>
                    )}
                  </div>

                  {/* Embedded Accessibility Settings inside User Dropdown */}
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <AccessibilityControls compact />
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-white/10">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={async () => {
                        setUserDropdownOpen(false);
                        await signOutAccount().catch(() => {});
                        onOpenAuth('signin');
                      }}
                      className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-error-400 hover:bg-error-500/10 text-left font-semibold cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onOpenAuth('signin')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-slate-200 hover:text-white hover:border-primary-400/50 hover:bg-white/10 transition-all cursor-pointer whitespace-nowrap"
              >
                <LogIn className="h-3.5 w-3.5 text-primary-400 shrink-0" aria-hidden="true" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="btn-glow-gold group relative hidden sm:inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 sm:px-4 py-2 text-xs font-extrabold text-white cursor-pointer whitespace-nowrap"
              >
                <UserPlus className="h-3.5 w-3.5 text-white shrink-0" aria-hidden="true" />
                <span className="tracking-tight uppercase">Sign Up</span>
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-nav-drawer"
            className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-xl border border-white/15 bg-white/5 text-slate-200 xl:hidden cursor-pointer hover:border-white/30 shrink-0"
            aria-label="Toggle Navigation Menu"
          >
            {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <div
        id="mobile-nav-drawer"
        className={`transition-all duration-300 xl:hidden ${
          open ? 'max-h-[calc(100vh-5rem)] overflow-y-auto border-b border-white/10 bg-ink-950/95 backdrop-blur-2xl' : 'max-h-0 overflow-hidden'
        }`}
      >
        <ul className="container-x space-y-1 pb-6 pt-3">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = currentPage === n.id;
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => go(n.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-primary-400/15 text-white border border-primary-400/30'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${active ? 'text-primary-400' : 'text-slate-400'}`} aria-hidden="true" />
                    <span>{n.label}</span>
                  </div>
                </button>
              </li>
            );
          })}

          <li className="pt-2 border-t border-white/10">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={toggleHighContrast}
                aria-pressed={highContrast}
                className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-bold whitespace-nowrap cursor-pointer ${
                  highContrast
                    ? 'border-[#00f0ff] bg-[#00f0ff]/20 text-white'
                    : 'border-white/15 bg-white/5 text-slate-200'
                }`}
              >
                <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>High Contrast</span>
              </button>
              <button
                type="button"
                onClick={toggleReduceMotion}
                aria-pressed={reduceMotion}
                className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-bold whitespace-nowrap cursor-pointer ${
                  reduceMotion
                    ? 'border-[#00f0ff] bg-[#00f0ff]/20 text-white'
                    : 'border-white/15 bg-white/5 text-slate-200'
                }`}
              >
                <PauseCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Reduce Motion</span>
              </button>
            </div>
          </li>

          <li className="pt-2">
            {currentUser ? (
              <button
                type="button"
                onClick={() => go('profile')}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/10 p-2.5 text-xs font-bold text-white cursor-pointer"
              >
                <User className="h-4 w-4 text-primary-400" aria-hidden="true" />
                <span>Signed in as {currentUser.gamerTag}</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setOpen(false); onOpenAuth('signin'); }}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 p-2.5 text-xs font-bold text-white cursor-pointer"
                >
                  <LogIn className="h-4 w-4 text-primary-400" aria-hidden="true" /> Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setOpen(false); onOpenAuth('signup'); }}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-accent-500 p-2.5 text-xs font-black text-ink-950 cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" aria-hidden="true" /> Sign Up
                </button>
              </div>
            )}
          </li>
        </ul>
      </div>
    </header>
  );
}

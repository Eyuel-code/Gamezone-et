import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  User,
  Trophy,
  Award,
  Gamepad2,
  ShoppingBag,
  Zap,
  Check,
  Sparkles,
  ShieldCheck,
  Bell,
  AlertTriangle,
  Save,
  Smartphone,
  Building2,
  Camera,
  X,
  Wallet,
  Copy,
  KeyRound,
  Lock,
  Radio,
  Eye,
  EyeOff,
  Fingerprint,
  Cpu,
  CheckCircle2,
} from 'lucide-react';
import { db, type UserAccount, type TournamentRegistration, type OrderItem, type TournamentEntity } from '@/services/db';
import { isAuthorizedAdminUser } from '@/services/authService';
import { securityEngine } from '@/services/securityEngine';
import { formatETB } from '@/data/catalog';
import { getRankFromPoints } from '@/services/ranking';
import UserAvatar from '@/components/UserAvatar';
import AvatarPicker from '@/components/AvatarPicker';
import IdentityVerificationModal from '@/components/IdentityVerificationModal';
import { DEFAULT_AVATAR_URL } from '@/utils/avatarUtils';
import { maskEmailAddress, maskPhoneNumber, maskSecretValue, formatShortHash } from '@/utils/masking';
import { formatEthiopianCity } from '@/utils/location';

const ETHIOPIAN_CITIES = [
  'Addis Ababa (Finfinnee)',
  'Adama (Nazreth)',
  'Bahir Dar',
  'Hawassa',
  'Mekelle',
  'Dire Dawa',
  'Gondar',
  'Jimma',
  'Bishoftu',
  'Other Ethiopia',
];

export default function ProfilePage({
  onNavigateToTournaments,
  onNavigateToOrders,
  onNavigateToTopUp,
  onOpenAuth,
  onNotify,
}: {
  onNavigateToTournaments?: () => void;
  onNavigateToOrders?: () => void;
  onNavigateToTopUp?: () => void;
  onOpenAuth?: () => void;
  onNotify?: (message: string, type?: 'success' | 'warning' | 'error') => void;
}) {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => db.getCurrentUser());
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>(() =>
    db.getRegistrations(db.getCurrentUser()?.id)
  );
  const [tournaments, setTournaments] = useState<TournamentEntity[]>(() => db.getTournaments());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>(() => db.getOrders(db.getCurrentUser()?.id));
  const [activeTab, setActiveTab] = useState<'overview' | 'account' | 'tournaments' | 'orders' | 'achievements'>(() =>
    db.getCurrentUser() && !db.isProfileComplete(db.getCurrentUser()) ? 'account' : 'overview'
  );
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  // Mandatory registration & saved IDs form state
  const [gamerTag, setGamerTag] = useState(() => db.getCurrentUser()?.gamerTag || '');
  const [fullName, setFullName] = useState(() => db.getCurrentUser()?.fullName || '');
  const [phone, setPhone] = useState(() => db.getCurrentUser()?.phone || '');
  const [city, setCity] = useState(() => formatEthiopianCity(db.getCurrentUser()?.city));
  const [favoriteGame, setFavoriteGame] = useState(() => db.getCurrentUser()?.favoriteGame || 'Free Fire');
  const [preferredPay, setPreferredPay] = useState<'telebirr' | 'cbe' | 'wallet'>(
    () => db.getCurrentUser()?.lastPaymentMethod || 'telebirr'
  );
  const [ffId, setFfId] = useState(() => db.getCurrentUser()?.savedPlayerIds?.freefire || '');
  const [pubgId, setPubgId] = useState(() => db.getCurrentUser()?.savedPlayerIds?.pubg || '');
  const [eafcId, setEafcId] = useState(() => db.getCurrentUser()?.savedPlayerIds?.eafc || '');
  const [avatarDraft, setAvatarDraft] = useState(() => db.getCurrentUser()?.avatar || DEFAULT_AVATAR_URL);
  const [showHeaderAvatarEditor, setShowHeaderAvatarEditor] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSaved, setFormSaved] = useState(false);
  const [notifPerm, setNotifPerm] = useState<string>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [revealEmail, setRevealEmail] = useState(false);
  const [revealPhone, setRevealPhone] = useState(false);
  const [revealedRoomPass, setRevealedRoomPass] = useState<Record<string, boolean>>({});
  const [roomRateWarning, setRoomRateWarning] = useState('');
  const [deviceHwid, setDeviceHwid] = useState<{ hwidHash: string; deviceSummary: string }>(() =>
    securityEngine.getCachedHwid()
  );
  const lastSyncedUidRef = useRef<string | null>(db.getCurrentUser()?.id || null);

  useEffect(() => {
    void securityEngine.ensureHwid().then(setDeviceHwid);
  }, []);

  useEffect(() => {
    const syncState = () => {
      setTournaments(db.getTournaments());
      const u = db.getCurrentUser();
      setCurrentUser(u);
      if (u) {
        setRegistrations(db.getRegistrations(u.id));
        setOrders(db.getOrders(u.id));
        const switchedAccount = lastSyncedUidRef.current !== u.id;
        lastSyncedUidRef.current = u.id;

        if (switchedAccount) {
          setGamerTag(u.gamerTag || '');
          setFullName(u.fullName || '');
          setPhone(u.phone || '');
          setCity(formatEthiopianCity(u.city));
          setFavoriteGame(u.favoriteGame || 'Free Fire');
          setPreferredPay(u.lastPaymentMethod || 'telebirr');
          setFfId(u.savedPlayerIds?.freefire || '');
          setPubgId(u.savedPlayerIds?.pubg || '');
          setEafcId(u.savedPlayerIds?.eafc || '');
          setAvatarDraft(u.avatar || DEFAULT_AVATAR_URL);
          setFormError('');
          setFormSaved(false);
        } else {
          setAvatarDraft(u.avatar || DEFAULT_AVATAR_URL);
          if (u.lastPaymentMethod) setPreferredPay(u.lastPaymentMethod);
        }
      } else {
        lastSyncedUidRef.current = null;
        setRegistrations([]);
        setOrders([]);
      }
    };
    syncState();
    return db.subscribe(syncState);
  }, []);

  if (!currentUser) {
    return (
      <div className="container-x pt-32 pb-20 max-w-lg mx-auto">
        <div className="glass-strong rounded-3xl border border-white/10 p-8 text-center space-y-4">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-500/15 border border-primary-400/30 text-primary-300" aria-hidden="true">
            <User className="h-7 w-7" />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-white">Your Gamer Profile</h1>
          <p className="text-sm text-slate-400">
            Sign in or create a GameZoneET account to track your Loyalty XP, tournament brackets, wallet balance, and rank.
          </p>
          {onOpenAuth && (
            <button
              type="button"
              onClick={onOpenAuth}
              className="btn-primary px-6 py-3 rounded-xl text-sm font-bold shadow-glow cursor-pointer"
            >
              Sign In / Create Account
            </button>
          )}
        </div>
      </div>
    );
  }

  const userRP = (currentUser.gamesPlayed || 0) * 35 + Math.floor((currentUser.highScore || 0) / 20);
  const rankInfo = getRankFromPoints(userRP);
  const isAdmin = isAuthorizedAdminUser(currentUser);

  const handleCopyText = (key: string, value: string, tourneyId?: string) => {
    if (tourneyId) {
      const rate = securityEngine.checkRateLimit(
        { key: `room-reveal:${tourneyId}`, maxRequests: 6, windowMs: 60_000, label: 'Room Credential Access' },
        { userId: currentUser.id, gamerTag: currentUser.gamerTag }
      );
      if (!rate.allowed) {
        setRoomRateWarning(rate.message || 'Rate limit active on credential access.');
        return;
      }
      setRoomRateWarning('');
    }
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1800);
  };

  const toggleRoomPassReveal = (key: string, tourneyId?: string) => {
    if (revealedRoomPass[key]) {
      setRevealedRoomPass((prev) => ({ ...prev, [key]: false }));
      return;
    }
    const rate = securityEngine.checkRateLimit(
      { key: `room-reveal:${tourneyId || key}`, maxRequests: 6, windowMs: 60_000, label: 'Room Credential Reveal' },
      { userId: currentUser.id, gamerTag: currentUser.gamerTag }
    );
    if (!rate.allowed) {
      setRoomRateWarning(rate.message || 'Too many reveal requests. Please wait.');
      return;
    }
    setRoomRateWarning('');
    setRevealedRoomPass((prev) => ({ ...prev, [key]: true }));
  };

  const profileIsComplete = db.isProfileComplete(currentUser);

  const handleSaveMandatoryProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSaved(false);

    if (gamerTag.trim().length < 3) {
      setFormError('Gamer Tag must be at least 3 characters.');
      return;
    }
    if (fullName.trim().length < 2) {
      setFormError('Full Name is mandatory so payment receipts match your account.');
      return;
    }
    if (phone.replace(/\D/g, '').length < 9) {
      setFormError('Please enter a valid Ethiopian mobile phone (e.g. +251 911234567 or 0911234567).');
      return;
    }
    if (!city.trim()) {
      setFormError('Please select your Ethiopian city.');
      return;
    }

    const savedPlayerIds: Record<string, string> = {};
    if (ffId.trim()) savedPlayerIds.freefire = ffId.trim();
    if (pubgId.trim()) savedPlayerIds.pubg = pubgId.trim();
    if (eafcId.trim()) savedPlayerIds.eafc = eafcId.trim();

    const normalizedCity = formatEthiopianCity(city);
    setCity(normalizedCity);

    db.updateMandatoryProfile(currentUser.id, {
      gamerTag,
      fullName,
      phone,
      city: normalizedCity,
      favoriteGame,
      savedPlayerIds,
      lastPaymentMethod: preferredPay,
    });

    db.addNotification({
      title: 'Profile & Player IDs Saved',
      message: `Your mandatory gamer info (${normalizedCity}) and saved Player IDs are synced to Firestore.`,
      type: 'success',
      targetPage: 'profile',
    });

    setFormSaved(true);
    onNotify?.('Mandatory profile details & saved Player IDs synced to Cloud Firestore!');
  };

  const handleAvatarSelected = (nextAvatar: string) => {
    setAvatarDraft(nextAvatar);
    if (!currentUser) return;
    db.updateUser({
      ...currentUser,
      avatar: nextAvatar,
    });
    onNotify?.('Profile photo updated & saved to your account!');
  };

  const handleRequestBrowserNotifications = async () => {
    if (typeof Notification === 'undefined') return;
    try {
      const res = await Notification.requestPermission();
      setNotifPerm(res);
      if (res === 'granted') {
        db.addNotification({
          title: 'Browser Notifications Active',
          message: 'Desktop/mobile browser alerts are now enabled for orders, deposits, and match brackets.',
          type: 'success',
          targetPage: 'profile',
        });
        onNotify?.('Desktop/browser notifications enabled!');
      }
    } catch {
      setNotifPerm('denied');
    }
  };

  return (
    <div className="relative min-h-screen pt-24 pb-16">
      <div className="container-x max-w-5xl">
        {/* Incomplete Profile Banner */}
        {!profileIsComplete && (
          <div className="mb-6 rounded-2xl border border-gold-400/40 bg-gold-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-gold-300 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-white text-sm">Complete Your Mandatory Gamer Information</p>
                <p className="text-slate-300 mt-0.5">
                  Save your Full Name, Ethiopian Mobile Phone, City, and Game IDs once so future top-ups and tournaments continue where you left off.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('account')}
              className="rounded-xl bg-gold-400 px-4 py-2 text-xs font-black text-ink-950 hover:bg-gold-300 shrink-0 cursor-pointer"
            >
              Complete Details Now
            </button>
          </div>
        )}

        {/* Profile Card Header */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-ink-950 via-ink-900 to-ink-950 p-6 sm:p-8 shadow-card mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative group flex flex-col items-center">
              <div className="relative">
                <UserAvatar
                  src={currentUser.avatar}
                  name={currentUser.gamerTag}
                  size="xl"
                  className="h-24 w-24 rounded-2xl ring-2 ring-primary-400 shadow-glow"
                />
                <span className="absolute -bottom-2 -right-2 rounded-full bg-primary-500 px-2 py-0.5 text-[10px] font-extrabold text-ink-950 shadow-xs">
                  #{currentUser.rank}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowHeaderAvatarEditor((v) => !v)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-slate-200 hover:border-primary-400/50 hover:text-white transition-all cursor-pointer"
              >
                <Camera className="h-3.5 w-3.5 text-primary-400" />
                {showHeaderAvatarEditor ? 'Close Photo Picker' : 'Change Photo'}
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
                  {currentUser.gamerTag}
                </h1>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-black border ${rankInfo.currentTier.badgeBg} ${rankInfo.currentTier.badgeColor} ${rankInfo.currentTier.badgeBorder}`}>
                  {rankInfo.currentTier.tier} {rankInfo.currentTier.division} • {rankInfo.currentTier.title}
                </span>
                <span className="rounded-full bg-primary-500/20 border border-primary-500/40 px-2.5 py-0.5 text-xs font-bold text-primary-300">
                  {isAuthorizedAdminUser(currentUser) ? 'Platform Administrator' : 'Ethiopian Esports Competitor'}
                </span>
                {currentUser.identityVerified ? (
                  <span
                    title={`Bound ID: ${currentUser.identityMasked || 'Ethiopian Digital ID'}`}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/45 px-2.5 py-0.5 text-xs font-extrabold text-emerald-300"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Verified ID
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setVerifyModalOpen(true)}
                    className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-400/45 px-2.5 py-0.5 text-xs font-bold text-amber-300 hover:bg-amber-500/25 cursor-pointer"
                  >
                    <Fingerprint className="h-3.5 w-3.5" /> Verify Identity
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-slate-400">
                <span className="font-mono text-slate-300">
                  {revealEmail ? currentUser.email : maskEmailAddress(currentUser.email)}
                </span>
                <button
                  type="button"
                  onClick={() => setRevealEmail((v) => !v)}
                  aria-label={revealEmail ? 'Hide email address' : 'Reveal email address'}
                  className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-slate-300 hover:text-white cursor-pointer"
                >
                  {revealEmail ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {revealEmail ? 'Hide' : 'Show'}
                </button>
                <span>&bull; Member since {currentUser.createdAt} &bull; {formatEthiopianCity(currentUser.city)}</span>
              </div>

              {/* Ranked Tier Progress Bar */}
              <div className="pt-2 max-w-md">
                <div className="flex items-center justify-between text-xs mb-1 font-mono">
                  <span className="text-gold-300 font-bold">{userRP.toLocaleString()} Ranked Points (RP)</span>
                  <span className="text-slate-400">
                    {rankInfo.nextTier ? `${rankInfo.rpToNext} RP to ${rankInfo.nextTier.tier}` : 'Top Tier Reached'}
                  </span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-400 to-gold-400 rounded-full transition-all duration-500"
                    style={{ width: `${rankInfo.progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Stats Highlights */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-6 pt-3">
                <div>
                  <span className="text-[11px] text-slate-400 block uppercase tracking-wider">Esports Tier</span>
                  <span className={`font-mono text-lg font-bold flex items-center gap-1 ${rankInfo.currentTier.badgeColor}`}>
                    <Sparkles className="h-4 w-4" /> {rankInfo.currentTier.tier}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block uppercase tracking-wider">Ranked Matches</span>
                  <span className="font-mono text-lg font-bold text-primary-300 flex items-center gap-1">
                    <Gamepad2 className="h-4 w-4 text-primary-400" /> {currentUser.gamesPlayed} Played
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block uppercase tracking-wider">Arcade Record</span>
                  <span className="font-mono text-lg font-bold text-accent-300 flex items-center gap-1">
                    <Zap className="h-4 w-4 text-accent-400" /> {currentUser.highScore.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block uppercase tracking-wider">National Rank</span>
                  <span className="font-mono text-lg font-bold text-white">
                    Rank #{currentUser.rank}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {showHeaderAvatarEditor && (
            <div className="mt-6 pt-5 border-t border-white/10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-white">
                  Upload from your device or choose a built-in website avatar (saves immediately)
                </p>
                <button
                  type="button"
                  onClick={() => setShowHeaderAvatarEditor(false)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
                  aria-label="Close photo editor"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <AvatarPicker
                value={avatarDraft}
                onChange={handleAvatarSelected}
                displayName={currentUser.gamerTag}
                compact
              />
            </div>
          )}
        </div>

        {/* Profile Tabs */}
        <div
          role="tablist"
          aria-label="Profile sections"
          className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3 mb-6"
        >
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'account', label: profileIsComplete ? 'Account & Saved Info' : 'Account & Mandatory Info (!)' },
            { id: 'tournaments', label: `Tournaments (${registrations.length})` },
            { id: 'orders', label: `Payments & Orders (${orders.length})` },
            { id: 'achievements', label: `Achievements (${currentUser.achievements.length})` },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`profile-tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`profile-panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative z-0 nav-luminous-item rounded-xl px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
                  isActive
                    ? 'text-ink-950'
                    : tab.id === 'account' && !profileIsComplete
                    ? 'border border-gold-400/50 bg-gold-500/15 text-gold-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="profile-active-tab"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 rounded-xl bg-primary-500 shadow-glow"
                  />
                )}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div id="profile-panel-overview" role="tabpanel" aria-labelledby="profile-tab-overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Tournament Registrations Quick Box */}
              <div className="card-spotlight rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-bold text-white text-base flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-gold-400" aria-hidden="true" /> Active Tournament Registrations
                  </h2>
                  {onNavigateToTournaments && (
                    <button
                      type="button"
                      onClick={onNavigateToTournaments}
                      className="text-xs text-primary-400 hover:underline cursor-pointer"
                    >
                      Browse All
                    </button>
                  )}
                </div>

                {registrations.length === 0 ? (
                  <p className="text-xs text-slate-400">No active tournament registrations yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {registrations.map((r) => {
                      const tourney = tournaments.find((t) => t.id === r.tournamentId);
                      const gate = db.isRoomUnlockedForUser(tourney, currentUser.id, isAdmin);
                      return (
                        <div key={r.id} className="p-3 rounded-xl bg-ink-950 border border-white/10 text-xs space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-bold text-white block">{r.tournamentTitle}</span>
                              <div className="flex flex-wrap items-center gap-2 text-slate-400 text-[11px] mt-1">
                                <span>
                                  ID: <strong className="text-primary-300 font-mono">{r.playerId}</strong>
                                </span>
                                {r.confirmationCode && (
                                  <span className="rounded bg-emerald-500/15 border border-emerald-400/30 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                                    {r.confirmationCode}
                                  </span>
                                )}
                                {r.slotNumber && (
                                  <span className="text-slate-300 font-mono">Slot #{r.slotNumber}</span>
                                )}
                              </div>
                            </div>
                            <span className="text-success-400 font-bold uppercase text-[10px]">{r.status}</span>
                          </div>

                          {gate.unlocked && gate.creds ? (
                            <div className="rounded-lg border border-primary-400/35 bg-primary-500/10 px-2.5 py-2 flex flex-wrap items-center justify-between gap-2">
                              <span className="font-mono text-[11px] text-white flex flex-wrap items-center gap-1.5">
                                <KeyRound className="inline h-3 w-3 text-primary-300" />
                                Room: <strong className="text-primary-300">{gate.creds.roomId}</strong> &bull; Pass:{' '}
                                <strong className="text-amber-300">
                                  {revealedRoomPass[`ov-${r.id}`]
                                    ? gate.creds.roomPassword
                                    : maskSecretValue(gate.creds.roomPassword, 1)}
                                </strong>
                                <button
                                  type="button"
                                  aria-label={revealedRoomPass[`ov-${r.id}`] ? 'Hide room password' : 'Reveal room password'}
                                  onClick={() => toggleRoomPassReveal(`ov-${r.id}`, r.tournamentId)}
                                  className="rounded border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-sans font-bold text-slate-200 hover:text-white cursor-pointer"
                                >
                                  {revealedRoomPass[`ov-${r.id}`] ? 'Hide' : 'Show'}
                                </button>
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopyText(
                                    `ov-${r.id}`,
                                    `Room ID: ${gate.creds!.roomId} | Password: ${gate.creds!.roomPassword}`,
                                    r.tournamentId
                                  )
                                }
                                className="rounded border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-primary-200 hover:bg-white/10 flex items-center gap-1 cursor-pointer"
                              >
                                {copiedKey === `ov-${r.id}` ? (
                                  <Check className="h-3 w-3 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                                {copiedKey === `ov-${r.id}` ? 'Copied' : 'Copy'}
                              </button>
                            </div>
                          ) : (
                            <div className="text-[11px] text-amber-300/90 flex items-center gap-1.5">
                              <Lock className="h-3 w-3 shrink-0" />
                              <span>
                                Room Credentials Locked — Unlocks at{' '}
                                {tourney?.roomCredentials?.unlockAt || tourney?.startTime || 'match kickoff'}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {roomRateWarning && (
                      <p className="text-[11px] font-semibold text-amber-300">{roomRateWarning}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Recent Orders Quick Box */}
              <div className="card-spotlight rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-bold text-white text-base flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-primary-400" aria-hidden="true" /> Recent Top-Up Orders
                  </h2>
                  {onNavigateToOrders && (
                    <button
                      type="button"
                      onClick={onNavigateToOrders}
                      className="text-xs text-primary-400 hover:underline cursor-pointer"
                    >
                      View All Orders
                    </button>
                  )}
                </div>

                {orders.length === 0 ? (
                  <p className="text-xs text-slate-400">No top-up orders yet.</p>
                ) : (
                  <div className="space-y-2">
                    {orders.slice(0, 3).map((o) => (
                      <div key={o.id} className="p-3 rounded-xl bg-ink-950 border border-white/5 text-xs flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white">{o.gameName} — {o.productName}</span>
                          <span className="text-slate-500 block text-[11px] font-mono">Ref: {o.receiptRef}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-white">{formatETB(o.amountETB)}</span>
                          <span className="text-success-400 text-[10px] block font-bold uppercase">{o.deliveryStatus}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Identity Verification & Anti-Smurf Hardware Security Card */}
            <div className="card-spotlight rounded-2xl border border-primary-400/25 bg-gradient-to-br from-ink-950/90 via-primary-500/[0.06] to-emerald-500/[0.05] p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`grid h-11 w-11 place-items-center rounded-xl border ${
                      currentUser.identityVerified
                        ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                        : 'bg-amber-500/15 border-amber-400/40 text-amber-300'
                    }`}
                  >
                    <Fingerprint className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display font-bold text-white text-base">
                        Identity Verification &amp; Anti-Smurf Hardware
                      </h2>
                      {currentUser.identityVerified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" /> Verified ({currentUser.identityType === 'passport' ? 'Passport Only' : 'Ethiopian ID Only'})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-400/40 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-300">
                          Action Required
                        </span>
                      )}
                      {(currentUser.isFlaggedForReview || (currentUser.identityMismatchWarnings || 0) > 0) && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 border border-rose-400/40 px-2.5 py-0.5 text-[10px] font-black uppercase text-rose-300">
                          <AlertTriangle className="h-3 w-3" /> Mismatch Strikes: {currentUser.identityMismatchWarnings || 0}/3
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Required for Free Fire, PUBG Mobile &amp; EAFC brackets. Enforces strict XOR exclusivity (either Fayda/FIDO ID or Passport, never both) + hardware binding.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setVerifyModalOpen(true)}
                  className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold cursor-pointer ${
                    currentUser.identityVerified
                      ? 'border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
                      : 'bg-primary-500 text-ink-950 hover:bg-primary-400 shadow-glow'
                  }`}
                >
                  {currentUser.identityVerified ? 'View Bound ID' : 'Verify Identity Now'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl border border-white/10 bg-ink-950/70 p-3.5">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                    Bound Credential
                  </span>
                  <span className="font-mono font-bold text-white mt-1 block">
                    {currentUser.identityVerified
                      ? currentUser.identityMasked || 'Ethiopian Digital ID'
                      : 'Not verified yet'}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    {currentUser.identityVerifiedAt
                      ? `Bound ${currentUser.identityVerifiedAt}`
                      : 'Fayda NID / FIDO / Passport'}
                  </span>
                </div>

                <div className="rounded-xl border border-white/10 bg-ink-950/70 p-3.5">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                    Deduplication Hash (SHA-256)
                  </span>
                  <span className="font-mono font-bold text-primary-300 mt-1 block">
                    {formatShortHash(currentUser.identityHash)}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Zero raw PII stored
                  </span>
                </div>

                <div className="rounded-xl border border-white/10 bg-ink-950/70 p-3.5">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Cpu className="h-3 w-3 text-accent-400" /> Session Hardware ID (HWID)
                  </span>
                  <span className="font-mono font-bold text-accent-300 mt-1 block">
                    {formatShortHash(deviceHwid.hwidHash || currentUser.hwidHash)}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block truncate">
                    {deviceHwid.deviceSummary || 'Canvas + WebGL Fingerprint'}
                  </span>
                </div>
              </div>
            </div>

            {/* Achievements Showcase */}
            <div className="card-spotlight rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
              <h2 className="font-display font-bold text-white text-base flex items-center gap-2">
                <Award className="h-5 w-5 text-gold-400" aria-hidden="true" /> Earned Platform Badges
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {currentUser.achievements.map((ach) => (
                  <div key={ach.id} className="p-4 rounded-xl bg-ink-950 border border-white/5 text-center space-y-2">
                    <span className="inline-grid h-10 w-10 place-items-center rounded-xl bg-gold-400/20 text-gold-400 mx-auto" aria-hidden="true">
                      <Sparkles className="h-5 w-5" />
                    </span>
                    <span className="font-bold text-white text-xs block">{ach.title}</span>
                    <p className="text-[11px] text-slate-400">{ach.desc}</p>
                    <span className="text-[10px] text-slate-500 block font-mono">{ach.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: ACCOUNT & MANDATORY REGISTRATION DETAILS */}
        {activeTab === 'account' && (
          <div id="profile-panel-account" role="tabpanel" aria-labelledby="profile-tab-account" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form
              onSubmit={handleSaveMandatoryProfile}
              className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary-400" aria-hidden="true" />
                    Mandatory Gamer Information &amp; Saved Game IDs
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Saved in Cloud Firestore so checkout, receipts, and sessions continue where you left off.
                  </p>
                </div>
                {profileIsComplete && (
                  <span className="rounded-full bg-success-500/20 border border-success-500/30 px-2.5 py-1 text-[10px] font-bold text-success-400 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Complete
                  </span>
                )}
              </div>

              {formError && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="rounded-xl border border-error-500/40 bg-error-500/10 p-3 text-xs text-error-300"
                >
                  {formError}
                </div>
              )}

              {formSaved && (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-xl border border-success-500/40 bg-success-500/10 p-3 text-xs text-success-300 flex items-center gap-2"
                >
                  <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> All mandatory registration details &amp; Player IDs are saved!
                </div>
              )}

              <div className="rounded-2xl border border-white/10 bg-ink-950/40 p-4">
                <AvatarPicker
                  value={avatarDraft}
                  onChange={handleAvatarSelected}
                  displayName={gamerTag || currentUser.gamerTag}
                  label="Profile Photo (Device Upload or 5 Presets)"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label htmlFor="profile-gamer-tag" className="block font-semibold text-slate-300 mb-1">
                    Gamer Tag <span className="text-primary-400">*</span>
                  </label>
                  <input
                    id="profile-gamer-tag"
                    type="text"
                    required
                    value={gamerTag}
                    onChange={(e) => setGamerTag(e.target.value)}
                    placeholder="e.g. AbyssiniaSniper"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white focus:border-primary-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="profile-full-name" className="block font-semibold text-slate-300 mb-1">
                    Full Name <span className="text-primary-400">*</span>
                  </label>
                  <input
                    id="profile-full-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your legal/receipt name"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white focus:border-primary-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="profile-phone" className="block font-semibold text-slate-300 mb-1">
                    Ethiopian Mobile Phone <span className="text-primary-400">*</span>
                  </label>
                  <input
                    id="profile-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+251 911234567"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white focus:border-primary-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="profile-city" className="block font-semibold text-slate-300 mb-1">
                    City <span className="text-primary-400">*</span>
                  </label>
                  <select
                    id="profile-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-ink-950 px-3.5 py-2.5 text-sm text-white focus:border-primary-400 focus:outline-none"
                  >
                    {ETHIOPIAN_CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="profile-primary-game" className="block font-semibold text-slate-300 mb-1">
                    Primary Game
                  </label>
                  <select
                    id="profile-primary-game"
                    value={favoriteGame}
                    onChange={(e) => setFavoriteGame(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-ink-950 px-3.5 py-2.5 text-sm text-white focus:border-primary-400 focus:outline-none"
                  >
                    <option value="Free Fire">Free Fire</option>
                    <option value="PUBG Mobile">PUBG Mobile</option>
                    <option value="EA SPORTS FC">EA SPORTS FC</option>
                    <option value="Arcade & Mini-Games">Arcade &amp; Mini-Games</option>
                  </select>
                </div>
                <div>
                  <span id="profile-default-pay-label" className="block font-semibold text-slate-300 mb-1">
                    Default Payment Channel
                  </span>
                  <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby="profile-default-pay-label">
                    <button
                      type="button"
                      aria-pressed={preferredPay === 'telebirr'}
                      onClick={() => setPreferredPay('telebirr')}
                      className={`rounded-xl border px-2.5 py-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                        preferredPay === 'telebirr'
                          ? 'border-[#0091da] bg-[#0091da]/20 text-white'
                          : 'border-white/10 bg-white/5 text-slate-400'
                      }`}
                    >
                      <Smartphone className="h-3.5 w-3.5 text-[#0091da]" aria-hidden="true" /> Telebirr
                    </button>
                    <button
                      type="button"
                      aria-pressed={preferredPay === 'cbe'}
                      onClick={() => setPreferredPay('cbe')}
                      className={`rounded-xl border px-2.5 py-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                        preferredPay === 'cbe'
                          ? 'border-[#a832a8] bg-[#7d1d7d]/30 text-white'
                          : 'border-white/10 bg-white/5 text-slate-400'
                      }`}
                    >
                      <Building2 className="h-3.5 w-3.5 text-[#f08ff0]" aria-hidden="true" /> CBE Birr
                    </button>
                    <button
                      type="button"
                      aria-pressed={preferredPay === 'wallet'}
                      onClick={() => setPreferredPay('wallet')}
                      className={`rounded-xl border px-2.5 py-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                        preferredPay === 'wallet'
                          ? 'border-emerald-400 bg-emerald-500/20 text-white'
                          : 'border-white/10 bg-white/5 text-slate-400'
                      }`}
                    >
                      <Wallet className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" /> Wallet
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10">
                <p id="profile-saved-uids-hint" className="text-xs font-bold text-slate-200 mb-2">
                  Saved In-Game Player IDs (Auto-filled in Checkout)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label htmlFor="profile-ff-uid" className="block text-slate-400 mb-1">
                      Free Fire UID
                    </label>
                    <input
                      id="profile-ff-uid"
                      type="text"
                      value={ffId}
                      onChange={(e) => setFfId(e.target.value)}
                      aria-describedby="profile-saved-uids-hint"
                      placeholder="e.g. 829471923"
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-mono text-white focus:border-primary-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-pubg-uid" className="block text-slate-400 mb-1">
                      PUBG Mobile UID
                    </label>
                    <input
                      id="profile-pubg-uid"
                      type="text"
                      value={pubgId}
                      onChange={(e) => setPubgId(e.target.value)}
                      aria-describedby="profile-saved-uids-hint"
                      placeholder="e.g. 519284710"
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-mono text-white focus:border-primary-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-eafc-uid" className="block text-slate-400 mb-1">
                      EA SPORTS FC UID
                    </label>
                    <input
                      id="profile-eafc-uid"
                      type="text"
                      value={eafcId}
                      onChange={(e) => setEafcId(e.target.value)}
                      aria-describedby="profile-saved-uids-hint"
                      placeholder="e.g. ET_ProFC26"
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-mono text-white focus:border-primary-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-xs font-bold text-ink-950 hover:bg-primary-400 shadow-glow cursor-pointer"
                >
                  <Save className="h-4 w-4" /> Save Mandatory Details
                </button>
              </div>
            </form>

            {/* Notification Methods Card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <Bell className="h-5 w-5 text-primary-400" aria-hidden="true" />
                <h2 className="font-display text-base font-bold text-white">Notification Methods</h2>
              </div>

              <div className="space-y-3 text-xs">
                <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">1. In-App Bell Inbox</span>
                    <span className="text-success-400 font-bold">Active</span>
                  </div>
                  <p className="text-slate-400">
                    Persistent notifications synced to Firestore for receipts, wallet deposits, and ticket updates.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">2. Live Toast Alerts</span>
                    <span className="text-success-400 font-bold">Active</span>
                  </div>
                  <p className="text-slate-400">
                    Real-time on-screen confirmation cards whenever actions complete.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">3. Desktop / Browser Push</span>
                    <span
                      className={`font-bold uppercase text-[10px] ${
                        notifPerm === 'granted'
                          ? 'text-success-400'
                          : notifPerm === 'denied'
                          ? 'text-error-400'
                          : 'text-gold-300'
                      }`}
                    >
                      {notifPerm}
                    </span>
                  </div>
                  <p className="text-slate-400">
                    Receive system alerts when the tab is in the background.
                  </p>
                  {notifPerm === 'default' && (
                    <button
                      type="button"
                      onClick={() => void handleRequestBrowserNotifications()}
                      className="w-full rounded-lg bg-primary-500/20 border border-primary-400/40 px-3 py-1.5 text-[11px] font-bold text-primary-200 hover:bg-primary-500/30 cursor-pointer"
                    >
                      Enable Browser Notifications
                    </button>
                  )}
                  {notifPerm === 'denied' && (
                    <p className="text-[11px] text-amber-300/90 leading-relaxed">
                      Browser alerts are currently blocked. Click the lock/site-settings icon in your browser address bar to allow Notifications for this site.
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white">4. USSD / Mobile Alerts</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-primary-300 font-mono text-[11px]">
                        {phone ? (revealPhone ? phone : maskPhoneNumber(phone)) : 'Set phone'}
                      </span>
                      {phone && (
                        <button
                          type="button"
                          onClick={() => setRevealPhone((v) => !v)}
                          aria-label={revealPhone ? 'Hide phone number' : 'Show phone number'}
                          className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-300 hover:text-white cursor-pointer"
                        >
                          {revealPhone ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-400">
                    Used for Telebirr &amp; CBE Birr payment prompts and custom room announcements.
                  </p>
                </div>

                {/* Account Identity Verification Card */}
                <div className="rounded-xl border border-primary-400/30 bg-primary-500/10 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Fingerprint className="h-3.5 w-3.5 text-primary-300" /> Identity &amp; Anti-Smurf
                    </span>
                    <span className={`font-bold text-[10px] uppercase ${currentUser.identityVerified ? 'text-emerald-300' : 'text-amber-300'}`}>
                      {currentUser.identityVerified ? 'Verified ID' : 'Unverified'}
                    </span>
                  </div>
                  <p className="text-slate-300 font-mono text-[11px]">
                    {currentUser.identityVerified
                      ? currentUser.identityMasked || 'Ethiopian Digital ID'
                      : 'Bind Fayda NID / FIDO / Passport to join tournaments.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setVerifyModalOpen(true)}
                    className="w-full rounded-lg bg-primary-500 px-3 py-1.5 text-[11px] font-bold text-ink-950 hover:bg-primary-400 cursor-pointer"
                  >
                    {currentUser.identityVerified ? 'View / Re-bind Identity' : 'Verify Identity Now'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TOURNAMENTS */}
        {activeTab === 'tournaments' && (
          <div id="profile-panel-tournaments" role="tabpanel" aria-labelledby="profile-tab-tournaments" className="space-y-4">
            {registrations.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-xs text-slate-400">
                You have not registered for any tournaments yet.
              </div>
            ) : (
              registrations.map((r) => {
                const tourney = tournaments.find((t) => t.id === r.tournamentId);
                const gate = db.isRoomUnlockedForUser(tourney, currentUser.id, isAdmin);
                return (
                  <div
                    key={r.id}
                    className="p-5 rounded-2xl border border-white/10 bg-white/[0.03] space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-bold text-white text-sm">{r.tournamentTitle}</h2>
                          {r.confirmationCode && (
                            <span className="rounded-full bg-emerald-500/15 border border-emerald-400/35 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                              {r.confirmationCode}
                            </span>
                          )}
                          {r.slotNumber && (
                            <span className="rounded-full bg-primary-500/15 border border-primary-400/30 px-2 py-0.5 font-mono text-[10px] font-bold text-primary-300">
                              Slot #{r.slotNumber}
                            </span>
                          )}
                          {tourney?.currentMatchLabel && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-200">
                              <Radio className="h-2.5 w-2.5 text-primary-400" /> {tourney.currentMatchLabel}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">
                          Registered ID: <span className="font-mono text-slate-200">{r.playerId}</span>
                          {r.teamName ? ` • Squad: ${r.teamName}` : ''} • Contact:{' '}
                          <span className="font-mono">{maskPhoneNumber(r.contactNumber)}</span> • Registered{' '}
                          {r.registeredAt}
                        </p>
                        {r.squadMemberIds && r.squadMemberIds.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span className="text-[11px] text-slate-400">Squadmates:</span>
                            {r.squadMemberIds.map((id, i) => (
                              <span
                                key={`${id}-${i}`}
                                className="rounded bg-white/5 border border-white/10 px-2 py-0.5 font-mono text-[10px] text-slate-200"
                              >
                                {id}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {confirmCancelId === r.id ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-slate-300">Cancel entry?</span>
                          <button
                            type="button"
                            onClick={() => {
                              db.cancelRegistration(r.id);
                              setConfirmCancelId(null);
                              onNotify?.(`Cancelled registration for ${r.tournamentTitle}.`);
                            }}
                            className="rounded-lg bg-error-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-error-400 cursor-pointer"
                          >
                            Yes, Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmCancelId(null)}
                            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                          >
                            Keep
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmCancelId(r.id)}
                          className="rounded-lg border border-error-500/30 text-error-400 hover:bg-error-500/10 px-3 py-1.5 text-xs font-bold cursor-pointer self-start shrink-0"
                        >
                          Cancel Registration
                        </button>
                      )}
                    </div>

                    {/* Unlocked Custom Room Credentials Panel */}
                    {gate.unlocked && gate.creds ? (
                      <div className="rounded-xl border border-primary-400/35 bg-primary-500/10 p-3.5 space-y-2 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 font-bold text-primary-300">
                            <KeyRound className="h-3.5 w-3.5" /> Unlocked Custom Room Credentials
                          </span>
                          <span className="text-[11px] text-slate-300">
                            Server: <strong className="text-white">{gate.creds.server}</strong>
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="flex items-center justify-between rounded-lg border border-white/15 bg-ink-950/75 px-3 py-2">
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase">Room ID</span>
                              <span className="font-mono font-bold text-white">{gate.creds.roomId}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyText(`id-${r.id}`, gate.creds!.roomId)}
                              className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-primary-300 hover:bg-white/10 flex items-center gap-1 cursor-pointer"
                            >
                              {copiedKey === `id-${r.id}` ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                              {copiedKey === `id-${r.id}` ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                          <div className="flex items-center justify-between rounded-lg border border-white/15 bg-ink-950/75 px-3 py-2 gap-2">
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase">Password</span>
                              <span className="font-mono font-bold text-amber-300">
                                {revealedRoomPass[`tr-${r.id}`]
                                  ? gate.creds.roomPassword
                                  : maskSecretValue(gate.creds.roomPassword, 1)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                aria-label={revealedRoomPass[`tr-${r.id}`] ? 'Hide room password' : 'Reveal room password'}
                                onClick={() => toggleRoomPassReveal(`tr-${r.id}`, r.tournamentId)}
                                className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-200 hover:bg-white/10 flex items-center gap-1 cursor-pointer"
                              >
                                {revealedRoomPass[`tr-${r.id}`] ? <EyeOff className="h-3 w-3" aria-hidden="true" /> : <Eye className="h-3 w-3" aria-hidden="true" />}
                                {revealedRoomPass[`tr-${r.id}`] ? 'Hide' : 'Show'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyText(`pw-${r.id}`, gate.creds!.roomPassword, r.tournamentId)}
                                className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-amber-300 hover:bg-white/10 flex items-center gap-1 cursor-pointer"
                              >
                                {copiedKey === `pw-${r.id}` ? (
                                  <Check className="h-3 w-3 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                                {copiedKey === `pw-${r.id}` ? 'Copied' : 'Copy'}
                              </button>
                            </div>
                          </div>
                        </div>
                        {roomRateWarning && (
                          <p className="text-[11px] font-semibold text-amber-300">{roomRateWarning}</p>
                        )}
                        {gate.creds.notes && (
                          <p className="text-[11px] text-slate-300">{gate.creds.notes}</p>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3 flex items-center gap-2 text-xs text-amber-300">
                        <Lock className="h-4 w-4 shrink-0" />
                        <span>
                          Room Credentials Locked — Unlocks automatically at{' '}
                          {tourney?.roomCredentials?.unlockAt || tourney?.startTime || 'match kickoff'}.
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 3: ORDERS */}
        {activeTab === 'orders' && (
          <div id="profile-panel-orders" role="tabpanel" aria-labelledby="profile-tab-orders" className="space-y-3">
            {orders.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center space-y-3">
                <p className="text-xs text-slate-400">You have no top-up or wallet payment records yet.</p>
                {onNavigateToTopUp && (
                  <button
                    type="button"
                    onClick={onNavigateToTopUp}
                    className="btn-primary px-4 py-2 text-xs font-bold cursor-pointer"
                  >
                    Browse Top-Ups
                  </button>
                )}
              </div>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="p-4 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono text-primary-300 font-bold">{o.id}</span>
                    <div className="font-bold text-white text-sm">{o.gameName} — {o.productName}</div>
                    <span className="text-slate-400 text-[11px]">Player ID: {o.playerId} • {o.createdAt}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-white text-base block">{formatETB(o.amountETB)}</span>
                    <span className="rounded-full bg-success-500/20 text-success-300 px-2 py-0.5 text-[10px] font-bold">
                      {o.deliveryStatus}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: ACHIEVEMENTS */}
        {activeTab === 'achievements' && (
          <div id="profile-panel-achievements" role="tabpanel" aria-labelledby="profile-tab-achievements">
            {currentUser.achievements.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-xs text-slate-400">
                Complete matches, enter tournaments, or redeem loyalty perks to unlock profile badges.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentUser.achievements.map((ach) => (
                  <div key={ach.id} className="p-5 rounded-2xl border border-white/10 bg-white/[0.03] flex items-start gap-3.5">
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-gold-400/20 text-gold-300 shrink-0" aria-hidden="true">
                      <Award className="h-6 w-6" />
                    </span>
                    <div>
                      <h2 className="font-bold text-white text-sm">{ach.title}</h2>
                      <p className="text-xs text-slate-300 mt-1">{ach.desc}</p>
                      <span className="text-[11px] text-slate-500 mt-2 block font-mono">Unlocked: {ach.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <IdentityVerificationModal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        currentUser={currentUser}
        onVerified={(updated) => {
          setCurrentUser(updated);
          onNotify?.(`Identity verified and bound (${updated.identityMasked}).`, 'success');
        }}
        onWarning={(msg, severe) => {
          setCurrentUser(db.getCurrentUser());
          onNotify?.(msg, severe ? 'error' : 'warning');
        }}
      />
    </div>
  );
}

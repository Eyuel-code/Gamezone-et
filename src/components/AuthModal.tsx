import { useEffect, useRef, useState } from 'react';
import { useAccessibleModal } from '@/hooks/useAccessibleModal';
import { X, Gamepad2, Mail, Lock, LogIn, UserPlus, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatETB } from '@/data/catalog';
import AvatarPicker from '@/components/AvatarPicker';
import UserAvatar from '@/components/UserAvatar';
import { DEFAULT_AVATAR_URL } from '@/utils/avatarUtils';
import { formatEthiopianCity } from '@/utils/location';
import {
  mapAuthErrorMessage,
  signInWithEmail,
  signInWithGoogle,
  signOutAccount,
  signUpWithEmail,
} from '@/services/authService';

export interface GamerProfile {
  id: string;
  name: string;
  gamerTag: string;
  phone: string;
  email: string;
  city: string;
  favoriteGame: string;
  avatar: string;
  gamesPlayed: number;
  highScore: number;
  rank: number;
  walletBalance: number;
  loyaltyPoints: number;
  createdAt: string;
}

const ETHIOPIAN_CITIES = [
  'Addis Ababa',
  'Hawassa (Sidama)',
  'Bahir Dar (Amhara)',
  'Dire Dawa',
  'Adama (Nazret)',
  'Gondar',
  'Mekelle (Tigray)',
  'Jimma (Oromia)',
  'Harar',
  'Bishoftu (Debre Zeyit)',
  'Dessie',
];

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: GamerProfile | null;
  onLogin: (user: GamerProfile) => void;
  onLogout: () => void;
  initialMode?: 'signin' | 'signup';
}

export default function AuthModal({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onLogout,
  initialMode = 'signin',
}: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string>(DEFAULT_AVATAR_URL);

  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  const [fullName, setFullName] = useState('');
  const [gamerTag, setGamerTag] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState(ETHIOPIAN_CITIES[0]);
  const [favoriteCategory, setFavoriteCategory] = useState('Free Fire & Battle Royale');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);

  useAccessibleModal(isOpen, onClose, dialogRef);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);
    try {
      const account = await signInWithGoogle();
      setSuccessMsg('Signed in with Google!');
      onLogin({
        id: account.id,
        name: account.fullName || account.gamerTag,
        gamerTag: account.gamerTag,
        phone: account.phone || '',
        email: account.email,
        city: formatEthiopianCity(account.city),
        favoriteGame: account.favoriteGame || 'Free Fire & Battle Royale',
        avatar: account.avatar,
        gamesPlayed: account.gamesPlayed,
        highScore: account.highScore,
        rank: account.rank,
        walletBalance: account.walletBalance || 0,
        loyaltyPoints: account.loyaltyPoints,
        createdAt: account.createdAt,
      });
      onClose();
    } catch (err) {
      setErrorMsg(mapAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!signInEmail.trim() || !signInPassword) {
      setErrorMsg('Please enter your email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const account = await signInWithEmail(signInEmail, signInPassword);
      setSuccessMsg('Signed in successfully!');
      onLogin({
        id: account.id,
        name: account.fullName || account.gamerTag,
        gamerTag: account.gamerTag,
        phone: account.phone || '',
        email: account.email,
        city: formatEthiopianCity(account.city),
        favoriteGame: account.favoriteGame || 'Free Fire & Battle Royale',
        avatar: account.avatar,
        gamesPlayed: account.gamesPlayed,
        highScore: account.highScore,
        rank: account.rank,
        walletBalance: account.walletBalance || 0,
        loyaltyPoints: account.loyaltyPoints,
        createdAt: account.createdAt,
      });
      onClose();
    } catch (err) {
      setErrorMsg(mapAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!gamerTag.trim() || gamerTag.trim().length < 3) {
      setErrorMsg('Gamer tag must be at least 3 characters.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Please provide your Ethiopian mobile phone number.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (!agreeTerms) {
      setErrorMsg('Please agree to the GameZoneET community terms.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await signUpWithEmail({
        email,
        password,
        gamerTag: gamerTag.trim(),
        fullName: fullName.trim() || gamerTag.trim(),
        phone: '+251 ' + phone.replace(/^\+?251|^0/, ''),
        city: formatEthiopianCity(city),
        favoriteGame: favoriteCategory,
        avatar: selectedAvatarUrl,
      });
      setSuccessMsg('Account created successfully!');
      onLogin({
        id: res.user.id,
        name: res.user.fullName || res.user.gamerTag,
        gamerTag: res.user.gamerTag,
        phone: res.user.phone || '',
        email: res.user.email,
        city: formatEthiopianCity(res.user.city || city),
        favoriteGame: res.user.favoriteGame || favoriteCategory,
        avatar: res.user.avatar,
        gamesPlayed: res.user.gamesPlayed,
        highScore: res.user.highScore,
        rank: res.user.rank,
        walletBalance: res.user.walletBalance || 0,
        loyaltyPoints: res.user.loyaltyPoints,
        createdAt: res.user.createdAt,
      });
      onClose();
    } catch (err) {
      setErrorMsg(mapAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md animate-fade-up">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        tabIndex={-1}
        className="glass-strong relative flex max-h-[90vh] w-full max-w-md sm:max-w-xl flex-col overflow-hidden rounded-3xl border border-primary-500/30 shadow-glow my-auto focus:outline-none"
      >
        <div className="relative shrink-0 border-b border-white/10 px-4 py-4 sm:px-8 sm:pt-7 sm:pb-5">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
            className="absolute right-3.5 top-3.5 sm:right-4 sm:top-4 grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-slate-400 transition-colors hover:border-white/30 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-3 sm:gap-3.5 pr-10 min-w-0">
            <span className="grid h-11 w-11 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary-400 to-accent-500 text-ink-950 font-bold shadow-glow">
              <Gamepad2 className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 id="auth-modal-title" className="text-lg sm:text-2xl font-bold text-white font-display leading-tight">
                {currentUser
                  ? 'Gamer Profile'
                  : mode === 'signin'
                  ? 'Sign In to GameZoneET'
                  : 'Create Gamer Account'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                {currentUser
                  ? 'Synced with Firebase Cloud'
                  : 'Save scores, join tournaments, and track orders in Birr'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-8 sm:pt-6">

        {currentUser ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
              <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                <UserAvatar
                  src={currentUser.avatar}
                  name={currentUser.gamerTag}
                  size="lg"
                  className="border border-primary-400/30 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-bold text-white truncate">{currentUser.gamerTag}</h3>
                    <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-xs font-semibold text-emerald-300 shrink-0">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {formatEthiopianCity(currentUser.city)} • ID: #{currentUser.id.slice(-6).toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                <div className="rounded-xl bg-black/40 p-3 border border-white/5 min-w-0">
                  <p className="text-xs text-slate-400 truncate">Games Played</p>
                  <p className="font-display text-lg font-bold text-white mt-1">{currentUser.gamesPlayed}</p>
                </div>
                <div className="rounded-xl bg-black/40 p-3 border border-white/5 min-w-0">
                  <p className="text-xs text-slate-400 truncate">Leaderboard Rank</p>
                  <p className="font-display text-lg font-bold text-gold-400 mt-1">#{currentUser.rank}</p>
                </div>
                <div className="rounded-xl bg-black/40 p-3 border border-white/5 min-w-0">
                  <p className="text-xs text-slate-400 truncate">Wallet (ETB)</p>
                  <p className="font-mono text-sm font-bold text-primary-300 mt-1 truncate">{formatETB(currentUser.walletBalance || 0)}</p>
                </div>
                <div className="rounded-xl bg-black/40 p-3 border border-white/5 min-w-0">
                  <p className="text-xs text-slate-400 truncate">Loyalty XP</p>
                  <p className="font-mono text-sm font-bold text-gold-300 mt-1">{currentUser.loyaltyPoints.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onClose}
                className="btn-primary flex-1 py-3 text-base font-bold shadow-glow cursor-pointer"
              >
                Continue Playing
              </button>
              <button
                onClick={async () => {
                  await signOutAccount();
                  onLogout();
                  setSuccessMsg('Signed out successfully.');
                }}
                className="btn-ghost py-3 px-5 text-sm text-error-400 hover:text-error-300 hover:border-error-500/40 cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div
              role="tablist"
              aria-label="Account access mode"
              className="flex rounded-xl bg-ink-950 p-1 mb-6 border border-white/10"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signin'}
                onClick={() => {
                  setMode('signin');
                  setErrorMsg('');
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-gradient-to-r from-primary-400 to-primary-500 text-ink-950 shadow-glow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signup'}
                onClick={() => {
                  setMode('signup');
                  setErrorMsg('');
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-gradient-to-r from-accent-500 to-gold-500 text-white shadow-glow-accent'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Create Account
              </button>
            </div>

            {errorMsg && (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-4 rounded-xl border border-error-500/40 bg-error-500/10 p-3 text-xs text-error-300 flex items-center gap-2"
              >
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div
                role="status"
                aria-live="polite"
                className="mb-4 rounded-xl border border-success-500/40 bg-success-500/10 p-3 text-xs text-success-300 flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{successMsg}</span>
              </div>
            )}

            {mode === 'signin' ? (
              <form onSubmit={handleSignInSubmit} className="space-y-4">
                <div>
                  <label htmlFor="auth-modal-signin-email" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" aria-hidden="true" />
                    <input
                      id="auth-modal-signin-email"
                      type="email"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-primary-400 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="auth-modal-signin-password" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" aria-hidden="true" />
                    <input
                      id="auth-modal-signin-password"
                      type="password"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-primary-400 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full py-3.5 text-base font-bold shadow-glow cursor-pointer mt-2 flex items-center justify-center gap-2"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Sign In with Email
                </button>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-bold text-white hover:bg-white/10 hover:border-primary-400/50 transition-all cursor-pointer"
                >
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-ink-950 font-black text-[11px]">
                    G
                  </span>
                  Continue with Google
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignUpSubmit} className="space-y-4">
                <AvatarPicker
                  value={selectedAvatarUrl}
                  onChange={setSelectedAvatarUrl}
                  displayName={gamerTag || 'Gamer'}
                  compact
                  label="Choose Profile Photo"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="auth-modal-gamer-tag" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Unique Gamer Tag *
                    </label>
                    <input
                      id="auth-modal-gamer-tag"
                      type="text"
                      value={gamerTag}
                      onChange={(e) => setGamerTag(e.target.value)}
                      placeholder="e.g. RedNile_Sniper"
                      className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 px-3 text-sm text-white placeholder-slate-500 focus:border-primary-400 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="auth-modal-full-name" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Full Name
                    </label>
                    <input
                      id="auth-modal-full-name"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your name"
                      className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 px-3 text-sm text-white placeholder-slate-500 focus:border-primary-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="auth-modal-signup-email" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Email Address *
                    </label>
                    <input
                      id="auth-modal-signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 px-3 text-sm text-white placeholder-slate-500 focus:border-primary-400 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="auth-modal-phone" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Ethiopian Phone *
                    </label>
                    <div className="flex min-w-0">
                      <span className="inline-flex shrink-0 items-center rounded-l-xl border border-r-0 border-white/15 bg-white/10 px-2.5 text-xs font-semibold text-slate-300">
                        +251
                      </span>
                      <input
                        id="auth-modal-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="911234567"
                        className="flex-1 min-w-0 w-full rounded-r-xl border border-white/15 bg-white/5 py-2.5 px-3 text-sm text-white placeholder-slate-500 focus:border-primary-400 focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="auth-modal-city" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                      City / Region
                    </label>
                    <select
                      id="auth-modal-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-ink-950 py-2.5 px-3 text-sm text-white focus:border-primary-400 focus:outline-none cursor-pointer"
                    >
                      {ETHIOPIAN_CITIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="auth-modal-discipline" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Primary Game Discipline
                    </label>
                    <select
                      id="auth-modal-discipline"
                      value={favoriteCategory}
                      onChange={(e) => setFavoriteCategory(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-ink-950 py-2.5 px-3 text-sm text-white focus:border-primary-400 focus:outline-none cursor-pointer"
                    >
                      <option value="Free Fire & Battle Royale">Free Fire & Battle Royale</option>
                      <option value="Car Racing & Drift">Car Racing & Drift</option>
                      <option value="EA Sports FC & Football">EA Sports FC & Football</option>
                      <option value="Shooting & FPS Arenas">Shooting & FPS Arenas</option>
                      <option value="Cloud Retro Classics">Cloud Retro Classics</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="auth-modal-password" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Password *
                    </label>
                    <input
                      id="auth-modal-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 px-3 text-sm text-white placeholder-slate-500 focus:border-primary-400 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="auth-modal-confirm-password" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Confirm Password *
                    </label>
                    <input
                      id="auth-modal-confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 px-3 text-sm text-white placeholder-slate-500 focus:border-primary-400 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 rounded border-white/20 bg-white/5 text-primary-400 focus:ring-0"
                  />
                  <span>I agree to the Fair Play & Esports Community Guidelines of GameZoneET.</span>
                </label>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-accent w-full py-3.5 text-base font-bold shadow-glow-accent cursor-pointer mt-2 flex items-center justify-center gap-2"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Account
                </button>
              </form>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

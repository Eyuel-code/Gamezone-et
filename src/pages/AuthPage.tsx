import { useState, useEffect } from 'react';
import {
  Gamepad2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  ShieldCheck,
  Sparkles,
  Trophy,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  KeyRound,
  MapPin,
  Phone,
  Check,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { useTilt } from '@/hooks/useMotion';
import type { PageId } from '@/hooks/useRouter';
import type { UserAccount } from '@/services/db';
import AvatarPicker from '@/components/AvatarPicker';
import UserAvatar from '@/components/UserAvatar';
import { DEFAULT_AVATAR_URL } from '@/utils/avatarUtils';
import { formatEthiopianCity } from '@/utils/location';
import {
  mapAuthErrorMessage,
  refreshEmailVerification,
  resendVerificationEmail,
  resetPasswordWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signOutAccount,
  signUpWithEmail,
} from '@/services/authService';

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

const GAME_DISCIPLINES = [
  'Free Fire & Battle Royale',
  'PUBG Mobile Tactical',
  'Car Racing & Drift',
  'EA SPORTS FC & Football',
  'Shooting & FPS Arenas',
  'Retro & Strategy Classics',
];

interface AuthPageProps {
  initialMode?: 'signin' | 'signup';
  currentUser: UserAccount | null;
  onNavigate: (page: PageId) => void;
  onNotify?: (msg: string) => void;
}

export default function AuthPage({
  initialMode = 'signin',
  currentUser,
  onNavigate,
  onNotify,
}: AuthPageProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Sign In state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Reset Password state
  const [resetEmail, setResetEmail] = useState('');

  // Sign Up state
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string>(DEFAULT_AVATAR_URL);
  const [gamerTag, setGamerTag] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [city, setCity] = useState(ETHIOPIAN_CITIES[0]);
  const [favoriteGame, setFavoriteGame] = useState(GAME_DISCIPLINES[0]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Verification & Google auth state
  const [verifyingRefresh, setVerifyingRefresh] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { ref: cardTiltRef, onMove: onCardMove, onLeave: onCardLeave } = useTilt<HTMLDivElement>(6);

  useEffect(() => {
    setMode(initialMode);
    setErrorMsg('');
    setInfoMsg('');
  }, [initialMode]);

  const handleGoogleAuth = async () => {
    setErrorMsg('');
    setInfoMsg('');
    setGoogleLoading(true);
    try {
      const profile = await signInWithGoogle();
      onNotify?.(`Signed in with Google as ${profile.gamerTag}!`);
      onNavigate('home');
    } catch (err) {
      setErrorMsg(mapAuthErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!signInEmail.trim() || !signInPassword) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);
    try {
      const profile = await signInWithEmail(signInEmail, signInPassword);
      onNotify?.(`Welcome back, ${profile.gamerTag}!`);
      if (profile.emailVerified) {
        onNavigate('home');
      } else {
        setInfoMsg('Signed in! Please verify your email address from your inbox to unlock full account security.');
      }
    } catch (err) {
      setErrorMsg(mapAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const trimmedTag = gamerTag.trim();
    if (trimmedTag.length < 3 || trimmedTag.length > 32) {
      setErrorMsg('Gamer tag must be between 3 and 32 characters.');
      return;
    }
    if (!signUpEmail.trim() || !signUpEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 9) {
      setErrorMsg('Please enter a valid Ethiopian mobile number (e.g. 911234567).');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (!agreeTerms) {
      setErrorMsg('Please accept the Fair Play & Community Guidelines to create your account.');
      return;
    }

    const formattedPhone = '+251 ' + phone.trim().replace(/^\+?251|^0/, '');

    setIsLoading(true);
    try {
      const res = await signUpWithEmail({
        email: signUpEmail,
        password,
        gamerTag: trimmedTag,
        fullName: fullName.trim() || trimmedTag,
        phone: formattedPhone,
        city: formatEthiopianCity(city),
        favoriteGame,
        avatar: selectedAvatarUrl,
      });

      onNotify?.(`Account created for ${res.user.gamerTag}!`);
      if (res.emailVerificationSent) {
        setInfoMsg(`Account created! We sent a verification link to ${signUpEmail.trim()}. Check your inbox (and spam folder).`);
      } else {
        setInfoMsg('Account created and saved to the database!');
      }
    } catch (err) {
      setErrorMsg(mapAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!resetEmail.trim() || !resetEmail.includes('@')) {
      setErrorMsg('Enter the email address associated with your account.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPasswordWithEmail(resetEmail);
      setInfoMsg(`Password reset email sent to ${resetEmail.trim()}. Check your inbox to choose a new password.`);
    } catch (err) {
      setErrorMsg(mapAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setErrorMsg('');
    setInfoMsg('');
    setResendingEmail(true);
    try {
      await resendVerificationEmail();
      setInfoMsg('Verification email re-sent! Check your inbox and click the link.');
    } catch (err) {
      setErrorMsg(mapAuthErrorMessage(err));
    } finally {
      setResendingEmail(false);
    }
  };

  const handleCheckVerified = async () => {
    setErrorMsg('');
    setVerifyingRefresh(true);
    try {
      const verified = await refreshEmailVerification();
      if (verified) {
        onNotify?.('Email verified! Your GameZoneET account is fully active.');
        onNavigate('home');
      } else {
        setErrorMsg('Email not marked as verified yet. Click the link in your inbox first, then refresh.');
      }
    } catch (err) {
      setErrorMsg(mapAuthErrorMessage(err));
    } finally {
      setVerifyingRefresh(false);
    }
  };

  const previewTag = mode === 'signup' ? gamerTag.trim() || 'Your_GamerTag' : currentUser?.gamerTag || 'New_Challenger';
  const previewCity = mode === 'signup' ? formatEthiopianCity(city) : formatEthiopianCity(currentUser?.city);
  const previewDiscipline = mode === 'signup' ? favoriteGame : currentUser?.favoriteGame || 'Free Fire & Battle Royale';
  const previewAvatar = mode === 'signup' ? selectedAvatarUrl : currentUser?.avatar || DEFAULT_AVATAR_URL;

  return (
    <div className="relative min-h-screen pt-20 sm:pt-24 pb-12 sm:pb-16 lg:flex lg:items-center">
      <div className="container-x w-full max-w-6xl">
        {/* Back button */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={() => onNavigate('home')}
            className="group inline-flex items-center gap-2 rounded-xl glass px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:border-primary-400/40 transition-all cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Back to Dashboard
          </button>

          <span className="text-xs text-slate-400 hidden sm:inline">
            Protected by Firebase Authentication & Cloud Firestore
          </span>
        </div>

        <div className="grid gap-6 lg:gap-8 lg:grid-cols-12 items-stretch">
          {/* LEFT SHOWCASE COLUMN */}
          <div className="lg:col-span-5 min-w-0 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-400/35 bg-primary-400/10 px-4 py-1.5 text-xs font-bold text-primary-200">
                <Sparkles className="h-3.5 w-3.5 text-primary-400" />
                <span>Ethiopian Gaming Passport</span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white leading-tight text-shadow-glow">
                {currentUser
                  ? `Welcome, ${currentUser.gamerTag}`
                  : mode === 'signup'
                  ? 'Claim Your Gamer Identity.'
                  : 'Step Back Into The Arena.'}
              </h1>

              <p className="text-sm text-slate-300 leading-relaxed">
                Save your scores across verified HTML5 &amp; 3D WebGL games, track every Telebirr &amp; CBE Birr top-up receipt, and enter free Ethiopian tournaments with persistent cloud sync.
              </p>
            </div>

            {/* Interactive 3D Gamer Pass Preview */}
            <div
              ref={cardTiltRef}
              onPointerMove={onCardMove}
              onPointerLeave={onCardLeave}
              className="preserve-3d card-spotlight glass-strong relative overflow-hidden rounded-3xl border border-primary-400/35 p-6 shadow-2xl transition-all duration-300 hover:border-primary-300/60"
            >
              <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(circle at 92% 8%, rgba(56, 189, 248, 0.22), transparent 45%), radial-gradient(circle at 8% 92%, rgba(139, 92, 246, 0.22), transparent 45%)' }} aria-hidden="true" />

              <div className="relative z-10 flex items-center justify-between mb-5">
                <div className="flex items-center gap-2 text-xs font-bold text-primary-300">
                  <Gamepad2 className="h-4 w-4" />
                  <span>GAMEZONE ET • PASS</span>
                </div>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                  {currentUser?.emailVerified ? 'VERIFIED' : 'CLOUD SYNC'}
                </span>
              </div>

              <div className="relative z-10 flex items-center gap-4" style={{ transform: 'translateZ(20px)' }}>
                <UserAvatar
                  src={previewAvatar}
                  name={previewTag}
                  size="lg"
                  className="ring-2 ring-primary-400/60 shadow-glow"
                />
                <div className="min-w-0">
                  <h3 className="font-display text-xl font-extrabold text-white truncate">{previewTag}</h3>
                  <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5 truncate">
                    <MapPin className="h-3 w-3 text-primary-400 shrink-0" />
                    {previewCity}
                  </p>
                  <p className="text-[11px] text-amber-300 font-semibold mt-1 truncate">{previewDiscipline}</p>
                </div>
              </div>

              <div className="relative z-10 mt-6 grid grid-cols-3 gap-2.5 pt-4 border-t border-white/10 text-center">
                <div className="rounded-xl bg-black/30 p-2.5 border border-white/5">
                  <span className="text-[10px] text-slate-400 block">Rank</span>
                  <span className="font-mono text-sm font-bold text-gold-300">
                    #{currentUser?.rank ?? 99}
                  </span>
                </div>
                <div className="rounded-xl bg-black/30 p-2.5 border border-white/5">
                  <span className="text-[10px] text-slate-400 block">Platform XP</span>
                  <span className="font-mono text-sm font-bold text-primary-300">
                    {(currentUser?.loyaltyPoints ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="rounded-xl bg-black/30 p-2.5 border border-white/5">
                  <span className="text-[10px] text-slate-400 block">Matches</span>
                  <span className="font-mono text-sm font-bold text-white">
                    {currentUser?.gamesPlayed ?? 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Feature Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="glass card-spotlight rounded-2xl p-3.5 border border-white/10 hover:border-primary-400/40 transition-all">
                <ShieldCheck className="h-4 w-4 text-emerald-400 mb-1.5" />
                <p className="font-bold text-white">Verified Auth</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Encrypted email login & verification</p>
              </div>
              <div className="glass card-spotlight rounded-2xl p-3.5 border border-white/10 hover:border-amber-400/40 transition-all">
                <Trophy className="h-4 w-4 text-amber-400 mb-1.5" />
                <p className="font-bold text-white">Live Leaderboards</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Every high score locks to your profile</p>
              </div>
              <div className="glass card-spotlight rounded-2xl p-3.5 border border-white/10 hover:border-accent-400/40 transition-all">
                <Zap className="h-4 w-4 text-accent-400 mb-1.5" />
                <p className="font-bold text-white">Order History</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Sync Birr top-ups across devices</p>
              </div>
            </div>
          </div>

          {/* RIGHT INTERACTIVE AUTH CARD */}
          <div className="lg:col-span-7 min-w-0">
            <div className="glass-strong card-spotlight rounded-3xl border border-white/15 p-4 sm:p-8 shadow-2xl h-full flex flex-col justify-between min-w-0">
              {currentUser ? (
                /* SIGNED-IN ACCOUNT & VERIFICATION PANEL */
                <div className="space-y-6 my-auto">
                  <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                    <UserAvatar
                      src={currentUser.avatar}
                      name={currentUser.gamerTag}
                      size="lg"
                      className="ring-2 ring-primary-400 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white truncate">
                        {currentUser.gamerTag}
                      </h2>
                      <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
                    </div>
                  </div>

                  {/* Email Verification Banner */}
                  {!currentUser.emailVerified ? (
                    <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-5 space-y-3">
                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-bold text-white text-sm">Verify Your Email Address</h3>
                          <p className="text-xs text-amber-100/80 mt-1 leading-relaxed">
                            We sent a verification link to <strong className="text-white">{currentUser.email}</strong>. Click the link in your inbox (or spam folder) and refresh below.
                          </p>
                        </div>
                      </div>

                      {errorMsg && (
                        <div className="rounded-xl border border-error-500/40 bg-error-500/10 p-2.5 text-xs text-error-300 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>{errorMsg}</span>
                        </div>
                      )}
                      {infoMsg && (
                        <div className="rounded-xl border border-success-500/40 bg-success-500/10 p-2.5 text-xs text-success-300 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span>{infoMsg}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={handleCheckVerified}
                          disabled={verifyingRefresh}
                          className="btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          {verifyingRefresh ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          I Verified My Email
                        </button>
                        <button
                          type="button"
                          onClick={handleResendVerification}
                          disabled={resendingEmail}
                          className="btn-ghost px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          {resendingEmail ? 'Sending...' : 'Resend Link'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 flex items-center gap-3 text-xs text-emerald-200">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                      <span>Your email is verified and your gamer profile is synchronized with the database.</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => onNavigate('home')}
                      className="btn-glow-cyan py-3 px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      Continue to Dashboard
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onNavigate('profile')}
                      className="btn-ghost py-3 px-5 rounded-xl font-semibold text-sm cursor-pointer"
                    >
                      View My Profile
                    </button>
                  </div>

                  <div className="pt-4 border-t border-white/10 text-center">
                    <button
                      onClick={async () => {
                        await signOutAccount();
                        setInfoMsg('Signed out cleanly.');
                        onNotify?.('Signed out.');
                      }}
                      className="text-xs font-semibold text-error-400 hover:text-error-300 hover:underline cursor-pointer"
                    >
                      Sign out and switch account
                    </button>
                  </div>
                </div>
              ) : (
                /* SIGN IN / SIGN UP / PASSWORD RESET FORMS */
                <div className="space-y-6">
                  {/* Tab Switcher */}
                  {mode !== 'reset' ? (
                    <div
                      role="tablist"
                      aria-label="Account access mode"
                      className="grid grid-cols-2 gap-2 rounded-2xl bg-ink-950/80 p-1.5 border border-white/10"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={mode === 'signin'}
                        onClick={() => {
                          setMode('signin');
                          setErrorMsg('');
                          setInfoMsg('');
                        }}
                        className={`flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-2 py-2.5 sm:py-3 text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer ${
                          mode === 'signin'
                            ? 'bg-gradient-to-r from-primary-400 to-cyan-400 text-ink-950 shadow-glow'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <LogIn className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>Sign In</span>
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={mode === 'signup'}
                        onClick={() => {
                          setMode('signup');
                          setErrorMsg('');
                          setInfoMsg('');
                        }}
                        className={`flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-2 py-2.5 sm:py-3 text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer ${
                          mode === 'signup'
                            ? 'bg-gradient-to-r from-accent-500 to-amber-500 text-white shadow-glow-accent'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <UserPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">Create Account</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-5 w-5 text-primary-400" aria-hidden="true" />
                        <h2 className="font-display text-lg font-bold text-white">Reset Password</h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setMode('signin');
                          setErrorMsg('');
                          setInfoMsg('');
                        }}
                        className="text-xs text-primary-400 hover:underline cursor-pointer"
                      >
                        Back to Sign In
                      </button>
                    </div>
                  )}

                  {/* Feedback Alerts */}
                  {errorMsg && (
                    <div
                      role="alert"
                      aria-live="assertive"
                      className="rounded-xl border border-error-500/40 bg-error-500/10 p-3.5 text-xs text-error-200 flex items-start gap-2.5 animate-scale-in"
                    >
                      <AlertCircle className="h-4 w-4 text-error-400 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{errorMsg}</span>
                    </div>
                  )}
                  {infoMsg && (
                    <div
                      role="status"
                      aria-live="polite"
                      className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs text-emerald-200 flex items-start gap-2.5 animate-scale-in"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{infoMsg}</span>
                    </div>
                  )}

                  {/* SIGN IN FORM */}
                  {mode === 'signin' && (
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div>
                        <label htmlFor="auth-page-signin-email" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                          Email Address
                        </label>
                        <div className="relative group">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary-400 transition-colors" aria-hidden="true" />
                          <input
                            id="auth-page-signin-email"
                            type="email"
                            value={signInEmail}
                            onChange={(e) => setSignInEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full rounded-xl border border-white/15 bg-white/[0.04] py-3.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 transition-all hover:border-white/30 focus:border-primary-400 focus:bg-white/[0.07] focus:outline-none focus:ring-1 focus:ring-primary-400/50"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                          <label htmlFor="auth-page-signin-password" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            Password
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setResetEmail(signInEmail);
                              setMode('reset');
                              setErrorMsg('');
                              setInfoMsg('');
                            }}
                            className="text-xs font-semibold text-primary-400 hover:text-primary-300 hover:underline cursor-pointer"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <div className="relative group">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary-400 transition-colors" aria-hidden="true" />
                          <input
                            id="auth-page-signin-password"
                            type={showPassword ? 'text' : 'password'}
                            value={signInPassword}
                            onChange={(e) => setSignInPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="w-full rounded-xl border border-white/15 bg-white/[0.04] py-3.5 pl-10 pr-11 text-sm text-white placeholder-slate-500 transition-all hover:border-white/30 focus:border-primary-400 focus:bg-white/[0.07] focus:outline-none focus:ring-1 focus:ring-primary-400/50"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="btn-primary group relative w-full py-3.5 text-sm font-extrabold disabled:opacity-60 cursor-pointer"
                      >
                        <span aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:translate-x-full transition-transform duration-700" />
                        </span>
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <LogIn className="h-4 w-4" />
                        )}
                        <span>{isLoading ? 'Signing In...' : 'Sign In with Email'}</span>
                      </button>

                      {/* Divider & Google Sign-In */}
                      <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-[11px] uppercase">
                          <span className="bg-ink-950/90 px-3 text-slate-500 font-semibold rounded-full">Or</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleGoogleAuth}
                        disabled={isLoading || googleLoading}
                        className="group w-full flex items-center justify-between rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-xs sm:text-sm font-bold text-white hover:bg-white/[0.1] disabled:opacity-60 cursor-pointer"
                      >
                        <span className="flex items-center gap-3">
                          {googleLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary-400" />
                          ) : (
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-ink-950 font-black text-xs shadow-xs">
                              G
                            </span>
                          )}
                          <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
                        </span>
                        <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-primary-300 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    </form>
                  )}

                  {/* SIGN UP FORM */}
                  {mode === 'signup' && (
                    <form onSubmit={handleSignUp} className="space-y-4">
                      {/* Avatar Picker (Device Upload + 5 Website Presets) */}
                      <AvatarPicker
                        value={selectedAvatarUrl}
                        onChange={setSelectedAvatarUrl}
                        displayName={gamerTag || 'Your_GamerTag'}
                        label="Profile Picture (Upload from Device or Choose Preset)"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="auth-page-signup-gamertag" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                            Gamer Tag *
                          </label>
                          <div className="relative">
                            <Gamepad2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" aria-hidden="true" />
                            <input
                              id="auth-page-signup-gamertag"
                              type="text"
                              value={gamerTag}
                              onChange={(e) => setGamerTag(e.target.value)}
                              placeholder="e.g. RedNile_Sniper"
                              className="w-full rounded-xl border border-white/15 bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-500 transition-all hover:border-white/30 focus:border-primary-400 focus:outline-none"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="auth-page-signup-fullname" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                            Full Name
                          </label>
                          <input
                            id="auth-page-signup-fullname"
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Your full name"
                            className="w-full rounded-xl border border-white/15 bg-white/[0.04] py-2.5 px-3 text-sm text-white placeholder-slate-500 transition-all hover:border-white/30 focus:border-primary-400 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="auth-page-signup-email" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                            Email Address *
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" aria-hidden="true" />
                            <input
                              id="auth-page-signup-email"
                              type="email"
                              value={signUpEmail}
                              onChange={(e) => setSignUpEmail(e.target.value)}
                              placeholder="you@example.com"
                              className="w-full rounded-xl border border-white/15 bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-500 transition-all hover:border-white/30 focus:border-primary-400 focus:outline-none"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="auth-page-signup-phone" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                            Mobile Phone *
                          </label>
                          <div className="flex min-w-0">
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-l-xl border border-r-0 border-white/15 bg-white/10 px-2.5 text-xs font-semibold text-slate-300">
                              <Phone className="h-3 w-3 text-primary-400" aria-hidden="true" /> +251
                            </span>
                            <input
                              id="auth-page-signup-phone"
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="911234567"
                              className="flex-1 min-w-0 w-full rounded-r-xl border border-white/15 bg-white/[0.04] py-2.5 px-3 text-sm text-white placeholder-slate-500 transition-all hover:border-white/30 focus:border-primary-400 focus:outline-none"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="auth-page-signup-city" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                            City / Region
                          </label>
                          <select
                            id="auth-page-signup-city"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full rounded-xl border border-white/15 bg-ink-950 py-2.5 px-3 text-sm text-white focus:border-primary-400 focus:outline-none cursor-pointer"
                          >
                            {ETHIOPIAN_CITIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label htmlFor="auth-page-signup-discipline" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                            Main Discipline
                          </label>
                          <select
                            id="auth-page-signup-discipline"
                            value={favoriteGame}
                            onChange={(e) => setFavoriteGame(e.target.value)}
                            className="w-full rounded-xl border border-white/15 bg-ink-950 py-2.5 px-3 text-sm text-white focus:border-primary-400 focus:outline-none cursor-pointer"
                          >
                            {GAME_DISCIPLINES.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="auth-page-signup-password" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                            Password *
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" aria-hidden="true" />
                            <input
                              id="auth-page-signup-password"
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Min 6 characters"
                              className="w-full rounded-xl border border-white/15 bg-white/[0.04] py-2.5 pl-9 pr-9 text-sm text-white placeholder-slate-500 transition-all hover:border-white/30 focus:border-primary-400 focus:outline-none"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((v) => !v)}
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label htmlFor="auth-page-signup-confirm" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                            Confirm Password *
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" aria-hidden="true" />
                            <input
                              id="auth-page-signup-confirm"
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Repeat password"
                              className="w-full rounded-xl border border-white/15 bg-white/[0.04] py-2.5 pl-9 pr-9 text-sm text-white placeholder-slate-500 transition-all hover:border-white/30 focus:border-primary-400 focus:outline-none"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword((v) => !v)}
                              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={agreeTerms}
                          onChange={(e) => setAgreeTerms(e.target.checked)}
                          className="mt-0.5 rounded border-white/20 bg-white/5 text-primary-400 focus:ring-0"
                        />
                        <span>
                          I agree to the GameZoneET Fair Play Charter and Esports Community Guidelines.
                        </span>
                      </label>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="btn-glow-gold group relative w-full rounded-xl py-3.5 text-sm font-extrabold text-white disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        <span>{isLoading ? 'Creating Account...' : 'Create Account & Save Profile'}</span>
                      </button>

                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={handleGoogleAuth}
                          disabled={isLoading || googleLoading}
                          className="group w-full flex items-center justify-between rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-xs sm:text-sm font-bold text-white hover:bg-white/[0.1] disabled:opacity-60 cursor-pointer"
                        >
                          <span className="flex items-center gap-3">
                            {googleLoading ? (
                              <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
                            ) : (
                              <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-ink-950 font-black text-xs shadow-xs">
                                G
                              </span>
                            )}
                            <span>{googleLoading ? 'Connecting to Google...' : 'Sign up with Google'}</span>
                          </span>
                          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all" />
                        </button>
                      </div>
                    </form>
                  )}

                  {/* PASSWORD RESET FORM */}
                  {mode === 'reset' && (
                    <form onSubmit={handlePasswordReset} className="space-y-4">
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Enter your registered email address and we will send a password reset link immediately.
                      </p>
                      <div>
                        <label htmlFor="auth-page-reset-email" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                          Registered Email
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" aria-hidden="true" />
                          <input
                            id="auth-page-reset-email"
                            type="email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full rounded-xl border border-white/15 bg-white/[0.04] py-3.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-primary-400 focus:outline-none"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="btn-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                        Send Password Reset Link
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useRef, useState } from 'react';
import {
  HelpCircle,
  X,
  Trophy,
  ShieldCheck,
  Zap,
  HeartPulse,
  Sparkles,
  Bot,
  ArrowRight,
  KeyRound,
  CreditCard,
  Clock,
  CheckCircle2,
  Gamepad2,
  Compass,
  MessageSquare,
} from 'lucide-react';
import type { PageId } from '@/hooks/useRouter';
import { useAccessibleModal } from '@/hooks/useAccessibleModal';

interface PlatformHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: PageId) => void;
  onAskAi: (prompt?: string) => void;
}

type HelpSectionId =
  | 'all'
  | 'overview'
  | 'tournaments'
  | 'verification'
  | 'topups'
  | 'wellness'
  | 'tips';

const SECTION_TABS: { id: HelpSectionId; label: string }[] = [
  { id: 'all', label: 'All Guides' },
  { id: 'overview', label: 'Overview' },
  { id: 'tournaments', label: 'Tournaments & Rooms' },
  { id: 'verification', label: 'ID & Fair Play' },
  { id: 'topups', label: 'Telebirr & CBE' },
  { id: 'wellness', label: 'Wellness Limits' },
  { id: 'tips', label: 'Quick AI Tips' },
];

const QUICK_AI_PROMPTS = [
  {
    label: 'Where do Room IDs & Passwords appear?',
    prompt: 'Where do I find my tournament Room ID and Password after registering?',
  },
  {
    label: 'Passport vs Ethiopian FIDO ID rules',
    prompt: 'Explain why I must choose either Passport or Ethiopian National ID and how name matching works.',
  },
  {
    label: 'How Telebirr & CBE Birr delivery works',
    prompt: 'How do Telebirr and CBE Birr top-ups work, and where can I check my order receipt?',
  },
  {
    label: 'Why is there a 1-tournament/week & 2h cap?',
    prompt: 'How do the 2-hour daily gameplay cap and 1-tournament-per-week responsible gaming rules work?',
  },
];

export default function PlatformHelpModal({
  isOpen,
  onClose,
  onNavigate,
  onAskAi,
}: PlatformHelpModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<HelpSectionId>('all');

  useAccessibleModal(isOpen, onClose, dialogRef);

  if (!isOpen) return null;

  const showSection = (id: Exclude<HelpSectionId, 'all'>) =>
    activeTab === 'all' || activeTab === id;

  const goTo = (page: PageId) => {
    onClose();
    onNavigate(page);
  };

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-ink-950/80 backdrop-blur-md p-3 sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="platform-help-title"
        tabIndex={-1}
        className="relative flex w-full max-w-4xl max-h-[88vh] flex-col overflow-hidden rounded-3xl glass-strong border border-cyan-400/40 shadow-[0_24px_80px_-12px_rgba(4,6,17,0.96),0_0_48px_-8px_rgba(0,245,212,0.28),0_0_38px_-10px_rgba(139,92,246,0.34)] focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-gradient-to-r from-sky-500/15 via-violet-500/12 to-cyan-500/10 px-5 sm:px-7 py-4.5">
          <div className="flex items-center gap-3.5 min-w-0">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#00d2ff] via-[#3a7bd5] to-[#8b5cf6] text-white shadow-[0_0_24px_rgba(0,210,255,0.45)]">
              <HelpCircle className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2
                id="platform-help-title"
                className="font-display text-lg sm:text-xl font-extrabold text-white tracking-tight"
              >
                How GameZone ET Works
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 truncate">
                Quick-start guide to zero-fee tournaments, Telebirr top-ups, ID fair play &amp; wellness
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Platform Guide"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/5 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Section Filter Bar */}
        <div
          role="tablist"
          aria-label="Platform guide topics"
          className="flex items-center gap-2 overflow-x-auto border-b border-white/10 bg-ink-950/60 px-5 sm:px-7 py-3 scrollbar-none"
        >
          {SECTION_TABS.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold border transition-colors cursor-pointer ${
                  selected
                    ? 'border-sky-400/70 bg-gradient-to-r from-sky-500/25 to-violet-500/25 text-white shadow-[0_0_18px_rgba(0,210,255,0.28)]'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-5">
          {/* 1. Welcome & Platform Overview */}
          {showSection('overview') && (
            <section
              aria-labelledby="help-sec-overview"
              className="rounded-2xl border border-white/12 bg-[#0c1024]/75 p-5 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-500/20 text-sky-300 border border-sky-400/30">
                    <Compass className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 id="help-sec-overview" className="font-display text-base font-bold text-white">
                    1. Welcome &amp; Platform Overview
                  </h3>
                </div>
                <span className="rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                  Addis Ababa &bull; All Ethiopia
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                <strong className="text-white">GameZone ET</strong> brings Ethiopia&apos;s competitive gaming community together in one unified hub:
              </p>
              <div className="grid gap-3 sm:grid-cols-3 text-xs">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-1">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> 0 ETB Esports Hub
                  </div>
                  <p className="text-slate-300 leading-snug">
                    Compete in organized Free Fire, PUBG Mobile, and EA SPORTS FC cups for ETB cash prizes with zero entry fees.
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-1">
                  <div className="font-bold text-sky-300 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" aria-hidden="true" /> Instant ETB Top-Ups
                  </div>
                  <p className="text-slate-300 leading-snug">
                    Buy Free Fire Diamonds, PUBG UC, and FC Points instantly using Telebirr or CBE Birr with live order receipts.
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-1">
                  <div className="font-bold text-violet-300 flex items-center gap-1.5">
                    <Gamepad2 className="h-3.5 w-3.5" aria-hidden="true" /> HTML5 Browser Arcade
                  </div>
                  <p className="text-slate-300 leading-snug">
                    Play fast, zero-download HTML5 skill games right in your browser to earn Loyalty XP and climb the rankings.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => goTo('games')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/40 bg-violet-500/15 px-3.5 py-2 text-xs font-bold text-white cursor-pointer"
                >
                  Open Browser Arcade <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </section>
          )}

          {/* 2. How Tournaments & Room Codes Work */}
          {showSection('tournaments') && (
            <section
              aria-labelledby="help-sec-tournaments"
              className="rounded-2xl border border-white/12 bg-[#0c1024]/75 p-5 space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    <Trophy className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 id="help-sec-tournaments" className="font-display text-base font-bold text-white">
                    2. How Tournaments &amp; Room Codes Work
                  </h3>
                </div>
              </div>

              <ol className="grid gap-3 sm:grid-cols-2 text-xs">
                <li className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-1">
                  <span className="font-bold text-primary-300">Step 1 &bull; Pick Event &amp; Mode</span>
                  <p className="text-slate-300 leading-relaxed">
                    Browse upcoming Solo, Duo, or Squad cups for Free Fire, PUBG Mobile, or EA SPORTS FC and click <strong className="text-white">Register Free (0 ETB)</strong>.
                  </p>
                </li>
                <li className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-1">
                  <span className="font-bold text-primary-300">Step 2 &bull; Enter Squad &amp; In-Game ID</span>
                  <p className="text-slate-300 leading-relaxed">
                    Confirm your Gamer Tag, exact Player UID, and teammates&apos; tags (for Squad events) after completing one-time identity binding.
                  </p>
                </li>
                <li className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-1 sm:col-span-2">
                  <span className="font-bold text-amber-300 inline-flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5" aria-hidden="true" /> Step 3 &bull; Unlock Custom Room ID &amp; Password
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    Before kickoff, match marshals publish the private custom lobby credentials. Open <strong className="text-white">Profile &rarr; Overview / Tournaments</strong> or click <strong className="text-white">View Bracket</strong> on the tournament card to reveal and copy your <strong className="text-white">Room ID</strong> and <strong className="text-white">Password</strong>.
                  </p>
                </li>
              </ol>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => goTo('tournaments')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-500/15 px-3.5 py-2 text-xs font-bold text-white cursor-pointer"
                >
                  Browse Tournaments <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </section>
          )}

          {/* 3. Identity Verification & Fair Play */}
          {showSection('verification') && (
            <section
              aria-labelledby="help-sec-verification"
              className="rounded-2xl border border-white/12 bg-[#0c1024]/75 p-5 space-y-3"
            >
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 id="help-sec-verification" className="font-display text-base font-bold text-white">
                  3. Identity Verification &amp; Fair Play
                </h3>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 text-xs">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-1.5">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                    Passport OR FIDO ID Only
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Select <strong className="text-white">either</strong> your Ethiopian National / FIDO Digital ID <strong className="text-white">or</strong> your Passport—strictly never both at the same time.
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-1.5">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-sky-400 shrink-0" aria-hidden="true" />
                    Anti-Smurf 1-to-1 Binding
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Every ID hash binds to a single GameZone ET account so duplicate accounts cannot farm tournament slots or prize brackets.
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-1.5">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-violet-400 shrink-0" aria-hidden="true" />
                    Profile Name Matching
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Make sure your account full name matches your ID or Passport (minor spelling variations are checked fairly, and verified prizes pay out smoothly).
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => goTo('profile')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3.5 py-2 text-xs font-bold text-white cursor-pointer"
                >
                  Open Profile &amp; ID Status <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </section>
          )}

          {/* 4. Instant Mobile Top-Ups (Telebirr & CBE Birr) */}
          {showSection('topups') && (
            <section
              aria-labelledby="help-sec-topups"
              className="rounded-2xl border border-white/12 bg-[#0c1024]/75 p-5 space-y-3"
            >
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  <CreditCard className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 id="help-sec-topups" className="font-display text-base font-bold text-white">
                  4. Instant Mobile Top-Ups (Telebirr &amp; CBE Birr)
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Recharge game currencies in ETB without international cards:
              </p>
              <ul className="grid gap-2.5 sm:grid-cols-3 text-xs">
                <li className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-slate-300">
                  <strong className="text-white block mb-1">1. Choose Bundle</strong>
                  Pick Free Fire Diamonds, PUBG Mobile UC, or EA SPORTS FC Points and enter your numeric Player ID.
                </li>
                <li className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-slate-300">
                  <strong className="text-white block mb-1">2. Pay via Telebirr / CBE</strong>
                  Approve checkout with your Ethiopian mobile wallet to receive an official verification reference code.
                </li>
                <li className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-slate-300">
                  <strong className="text-white block mb-1">3. Track Delivery Live</strong>
                  Check fulfillment status, receipts, and Loyalty XP earned anytime in <strong className="text-white">My Orders</strong> or <strong className="text-white">Profile</strong>.
                </li>
              </ul>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => goTo('topup')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-sky-400/40 bg-sky-500/15 px-3.5 py-2 text-xs font-bold text-white cursor-pointer"
                >
                  Go to Top-Up Store <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => goTo('orders')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-bold text-slate-200 hover:text-white cursor-pointer"
                >
                  Track My Orders
                </button>
              </div>
            </section>
          )}

          {/* 5. Responsible Gaming & Health Portal */}
          {showSection('wellness') && (
            <section
              aria-labelledby="help-sec-wellness"
              className="rounded-2xl border border-white/12 bg-[#0c1024]/75 p-5 space-y-3"
            >
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-500/20 text-rose-300 border border-rose-400/30">
                  <HeartPulse className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 id="help-sec-wellness" className="font-display text-base font-bold text-white">
                  5. Responsible Gaming &amp; Health Portal
                </h3>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-1">
                  <div className="font-bold text-rose-300 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" /> 2-Hour Daily Gameplay Hard Cap
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Your active in-browser arcade &amp; session timer automatically tracks daily playtime. Reaching 2 hours triggers a calming daily wellness rest screen until the next calendar day.
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-1">
                  <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> 1 Tournament / Week + Mindful AI
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Verified accounts may join <strong className="text-white">1 tournament per calendar week (Monday–Sunday)</strong>. Visit the <strong className="text-white">Health &amp; Wellness</strong> portal for focus tips and your Mindful Companion AI coach.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => goTo('wellness')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-400/40 bg-rose-500/15 px-3.5 py-2 text-xs font-bold text-white cursor-pointer"
                >
                  Open Health &amp; Wellness <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </section>
          )}

          {/* 6. Quick Interactive Tips & Ask AI Assistant */}
          {showSection('tips') && (
            <section
              aria-labelledby="help-sec-tips"
              className="rounded-2xl border border-sky-400/30 bg-gradient-to-br from-sky-500/14 via-[#0c1024]/82 to-violet-500/18 p-5 space-y-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#00d2ff] to-[#8b5cf6] text-white">
                    <Bot className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 id="help-sec-tips" className="font-display text-base font-bold text-white">
                      6. Quick Interactive Tips &amp; Live AI Assistant
                    </h3>
                    <p className="text-xs text-slate-300">
                      Click any topic below to send it straight to the GameZone ET AI Assistant:
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {QUICK_AI_PROMPTS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      onClose();
                      onAskAi(item.prompt);
                    }}
                    className="flex items-center justify-between gap-2 rounded-xl border border-sky-400/30 bg-[#040611]/75 px-3.5 py-2.5 text-left text-xs font-semibold text-slate-100 hover:text-white cursor-pointer"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <MessageSquare className="h-3.5 w-3.5 shrink-0 text-sky-400" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-violet-300" aria-hidden="true" />
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="text-[11px] text-slate-300">
                  Need custom help with a match bracket, order receipt, or account question?
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAskAi();
                  }}
                  className="btn-primary !px-4 !py-2.5 !text-xs cursor-pointer"
                >
                  <Bot className="h-4 w-4" aria-hidden="true" />
                  Ask Esports AI Assistant
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

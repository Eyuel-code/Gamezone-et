import { useRef, useState, type FormEvent } from 'react';
import { useAccessibleModal } from '@/hooks/useAccessibleModal';
import {
  Gamepad2,
  Flame,
  Crosshair,
  CircleDot,
  Trophy,
  Wallet,
  Gift,
  Headphones,
  ShieldCheck,
  Twitter,
  Youtube,
  Instagram,
  MessageCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import type { PageId } from '@/hooks/useRouter';
import type { NotificationType } from '@/services/db';

interface FooterProps {
  onNavigate?: (page: PageId) => void;
  onNotify?: (
    message: string,
    opts?: { title?: string; type?: NotificationType; targetPage?: PageId; persist?: boolean }
  ) => void;
}

type LegalTopic = 'terms' | 'privacy' | 'refund';

const LEGAL_CONTENT: Record<LegalTopic, { title: string; body: string[] }> = {
  terms: {
    title: 'GameZoneET Terms of Service',
    body: [
      '1. GameZoneET provides digital top-up reselling (Telebirr, CBE Birr, and internal Wallet), free esports tournament organization, and browser HTML5 gaming for players in Ethiopia.',
      '2. Free tournaments have zero entry fees and zero wagering. Players must submit accurate in-game Player IDs and authentic match proof when reporting results.',
      '3. Misuse of disputes, impersonation, or chargeback fraud may result in account suspension by platform administrators.',
    ],
  },
  privacy: {
    title: 'Privacy & Data Protection',
    body: [
      '1. Public gamer stats (Gamer Tag, avatar, rank, and XP) are kept separate from private account data (email, phone number, full name, and saved Player IDs), which remain restricted to your signed-in account and platform admins.',
      '2. Uploaded profile photos are resized and compressed locally in your browser before saving to your profile.',
      '3. Payment receipts and order logs are retained for at least 60 days so you can verify transactions at any time.',
    ],
  },
  refund: {
    title: 'Top-Up & Refund Policy',
    body: [
      '1. Top-up packages delivered to a verified Player ID are final once credited by the game publisher.',
      '2. If a Telebirr or CBE Birr payment fails or times out before delivery completes, no top-up credit is consumed and you can retry checkout or contact 24/7 Support with your receipt reference.',
      '3. Duplicate or stalled gateway transactions can be reported via the Support Ticket Desk for admin reconciliation.',
    ],
  },
};

export default function Footer({ onNavigate, onNotify }: FooterProps) {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterError, setNewsletterError] = useState('');
  const [subscribedEmail, setSubscribedEmail] = useState('');
  const [legalTopic, setLegalTopic] = useState<LegalTopic | null>(null);
  const legalModalRef = useRef<HTMLDivElement>(null);

  useAccessibleModal(Boolean(legalTopic), () => setLegalTopic(null), legalModalRef);

  const cols: {
    title: string;
    links: { label: string; icon: typeof Flame; page: PageId }[];
  }[] = [
    {
      title: 'Games',
      links: [
        { label: 'Free Fire', icon: Flame, page: 'topup' },
        { label: 'PUBG Mobile', icon: Crosshair, page: 'topup' },
        { label: 'EA Sports FC', icon: CircleDot, page: 'topup' },
      ],
    },
    {
      title: 'Platform',
      links: [
        { label: 'Tournaments', icon: Trophy, page: 'tournaments' },
        { label: 'Wallet', icon: Wallet, page: 'wallet' },
        { label: 'Rewards', icon: Gift, page: 'rewards' },
        { label: 'Support', icon: Headphones, page: 'support' },
      ],
    },
  ];

  const socialChannels = [
    { label: 'X / Twitter', handle: '@GameZoneET', Icon: Twitter },
    { label: 'YouTube', handle: 'GameZoneET Official', Icon: Youtube },
    { label: 'Instagram', handle: '@gamezone.et', Icon: Instagram },
    { label: 'Telegram', handle: 't.me/GameZoneET', Icon: MessageCircle },
  ];

  const handleSocialClick = async (label: string, handle: string) => {
    try {
      await navigator.clipboard.writeText(handle);
    } catch {
      // Clipboard may be unavailable in restricted contexts
    }
    onNotify?.(`${label} (${handle}) copied! Connect with Ethiopian gamers on ${handle}.`, {
      title: 'Community Channel',
      type: 'info',
      persist: false,
    });
  };

  const handleNewsletterSubmit = (e: FormEvent) => {
    e.preventDefault();
    setNewsletterError('');
    const trimmed = newsletterEmail.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setNewsletterError('Please enter a valid email address.');
      return;
    }
    setSubscribedEmail(trimmed);
    setNewsletterEmail('');
    onNotify?.(`Subscribed ${trimmed} to GameZoneET tournament drops and top-up offers!`, {
      title: 'Newsletter Subscribed',
      type: 'success',
      persist: true,
    });
  };

  return (
    <footer className="relative z-10 border-t border-white/10 bg-ink-950/65 backdrop-blur-2xl">
      <div className="absolute inset-0 bg-grid opacity-15 pointer-events-none" />
      <div className="container-x relative py-14">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <button
              type="button"
              onClick={() => onNavigate?.('home')}
              className="no-heat flex items-center gap-2.5 cursor-pointer text-left"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary-400 to-accent-500 text-ink-950">
                <Gamepad2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="font-display text-lg font-bold text-white">
                GameZone<span className="text-primary-400">ET</span>
              </span>
            </button>
            <p className="mt-4 max-w-xs text-sm text-slate-400">
              Ethiopia's home for game top-ups, memberships, and esports tournaments. Pay in Birr, play instantly.
            </p>
            <div className="mt-5 flex gap-2.5">
              {socialChannels.map(({ label, handle, Icon }) => (
                <button
                  key={label}
                  type="button"
                  title={`${label}: ${handle}`}
                  aria-label={`Copy ${label} handle ${handle}`}
                  onClick={() => void handleSocialClick(label, handle)}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-400 transition-all hover:border-primary-300/50 hover:text-primary-300 cursor-pointer"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>

          {cols.map((c) => (
            <div key={c.title} className="lg:col-span-2">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-slate-300">{c.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => {
                  const Icon = l.icon;
                  return (
                    <li key={l.label}>
                      <button
                        type="button"
                        onClick={() => onNavigate?.(l.page)}
                        className="flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white cursor-pointer"
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {l.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <div className="lg:col-span-4">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-slate-300">Stay in the loop</h2>
            <p className="mt-4 text-sm text-slate-400">Get tournament announcements and exclusive offers.</p>
            <form className="mt-4 flex flex-wrap sm:flex-nowrap gap-2" onSubmit={handleNewsletterSubmit}>
              <label htmlFor="footer-newsletter-email" className="sr-only">
                Email address for tournament drops and top-up offers
              </label>
              <input
                id="footer-newsletter-email"
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                aria-invalid={Boolean(newsletterError)}
                aria-describedby={newsletterError ? 'footer-newsletter-error' : undefined}
                placeholder="you@email.com"
                className="flex-1 min-w-0 rounded-xl border border-white/10 bg-ink-900/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-primary-400/50 focus:outline-none"
              />
              <button type="submit" className="btn-primary px-4 py-2.5 text-sm cursor-pointer">
                Subscribe
              </button>
            </form>
            {newsletterError && (
              <p id="footer-newsletter-error" role="alert" aria-live="assertive" className="mt-2 text-xs text-error-400">
                {newsletterError}
              </p>
            )}
            {subscribedEmail && (
              <p role="status" aria-live="polite" className="mt-2 flex items-center gap-1.5 text-xs text-success-400">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Subscribed {subscribedEmail} for updates!
              </p>
            )}
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-success-400/20 bg-success-400/5 px-4 py-3 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4 text-success-400 shrink-0" aria-hidden="true" />
              Licensed payment processor. All transactions secured &amp; encrypted.
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row">
          <p>© 2026 GameZone ET. All rights reserved. Not affiliated with game publishers.</p>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setLegalTopic('terms')}
              className="hover:text-slate-300 cursor-pointer"
            >
              Terms
            </button>
            <button
              type="button"
              onClick={() => setLegalTopic('privacy')}
              className="hover:text-slate-300 cursor-pointer"
            >
              Privacy
            </button>
            <button
              type="button"
              onClick={() => setLegalTopic('refund')}
              className="hover:text-slate-300 cursor-pointer"
            >
              Refund Policy
            </button>
          </div>
        </div>
      </div>

      {/* Legal Policy Modal */}
      {legalTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-md" onClick={() => setLegalTopic(null)} aria-hidden="true" />
          <div
            ref={legalModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="legal-modal-title"
            tabIndex={-1}
            className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto my-auto rounded-2xl border border-white/15 bg-ink-900 p-5 sm:p-6 shadow-2xl space-y-4 focus:outline-none"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 id="legal-modal-title" className="font-display text-lg font-bold text-white">
                {LEGAL_CONTENT[legalTopic].title}
              </h2>
              <button
                type="button"
                aria-label="Close policy dialog"
                onClick={() => setLegalTopic(null)}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
              {LEGAL_CONTENT[legalTopic].body.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setLegalTopic(null)}
                className="rounded-xl bg-primary-500 px-5 py-2 text-xs font-bold text-ink-950 hover:bg-primary-400 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}

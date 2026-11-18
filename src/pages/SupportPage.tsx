import { useState, useEffect, useRef, type FormEvent } from 'react';
import {
  Headphones,
  ChevronDown,
  MessageCircle,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Send,
  CheckCircle2,
  AlertCircle,
  LogIn,
  Clock,
  FileText,
} from 'lucide-react';
import Reveal from '@/components/Reveal';
import { faqs } from '@/data/catalog';
import { db, type SupportTicket, type SupportTicketCategory, type UserAccount } from '@/services/db';

interface SupportPageProps {
  currentUser?: UserAccount | null;
  onOpenAuth?: () => void;
  onNotify?: (msg: string) => void;
}

const CATEGORY_OPTIONS: { value: SupportTicketCategory; label: string }[] = [
  { value: 'support', label: 'General Support & Account Help' },
  { value: 'payment', label: 'Telebirr / CBE Birr Payment & Order Issue' },
  { value: 'bug', label: 'Platform or HTML5 Game Bug' },
  { value: 'abuse', label: 'Player / Tournament Conduct Report' },
];

export default function SupportPage({ currentUser, onOpenAuth, onNotify }: SupportPageProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [category, setCategory] = useState<SupportTicketCategory>('support');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [myTickets, setMyTickets] = useState<SupportTicket[]>(() =>
    currentUser ? db.getSupportTickets(currentUser.id) : []
  );

  const subjectInputRef = useRef<HTMLInputElement | null>(null);
  const formSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const refresh = () => {
      setMyTickets(currentUser ? db.getSupportTickets(currentUser.id) : []);
    };
    refresh();
    return db.subscribe(refresh);
  }, [currentUser]);

  const handleFocusForm = () => {
    formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => subjectInputRef.current?.focus(), 300);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmittedId(null);

    if (!currentUser) {
      onOpenAuth?.();
      return;
    }

    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (trimmedSubject.length < 2) {
      setError('Please enter a subject of at least 2 characters.');
      return;
    }
    if (trimmedMessage.length < 5) {
      setError('Please provide details of at least 5 characters so our team can assist.');
      return;
    }

    const ticket = db.createSupportTicket({
      userId: currentUser.id,
      userName: currentUser.gamerTag || currentUser.fullName || 'Ethiopian Gamer',
      email: currentUser.email || 'gamer@gamezone.et',
      category,
      subject: trimmedSubject,
      message: trimmedMessage,
    });

    setSubject('');
    setMessage('');
    setSubmittedId(ticket.id);
    onNotify?.(`Ticket ${ticket.id} submitted and saved to your account.`);
  };

  return (
    <div className="relative min-h-screen pt-20 pb-20">
      <section className="relative overflow-hidden py-12">
        <div className="absolute inset-0 -z-10 bg-radial-fade" />
        <div className="container-x">
          <Reveal className="text-center">
            <span className="chip border-primary-400/30 bg-primary-400/10 text-primary-200">
              <Headphones className="h-3.5 w-3.5" /> Support &amp; Reports
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">
              How can we <span className="text-gradient">help?</span>
            </h1>
            <p className="mt-4 text-slate-400">
              Our support desk is available 24/7 in Amharic and English for top-ups, tournaments, and bug reports.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-6">
        <div className="container-x">
          <div className="grid gap-10 lg:grid-cols-2">
            {/* Submit Support Ticket / Report */}
            <div ref={formSectionRef} id="ticket-form">
              <Reveal>
                <div className="glass-strong rounded-2xl border border-white/10 p-5 sm:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-display text-2xl font-bold text-white">Submit a Ticket or Report</h2>
                      <p className="mt-1 text-xs text-slate-400">
                        Tracked directly inside your account and reviewed by GameZoneET admins.
                      </p>
                    </div>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-500/15 text-primary-300">
                      <FileText className="h-5 w-5" />
                    </span>
                  </div>

                  {!currentUser ? (
                    <div className="mt-6 rounded-2xl border border-primary-400/25 bg-primary-400/5 p-6 text-center space-y-4">
                      <p className="text-sm text-slate-300">
                        Sign in with Google or Email to submit an order issue, bug report, or player conduct report synced to Firestore.
                      </p>
                      <button
                        type="button"
                        onClick={() => onOpenAuth?.()}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-bold text-ink-950 hover:bg-primary-400 shadow-glow cursor-pointer transition-colors"
                      >
                        <LogIn className="h-4 w-4" /> Sign In to Submit Ticket
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-slate-400">
                          Reporting as <strong className="text-white">{currentUser.gamerTag}</strong>
                        </span>
                        <span className="font-mono text-slate-400 truncate max-w-full sm:max-w-[200px]">
                          {currentUser.email}
                        </span>
                      </div>

                      <div>
                        <label htmlFor="support-category" className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Category
                        </label>
                        <select
                          id="support-category"
                          value={category}
                          onChange={(e) => setCategory(e.target.value as SupportTicketCategory)}
                          className="w-full rounded-xl border border-white/15 bg-ink-950 px-3.5 py-2.5 text-sm text-white focus:border-primary-400 focus:outline-none"
                        >
                          {CATEGORY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="support-subject" className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Subject <span className="text-primary-400">*</span>
                        </label>
                        <input
                          id="support-subject"
                          ref={subjectInputRef}
                          type="text"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          maxLength={160}
                          aria-required="true"
                          aria-invalid={Boolean(error)}
                          aria-describedby={error ? 'support-form-error' : undefined}
                          placeholder="e.g. Delayed Telebirr receipt for Order #ET-ORD-..."
                          className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-primary-400 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label htmlFor="support-message" className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Details <span className="text-primary-400">*</span>
                        </label>
                        <textarea
                          id="support-message"
                          rows={4}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          maxLength={2000}
                          aria-required="true"
                          aria-invalid={Boolean(error)}
                          aria-describedby={error ? 'support-form-error' : undefined}
                          placeholder="Describe your issue, Player ID, or match details..."
                          className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-primary-400 focus:outline-none resize-none"
                        />
                      </div>

                      {error && (
                        <div
                          id="support-form-error"
                          role="alert"
                          aria-live="assertive"
                          className="flex items-center gap-2 rounded-xl border border-error-500/30 bg-error-500/10 px-3.5 py-2.5 text-xs text-error-300"
                        >
                          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>{error}</span>
                        </div>
                      )}

                      {submittedId && (
                        <div
                          role="status"
                          aria-live="polite"
                          className="flex items-center gap-2 rounded-xl border border-success-500/30 bg-success-500/10 px-3.5 py-2.5 text-xs text-success-300"
                        >
                          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>
                            Ticket <strong className="font-mono">{submittedId}</strong> logged and synced.
                          </span>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-5 py-3 text-sm font-bold text-ink-950 hover:bg-primary-400 shadow-glow cursor-pointer transition-all"
                      >
                        <Send className="h-4 w-4" /> Submit Ticket / Report
                      </button>
                    </form>
                  )}
                </div>
              </Reveal>
            </div>

            {/* Contact card */}
            <Reveal delay={120}>
              <div className="glass-strong h-full rounded-2xl p-5 sm:p-7">
                <h3 className="font-display text-xl font-bold text-white">Get in touch</h3>
                <p className="mt-2 text-sm text-slate-400">Reach us through any of these channels.</p>

                <div className="mt-6 space-y-4">
                  <button
                    type="button"
                    onClick={handleFocusForm}
                    className="w-full text-left cursor-pointer"
                  >
                    <ContactRow
                      icon={MessageCircle}
                      label="Ticket Desk"
                      value="Open a support ticket on the left"
                      accent="#11bdf7"
                    />
                  </button>
                  <a href="mailto:support@gamezone.et" className="block">
                    <ContactRow icon={Mail} label="Email" value="support@gamezone.et" accent="#34d399" />
                  </a>
                  <a href="tel:+251911234567" className="block">
                    <ContactRow icon={Phone} label="Phone / Telegram" value="+251 911 234 567" accent="#ff4516" />
                  </a>
                  <ContactRow icon={MapPin} label="Office" value="Bole, Addis Ababa, Ethiopia" accent="#f5b200" />
                </div>

                <div className="mt-7 rounded-xl border border-white/10 bg-gradient-to-br from-primary-400/10 to-transparent p-5">
                  <p className="text-sm font-semibold text-white">Average response time</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-primary-300">&lt; 5 minutes</p>
                  <p className="mt-1 text-xs text-slate-500">For verified Telebirr &amp; CBE Birr inquiries</p>
                </div>

                <div className="mt-5 flex items-center gap-2 rounded-xl border border-success-400/20 bg-success-400/5 px-4 py-3 text-xs text-slate-400">
                  <ShieldCheck className="h-4 w-4 text-success-400 shrink-0" />
                  Authorized reseller. We deliver through official channels.
                </div>
              </div>
            </Reveal>
          </div>

          {/* My Submitted Tickets */}
          {currentUser && (
            <div className="mt-12">
              <Reveal>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h2 className="font-display text-2xl font-bold text-white">My Submitted Tickets &amp; Reports</h2>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-mono text-slate-300">
                    {myTickets.length} total
                  </span>
                </div>

                {myTickets.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-slate-400">
                    You have not submitted any tickets or reports yet.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {myTickets.map((t) => (
                      <div
                        key={t.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono text-xs text-primary-300 font-bold">{t.id}</span>
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-300">
                              {t.category}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                                t.status === 'resolved'
                                  ? 'bg-success-500/20 text-success-300'
                                  : t.status === 'in_progress'
                                  ? 'bg-gold-500/20 text-gold-300'
                                  : 'bg-primary-500/20 text-primary-300'
                              }`}
                            >
                              {t.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        <h3 className="font-bold text-white text-sm">{t.subject}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">{t.message}</p>
                        {t.adminNotes && (
                          <div className="rounded-xl border border-success-400/20 bg-success-400/5 px-3 py-2 text-xs text-success-200">
                            <span className="font-bold">Admin Response: </span>
                            {t.adminNotes}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-500">
                          <Clock className="h-3 w-3" /> {t.createdAt}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Reveal>
            </div>
          )}

          {/* FAQ */}
          <div className="mt-14">
            <Reveal>
              <h2 className="font-display text-2xl font-bold text-white">Frequently asked questions</h2>
              <div className="mt-6 grid gap-3 lg:grid-cols-2">
                {faqs.map((f, i) => {
                  const open = openIdx === i;
                  return (
                    <div
                      key={i}
                      className={`overflow-hidden rounded-xl border transition-colors ${
                        open ? 'border-primary-400/30 bg-primary-400/5' : 'border-white/10 bg-white/[0.02]'
                      }`}
                    >
                      <button
                        id={`faq-trigger-${i}`}
                        type="button"
                        aria-expanded={open}
                        aria-controls={`faq-panel-${i}`}
                        onClick={() => setOpenIdx(open ? null : i)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left cursor-pointer"
                      >
                        <span className="text-sm font-medium text-white">{f.q}</span>
                        <ChevronDown
                          aria-hidden="true"
                          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 ${
                            open ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      <div
                        id={`faq-panel-${i}`}
                        role="region"
                        aria-labelledby={`faq-trigger-${i}`}
                        className="grid transition-all duration-300 ease-out"
                        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
                      >
                        <div className="overflow-hidden">
                          <p className="px-4 pb-4 text-sm text-slate-400">{f.a}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-white/20">
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
        style={{ background: `${accent}22`, color: accent }}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

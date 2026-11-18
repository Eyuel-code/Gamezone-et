import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Trophy,
  Calendar,
  Clock,
  Send,
  Users,
  Award,
  AlertTriangle,
  Radio,
  Copy,
  Check,
  Lock,
  KeyRound,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';
import { db, type TournamentEntity, type TournamentMatch } from '@/services/db';
import { isAuthorizedAdminUser } from '@/services/authService';
import { securityEngine } from '@/services/securityEngine';
import { maskSecretValue } from '@/utils/masking';
import { useAccessibleModal } from '@/hooks/useAccessibleModal';
import { useAccessibility } from '@/context/AccessibilityContext';

interface BracketModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: TournamentEntity | null;
  currentUser: any;
  onOpenDispute: (matchId: string, tourneyId: string) => void;
  onSubmitResult: (matchId: string, tourneyId: string) => void;
}

export default function TournamentBracketModal({
  isOpen,
  onClose,
  tournament,
  currentUser,
  onOpenDispute,
  onSubmitResult,
}: BracketModalProps) {
  const [activeTab, setActiveTab] = useState<'bracket' | 'rules' | 'schedule'>('bracket');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [revealRoomPass, setRevealRoomPass] = useState(false);
  const [rateNotice, setRateNotice] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const { pushVisualAlert } = useAccessibility();

  useAccessibleModal(isOpen && Boolean(tournament), onClose, modalRef);

  if (!isOpen || !tournament) return null;

  const matches = tournament.matches || [];
  const qfMatches = matches.filter((m) => m.round.includes('Quarterfinal'));
  const sfMatches = matches.filter((m) => m.round.includes('Semifinal'));
  const gfMatches = matches.filter((m) => m.round.includes('Grand Final'));
  const otherMatches = matches.filter(
    (m) =>
      !m.round.includes('Quarterfinal') &&
      !m.round.includes('Semifinal') &&
      !m.round.includes('Grand Final')
  );

  const isAdmin = isAuthorizedAdminUser(currentUser);
  const registration = currentUser?.id
    ? db.getRegistrationForTournament(currentUser.id, tournament.id)
    : null;
  const roomGate = db.isRoomUnlockedForUser(tournament, currentUser?.id, isAdmin);
  const creds = roomGate.creds;

  const handleCopy = (label: string, val: string) => {
    const rate = securityEngine.checkRateLimit(
      { key: `room-reveal:${tournament.id}`, maxRequests: 6, windowMs: 60_000, label: 'Room Credential Reveal' },
      { userId: currentUser?.id, gamerTag: currentUser?.gamerTag }
    );
    if (!rate.allowed) {
      setRateNotice(rate.message || 'Rate limit reached on room credential access.');
      return;
    }
    setRateNotice('');
    navigator.clipboard?.writeText(val).catch(() => {});
    setCopiedField(label);
    window.setTimeout(() => setCopiedField(null), 1800);
  };

  const handleToggleRoomPass = () => {
    if (revealRoomPass) {
      setRevealRoomPass(false);
      return;
    }
    const rate = securityEngine.checkRateLimit(
      { key: `room-reveal:${tournament.id}`, maxRequests: 6, windowMs: 60_000, label: 'Room Credential Reveal' },
      { userId: currentUser?.id, gamerTag: currentUser?.gamerTag }
    );
    if (!rate.allowed) {
      setRateNotice(rate.message || 'Too many reveal requests. Please wait.');
      return;
    }
    setRateNotice('');
    setRevealRoomPass(true);
  };

  const handleAdminAdvance = (matchId: string, winnerId: string, p1Score: number, p2Score: number) => {
    db.approveMatchResult(tournament.id, matchId, winnerId, p1Score, p2Score);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-ink-950/85 backdrop-blur-md" onClick={onClose} aria-hidden="true" />

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bracket-modal-title"
        tabIndex={-1}
        className="relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-white/10 bg-ink-900 shadow-2xl overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="relative shrink-0 p-4 sm:p-6 border-b border-white/10 bg-gradient-to-r from-ink-950 via-ink-900 to-ink-950">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-400/10 border border-gold-400/30 px-3 py-0.5 text-xs font-bold text-gold-300">
                  <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> Official Competition Bracket
                </span>
                {tournament.currentMatchLabel && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-500/15 border border-primary-400/35 px-2.5 py-0.5 text-[11px] font-bold text-primary-300">
                    <Radio className="h-3 w-3 animate-pulse" aria-hidden="true" />
                    {tournament.currentMatchLabel}
                  </span>
                )}
                {registration && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 font-mono">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    {registration.confirmationCode || 'REGISTERED'} · Slot #{registration.slotNumber ?? '-'}
                  </span>
                )}
              </div>
              <h2 id="bracket-modal-title" className="font-display text-xl sm:text-2xl font-bold text-white">
                {tournament.title}
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-primary-400" aria-hidden="true" /> {tournament.date}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-primary-400" aria-hidden="true" /> {tournament.startTime}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" /> {tournament.registeredCount}/{tournament.capacity} Slots Filled
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close tournament bracket modal"
              className="shrink-0 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div role="tablist" aria-label="Tournament bracket sections" className="flex items-center gap-2 mt-4 sm:mt-5 border-b border-white/10 -mb-4 sm:-mb-6 pb-2 overflow-x-auto scrollbar-none">
            {[
              { id: 'bracket', label: 'Interactive Bracket' },
              { id: 'rules', label: 'Rules & Format' },
              { id: 'schedule', label: 'Match Schedule' },
            ].map((t) => {
              const selected = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  id={`bracket-tab-${t.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`bracket-panel-${t.id}`}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`relative z-0 nav-luminous-item whitespace-nowrap shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    selected
                      ? 'text-ink-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {selected && (
                    <motion.span
                      layoutId="bracket-active-tab"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      className="absolute inset-0 -z-10 rounded-lg bg-primary-500 shadow-glow"
                    />
                  )}
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 flex-1 min-h-0 overflow-y-auto">
          {activeTab === 'bracket' && (
            <div
              id="bracket-panel-bracket"
              role="tabpanel"
              aria-labelledby="bracket-tab-bracket"
              className="space-y-6"
            >
              {/* Secure Custom Room Credentials & Visual Drop Banner */}
              {roomGate.unlocked && creds ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex flex-col gap-3 rounded-xl border border-[#00f0ff]/45 bg-[#00f0ff]/10 p-4 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded bg-[#00f0ff] px-2 py-0.5 text-[10px] font-black uppercase text-[#0a0a0c]">
                        <KeyRound className="h-3 w-3" aria-hidden="true" />
                        ROOM CREDENTIALS UNLOCKED
                      </span>
                      <span className="text-slate-200 font-semibold">
                        Server: <strong className="text-white">{creds.server}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        pushVisualAlert({
                          kind: 'room_code',
                          badge: 'ROOM CODE LIVE',
                          title: `${tournament.title} — Custom Lobby Open`,
                          message: `Join ${tournament.gameName} (${creds.server}) 10 minutes before ${tournament.startTime}.`,
                          roomId: creds.roomId,
                          roomPassword: creds.roomPassword,
                        })
                      }
                      className="shrink-0 rounded-lg border border-[#00f0ff] bg-[#0a0a0c] px-3 py-1.5 text-[11px] font-bold text-[#00f0ff] hover:bg-[#00f0ff]/20 cursor-pointer"
                    >
                      Pop Visual Alert
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/15 bg-ink-950/75 px-3 py-2">
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Room ID</span>
                        <span className="font-mono text-sm font-black text-white break-all">{creds.roomId}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy('roomId', creds.roomId)}
                        className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-primary-300 hover:bg-white/10 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedField === 'roomId' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        {copiedField === 'roomId' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center justify-between rounded-xl border border-white/15 bg-ink-950/75 px-3 py-2 gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Room Password</span>
                        <span className="font-mono text-sm font-black text-amber-300">
                          {revealRoomPass ? creds.roomPassword : maskSecretValue(creds.roomPassword, 1)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleToggleRoomPass}
                          aria-label={revealRoomPass ? 'Hide room password' : 'Reveal room password'}
                          className="rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-[11px] font-bold text-slate-200 hover:bg-white/10 flex items-center gap-1 cursor-pointer"
                        >
                          {revealRoomPass ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          {revealRoomPass ? 'Hide' : 'Show'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy('roomPassword', creds.roomPassword)}
                          className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-amber-300 hover:bg-white/10 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedField === 'roomPassword' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          {copiedField === 'roomPassword' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>
                  {rateNotice && (
                    <p className="text-[11px] font-semibold text-amber-300">{rateNotice}</p>
                  )}
                  {creds.notes && (
                    <p className="text-[11px] text-slate-200">{creds.notes}</p>
                  )}
                </div>
              ) : (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/[0.04] p-4 text-xs"
                >
                  <div className="flex items-start gap-2.5">
                    <Lock className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="space-y-0.5">
                      <span className="font-bold text-white block">
                        {roomGate.reason === 'unregistered'
                          ? 'Register Free to Unlock Custom Room Credentials'
                          : roomGate.reason === 'scheduled_lock'
                          ? `Registered! Room Credentials Unlock at ${tournament.roomCredentials?.unlockAt || tournament.startTime}`
                          : 'Host Will Publish Custom Room Codes Prior to Kickoff'}
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Only confirmed participants see private Room IDs &amp; Passwords once published by the tournament host.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      pushVisualAlert({
                        kind: 'countdown',
                        badge: 'LOBBY STATUS',
                        title: `${tournament.title}`,
                        message:
                          roomGate.reason === 'unregistered'
                            ? 'Register for free to receive your private slot confirmation and custom room lobby password.'
                            : `Custom room unlocks automatically before ${tournament.startTime}.`,
                      })
                    }
                    className="shrink-0 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-white/10 cursor-pointer"
                  >
                    Room Status Alert
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-400 bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                <span>
                  Ethiopian tournament knockout tree • Verified single-elimination progression
                </span>
                {isAdmin && (
                  <span className="rounded bg-accent-500/20 text-accent-300 font-bold px-2 py-0.5">
                    Admin Match Controls Enabled
                  </span>
                )}
              </div>

              {/* Bracket Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                {/* Quarterfinals */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-white/10">
                    {qfMatches.length > 0 ? 'Quarterfinals' : 'Round 1'}
                  </h3>
                  {(qfMatches.length > 0 ? qfMatches : otherMatches).map((m) => (
                    <MatchCard
                      key={m.id}
                      match={m}
                      isAdmin={isAdmin}
                      onAdvance={handleAdminAdvance}
                      onDispute={() => onOpenDispute(m.id, tournament.id)}
                      onSubmit={() => onSubmitResult(m.id, tournament.id)}
                    />
                  ))}
                </div>

                {/* Semifinals */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-white/10">
                    Semifinals
                  </h3>
                  {sfMatches.map((m) => (
                    <MatchCard
                      key={m.id}
                      match={m}
                      isAdmin={isAdmin}
                      onAdvance={handleAdminAdvance}
                      onDispute={() => onOpenDispute(m.id, tournament.id)}
                      onSubmit={() => onSubmitResult(m.id, tournament.id)}
                    />
                  ))}
                </div>

                {/* Grand Finals */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gold-400 pb-1 border-b border-gold-400/30 flex items-center gap-1">
                    <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> Grand Finals
                  </h3>
                  {gfMatches.map((m) => (
                    <MatchCard
                      key={m.id}
                      match={m}
                      isFinal
                      isAdmin={isAdmin}
                      onAdvance={handleAdminAdvance}
                      onDispute={() => onOpenDispute(m.id, tournament.id)}
                      onSubmit={() => onSubmitResult(m.id, tournament.id)}
                    />
                  ))}
                  <div className="rounded-xl border border-gold-500/30 bg-gold-500/10 p-4 text-center mt-4">
                    <Award className="mx-auto h-8 w-8 text-gold-400 mb-1" />
                    <span className="font-bold text-white text-xs block">Champion Prize Recognition</span>
                    <span className="text-[11px] text-gold-300 mt-1 block">{tournament.prizeRecognition}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rules' && (
            <div
              id="bracket-panel-rules"
              role="tabpanel"
              aria-labelledby="bracket-tab-rules"
              className="space-y-4"
            >
              <h3 className="font-display font-bold text-white text-base">Competition Rules &amp; Fair Play</h3>
              <ul className="space-y-2">
                {tournament.rules.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-primary-500/20 text-primary-400 font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div
              id="bracket-panel-schedule"
              role="tabpanel"
              aria-labelledby="bracket-tab-schedule"
              className="space-y-4"
            >
              <h3 className="font-display font-bold text-white text-base">Match Timetable (Addis Ababa Time)</h3>
              <div className="space-y-2">
                {tournament.schedule.map((slot, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-xs text-slate-300 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <Clock className="h-4 w-4 text-primary-400 shrink-0" aria-hidden="true" />
                    <span className="font-medium text-white">{slot}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MatchCard({
  match,
  isFinal,
  isAdmin,
  onAdvance,
  onDispute,
  onSubmit,
}: {
  match: TournamentMatch;
  isFinal?: boolean;
  isAdmin?: boolean;
  onAdvance: (matchId: string, winnerId: string, p1Score: number, p2Score: number) => void;
  onDispute: () => void;
  onSubmit: () => void;
}) {
  return (
    <div
      className={`rounded-xl border p-3 transition-all ${
        isFinal
          ? 'border-gold-500/40 bg-gold-500/10'
          : match.status === 'completed'
          ? 'border-white/10 bg-white/[0.03]'
          : match.status === 'pending_approval'
          ? 'border-gold-400/40 bg-gold-400/5'
          : match.status === 'disputed'
          ? 'border-error-500/40 bg-error-500/10'
          : 'border-white/10 bg-white/[0.02]'
      }`}
    >
      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
        <span className="font-semibold">{match.round}</span>
        <span
          className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
            match.status === 'completed'
              ? 'bg-success-500/20 text-success-400'
              : match.status === 'pending_approval'
              ? 'bg-gold-500/20 text-gold-300'
              : match.status === 'disputed'
              ? 'bg-error-500/20 text-error-400'
              : 'bg-white/10 text-slate-400'
          }`}
        >
          {match.status.replace('_', ' ')}
        </span>
      </div>

      {/* Player 1 */}
      <div
        className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors mb-1 ${
          match.player1.isWinner ? 'bg-primary-500/20 border border-primary-500/40 text-white font-bold' : 'bg-white/[0.03] text-slate-300'
        }`}
      >
        <span className="truncate">{match.player1.name}</span>
        <span className="font-mono font-bold ml-2">{match.player1.score ?? '-'}</span>
      </div>

      {/* Player 2 */}
      <div
        className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
          match.player2.isWinner ? 'bg-primary-500/20 border border-primary-500/40 text-white font-bold' : 'bg-white/[0.03] text-slate-300'
        }`}
      >
        <span className="truncate">{match.player2.name}</span>
        <span className="font-mono font-bold ml-2">{match.player2.score ?? '-'}</span>
      </div>

      {/* Participant Actions */}
      <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-white/5 text-[11px]">
        {match.status === 'scheduled' && (
          <button
            type="button"
            onClick={onSubmit}
            className="min-h-[28px] text-primary-400 hover:text-primary-300 font-bold flex items-center gap-1 cursor-pointer"
          >
            <Send className="h-3 w-3" aria-hidden="true" /> Report Result
          </button>
        )}

        {match.status === 'pending_approval' && (
          <span className="text-gold-300 font-medium">Result Submitted: {match.submittedScore}</span>
        )}

        <button
          type="button"
          onClick={onDispute}
          className="min-h-[28px] text-slate-400 hover:text-error-400 flex items-center gap-1 ml-auto text-[10px] cursor-pointer"
        >
          <AlertTriangle className="h-3 w-3" aria-hidden="true" /> Dispute
        </button>
      </div>

      {/* Admin Fast Advancement Controls */}
      {isAdmin && match.status !== 'completed' && (
        <div className="pt-2 mt-2 border-t border-white/10 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onAdvance(match.id, match.player1.id, 7, 5)}
            className="flex-1 min-h-[28px] rounded bg-primary-500/20 hover:bg-primary-500/40 text-[10px] font-bold text-primary-300 py-1.5 px-2 cursor-pointer"
          >
            Advance {match.player1.name.split('_')[0]} (7-5)
          </button>
          <button
            type="button"
            onClick={() => onAdvance(match.id, match.player2.id, 5, 7)}
            className="flex-1 min-h-[28px] rounded bg-accent-500/20 hover:bg-accent-500/40 text-[10px] font-bold text-accent-300 py-1.5 px-2 cursor-pointer"
          >
            Advance {match.player2.name.split('_')[0]} (7-5)
          </button>
        </div>
      )}
    </div>
  );
}

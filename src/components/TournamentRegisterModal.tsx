import { useState, useEffect, useRef } from 'react';
import { useAccessibleModal } from '@/hooks/useAccessibleModal';
import {
  X,
  Trophy,
  ShieldCheck,
  Check,
  Users,
  AlertCircle,
  Sparkles,
  User,
  Plus,
  Trash2,
  Copy,
  KeyRound,
  Loader2,
  Ban,
  Fingerprint,
  CalendarClock,
} from 'lucide-react';
import { db, type TournamentEntity, type TournamentRegistration } from '@/services/db';
import { securityEngine } from '@/services/securityEngine';
import IdentityVerificationModal from '@/components/IdentityVerificationModal';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: TournamentEntity | null;
  currentUser: any;
  onSuccess: (message: string) => void;
  onNotify?: (
    message: string,
    opts?: { title?: string; type?: 'success' | 'info' | 'warning' | 'error'; targetPage?: any; persist?: boolean }
  ) => void;
}

export default function TournamentRegisterModal({
  isOpen,
  onClose,
  tournament,
  currentUser,
  onSuccess,
  onNotify,
}: RegisterModalProps) {
  const [entryType, setEntryType] = useState<'solo' | 'squad'>('solo');
  const [playerId, setPlayerId] = useState('');
  const [teamName, setTeamName] = useState('');
  const [squadMemberIds, setSquadMemberIds] = useState<string[]>([]);
  const [contactNumber, setContactNumber] = useState(() => currentUser?.phone || '');
  const [error, setError] = useState('');
  const [confirmedReg, setConfirmedReg] = useState<TournamentRegistration | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [checkingGate, setCheckingGate] = useState(false);
  const [verifiedSnapshot, setVerifiedSnapshot] = useState<any>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useAccessibleModal(Boolean(isOpen && tournament && !verifyModalOpen), onClose, dialogRef);

  const activeUser =
    verifiedSnapshot && verifiedSnapshot.id === currentUser?.id
      ? verifiedSnapshot
      : currentUser?.id
      ? db.getUserById(currentUser.id) || currentUser
      : currentUser;

  useEffect(() => {
    if (isOpen && tournament) {
      setError('');
      setTeamName('');
      setSquadMemberIds([]);
      setConfirmedReg(null);
      setCopiedCode(false);
      setCheckingGate(false);
      setVerifiedSnapshot(null);
      const savedPid = currentUser?.savedPlayerIds?.[tournament.gameId] || '';
      setPlayerId(savedPid);
      setContactNumber(currentUser?.phone || '');
      const defaultIsSquad =
        tournament.entryMode === 'squad' ||
        (tournament.entryMode !== 'solo' && tournament.format.toLowerCase().includes('squad'));
      setEntryType(defaultIsSquad ? 'squad' : 'solo');
    }
  }, [isOpen, tournament, currentUser]);

  if (!isOpen || !tournament) return null;

  const allowToggle = tournament.entryMode === 'either' || !tournament.entryMode;
  const isSquad = entryType === 'squad';
  const weeklyLimit = db.getWeeklyTournamentLimitStatus(activeUser, tournament.id);

  const handleAddSquadmate = () => {
    if (squadMemberIds.length >= 3) return;
    setSquadMemberIds((prev) => [...prev, '']);
  };

  const handleUpdateSquadmate = (idx: number, val: string) => {
    setSquadMemberIds((prev) => prev.map((item, i) => (i === idx ? val : item)));
  };

  const handleRemoveSquadmate = (idx: number) => {
    setSquadMemberIds((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!activeUser?.id) {
      setError('Please sign in or create an account before registering for tournaments.');
      return;
    }
    if (activeUser.isBanned) {
      setError(
        `Your account is suspended from competitive tournaments${activeUser.banReason ? `: ${activeUser.banReason}` : '.'}`
      );
      return;
    }
    if (!activeUser.identityVerified) {
      setError('Identity verification is required before joining tournaments. Complete Fayda NID, FIDO, or Passport binding below.');
      setVerifyModalOpen(true);
      return;
    }

    const rateRes = securityEngine.checkRateLimit(
      {
        key: `tourney-register:${tournament.id}`,
        maxRequests: 5,
        windowMs: 60_000,
        label: 'Tournament Registration',
      },
      { userId: activeUser.id, gamerTag: activeUser.gamerTag }
    );
    if (!rateRes.allowed) {
      setError(rateRes.message || 'Too many registration attempts. Please wait a moment.');
      return;
    }

    if (!playerId.trim()) {
      setError('Please provide your in-game Player ID for custom room invite verification.');
      return;
    }
    if (isSquad && !teamName.trim()) {
      setError('Please provide a squad or team name.');
      return;
    }
    if (!contactNumber.trim() || contactNumber.trim().length < 5) {
      setError('Please enter your Telegram handle or Ethiopian mobile phone (at least 5 characters).');
      return;
    }

    if (weeklyLimit.limited) {
      const msg =
        weeklyLimit.message ||
        `Weekly Cool-Down Limit: You already entered "${weeklyLimit.activeReg?.tournamentTitle || 'a tournament'}" this week (${weeklyLimit.week.rangeLabel}). Next entry opens ${weeklyLimit.week.nextResetLabel}.`;
      setError(msg);
      db.addNotification({
        title: 'Weekly Cool-Down Active (1/Week)',
        message: msg,
        type: 'warning',
        targetPage: 'wellness',
      });
      onNotify?.(msg, {
        title: 'Weekly Cool-Down Active',
        type: 'warning',
        targetPage: 'wellness',
        persist: false,
      });
      return;
    }

    setCheckingGate(true);
    try {
      const gate = await db.checkTournamentAntiSmurfGate(activeUser.id, tournament.id);
      if (!gate.allowed) {
        const msg = gate.message || 'Unable to verify anti-smurf eligibility for this tournament.';
        setError(msg);
        if (gate.reason === 'weekly_limit') {
          db.addNotification({
            title: 'Weekly Cool-Down Active (1/Week)',
            message: msg,
            type: 'warning',
            targetPage: 'wellness',
          });
          onNotify?.(msg, {
            title: 'Weekly Cool-Down Active',
            type: 'warning',
            targetPage: 'wellness',
            persist: false,
          });
        }
        return;
      }

      const userId = activeUser.id;
      const gamerTag = activeUser.gamerTag || 'Ethiopian Gamer';
      const cleanedSquadmates = isSquad
        ? squadMemberIds.map((s) => s.trim()).filter((s) => s.length > 0).slice(0, 3)
        : undefined;

      const res = db.registerForTournament({
        tournamentId: tournament.id,
        tournamentTitle: tournament.title,
        userId,
        gamerTag,
        gameId: tournament.gameId,
        playerId: playerId.trim(),
        teamName: isSquad ? teamName.trim() : undefined,
        entryType,
        squadMemberIds: cleanedSquadmates,
        contactNumber: contactNumber.trim(),
        status: 'confirmed',
      });

      if (res.success && res.reg) {
        db.saveUserCheckpoint(userId, {
          playerIdForGame: { gameId: tournament.gameId, playerId: playerId.trim() },
          lastPage: 'tournaments',
        });
        db.addNotification({
          title: 'Tournament Slot Confirmed',
          message: `${res.reg.confirmationCode || 'Confirmed'} • Slot #${res.reg.slotNumber || '-'} for ${tournament.title} (${tournament.date} ${tournament.startTime}).`,
          type: 'success',
          targetPage: 'profile',
        });
        onSuccess(res.message);
        setConfirmedReg(res.reg);
      } else {
        setError(res.message);
      }
    } finally {
      setCheckingGate(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-md" onClick={onClose} aria-hidden="true" />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tourney-reg-title"
        tabIndex={-1}
        className="relative z-10 w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-white/10 bg-ink-900 shadow-2xl overflow-hidden my-auto focus:outline-none"
      >
        <div className="shrink-0 flex items-center justify-between gap-3 border-b border-white/10 p-4 sm:p-5 bg-gradient-to-r from-primary-500/10 via-transparent to-accent-500/10">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary-400 block">
              {confirmedReg ? 'Official Slot Pass Issued' : 'Free Competition Registration'}
            </span>
            <h3 id="tourney-reg-title" className="font-display text-base sm:text-lg font-bold text-white truncate">
              {tournament.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close tournament registration modal"
            className="shrink-0 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {confirmedReg ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
            <div className="rounded-2xl border border-emerald-400/40 bg-gradient-to-br from-emerald-500/15 via-primary-500/10 to-ink-950 p-5 text-center space-y-3">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3 py-0.5 text-[11px] font-black uppercase tracking-wider text-emerald-300">
                  <Sparkles className="h-3 w-3" /> Registration Confirmation Badge
                </span>
                <h4 className="mt-2 font-display text-xl font-extrabold text-white">
                  Slot #{confirmedReg.slotNumber ?? '-'} / {tournament.capacity} Locked In
                </h4>
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                <span className="rounded-xl border border-primary-400/40 bg-ink-950/80 px-4 py-2 font-mono text-base font-black tracking-wider text-primary-300">
                  {confirmedReg.confirmationCode || 'CONFIRMED'}
                </span>
                {confirmedReg.confirmationCode && (
                  <button
                    type="button"
                    onClick={() => handleCopyCode(confirmedReg.confirmationCode!)}
                    className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedCode ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Entry Format:</span>
                <span className="font-bold text-white uppercase">{confirmedReg.entryType || 'solo'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Captain Gamer Tag:</span>
                <span className="font-bold text-white">{confirmedReg.gamerTag}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">In-Game Player ID:</span>
                <span className="font-mono font-bold text-primary-300">{confirmedReg.playerId}</span>
              </div>
              {confirmedReg.teamName && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Squad Name:</span>
                  <span className="font-bold text-amber-300">{confirmedReg.teamName}</span>
                </div>
              )}
              {confirmedReg.squadMemberIds && confirmedReg.squadMemberIds.length > 0 && (
                <div className="pt-1 border-t border-white/10">
                  <span className="text-slate-400 block mb-1">Registered Squadmate IDs:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {confirmedReg.squadMemberIds.map((id, i) => (
                      <span
                        key={`${id}-${i}`}
                        className="rounded-lg bg-white/5 border border-white/10 px-2 py-0.5 font-mono text-[11px] text-slate-200"
                      >
                        #{i + 2}: {id}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-primary-400/30 bg-primary-500/10 p-3.5 flex items-start gap-2.5 text-xs text-primary-100">
              <KeyRound className="h-4 w-4 shrink-0 text-primary-300 mt-0.5" />
              <span>
                Custom Room ID &amp; Password unlock automatically inside your <strong>Profile &rarr; Tournaments</strong> tab and the <strong>Tournament Bracket</strong> modal prior to kickoff ({tournament.startTime}).
              </span>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto rounded-xl bg-primary-500 px-6 py-2.5 text-sm font-bold text-ink-950 hover:bg-primary-400 shadow-glow cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => void handleRegister(e)} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
            <div className="rounded-xl border border-success-500/30 bg-success-500/10 p-3 flex items-center gap-2.5 text-xs text-success-300">
              <ShieldCheck className="h-4 w-4 shrink-0 text-success-400" aria-hidden="true" />
              <span>100% Free Entry • No credit card, no wagering • {tournament.registeredCount}/{tournament.capacity} slots filled.</span>
            </div>

            {/* Suspension & Identity Verification Security Gate */}
            {activeUser?.isBanned ? (
              <div className="rounded-xl border border-error-500/45 bg-error-500/15 p-3.5 flex items-start gap-2.5 text-xs text-error-200">
                <Ban className="h-4 w-4 text-error-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block">Account Suspended from Tournaments</span>
                  <span className="text-[11px] text-error-200/90">
                    {activeUser.banReason || 'Contact GameZoneET moderation desk for review.'}
                  </span>
                </div>
              </div>
            ) : activeUser?.id && activeUser.identityVerified ? (
              <div className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 p-3 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-200 block">
                      Verified ID Gate Passed ({activeUser.identityType === 'passport' ? 'Passport Only' : 'Ethiopian Digital ID Only'})
                    </span>
                    <span className="text-[11px] font-mono text-emerald-300/90">
                      {activeUser.identityMasked || 'Ethiopian Digital ID'} • Anti-Smurf HWID Checked
                    </span>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-300">
                  Verified ID
                </span>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-400/45 bg-amber-500/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <Fingerprint className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">
                      Identity Verification Gate Required
                    </span>
                    <span className="text-[11px] text-amber-100/90">
                      Bind your Ethiopian Fayda NID, FIDO Passkey, or Passport once to unlock fair-play tournament entries.
                    </span>
                  </div>
                </div>
                {activeUser?.id && (
                  <button
                    type="button"
                    onClick={() => setVerifyModalOpen(true)}
                    className="shrink-0 rounded-lg bg-amber-400 px-3 py-1.5 text-[11px] font-black text-ink-950 hover:bg-amber-300 cursor-pointer"
                  >
                    Verify ID Now
                  </button>
                )}
              </div>
            )}

            {weeklyLimit.limited && (
              <div
                role="status"
                className="rounded-xl border border-amber-400/45 bg-amber-500/12 p-3.5 flex items-start gap-2.5 text-xs text-amber-100"
              >
                <CalendarClock className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1">
                  <span className="font-bold text-white block">
                    Weekly Cool-Down Limit Active (1 Tournament / Mon–Sun)
                  </span>
                  <p className="text-[11px] text-amber-100/90 leading-relaxed">
                    You already hold a verified spot in{' '}
                    <strong className="text-white">{weeklyLimit.activeReg?.tournamentTitle}</strong>{' '}
                    for {weeklyLimit.week.rangeLabel}. To prevent player burnout and ensure fair squad spots, your next tournament registration unlocks{' '}
                    <strong className="text-amber-200">{weeklyLimit.week.nextResetLabel}</strong>.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div
                id="reg-form-error"
                role="alert"
                aria-live="assertive"
                className="rounded-xl border border-error-500/40 bg-error-500/10 p-3 flex items-center gap-2 text-xs text-error-300"
              >
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {/* Solo vs Squad Entry Mode Selector */}
            <div>
              <span id="reg-type-label" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Registration Type
              </span>
              <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="reg-type-label">
                <button
                  type="button"
                  aria-pressed={entryType === 'solo'}
                  disabled={!allowToggle && tournament.entryMode === 'squad'}
                  onClick={() => setEntryType('solo')}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                    entryType === 'solo'
                      ? 'border-primary-400 bg-primary-500/20 text-white'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <User className="h-3.5 w-3.5" aria-hidden="true" /> Solo Player
                </button>
                <button
                  type="button"
                  aria-pressed={entryType === 'squad'}
                  disabled={!allowToggle && tournament.entryMode === 'solo'}
                  onClick={() => setEntryType('squad')}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                    entryType === 'squad'
                      ? 'border-accent-400 bg-accent-500/20 text-white'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" aria-hidden="true" /> Squad / Team
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="reg-gamer-tag" className="block text-xs font-semibold text-slate-300 mb-1">
                Gamer Tag / Captain Username
              </label>
              <input
                id="reg-gamer-tag"
                type="text"
                disabled
                value={currentUser?.gamerTag || 'Guest Player (Sign in to save)'}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300 cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="reg-player-id" className="block text-xs font-semibold text-slate-300 mb-1">
                {isSquad ? 'Captain In-Game Player ID' : 'In-Game Player ID'} <span className="text-primary-400">*</span>
              </label>
              <input
                id="reg-player-id"
                type="text"
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                aria-required="true"
                aria-invalid={Boolean(error && !playerId.trim())}
                aria-describedby={error ? 'reg-player-id-hint reg-form-error' : 'reg-player-id-hint'}
                placeholder="e.g. 829471923"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-primary-400 focus:outline-none"
              />
              <p id="reg-player-id-hint" className="text-[11px] text-slate-500 mt-1">
                Must match your in-game {tournament.gameName} profile for room validation.
              </p>
            </div>

            {isSquad && (
              <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                <div>
                  <label htmlFor="reg-team-name" className="block text-xs font-semibold text-slate-300 mb-1">
                    Squad / Team Name <span className="text-primary-400">*</span>
                  </label>
                  <input
                    id="reg-team-name"
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    aria-required="true"
                    aria-invalid={Boolean(error && isSquad && !teamName.trim())}
                    aria-describedby={error ? 'reg-form-error' : undefined}
                    placeholder="e.g. Addis Apex Predators"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white focus:border-primary-400 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-slate-300">
                      Squadmate Player IDs (Optional, up to 3)
                    </span>
                    {squadMemberIds.length < 3 && (
                      <button
                        type="button"
                        onClick={handleAddSquadmate}
                        className="inline-flex min-h-[28px] items-center gap-1 rounded-lg bg-primary-500/15 border border-primary-400/30 px-2.5 py-1 text-[11px] font-bold text-primary-300 hover:bg-primary-500/25 cursor-pointer"
                      >
                        <Plus className="h-3 w-3" aria-hidden="true" /> Add Teammate
                      </button>
                    )}
                  </div>
                  {squadMemberIds.length === 0 ? (
                    <p className="text-[11px] text-slate-500">
                      Add teammates now or finalize roster in the check-in lobby.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {squadMemberIds.map((memberId, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            id={`reg-squadmate-${idx}`}
                            type="text"
                            value={memberId}
                            onChange={(e) => handleUpdateSquadmate(idx, e.target.value)}
                            aria-label={`Squadmate #${idx + 2} Player ID`}
                            placeholder={`Squadmate #${idx + 2} Player ID`}
                            className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-mono text-white focus:border-primary-400 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveSquadmate(idx)}
                            aria-label={`Remove squadmate ${idx + 2}`}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:text-error-400 hover:bg-white/5 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="reg-contact" className="block text-xs font-semibold text-slate-300 mb-1">
                Telegram or Mobile Phone (For Room ID &amp; Password) <span className="text-primary-400">*</span>
              </label>
              <input
                id="reg-contact"
                type="text"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                aria-required="true"
                aria-describedby="reg-contact-hint"
                placeholder="@your_telegram or 0911234567"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white focus:border-primary-400 focus:outline-none"
              />
              <p id="reg-contact-hint" className="text-[11px] text-slate-500 mt-1">
                Used for room ID &amp; passcode drops before match lock-in.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={checkingGate || Boolean(activeUser?.isBanned)}
                className="flex items-center gap-2 rounded-xl bg-primary-500 px-6 py-2.5 text-sm font-bold text-ink-950 hover:bg-primary-400 disabled:opacity-50 transition-colors shadow-glow cursor-pointer"
              >
                {checkingGate ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Checking Anti-Smurf Gate...
                  </>
                ) : !activeUser?.identityVerified && activeUser?.id ? (
                  'Verify ID & Register'
                ) : (
                  'Confirm Free Registration'
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      <IdentityVerificationModal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        currentUser={activeUser}
        onVerified={(updatedUser) => {
          setVerifiedSnapshot(updatedUser);
          setError('');
          setVerifyModalOpen(false);
        }}
        onWarning={(msg, severe) => {
          onNotify?.(msg, {
            title: severe ? 'Account Restricted' : 'Security Warning: ID Name Mismatch',
            type: severe ? 'error' : 'warning',
            persist: false,
          });
        }}
      />
    </div>
  );
}

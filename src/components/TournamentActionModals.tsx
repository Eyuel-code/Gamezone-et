import { useRef, useState } from 'react';
import { X, Send, AlertTriangle } from 'lucide-react';
import { db } from '@/services/db';
import { useAccessibleModal } from '@/hooks/useAccessibleModal';

interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
  tournamentId: string;
  currentUser: any;
  onSuccess: (msg: string) => void;
}

export function MatchResultModal({
  isOpen,
  onClose,
  matchId,
  tournamentId,
  currentUser,
  onSuccess,
}: ResultModalProps) {
  const [score, setScore] = useState('7 - 5');
  const [proofNote, setProofNote] = useState('Bermuda custom room finished. Opponent conceded round 12.');
  const modalRef = useRef<HTMLDivElement>(null);

  useAccessibleModal(isOpen, onClose, modalRef);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    db.submitMatchResult(matchId, tournamentId, currentUser?.gamerTag || 'Guest Player', score, proofNote);
    onSuccess('Match result submitted! Pending administrator verification.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-md" onClick={onClose} aria-hidden="true" />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-result-modal-title"
        tabIndex={-1}
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-ink-900 shadow-2xl p-5 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 id="match-result-modal-title" className="font-display font-bold text-white text-base">
            Submit Match Result
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close match result modal"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="match-final-score" className="block text-xs font-semibold text-slate-300 mb-1">
              Final Score
            </label>
            <input
              id="match-final-score"
              type="text"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="e.g. 7 - 5"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-400"
            />
          </div>

          <div>
            <label htmlFor="match-proof-note" className="block text-xs font-semibold text-slate-300 mb-1">
              Verification Note / Match Details
            </label>
            <textarea
              id="match-proof-note"
              rows={3}
              value={proofNote}
              onChange={(e) => setProofNote(e.target.value)}
              placeholder="Provide notes or link to screenshot proof..."
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer">
              Cancel
            </button>
            <button type="submit" className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-500 font-bold text-xs text-ink-950 hover:bg-primary-400 cursor-pointer">
              <Send className="h-3.5 w-3.5" aria-hidden="true" /> Submit for Review
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
  tournamentId: string;
  currentUser: any;
  onSuccess: (msg: string) => void;
}

export function TournamentDisputeModal({
  isOpen,
  onClose,
  matchId,
  tournamentId,
  currentUser,
  onSuccess,
}: DisputeModalProps) {
  const [reason, setReason] = useState('Opponent Did Not Join Room');
  const [description, setDescription] = useState('Waited 10 minutes in the custom room lobby, opponent never responded on Telegram.');
  const modalRef = useRef<HTMLDivElement>(null);

  useAccessibleModal(isOpen, onClose, modalRef);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    db.reportDispute(
      matchId,
      tournamentId,
      currentUser?.gamerTag || 'Guest Player',
      reason,
      description,
      currentUser?.id
    );
    onSuccess('Dispute report filed. GameZoneET tournament committee will inspect within 15 minutes.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-md" onClick={onClose} aria-hidden="true" />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dispute-modal-title"
        tabIndex={-1}
        className="relative z-10 w-full max-w-md rounded-2xl border border-error-500/30 bg-ink-900 shadow-2xl p-5 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-error-400">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <h3 id="dispute-modal-title" className="font-display font-bold text-white text-base">
              File Tournament Dispute
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dispute modal"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="dispute-reason" className="block text-xs font-semibold text-slate-300 mb-1">
              Reason for Dispute
            </label>
            <select
              id="dispute-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-ink-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-error-400"
            >
              <option value="Opponent Did Not Join Room">Opponent Did Not Join Room (5+ min timeout)</option>
              <option value="Unapproved Weapon / Rule Breach">Unapproved Weapon / Rule Breach</option>
              <option value="Wrong In-Game Player ID">Wrong In-Game Player ID / Ringer Sub</option>
              <option value="Connection Drop / Severe Server Desync">Connection Drop / Severe Server Desync</option>
            </select>
          </div>

          <div>
            <label htmlFor="dispute-description" className="block text-xs font-semibold text-slate-300 mb-1">
              Description of Incident
            </label>
            <textarea
              id="dispute-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="State what occurred in the match..."
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none focus:border-error-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer">
              Cancel
            </button>
            <button type="submit" className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-error-500 font-bold text-xs text-white hover:bg-error-400 cursor-pointer">
              Submit Dispute
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

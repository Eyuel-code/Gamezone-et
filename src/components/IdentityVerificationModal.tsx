import { useState, useEffect, useRef } from 'react';
import {
  X,
  ShieldCheck,
  Fingerprint,
  IdCard,
  Globe,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileCheck2,
  Lock,
  Upload,
} from 'lucide-react';
import { useAccessibleModal } from '@/hooks/useAccessibleModal';
import { db, type UserAccount } from '@/services/db';
import {
  evaluateFuzzyNameMatch,
  generateFidoPasskeyChallengeToken,
  getCredentialCategory,
  validateIdentityFormat,
  type IdentityDocType,
} from '@/services/securityEngine';
import { maskIdentityInput } from '@/utils/masking';

interface IdentityVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  onVerified?: (user: UserAccount) => void;
  onWarning?: (message: string, severe?: boolean) => void;
}

const METHOD_OPTIONS: Array<{
  id: IdentityDocType;
  categoryLabel: string;
  label: string;
  short: string;
  placeholder: string;
  hint: string;
  icon: typeof IdCard;
}> = [
  {
    id: 'fayda_national_id',
    categoryLabel: 'Ethiopian ID Only',
    label: 'Ethiopian Fayda NID',
    short: 'Fayda National ID',
    placeholder: 'e.g. 4910 2837 1940',
    hint: 'Enter your 12 to 16-digit Fayda Identification Number (FIN/FAN).',
    icon: IdCard,
  },
  {
    id: 'ethiopian_fido',
    categoryLabel: 'Ethiopian ID Only',
    label: 'Ethiopian FIDO Passkey',
    short: 'FIDO Digital ID',
    placeholder: 'e.g. ETFIDO9A28C41B7E',
    hint: 'Enter your Ethiopian FIDO Digital ID token or generate a hardware passkey challenge.',
    icon: Fingerprint,
  },
  {
    id: 'passport',
    categoryLabel: 'Passport Only',
    label: 'Passport Number',
    short: 'Passport Only',
    placeholder: 'e.g. EP1234567',
    hint: 'Enter your valid 6 to 12 character Ethiopian or international passport number.',
    icon: Globe,
  },
];

export default function IdentityVerificationModal({
  isOpen,
  onClose,
  currentUser,
  onVerified,
  onWarning,
}: IdentityVerificationModalProps) {
  const [idType, setIdType] = useState<IdentityDocType>('fayda_national_id');
  const [docFullName, setDocFullName] = useState('');
  const [identifierInput, setIdentifierInput] = useState('');
  const [docFileName, setDocFileName] = useState('');
  const [docPreviewUrl, setDocPreviewUrl] = useState('');
  const [consentChecked, setConsentChecked] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generatingFido, setGeneratingFido] = useState(false);
  const [error, setError] = useState('');
  const [warningNotice, setWarningNotice] = useState('');
  const [verifiedSuccess, setVerifiedSuccess] = useState<UserAccount | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useAccessibleModal(isOpen, onClose, dialogRef);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setWarningNotice('');
      setDocFullName('');
      setIdentifierInput('');
      setDocFileName('');
      setDocPreviewUrl('');
      setVerifiedSuccess(null);
      setSubmitting(false);
      setConsentChecked(true);
      if (currentUser?.identityType) {
        setIdType(currentUser.identityType);
      }
    }
  }, [isOpen, currentUser?.identityType]);

  if (!isOpen) return null;

  const isAlreadyLockedVerified = Boolean(currentUser?.identityVerified && currentUser?.identityHash);
  const activeMethod = METHOD_OPTIONS.find((m) => m.id === idType) || METHOD_OPTIONS[0];
  const activeCategory = getCredentialCategory(idType);
  const liveFormatCheck = identifierInput.trim()
    ? validateIdentityFormat(idType, identifierInput)
    : null;
  const maskedPreview =
    identifierInput.trim().length >= 4 ? maskIdentityInput(idType, identifierInput) : '';

  const accountRefName = (currentUser?.fullName || currentUser?.gamerTag || '').trim();
  const liveNameMatch =
    docFullName.trim().length >= 2 && accountRefName
      ? evaluateFuzzyNameMatch(accountRefName, docFullName)
      : null;

  const currentWarningsCount = currentUser?.identityMismatchWarnings || 0;

  const handleGenerateFido = async () => {
    setError('');
    setGeneratingFido(true);
    try {
      const token = await generateFidoPasskeyChallengeToken(currentUser?.gamerTag || 'Player');
      setIdentifierInput(token);
    } finally {
      setGeneratingFido(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError('Document scan preview must be under 4 MB.');
      return;
    }
    setError('');
    setDocFileName(file.name);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setDocPreviewUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setDocPreviewUrl('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setWarningNotice('');
    if (!currentUser?.id) {
      setError('Please sign in first to bind your verified identity.');
      return;
    }
    if (isAlreadyLockedVerified) {
      setError('Your account already has a single exclusive credential bound. Contact an admin to revoke it first.');
      return;
    }
    if (!docFullName.trim() || docFullName.trim().length < 2) {
      setError('Please enter the full legal name printed on your Passport or Ethiopian ID.');
      return;
    }
    if (!consentChecked) {
      setError('Please confirm single-account identity binding policy before continuing.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await db.verifyAndBindUserIdentity(
        currentUser.id,
        idType,
        identifierInput,
        docFullName,
        {
          ethiopianIdValue: activeCategory === 'ethiopian_id' ? identifierInput : '',
          passportValue: activeCategory === 'passport' ? identifierInput : '',
        }
      );

      if (res.success && res.user) {
        setVerifiedSuccess(res.user);
        onVerified?.(res.user);
      } else if (res.warningTriggered) {
        setWarningNotice(res.message);
        onWarning?.(res.message, res.blockedAccount);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete identity verification.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-ink-950/85 backdrop-blur-md" onClick={onClose} aria-hidden="true" />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="id-verify-modal-title"
        tabIndex={-1}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-primary-400/30 bg-ink-900 shadow-2xl overflow-hidden my-6 focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-5 bg-gradient-to-r from-primary-500/15 via-emerald-500/10 to-accent-500/10">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-500/20 border border-primary-400/40 text-primary-300">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary-300 block">
                Anti-Smurf Exclusive Identity Gate
              </span>
              <h3 id="id-verify-modal-title" className="font-display text-lg font-extrabold text-white">
                Ethiopian Digital ID OR Passport
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close identity verification modal"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {verifiedSuccess ? (
          <div className="p-6 space-y-5 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 shadow-glow">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3 py-0.5 text-[11px] font-black uppercase tracking-wider text-emerald-300">
                <Sparkles className="h-3 w-3" /> Verified ID Active
              </span>
              <h4 className="font-display text-xl font-extrabold text-white">
                Identity Cryptographically Bound
              </h4>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                Your single exclusive credential ({verifiedSuccess.identityMasked}) is SHA-256 hashed and deduplicated across GameZoneET tournaments.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-ink-950/75 p-4 text-left text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Account</span>
                <span className="font-bold text-white">{verifiedSuccess.gamerTag}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Exclusive Credential Type</span>
                <span className="font-bold text-primary-300">
                  {verifiedSuccess.identityType === 'passport' ? 'Passport Only' : 'Ethiopian Digital ID Only'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Masked Reference</span>
                <span className="font-mono font-bold text-emerald-300">
                  {verifiedSuccess.identityMasked}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Verification Hash</span>
                <span className="font-mono text-primary-300">
                  {verifiedSuccess.identityHash
                    ? `${verifiedSuccess.identityHash.slice(0, 10)}...${verifiedSuccess.identityHash.slice(-6)}`
                    : 'SHA-256'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-primary-500 px-6 py-2.5 text-sm font-bold text-ink-950 hover:bg-primary-400 shadow-glow cursor-pointer"
            >
              Continue to GameZoneET
            </button>
          </div>
        ) : isAlreadyLockedVerified && currentUser ? (
          <div className="p-6 space-y-4">
            <div className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 p-4 flex items-start gap-3 text-xs">
              <Lock className="h-4 w-4 text-emerald-300 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-white block">
                  Single Exclusive Credential Locked
                </span>
                <p className="text-slate-300 leading-relaxed">
                  Your account is already exclusively verified with{' '}
                  <strong className="text-emerald-300">
                    {currentUser.identityType === 'passport'
                      ? 'Passport Only'
                      : 'Ethiopian Digital / National ID Only'}
                  </strong>
                  . Binding a second credential or switching document types is blocked unless an administrator revokes your existing verification.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-ink-950/75 p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Masked Reference</span>
                <span className="font-mono font-bold text-emerald-300">
                  {currentUser.identityMasked || 'Verified'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Bound On</span>
                <span className="text-slate-200">{currentUser.identityVerifiedAt || 'Active'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">SHA-256 Hash</span>
                <span className="font-mono text-primary-300">
                  {currentUser.identityHash
                    ? `${currentUser.identityHash.slice(0, 10)}...${currentUser.identityHash.slice(-6)}`
                    : 'SHA-256'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-primary-500 px-6 py-2.5 text-sm font-bold text-ink-950 hover:bg-primary-400 shadow-glow cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="rounded-xl border border-primary-400/30 bg-primary-500/10 p-3 flex items-start gap-2.5 text-xs text-primary-100">
              <Lock className="h-4 w-4 text-primary-300 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                <strong>Strict XOR Policy:</strong> Submit <strong>either</strong> an Ethiopian National/FIDO ID <strong>or</strong> a Passport — strictly not both. Raw numbers are never stored; only salted SHA-256 hashes are retained.
              </span>
            </div>

            {(warningNotice || currentWarningsCount > 0) && (
              <div
                role="alert"
                aria-live="assertive"
                className={`rounded-xl border p-3 flex items-start gap-2.5 text-xs ${
                  currentUser?.isBanned
                    ? 'border-error-500/50 bg-error-500/15 text-error-200'
                    : 'border-amber-400/50 bg-amber-500/15 text-amber-100'
                }`}
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300 mt-0.5" aria-hidden="true" />
                <div>
                  <span className="font-bold text-white block">
                    {warningNotice
                      ? 'Security Warning: Identity Name Mismatch'
                      : `Active Name Mismatch Strikes: ${currentWarningsCount}/3`}
                  </span>
                  <span>
                    {warningNotice ||
                      'Repeated submissions with a name that differs from your registered profile will flag and suspend your account.'}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div
                id="identity-form-error"
                role="alert"
                aria-live="assertive"
                className="rounded-xl border border-error-500/40 bg-error-500/10 p-3 flex items-start gap-2 text-xs text-error-200"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-error-400 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {/* Verification Method Tabs (Mutually Exclusive) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-300">
                  Choose ONE Credential Type <span className="text-primary-400">*</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-300">
                  {activeMethod.categoryLabel}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Exclusive identity verification method">
                {METHOD_OPTIONS.map((m) => {
                  const Icon = m.icon;
                  const active = idType === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => {
                        setIdType(m.id);
                        setError('');
                        setWarningNotice('');
                        setIdentifierInput('');
                      }}
                      className={`flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2.5 text-center transition-all cursor-pointer ${
                        active
                          ? 'border-primary-400 bg-primary-500/20 text-white shadow-glow'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${active ? 'text-primary-300' : 'text-slate-400'}`} />
                      <span className="text-[11px] font-bold leading-tight">{m.short}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Full Name on Document (Fuzzy-Matched Against Account Name) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="identity-doc-fullname" className="text-xs font-semibold text-slate-300">
                  Full Name Printed on ID / Passport <span className="text-primary-400">*</span>
                </label>
                {accountRefName && (
                  <span className="text-[10px] text-slate-400 truncate max-w-[190px]">
                    Account: <strong className="text-slate-200">{accountRefName}</strong>
                  </span>
                )}
              </div>
              <input
                id="identity-doc-fullname"
                type="text"
                autoComplete="off"
                aria-required="true"
                aria-invalid={Boolean((error && !docFullName.trim()) || (liveNameMatch && !liveNameMatch.matched))}
                aria-describedby={error ? 'identity-fullname-hint identity-form-error' : 'identity-fullname-hint'}
                value={docFullName}
                onChange={(e) => {
                  setDocFullName(e.target.value);
                  if (error) setError('');
                  if (warningNotice) setWarningNotice('');
                }}
                placeholder="e.g. Abebe Tadesse Bikila"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-primary-400 focus:outline-none"
              />
              <div id="identity-fullname-hint" className="mt-1.5 text-[11px]" aria-live="polite">
                {liveNameMatch ? (
                  liveNameMatch.matched ? (
                    <span className="text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      Matches account name ({Math.round(liveNameMatch.score * 100)}% • case, spacing &amp; middle-name variants accepted).
                    </span>
                  ) : (
                    <span className="text-amber-300 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      Major mismatch vs &ldquo;{accountRefName}&rdquo; — submitting triggers a Security Warning.
                    </span>
                  )
                ) : (
                  <span className="text-slate-400">
                    Case, spacing, and Ethiopian middle/grandfather name variations are automatically accepted.
                  </span>
                )}
              </div>
            </div>

            {/* Identifier Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="identity-identifier-input" className="text-xs font-semibold text-slate-300">
                  {activeMethod.label} <span className="text-primary-400">*</span>
                </label>
                {idType === 'ethiopian_fido' && (
                  <button
                    type="button"
                    disabled={generatingFido}
                    onClick={() => void handleGenerateFido()}
                    className="inline-flex items-center gap-1 rounded-lg border border-primary-400/40 bg-primary-500/15 px-2.5 py-0.5 text-[11px] font-bold text-primary-200 hover:bg-primary-500/25 cursor-pointer"
                  >
                    <Fingerprint className="h-3 w-3" />
                    {generatingFido ? 'Generating...' : 'Generate FIDO Challenge Token'}
                  </button>
                )}
              </div>

              <input
                id="identity-identifier-input"
                type="text"
                autoComplete="off"
                spellCheck={false}
                aria-required="true"
                aria-invalid={Boolean(error || (liveFormatCheck && !liveFormatCheck.valid))}
                aria-describedby={error ? 'identity-identifier-hint identity-form-error' : 'identity-identifier-hint'}
                value={identifierInput}
                onChange={(e) => {
                  setIdentifierInput(e.target.value);
                  if (error) setError('');
                }}
                placeholder={activeMethod.placeholder}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 font-mono text-sm text-white focus:border-primary-400 focus:outline-none"
              />

              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span id="identity-identifier-hint" className="text-slate-400">{activeMethod.hint}</span>
                {maskedPreview && liveFormatCheck?.valid && (
                  <span className="rounded bg-emerald-500/15 border border-emerald-400/30 px-2 py-0.5 font-mono font-bold text-emerald-300">
                    Stored As: {maskedPreview}
                  </span>
                )}
              </div>
            </div>

            {/* Optional Client-Only Masked Document Scan Preview */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs">
                  <span className="font-semibold text-slate-200 block">
                    Optional Document Scan Check (Client-Only Preview)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Preview stays local in your browser and is never uploaded raw.
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  aria-label="Optional document scan preview upload"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 inline-flex min-h-[28px] items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-white/10 cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5 text-primary-400" aria-hidden="true" />
                  {docFileName ? 'Replace Scan' : 'Attach Scan'}
                </button>
              </div>

              {docFileName && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-2.5 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCheck2 className="h-4 w-4 text-emerald-300 shrink-0" />
                    <span className="truncate font-mono text-emerald-200">{docFileName}</span>
                  </div>
                  {docPreviewUrl && (
                    <img
                      src={docPreviewUrl}
                      alt="Masked local ID scan preview"
                      className="h-9 w-14 rounded object-cover blur-[2px] border border-white/20"
                      title="Locally blurred for privacy"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Single-Account Policy Checkbox */}
            <label className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-white/30 bg-ink-950 accent-primary-500"
              />
              <span>
                I confirm this identity belongs solely to me. GameZoneET blocks duplicate IDs, dual Passport+ID bypasses, and mismatched identity submissions.
              </span>
            </label>

            <div className="pt-1 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !identifierInput.trim() || !docFullName.trim() || Boolean(currentUser?.isBanned)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-xs font-bold text-ink-950 hover:bg-primary-400 disabled:opacity-45 shadow-glow cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Checking Name &amp; Dedupe...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" /> Verify &amp; Bind Identity
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}


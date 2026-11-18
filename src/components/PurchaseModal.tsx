import { useState, useEffect, useRef } from 'react';
import { useAccessibleModal } from '@/hooks/useAccessibleModal';
import {
  X,
  Smartphone,
  CreditCard,
  Building2,
  Wallet,
  Check,
  Loader2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { formatETB } from '@/data/catalog';
import type { Game } from '@/data/catalog';

interface Props {
  open: boolean;
  item: { title: string; priceETB: number } | null;
  game: Game;
  onClose: () => void;
  onConfirm: () => void;
}

const paymentMethods = [
  { id: 'telebirr', name: 'Telebirr', desc: 'Instant USSD / app', icon: Smartphone },
  { id: 'cbe', name: 'CBE Birr', desc: 'Commercial Bank', icon: Building2 },
  { id: 'chapa', name: 'Chapa', desc: 'Cards & mobile money', icon: CreditCard },
  { id: 'wallet', name: 'GameZone Wallet', desc: 'Use your balance', icon: Wallet },
];

export default function PurchaseModal({ open, item, game, onClose, onConfirm }: Props) {
  const [step, setStep] = useState<'details' | 'payment' | 'processing' | 'done'>('details');
  const [method, setMethod] = useState('telebirr');
  const [playerId, setPlayerId] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);

  useAccessibleModal(Boolean(open && item), onClose, dialogRef);

  useEffect(() => {
    if (open) {
      setStep('details');
      setPlayerId('');
      setMethod('telebirr');
    }
  }, [open]);

  if (!open || !item) return null;

  const pay = () => {
    setStep('processing');
    setTimeout(() => {
      setStep('done');
      onConfirm();
    }, 1900);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm animate-fade-up"
        onClick={onClose}
        aria-hidden="true"
        style={{ animationDuration: '0.3s' }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-modal-title"
        tabIndex={-1}
        className="glass-strong relative z-10 w-full max-w-md max-h-[90vh] flex flex-col my-auto animate-scale-in overflow-hidden rounded-2xl focus:outline-none"
      >
        {/* accent bar */}
        <div className="shrink-0 h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${game.accent}, transparent)` }} aria-hidden="true" />

        <div className="shrink-0 flex items-center justify-between gap-3 border-b border-white/10 p-4 sm:p-5">
          <div className="min-w-0">
            <h3 id="purchase-modal-title" className="font-display text-lg font-bold text-white truncate">Complete purchase</h3>
            <p className="text-xs text-slate-400 truncate">{game.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close purchase modal"
            className="shrink-0 grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto">
          {/* Order summary */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Item</span>
              <span className="text-sm font-medium text-white">{item.title}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-slate-400">Total</span>
              <span className="font-mono text-xl font-bold" style={{ color: game.accent }}>
                {formatETB(item.priceETB)}
              </span>
            </div>
          </div>

          {step === 'details' && (
            <div className="mt-5 animate-fade-up" style={{ animationDuration: '0.3s' }}>
              <label htmlFor="purchase-player-id" className="text-sm font-medium text-slate-300">In-game Player ID</label>
              <input
                id="purchase-player-id"
                type="text"
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                placeholder="e.g. 8471234567"
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-white placeholder:text-slate-600 focus:border-primary-400/50 focus:outline-none focus:ring-2 focus:ring-primary-400/20"
              />
              <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5 text-success-400" aria-hidden="true" />
                Your ID is only used to deliver the purchase securely.
              </p>
              <button
                type="button"
                disabled={playerId.trim().length < 3}
                onClick={() => setStep('payment')}
                className="btn-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue to payment
              </button>
            </div>
          )}

          {step === 'payment' && (
            <div className="mt-5 animate-fade-up" style={{ animationDuration: '0.3s' }}>
              <p className="mb-3 text-sm font-medium text-slate-300">Select payment method</p>
              <div className="space-y-2" role="group" aria-label="Payment method">
                {paymentMethods.map((m) => {
                  const Icon = m.icon;
                  const active = method === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setMethod(m.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                        active
                          ? 'border-primary-400/50 bg-primary-400/10'
                          : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                      }`}
                    >
                      <span
                        className={`grid h-10 w-10 place-items-center rounded-lg ${
                          active ? 'bg-primary-400/20 text-primary-300' : 'bg-white/5 text-slate-400'
                        }`}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-semibold text-white">{m.name}</span>
                        <span className="block text-xs text-slate-500">{m.desc}</span>
                      </span>
                      <span
                        aria-hidden="true"
                        className={`grid h-5 w-5 place-items-center rounded-full border ${
                          active ? 'border-primary-400 bg-primary-400 text-ink-950' : 'border-white/20'
                        }`}
                      >
                        {active && <Check className="h-3 w-3" />}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 flex gap-3">
                <button type="button" onClick={() => setStep('details')} className="btn-ghost flex-1">
                  Back
                </button>
                <button type="button" onClick={pay} className="btn-primary flex-1">
                  Pay {formatETB(item.priceETB)}
                </button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div role="status" aria-live="polite" className="mt-8 flex flex-col items-center py-6 text-center animate-fade-up" style={{ animationDuration: '0.3s' }}>
              <Loader2 className="h-12 w-12 animate-spin text-primary-400" aria-hidden="true" />
              <p className="mt-4 text-sm font-medium text-white">Processing payment…</p>
              <p className="mt-1 text-xs text-slate-500">Confirming via {paymentMethods.find((m) => m.id === method)?.name}</p>
            </div>
          )}

          {step === 'done' && (
            <div role="status" aria-live="polite" className="mt-8 flex flex-col items-center py-6 text-center animate-scale-in">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-success-400/15 text-success-400">
                <Check className="h-8 w-8" aria-hidden="true" />
              </div>
              <p className="mt-4 font-display text-lg font-bold text-white">Purchase complete!</p>
              <p className="mt-1 text-sm text-slate-400">{item.title} is being delivered to your account.</p>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gold-400/10 px-3 py-1.5 text-xs text-gold-200">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> You earned loyalty points
              </div>
              <button type="button" onClick={onClose} className="btn-primary mt-6 w-full">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

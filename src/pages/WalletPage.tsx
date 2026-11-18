import { useState, useEffect, useMemo } from 'react';
import { Wallet, Plus, ArrowDownLeft, ArrowUpRight, Coins, History, ShieldCheck, Smartphone, Building2, Filter } from 'lucide-react';
import Reveal from '@/components/Reveal';
import { formatETB } from '@/data/catalog';
import { db, type UserAccount, type OrderItem } from '@/services/db';

const paymentMethods = [
  { name: 'Telebirr', icon: Smartphone, desc: 'Instant deposit via USSD or app' },
  { name: 'CBE Birr', icon: Building2, desc: 'Commercial Bank of Ethiopia' },
  { name: 'Chapa', icon: Wallet, desc: 'Cards & mobile money gateway' },
];

export default function WalletPage({
  balance,
  onDeposit,
  currentUser,
  onOpenAuth,
}: {
  balance: number;
  onDeposit: (amount: number, method: 'telebirr' | 'cbe') => void;
  currentUser?: UserAccount | null;
  onOpenAuth?: () => void;
}) {
  const [txFilter, setTxFilter] = useState<string>('all');
  const [customAmount, setCustomAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState<'telebirr' | 'cbe'>(() =>
    currentUser?.lastPaymentMethod === 'cbe' ? 'cbe' : 'telebirr'
  );
  const [orders, setOrders] = useState<OrderItem[]>(() =>
    currentUser ? db.getOrdersLastTwoMonths(currentUser.id) : []
  );

  useEffect(() => {
    setOrders(currentUser ? db.getOrdersLastTwoMonths(currentUser.id) : []);
    if (currentUser?.lastPaymentMethod === 'telebirr' || currentUser?.lastPaymentMethod === 'cbe') {
      setDepositMethod(currentUser.lastPaymentMethod);
    }
    return db.subscribe(() => {
      const u = db.getCurrentUser();
      setOrders(u ? db.getOrdersLastTwoMonths(u.id) : []);
    });
  }, [currentUser]);

  const transactions = useMemo(() => {
    return orders.map((o) => {
      const isDeposit = o.gameId === 'wallet';
      return {
        type: isDeposit ? 'deposit' : 'topup',
        label: isDeposit
          ? `Wallet Deposit via ${o.paymentMethod === 'telebirr' ? 'Telebirr' : 'CBE Birr'}`
          : `${o.productName} — ${o.gameName}`,
        sub: `Ref: ${o.receiptRef} • ${o.createdAt}`,
        amount: isDeposit ? o.amountETB : -o.amountETB,
      };
    });
  }, [orders]);

  const filteredTx = transactions.filter((t) => txFilter === 'all' || t.type === txFilter);

  const txTypes = [
    { id: 'all', label: 'All (60 Days)' },
    { id: 'topup', label: 'Top-ups' },
    { id: 'deposit', label: 'Deposits' },
  ];

  const handleCustomDeposit = () => {
    const amt = parseInt(customAmount, 10);
    if (amt > 0) {
      onDeposit(amt, depositMethod);
      setCustomAmount('');
    }
  };

  return (
    <div className="relative min-h-screen pt-20">
      <section className="relative overflow-hidden py-12">
        <div className="absolute inset-0 -z-10 bg-radial-fade" />
        <div className="container-x">
          <Reveal className="text-center">
            <span className="chip border-primary-400/30 bg-primary-400/10 text-primary-200"><Wallet className="h-3.5 w-3.5" /> Wallet</span>
            <h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">Your <span className="text-gradient">GameZone wallet</span></h1>
            <p className="mt-4 text-slate-400">Deposit once, then top up and register in one tap.</p>
          </Reveal>
        </div>
      </section>

      <section className="py-6">
        <div className="container-x space-y-6">
          {!currentUser && onOpenAuth && (
            <div className="rounded-2xl border border-primary-400/30 bg-primary-500/10 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-200">
                Sign in or create an account to manage your Ethiopian Birr wallet balance and save transactions.
              </span>
              <button
                onClick={onOpenAuth}
                className="btn-primary px-4 py-2 rounded-xl font-bold shrink-0 cursor-pointer"
              >
                Sign In / Sign Up
              </button>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Balance card */}
            <Reveal className="lg:col-span-1">
              <div className="glass-strong relative overflow-hidden rounded-2xl p-4 sm:p-6">
                <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(circle at 90% 10%, rgba(0, 245, 212, 0.2), transparent 50%)' }} aria-hidden="true" />
                <p id="wallet-balance-label" className="text-sm text-slate-400">Available balance</p>
                <p
                  aria-labelledby="wallet-balance-label"
                  aria-live="polite"
                  aria-atomic="true"
                  className="mt-2 font-mono text-3xl sm:text-4xl font-bold text-white break-words"
                >
                  {formatETB(balance)}
                </p>
                <div role="group" aria-label="Select deposit payment method" className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-pressed={depositMethod === 'telebirr'}
                    onClick={() => setDepositMethod('telebirr')}
                    className={`rounded-xl border px-3 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      depositMethod === 'telebirr'
                        ? 'border-[#0091da] bg-[#0091da]/20 text-white'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5 text-[#0091da]" aria-hidden="true" /> Telebirr
                  </button>
                  <button
                    type="button"
                    aria-pressed={depositMethod === 'cbe'}
                    onClick={() => setDepositMethod('cbe')}
                    className={`rounded-xl border px-3 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      depositMethod === 'cbe'
                        ? 'border-[#a832a8] bg-[#7d1d7d]/30 text-white'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5 text-[#f08ff0]" aria-hidden="true" /> CBE Birr
                  </button>
                </div>
                <div role="group" aria-label="Quick deposit amounts" className="mt-4 flex flex-wrap gap-3">
                  {[500, 1000, 2000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => onDeposit(amt, depositMethod)}
                      aria-label={`Deposit ${formatETB(amt)} via ${depositMethod === 'telebirr' ? 'Telebirr' : 'CBE Birr'}`}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition-all hover:border-primary-300/50 hover:bg-white/10 cursor-pointer"
                    >
                      +{formatETB(amt).replace('Br ', '')}
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <label htmlFor="wallet-custom-amount" className="sr-only">
                    Custom deposit amount in Ethiopian Birr
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="wallet-custom-amount"
                      type="text"
                      inputMode="numeric"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value.replace(/[^0-9]/g, ''))}
                      aria-describedby="wallet-custom-amount-hint"
                      placeholder="Custom amount (ETB)"
                      className="w-full rounded-lg border border-white/10 bg-ink-900/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-primary-400/50 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCustomDeposit}
                      disabled={!customAmount || parseInt(customAmount, 10) <= 0}
                      aria-label="Deposit custom Birr amount"
                      className="shrink-0 rounded-lg bg-primary-400 px-4 py-2 text-sm font-semibold text-ink-950 transition-all hover:bg-primary-300 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <p id="wallet-custom-amount-hint" className="mt-1 text-[11px] text-slate-400">
                    Enter whole Ethiopian Birr amount to deposit via {depositMethod === 'telebirr' ? 'Telebirr' : 'CBE Birr'}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDeposit(1000, depositMethod)}
                  className="btn-primary mt-4 w-full cursor-pointer"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" /> Deposit Br 1,000
                </button>
                <div className="mt-6 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-slate-400"><Coins className="h-4 w-4 text-gold-400" aria-hidden="true" />All deposits &amp; top-ups are saved for 2+ months in Firestore.</div>
              </div>
            </Reveal>

            {/* Transactions */}
            <Reveal delay={120} className="lg:col-span-2">
              <div className="glass-strong rounded-2xl p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2"><History className="h-5 w-5 text-slate-400" aria-hidden="true" /><h2 className="font-display text-lg font-bold text-white">Saved Payments (Last 2 Months)</h2></div>
                  <div role="group" aria-label="Filter wallet transactions" className="flex flex-wrap items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                    {txTypes.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        aria-pressed={txFilter === t.id}
                        onClick={() => setTxFilter(t.id)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                          txFilter === t.id
                            ? 'border-primary-400/50 bg-primary-400/15 text-primary-300'
                            : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-4 divide-y divide-white/5">
                  {filteredTx.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">
                      No wallet transactions in the last 2 months. Make a deposit or complete a top-up order to see your saved history here.
                    </p>
                  ) : (
                    filteredTx.map((tx, i) => (
                      <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 py-3">
                        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tx.amount > 0 ? 'bg-success-400/10 text-success-400' : 'bg-error-400/10 text-error-400'}`}>
                          {tx.amount > 0 ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                        </span>
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white">{tx.label}</p><p className="text-xs text-slate-500 truncate">{tx.sub}</p></div>
                        <span className={`font-mono text-sm font-bold shrink-0 ${tx.amount > 0 ? 'text-success-400' : 'text-slate-300'}`}>{tx.amount > 0 ? '+' : '-'}{formatETB(Math.abs(tx.amount))}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Reveal>
          </div>

          {/* Payment methods */}
          <Reveal>
            <div className="glass rounded-2xl p-4 sm:p-6">
              <h2 className="font-display text-lg font-bold text-white">Supported payment methods</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {paymentMethods.map((m) => {
                  const Icon = m.icon;
                  return (
                    <div key={m.name} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-400/15 text-primary-300"><Icon className="h-5 w-5" /></span>
                      <div><p className="text-sm font-semibold text-white">{m.name}</p><p className="text-xs text-slate-400">{m.desc}</p></div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 flex items-center gap-2 rounded-xl border border-success-400/20 bg-success-400/5 px-4 py-3 text-xs text-slate-400">
                <ShieldCheck className="h-4 w-4 text-success-400" /> All deposits are encrypted and processed instantly. Your card details are never stored.
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

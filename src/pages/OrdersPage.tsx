import { useState, useEffect, useRef } from 'react';
import {
  ShoppingBag,
  Clock,
  Check,
  AlertCircle,
  Copy,
  Receipt,
  Search,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  Building2,
  Wallet,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';
import { formatETB } from '@/data/catalog';
import { db, type OrderItem } from '@/services/db';
import { maskPhoneNumber } from '@/utils/masking';
import { useAccessibleModal } from '@/hooks/useAccessibleModal';

export default function OrdersPage({
  onNavigateToTopUp,
}: {
  onNavigateToTopUp?: () => void;
}) {
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(() => db.getCurrentUser()?.id);
  const [timeframe, setTimeframe] = useState<'60d' | 'all'>('60d');
  const [allOrders, setAllOrders] = useState<OrderItem[]>(() =>
    db.getOrders(db.getCurrentUser()?.id)
  );
  const [orders60d, setOrders60d] = useState<OrderItem[]>(() =>
    db.getOrdersLastTwoMonths(db.getCurrentUser()?.id)
  );
  const [filter, setFilter] = useState<'all' | 'completed' | 'processing' | 'pending' | 'failed'>('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [revealOrderPhone, setRevealOrderPhone] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const receiptModalRef = useRef<HTMLDivElement>(null);

  useAccessibleModal(Boolean(selectedOrder), () => setSelectedOrder(null), receiptModalRef);

  useEffect(() => {
    const syncOrders = () => {
      const uid = db.getCurrentUser()?.id;
      setCurrentUserId(uid);
      setAllOrders(db.getOrders(uid));
      setOrders60d(db.getOrdersLastTwoMonths(uid));
    };
    syncOrders();
    return db.subscribe(syncOrders);
  }, []);

  const orders = timeframe === '60d' ? orders60d : allOrders;
  const twoMonthPaidTotal = orders60d
    .filter((o) => o.paymentStatus === 'success')
    .reduce((sum, o) => sum + (o.amountETB || 0), 0);

  const filteredOrders = orders.filter((o) => {
    const matchesFilter = filter === 'all' || o.deliveryStatus === filter || o.paymentStatus === filter;
    const matchesSearch =
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.gameName.toLowerCase().includes(search.toLowerCase()) ||
      o.productName.toLowerCase().includes(search.toLowerCase()) ||
      o.playerId.toLowerCase().includes(search.toLowerCase()) ||
      o.receiptRef.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleCopyReceipt = (o: OrderItem) => {
    const text = `GameZoneET Receipt\nRef: ${o.receiptRef}\nOrder: ${o.id}\nGame: ${o.gameName}\nProduct: ${o.productName}\nPlayer ID: ${o.playerId}\nAmount: Br ${o.amountETB}\nMethod: ${o.paymentMethod.toUpperCase()}\nStatus: ${o.paymentStatus.toUpperCase()}`;
    navigator.clipboard.writeText(text);
    setCopiedId(o.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="relative min-h-screen pt-24 pb-16">
      <div className="container-x max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 border border-primary-500/30 px-3 py-1 text-xs font-bold text-primary-300 mb-2">
              <ShoppingBag className="h-3.5 w-3.5" /> Payment Archive &amp; Receipts
            </div>
            <h1 className="font-display text-3xl font-extrabold text-white">My Top-Up &amp; Payment History</h1>
            <p className="text-xs text-slate-400 mt-1">
              Every verified payment is saved for at least the last 2 months (60+ days) so you never lose a receipt.
            </p>
          </div>

          {onNavigateToTopUp && (
            <button
              type="button"
              onClick={onNavigateToTopUp}
              className="rounded-xl bg-primary-500 px-5 py-2.5 text-xs font-bold text-ink-950 hover:bg-primary-400 transition-colors shadow-glow self-start sm:self-auto cursor-pointer"
            >
              + Top-Up Another Game
            </button>
          )}
        </div>

        {/* 2-Month Payment Retention Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Saved Payments (Last 2 Months)
            </span>
            <p className="mt-1 font-mono text-2xl font-extrabold text-white">{orders60d.length}</p>
            <span className="text-[11px] text-slate-500">Rolling 60-day transaction history</span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              2-Month Verified Volume
            </span>
            <p className="mt-1 font-mono text-2xl font-extrabold text-primary-300">{formatETB(twoMonthPaidTotal)}</p>
            <span className="text-[11px] text-slate-500">Telebirr &amp; CBE Birr completed payments</span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className={`h-3.5 w-3.5 ${currentUserId ? 'text-success-400' : 'text-gold-400'}`} />
                Persistence Status
              </span>
              <p className={`mt-1 text-sm font-bold ${currentUserId ? 'text-success-400' : 'text-gold-300'}`}>
                {currentUserId ? 'Cloud Firestore Active' : 'Local Session Only'}
              </p>
            </div>
            <span className="text-[11px] text-slate-500">
              {currentUserId
                ? 'Synced across devices & sessions'
                : 'Sign in so payments stay saved across devices'}
            </span>
          </div>
        </div>

        {/* Timeframe & Filter & Search Bar */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div role="group" aria-label="Order timeframe" className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
              <button
                type="button"
                aria-pressed={timeframe === '60d'}
                onClick={() => setTimeframe('60d')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  timeframe === '60d'
                    ? 'bg-primary-500 text-ink-950 shadow-glow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Last 2 Months ({orders60d.length})
              </button>
              <button
                type="button"
                aria-pressed={timeframe === 'all'}
                onClick={() => setTimeframe('all')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  timeframe === 'all'
                    ? 'bg-primary-500 text-ink-950 shadow-glow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Saved ({allOrders.length})
              </button>
            </div>

            <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[240px] flex-1 sm:flex-initial">
              <label htmlFor="orders-search" className="sr-only">
                Search order ID, game, player, or receipt
              </label>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                id="orders-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ID, game, player, receipt..."
                className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-primary-400"
              />
            </div>
          </div>

          <div role="group" aria-label="Filter orders by delivery status" className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Payments' },
              { id: 'completed', label: 'Completed' },
              { id: 'processing', label: 'Processing' },
              { id: 'pending', label: 'Pending' },
              { id: 'failed', label: 'Failed' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={filter === tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  filter === tab.id
                    ? 'bg-white/15 text-white border border-white/25'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-slate-500 mb-3" />
            <h3 className="font-display font-bold text-white text-base">No Saved Payments Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              You have no payments matching this filter yet. Visit Game Top-Up or Wallet to complete a Telebirr or CBE Birr payment.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const isTelebirr = order.paymentMethod === 'telebirr';
              const isWalletPay = order.paymentMethod === 'wallet';
              const isWalletDeposit = order.gameId === 'wallet';
              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 hover:border-white/20 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <span
                        className={`grid h-11 w-11 place-items-center rounded-xl shrink-0 ${
                          isWalletPay
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : isTelebirr
                            ? 'bg-[#0091da]/20 text-[#0091da]'
                            : 'bg-[#7d1d7d]/30 text-[#f08ff0]'
                        }`}
                      >
                        {isWalletPay ? (
                          <Wallet className="h-5 w-5" />
                        ) : isTelebirr ? (
                          <Smartphone className="h-5 w-5" />
                        ) : (
                          <Building2 className="h-5 w-5" />
                        )}
                      </span>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-white text-sm">
                            {order.gameName} — {order.productName}
                          </h4>
                          {isWalletDeposit && (
                            <span className="rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/30 px-2 py-0.5 text-[10px] font-bold uppercase">
                              Wallet Credit
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              order.deliveryStatus === 'completed'
                                ? 'bg-success-500/20 text-success-400 border border-success-500/30'
                                : order.deliveryStatus === 'processing'
                                ? 'bg-gold-500/20 text-gold-300 border border-gold-500/30'
                                : 'bg-error-500/20 text-error-400 border border-error-500/30'
                            }`}
                          >
                            {order.deliveryStatus}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                          <span>Order: <strong className="text-slate-200">{order.id}</strong></span>
                          <span>{isWalletDeposit ? 'Account' : 'Player ID'}: <strong className="text-primary-300 font-mono">{order.playerId}</strong></span>
                          <span>Method: <strong className="uppercase text-slate-200">{order.paymentMethod}</strong></span>
                          <span>Ref: <strong className="font-mono text-slate-300">{order.receiptRef}</strong></span>
                          <span>Date: {order.createdAt}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
                      <span className="font-mono text-base font-bold text-white">
                        {formatETB(order.amountETB)}
                      </span>

                      <div className="flex items-center gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => handleCopyReceipt(order)}
                          className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <Copy className="h-3 w-3" aria-hidden="true" />
                          {copiedId === order.id ? 'Copied' : 'Receipt'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRevealOrderPhone(false);
                            setSelectedOrder(order);
                          }}
                          className="flex items-center gap-1 rounded-lg bg-primary-500/10 border border-primary-500/30 px-2.5 py-1.5 text-[11px] font-bold text-primary-300 hover:bg-primary-500/20 transition-colors cursor-pointer"
                        >
                          Details <ChevronRight className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detailed Receipt Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-md" onClick={() => setSelectedOrder(null)} aria-hidden="true" />
            <div
              ref={receiptModalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="order-receipt-modal-title"
              tabIndex={-1}
              className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto my-auto rounded-2xl border border-white/15 bg-ink-900 shadow-2xl p-4 sm:p-6 space-y-4 focus:outline-none"
            >
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Receipt className="h-5 w-5 text-primary-400 shrink-0" aria-hidden="true" />
                  <h2 id="order-receipt-modal-title" className="font-display font-bold text-white text-base truncate">Official Payment Receipt</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  aria-label="Close receipt modal"
                  className="shrink-0 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between gap-3 py-1 border-b border-white/5">
                  <span className="text-slate-400 shrink-0">Order ID</span>
                  <span className="font-mono text-white font-semibold text-right break-all min-w-0">{selectedOrder.id}</span>
                </div>
                <div className="flex justify-between gap-3 py-1 border-b border-white/5">
                  <span className="text-slate-400 shrink-0">Receipt Reference</span>
                  <span className="font-mono text-primary-300 font-semibold text-right break-all min-w-0">{selectedOrder.receiptRef}</span>
                </div>
                <div className="flex justify-between gap-3 py-1 border-b border-white/5">
                  <span className="text-slate-400 shrink-0">Game & Item</span>
                  <span className="text-white font-semibold text-right break-words min-w-0">{selectedOrder.gameName} — {selectedOrder.productName}</span>
                </div>
                <div className="flex justify-between gap-3 py-1 border-b border-white/5">
                  <span className="text-slate-400 shrink-0">Player ID</span>
                  <span className="font-mono text-primary-300 font-semibold text-right break-all min-w-0">{selectedOrder.playerId}</span>
                </div>
                <div className="flex justify-between items-center gap-3 py-1 border-b border-white/5">
                  <span className="text-slate-400 shrink-0">Notification Phone</span>
                  <span className="flex items-center gap-2 font-mono text-slate-200 min-w-0">
                    {revealOrderPhone
                      ? selectedOrder.customerPhone
                      : maskPhoneNumber(selectedOrder.customerPhone)}
                    <button
                      type="button"
                      onClick={() => setRevealOrderPhone((v) => !v)}
                      aria-label={revealOrderPhone ? 'Hide phone number' : 'Reveal phone number'}
                      className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-sans font-bold text-slate-300 hover:text-white cursor-pointer"
                    >
                      {revealOrderPhone ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  </span>
                </div>
                <div className="flex justify-between gap-3 py-1 border-b border-white/5">
                  <span className="text-slate-400 shrink-0">Server / Zone</span>
                  <span className="text-white text-right break-words min-w-0">{selectedOrder.playerZone || 'Default Server'}</span>
                </div>
                <div className="flex justify-between gap-3 py-1 border-b border-white/5">
                  <span className="text-slate-400 shrink-0">Payment Channel</span>
                  <span className="text-white uppercase font-semibold text-right">{selectedOrder.paymentMethod}</span>
                </div>
                <div className="flex justify-between gap-3 py-1 border-b border-white/5">
                  <span className="text-slate-400 shrink-0">Total Price</span>
                  <span className="font-mono font-bold text-white text-sm text-right">{formatETB(selectedOrder.amountETB)}</span>
                </div>
                <div className="flex justify-between gap-3 py-1 border-b border-white/5">
                  <span className="text-slate-400 shrink-0">Timestamp</span>
                  <span className="text-white text-right break-words min-w-0">{selectedOrder.createdAt}</span>
                </div>
              </div>

              <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-xs text-slate-300">
                <strong className="text-white block mb-0.5">Note:</strong>
                {selectedOrder.note}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleCopyReceipt(selectedOrder)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  Copy Text
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-xl bg-primary-500 px-5 py-2 text-xs font-bold text-ink-950 hover:bg-primary-400 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useAccessibleModal } from '@/hooks/useAccessibleModal';
import {
  X,
  Smartphone,
  Building2,
  Check,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Printer,
  Copy,
  Receipt,
  Gamepad2,
  Flame,
  Crosshair,
  CircleDot,
  Info,
  Wallet,
  RotateCcw,
} from 'lucide-react';
import { formatETB } from '@/data/catalog';
import { db, type ProductItem, type OrderItem } from '@/services/db';
import { paymentProvider, type PaymentOutcome } from '@/services/payment';
import { securityEngine } from '@/services/securityEngine';
import { maskPhoneNumber } from '@/utils/masking';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGameId?: 'freefire' | 'pubg' | 'eafc';
  initialProduct?: ProductItem | null;
  onOrderCompleted?: (order: OrderItem) => void;
  onNavigateToOrders?: () => void;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  initialGameId = 'freefire',
  initialProduct = null,
  onOrderCompleted,
  onNavigateToOrders,
}: CheckoutModalProps) {
  // Step state: 1 (Game), 2 (Package), 3 (Player ID), 4 (Summary), 5 (Payment Method), 6 (Checkout & Receipt)
  const [step, setStep] = useState<number>(initialProduct ? 3 : 1);
  const [selectedGameId, setSelectedGameId] = useState<'freefire' | 'pubg' | 'eafc'>(initialGameId);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(initialProduct);

  // Player details initialized cleanly from signed-in profile if available
  const [playerId, setPlayerId] = useState('');
  const [playerZone, setPlayerZone] = useState('Africa (Addis Ababa Server)');
  const [customerPhone, setCustomerPhone] = useState(() => db.getCurrentUser()?.phone || '');
  const [customerName, setCustomerName] = useState(
    () => db.getCurrentUser()?.fullName || db.getCurrentUser()?.gamerTag || ''
  );
  const [validationError, setValidationError] = useState('');

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<'telebirr' | 'cbe' | 'wallet'>(
    () => db.getCurrentUser()?.lastPaymentMethod || 'telebirr'
  );

  // Checkout processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatusText, setProcessingStatusText] = useState('');
  const [completedOrder, setCompletedOrder] = useState<OrderItem | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  useAccessibleModal(isOpen, onClose, dialogRef);

  // Sync initial props and prefill saved user info / player IDs
  useEffect(() => {
    if (isOpen) {
      const user = db.getCurrentUser();
      const targetGameId = (initialProduct?.gameId || initialGameId) as 'freefire' | 'pubg' | 'eafc';
      if (user) {
        if (user.phone) setCustomerPhone(user.phone);
        if (user.fullName || user.gamerTag) setCustomerName(user.fullName || user.gamerTag || '');
        if (user.lastPaymentMethod) setPaymentMethod(user.lastPaymentMethod);
        const savedPid = user.savedPlayerIds?.[targetGameId];
        if (savedPid) {
          setPlayerId(savedPid);
        }
      }
      if (initialProduct) {
        setSelectedProduct(initialProduct);
        setSelectedGameId(initialProduct.gameId as 'freefire' | 'pubg' | 'eafc');
        setStep(3);
      } else {
        setSelectedGameId(initialGameId);
        setStep(1);
      }
      setValidationError('');
      setCompletedOrder(null);
      setIsProcessing(false);
    }
  }, [isOpen, initialProduct, initialGameId]);

  if (!isOpen) return null;

  const productsForGame = db.getProducts(selectedGameId);

  // Validation
  const validatePlayerDetails = () => {
    if (!playerId.trim()) {
      setValidationError('Please enter your in-game Player ID.');
      return false;
    }
    if (selectedGameId === 'freefire' && (playerId.length < 7 || !/^\d+$/.test(playerId))) {
      setValidationError('Free Fire Player ID must be numeric (7 to 11 digits).');
      return false;
    }
    if (selectedGameId === 'pubg' && (playerId.length < 8 || !/^\d+$/.test(playerId))) {
      setValidationError('PUBG Mobile Player ID must be 8 to 11 numeric digits.');
      return false;
    }
    if (!customerPhone.trim() || customerPhone.length < 9) {
      setValidationError('Please enter a valid Ethiopian mobile phone (e.g. 0911234567).');
      return false;
    }
    setValidationError('');
    return true;
  };

  // Execute Mobile Money or Wallet Payment
  const handleExecutePayment = async (overrideOutcome: PaymentOutcome = 'success') => {
    if (!selectedProduct) return;

    const currentUserForRate = db.getCurrentUser();
    const rate = securityEngine.checkRateLimit(
      { key: 'checkout-pay', maxRequests: 5, windowMs: 60_000, label: 'Mobile Money Checkout' },
      { userId: currentUserForRate?.id, gamerTag: currentUserForRate?.gamerTag }
    );
    if (!rate.allowed) {
      setValidationError(rate.message || 'Too many payment attempts. Please wait a moment.');
      setStep(5);
      return;
    }

    if (paymentMethod === 'wallet') {
      const signedInUser = db.getCurrentUser();
      if (!signedInUser) {
        setValidationError('Please sign in to pay using your GameZoneET Wallet.');
        setStep(5);
        return;
      }
      if ((signedInUser.walletBalance || 0) < selectedProduct.priceETB) {
        setValidationError(
          `Insufficient GameZoneET Wallet balance (${formatETB(signedInUser.walletBalance || 0)}). Top up your wallet or select Telebirr / CBE Birr.`
        );
        setStep(5);
        return;
      }

      setValidationError('');
      setIsProcessing(true);
      setProcessingStatusText(
        `Deducting ${formatETB(selectedProduct.priceETB)} from your GameZoneET Wallet...`
      );

      try {
        await new Promise((res) => setTimeout(res, 350));
        const freshUser = db.getUserById(signedInUser.id) || signedInUser;
        if ((freshUser.walletBalance || 0) < selectedProduct.priceETB) {
          setValidationError('Insufficient GameZoneET Wallet balance.');
          setStep(5);
          return;
        }

        // Deduct wallet balance BEFORE creating order so db.createOrder updates loyaltyPoints against updated balance
        db.updateUser({
          ...freshUser,
          walletBalance: Number(((freshUser.walletBalance || 0) - selectedProduct.priceETB).toFixed(2)),
        });

        const receiptRef = `WLT-PAY-${Date.now().toString().slice(-6)}`;
        const order = db.createOrder({
          userId: freshUser.id,
          customerName: customerName || freshUser.fullName || freshUser.gamerTag || 'Ethiopian Gamer',
          customerPhone,
          gameId: selectedGameId,
          gameName: selectedProduct.gameName,
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          playerId,
          playerZone,
          amountETB: selectedProduct.priceETB,
          paymentMethod: 'wallet',
          paymentStatus: 'success',
          deliveryStatus: 'completed',
          receiptRef,
          note: 'Paid instantaneously from GameZoneET Wallet balance.',
        });

        db.saveUserCheckpoint(freshUser.id, {
          playerIdForGame: { gameId: selectedGameId, playerId },
          phone: customerPhone,
          fullName: customerName,
          lastGameId: selectedGameId,
          lastPaymentMethod: 'wallet',
          lastPage: 'orders',
        });

        db.addNotification({
          title: 'Wallet Top-Up Confirmed',
          message: `${selectedProduct.gameName} — ${selectedProduct.name} (${formatETB(selectedProduct.priceETB)}) paid from Wallet and delivered to Player ID ${playerId}. Ref: ${receiptRef}`,
          type: 'success',
          targetPage: 'orders',
        });

        setCompletedOrder(order);
        if (onOrderCompleted) onOrderCompleted(order);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    setValidationError('');
    setIsProcessing(true);
    setProcessingStatusText(
      paymentMethod === 'telebirr'
        ? `Initiating Telebirr USSD push to ${maskPhoneNumber(customerPhone)}...`
        : 'Connecting to Commercial Bank of Ethiopia (CBE Birr)...'
    );

    try {
      const initRes = await paymentProvider.initializePayment({
        orderId: `temp-${Date.now()}`,
        amountETB: selectedProduct.priceETB,
        provider: paymentMethod,
        customerPhone,
        customerName,
        gameName: selectedProduct.gameName,
        productName: selectedProduct.name,
        playerId,
      });

      setProcessingStatusText(initRes.statusMessage);

      const res = await paymentProvider.verifyPayment(initRes.orderRef, overrideOutcome);

      const currentUser = db.getCurrentUser();

      if (res.status === 'success') {
        const order = db.createOrder({
          userId: currentUser?.id || 'guest',
          customerName: customerName || 'Ethiopian Gamer',
          customerPhone,
          gameId: selectedGameId,
          gameName: selectedProduct.gameName,
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          playerId,
          playerZone,
          amountETB: selectedProduct.priceETB,
          paymentMethod,
          paymentStatus: 'success',
          deliveryStatus: 'completed',
          receiptRef: res.receiptNumber,
          note: 'Payment verified and top-up delivered to Player ID.',
        });

        if (currentUser) {
          db.saveUserCheckpoint(currentUser.id, {
            playerIdForGame: { gameId: selectedGameId, playerId },
            phone: customerPhone,
            fullName: customerName,
            lastGameId: selectedGameId,
            lastPaymentMethod: paymentMethod,
            lastPage: 'orders',
          });
        }

        db.addNotification({
          title: 'Top-Up Payment Confirmed',
          message: `${selectedProduct.gameName} — ${selectedProduct.name} (Br ${selectedProduct.priceETB.toLocaleString()}) delivered to Player ID ${playerId}. Ref: ${res.receiptNumber}`,
          type: 'success',
          targetPage: 'orders',
        });

        setCompletedOrder(order);
        if (onOrderCompleted) onOrderCompleted(order);
      } else if (res.status === 'pending') {
        const order = db.createOrder({
          userId: currentUser?.id || 'guest',
          customerName: customerName || 'Ethiopian Gamer',
          customerPhone,
          gameId: selectedGameId,
          gameName: selectedProduct.gameName,
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          playerId,
          playerZone,
          amountETB: selectedProduct.priceETB,
          paymentMethod,
          paymentStatus: 'pending',
          deliveryStatus: 'pending',
          receiptRef: res.receiptNumber,
          note: 'USSD prompt sent to mobile. Awaiting confirmation.',
        });

        if (currentUser) {
          db.saveUserCheckpoint(currentUser.id, {
            playerIdForGame: { gameId: selectedGameId, playerId },
            phone: customerPhone,
            fullName: customerName,
            lastGameId: selectedGameId,
            lastPaymentMethod: paymentMethod,
          });
        }

        db.addNotification({
          title: 'Payment Awaiting Approval',
          message: `USSD prompt sent to ${customerPhone} for ${selectedProduct.name}. Ref: ${res.receiptNumber}`,
          type: 'warning',
          targetPage: 'orders',
        });

        setCompletedOrder(order);
      } else {
        const order = db.createOrder({
          userId: currentUser?.id || 'guest',
          customerName: customerName || 'Ethiopian Gamer',
          customerPhone,
          gameId: selectedGameId,
          gameName: selectedProduct.gameName,
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          playerId,
          playerZone,
          amountETB: selectedProduct.priceETB,
          paymentMethod,
          paymentStatus: 'failed',
          deliveryStatus: 'cancelled',
          receiptRef: res.receiptNumber,
          note: 'Payment declined or cancelled on mobile gateway.',
        });

        db.addNotification({
          title: 'Payment Declined',
          message: `${selectedProduct.name} payment (${res.receiptNumber}) was not completed.`,
          type: 'error',
          targetPage: 'orders',
        });

        setCompletedOrder(order);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyReceipt = () => {
    if (!completedOrder) return;
    const text = `GameZoneET Receipt\nRef: ${completedOrder.receiptRef}\nOrder: ${completedOrder.id}\nGame: ${completedOrder.gameName}\nItem: ${completedOrder.productName}\nPlayer ID: ${completedOrder.playerId}\nAmount: Br ${completedOrder.amountETB}\nMethod: ${completedOrder.paymentMethod.toUpperCase()}\nStatus: ${completedOrder.paymentStatus.toUpperCase()}`;
    navigator.clipboard.writeText(text);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  const gameInfo = {
    freefire: { name: 'Free Fire', icon: Flame, color: '#ff4516' },
    pubg: { name: 'PUBG Mobile', icon: Crosshair, color: '#f59e0b' },
    eafc: { name: 'EA SPORTS FC', icon: CircleDot, color: '#10b981' },
  }[selectedGameId];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-md" onClick={onClose} aria-hidden="true" />

      {/* Modal Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-modal-title"
        tabIndex={-1}
        className="relative z-10 w-full max-w-xl rounded-2xl border border-white/10 bg-ink-900 shadow-2xl overflow-hidden my-6 focus:outline-none"
      >
        {/* Top Checkout Header */}
        <div className="bg-gradient-to-r from-primary-500/20 via-primary-500/10 to-accent-500/20 border-b border-white/10 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              id="checkout-modal-title"
              className="rounded-full bg-primary-500 px-2.5 py-0.5 text-[10px] font-bold text-ink-950 uppercase tracking-wider"
            >
              GameZoneET Checkout
            </span>
            <span className="text-xs font-medium text-slate-200">
              Telebirr, CBE Birr &amp; Wallet • Instant Delivery
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout modal"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* 6-Step Visual Breadcrumbs */}
        <nav aria-label="Checkout progress" className="bg-ink-950/60 px-4 py-3 border-b border-white/5">
          <ol className="flex items-center justify-between text-xs">
            {[
              { num: 1, label: 'Game' },
              { num: 2, label: 'Package' },
              { num: 3, label: 'Player' },
              { num: 4, label: 'Summary' },
              { num: 5, label: 'Payment' },
              { num: 6, label: 'Checkout' },
            ].map((s) => (
              <li
                key={s.num}
                aria-current={step === s.num ? 'step' : undefined}
                className="flex items-center gap-1.5"
              >
                <span
                  aria-hidden="true"
                  className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold transition-all ${
                    step === s.num
                      ? 'bg-primary-500 text-ink-950 ring-2 ring-primary-400/40'
                      : step > s.num
                      ? 'bg-success-500/20 text-success-400 border border-success-500/40'
                      : 'bg-white/5 text-slate-500'
                  }`}
                >
                  {step > s.num ? <Check className="h-3 w-3" /> : s.num}
                </span>
                <span
                  className={`hidden sm:inline font-medium ${
                    step === s.num ? 'text-white' : step > s.num ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {s.label}
                </span>
                <span className="sr-only">
                  {`Step ${s.num}: ${s.label}${step === s.num ? ' (current)' : step > s.num ? ' (completed)' : ''}`}
                </span>
              </li>
            ))}
          </ol>
        </nav>

        {/* Modal Body */}
        <div className="p-5 max-h-[75vh] overflow-y-auto">
          {/* STEP 1: SELECT GAME */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-lg font-bold text-white">Step 1: Select Game</h3>
                <p className="text-xs text-slate-400">Choose the title you wish to top up in Ethiopian Birr.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'freefire', name: 'Free Fire', icon: Flame, color: '#ff4516', sub: 'Diamonds & Pass' },
                  { id: 'pubg', name: 'PUBG Mobile', icon: Crosshair, color: '#f59e0b', sub: 'UC & Royale Pass' },
                  { id: 'eafc', name: 'EA SPORTS FC', icon: CircleDot, color: '#10b981', sub: 'FC Points' },
                ].map((g) => {
                  const Icon = g.icon;
                  const active = selectedGameId === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        const gid = g.id as 'freefire' | 'pubg' | 'eafc';
                        setSelectedGameId(gid);
                        setSelectedProduct(null);
                        const savedPid = db.getCurrentUser()?.savedPlayerIds?.[gid];
                        if (savedPid) setPlayerId(savedPid);
                      }}
                      className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        active
                          ? 'border-primary-400 bg-primary-500/10 shadow-glow'
                          : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                      }`}
                    >
                      <span
                        className="grid h-10 w-10 place-items-center rounded-lg mb-3"
                        style={{ background: `${g.color}22`, color: g.color }}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="font-bold text-white text-sm">{g.name}</span>
                      <span className="text-xs text-slate-400 mt-0.5">{g.sub}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-bold text-ink-950 hover:bg-primary-400 transition-colors shadow-glow cursor-pointer"
                >
                  Continue to Packages <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SELECT PRODUCT PACKAGE */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-white">Step 2: Select Package</h3>
                  <p className="text-xs text-slate-400">Available products for {gameInfo.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="min-h-[28px] text-xs text-primary-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="h-3 w-3" aria-hidden="true" /> Change Game
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {productsForGame.map((p) => {
                  const active = selectedProduct?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedProduct(p)}
                      className={`relative flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        active
                          ? 'border-primary-400 bg-primary-500/10 ring-1 ring-primary-400 shadow-glow'
                          : 'border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.05]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{p.name}</span>
                          {p.popular && (
                            <span className="rounded bg-accent-500/20 text-accent-300 text-[10px] font-bold px-1.5 py-0.2">
                              Popular
                            </span>
                          )}
                          {p.bestValue && (
                            <span className="rounded bg-gold-500/20 text-gold-300 text-[10px] font-bold px-1.5 py-0.2">
                              Best Value
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{p.description}</p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <span className="font-mono font-bold text-white text-sm">
                          {formatETB(p.priceETB)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back
                </button>
                <button
                  type="button"
                  disabled={!selectedProduct}
                  onClick={() => setStep(3)}
                  className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-colors ${
                    selectedProduct
                      ? 'bg-primary-500 text-ink-950 hover:bg-primary-400 shadow-glow cursor-pointer'
                      : 'bg-white/10 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Enter Player Info <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: ENTER PLAYER INFORMATION */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-white">Step 3: Player Details</h3>
                  <p className="text-xs text-slate-400">Direct top-up delivery credentials for {gameInfo.name}</p>
                </div>
                <span className="text-xs text-slate-400">{selectedProduct?.name}</span>
              </div>

              {/* Safeguard Notice */}
              <div className="flex items-center gap-2.5 rounded-xl border border-primary-500/30 bg-primary-500/10 p-3 text-xs text-primary-200">
                <ShieldCheck className="h-4 w-4 text-primary-400 shrink-0" />
                <span>We only require your public Player ID. We NEVER ask for passwords, login pins, or email passwords.</span>
              </div>

              {validationError && (
                <div
                  id="checkout-validation-error"
                  role="alert"
                  aria-live="assertive"
                  className="flex items-center gap-2 rounded-xl border border-error-500/40 bg-error-500/10 p-3 text-xs text-error-300"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{validationError}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label htmlFor="checkout-player-id" className="block text-xs font-semibold text-slate-300 mb-1">
                    In-Game Player ID <span className="text-primary-400">*</span>
                  </label>
                  <input
                    id="checkout-player-id"
                    type="text"
                    value={playerId}
                    onChange={(e) => setPlayerId(e.target.value)}
                    aria-required="true"
                    aria-invalid={Boolean(validationError)}
                    aria-describedby={
                      validationError
                        ? 'checkout-player-id-hint checkout-validation-error'
                        : 'checkout-player-id-hint'
                    }
                    placeholder={selectedGameId === 'freefire' ? 'e.g. 829471923 (numeric ID)' : 'e.g. 519284710'}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
                  />
                  <p id="checkout-player-id-hint" className="text-[11px] text-slate-500 mt-1">
                    Found in your {gameInfo.name} profile header under your avatar.
                  </p>
                </div>

                <div>
                  <label htmlFor="checkout-player-zone" className="block text-xs font-semibold text-slate-300 mb-1">
                    Server / Region
                  </label>
                  <select
                    id="checkout-player-zone"
                    value={playerZone}
                    onChange={(e) => setPlayerZone(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-ink-950 px-4 py-2.5 text-sm text-white focus:border-primary-400 focus:outline-none"
                  >
                    <option value="Africa (Addis Ababa Server)">Africa (Addis Ababa Server)</option>
                    <option value="Middle East & North Africa (MENA)">Middle East &amp; North Africa (MENA)</option>
                    <option value="Europe Server">Europe Server</option>
                    <option value="Global Standard">Global Standard</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="checkout-customer-name" className="block text-xs font-semibold text-slate-300 mb-1">
                      Customer Name
                    </label>
                    <input
                      id="checkout-customer-name"
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Your name"
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white focus:border-primary-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="checkout-customer-phone" className="block text-xs font-semibold text-slate-300 mb-1">
                      Mobile Phone (for USSD prompt) <span className="text-primary-400">*</span>
                    </label>
                    <input
                      id="checkout-customer-phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      aria-required="true"
                      aria-describedby={validationError ? 'checkout-validation-error' : undefined}
                      placeholder="0911234567"
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white focus:border-primary-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (validatePlayerDetails()) setStep(4);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-bold text-ink-950 hover:bg-primary-400 transition-colors shadow-glow cursor-pointer"
                >
                  Review Order <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: ORDER SUMMARY & CONFIRMATION */}
          {step === 4 && selectedProduct && (
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-lg font-bold text-white">Step 4: Order Summary</h3>
                <p className="text-xs text-slate-400">Please verify your details before choosing payment method.</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 divide-y divide-white/5 space-y-3">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs text-slate-400">Game</span>
                  <span className="font-semibold text-white text-sm flex items-center gap-1.5">
                    <gameInfo.icon className="h-4 w-4" style={{ color: gameInfo.color }} aria-hidden="true" /> {gameInfo.name}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-slate-400">Package</span>
                  <span className="font-semibold text-white text-sm">{selectedProduct.name}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-slate-400">Player ID</span>
                  <span className="font-mono font-semibold text-primary-300 text-sm">{playerId}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-slate-400">Server</span>
                  <span className="text-xs text-slate-300">{playerZone}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-slate-400">Notification Phone</span>
                  <span className="font-mono text-xs text-slate-300">{maskPhoneNumber(customerPhone)}</span>
                </div>
                <div className="flex items-center justify-between pt-3">
                  <span className="text-sm font-semibold text-slate-200">Total Due (ETB)</span>
                  <span className="font-mono text-xl font-extrabold text-primary-400">
                    {formatETB(selectedProduct.priceETB)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Edit Player Info
                </button>
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-bold text-ink-950 hover:bg-primary-400 transition-colors shadow-glow cursor-pointer"
                >
                  Select Payment Method <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: SELECT PAYMENT METHOD */}
          {step === 5 && selectedProduct && (() => {
            const walletUser = db.getCurrentUser();
            const walletBalance = walletUser?.walletBalance ?? 0;
            const canUseWallet = Boolean(walletUser) && walletBalance >= selectedProduct.priceETB;
            return (
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-lg font-bold text-white">Step 5: Payment Method</h3>
                <p className="text-xs text-slate-400">Select Telebirr, CBE Birr, or your GameZoneET Wallet balance.</p>
              </div>

              {validationError && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="flex items-center gap-2 rounded-xl border border-error-500/40 bg-error-500/10 p-3 text-xs text-error-300"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{validationError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="group" aria-label="Payment methods">
                {/* Telebirr */}
                <button
                  type="button"
                  aria-pressed={paymentMethod === 'telebirr'}
                  onClick={() => {
                    setValidationError('');
                    setPaymentMethod('telebirr');
                  }}
                  className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    paymentMethod === 'telebirr'
                      ? 'border-[#0091da] bg-[#0091da]/15 ring-2 ring-[#0091da]/50 shadow-glow'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#0091da]/20 text-[#0091da]">
                      <Smartphone className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="rounded-full bg-[#0091da]/30 text-[#00b0ff] text-[10px] font-bold px-2 py-0.5">
                      Instant USSD
                    </span>
                  </div>
                  <span className="font-bold text-white text-base">Telebirr</span>
                  <span className="text-xs text-slate-300 mt-1">Ethio Telecom Mobile Money</span>
                  <span className="text-[11px] text-slate-400 mt-2">USSD prompt to {maskPhoneNumber(customerPhone)}</span>
                </button>

                {/* CBE Birr */}
                <button
                  type="button"
                  aria-pressed={paymentMethod === 'cbe'}
                  onClick={() => {
                    setValidationError('');
                    setPaymentMethod('cbe');
                  }}
                  className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    paymentMethod === 'cbe'
                      ? 'border-[#7d1d7d] bg-[#7d1d7d]/20 ring-2 ring-[#a832a8]/50 shadow-glow'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#7d1d7d]/30 text-[#c954c9]">
                      <Building2 className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="rounded-full bg-[#7d1d7d]/40 text-[#f08ff0] text-[10px] font-bold px-2 py-0.5">
                      Bank App
                    </span>
                  </div>
                  <span className="font-bold text-white text-base">CBE Birr</span>
                  <span className="text-xs text-slate-300 mt-1">Commercial Bank of Ethiopia</span>
                  <span className="text-[11px] text-slate-400 mt-2">Instant mobile wallet transfer</span>
                </button>

                {/* GameZoneET Wallet */}
                <button
                  type="button"
                  disabled={!canUseWallet}
                  aria-pressed={paymentMethod === 'wallet'}
                  onClick={() => {
                    if (!canUseWallet) return;
                    setValidationError('');
                    setPaymentMethod('wallet');
                  }}
                  className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                    !canUseWallet
                      ? 'border-white/5 bg-white/[0.01] opacity-60 cursor-not-allowed'
                      : paymentMethod === 'wallet'
                      ? 'border-emerald-400 bg-emerald-500/15 ring-2 ring-emerald-400/50 shadow-glow cursor-pointer'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05] cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/20 text-emerald-400">
                      <Wallet className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5">
                      {formatETB(walletBalance)}
                    </span>
                  </div>
                  <span className="font-bold text-white text-base">GZ Wallet</span>
                  <span className="text-xs text-slate-300 mt-1">GameZoneET ETB Balance</span>
                  <span className="text-[11px] text-slate-400 mt-2">
                    {!walletUser
                      ? 'Sign in to pay with Wallet'
                      : walletBalance < selectedProduct.priceETB
                      ? `Need ${formatETB(selectedProduct.priceETB - walletBalance)} more`
                      : 'Zero fee • Instant deduction'}
                  </span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (paymentMethod === 'wallet' && !canUseWallet) {
                      setValidationError(
                        !walletUser
                          ? 'Please sign in to pay with your GameZoneET Wallet.'
                          : 'Insufficient wallet balance. Select Telebirr or CBE Birr.'
                      );
                      return;
                    }
                    setStep(6);
                    void handleExecutePayment('success');
                  }}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-400 to-accent-500 px-6 py-2.5 text-sm font-bold text-ink-950 hover:brightness-110 transition-all shadow-glow cursor-pointer"
                >
                  Complete Payment <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            );
          })()}

          {/* STEP 6: PAYMENT PROCESSING & RECEIPT */}
          {step === 6 && (
            <div className="space-y-4">
              {isProcessing && (
                <div className="py-12 text-center space-y-4" role="status" aria-live="polite">
                  <Loader2 className="mx-auto h-10 w-10 text-primary-400 animate-spin" aria-hidden="true" />
                  <div>
                    <h4 className="font-display font-bold text-white text-base">Processing Mobile Money Payment</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">{processingStatusText}</p>
                  </div>
                  <div className="inline-block rounded-full bg-primary-500/10 border border-primary-500/30 px-3 py-1 text-xs text-primary-300">
                    Secured Ethiopian Mobile Money Gateway
                  </div>
                </div>
              )}

              {!isProcessing && completedOrder && (
                <div className="space-y-4 animate-scale-in">
                  {/* Status Banner */}
                  {completedOrder.paymentStatus === 'success' && (
                    <div
                      role="status"
                      aria-live="polite"
                      className="rounded-xl border border-success-500/40 bg-success-500/10 p-4 text-center"
                    >
                      <span className="inline-grid h-12 w-12 place-items-center rounded-full bg-success-500/20 text-success-400 mb-2">
                        <Check className="h-6 w-6" aria-hidden="true" />
                      </span>
                      <h4 className="font-display font-bold text-white text-lg">Payment Successful!</h4>
                      <p className="text-xs text-slate-300 mt-1">
                        Delivery to Player ID <strong className="text-primary-300">{completedOrder.playerId}</strong> is confirmed.
                      </p>
                    </div>
                  )}

                  {completedOrder.paymentStatus === 'pending' && (
                    <div className="rounded-xl border border-gold-500/40 bg-gold-500/10 p-4 text-center">
                      <span className="inline-grid h-12 w-12 place-items-center rounded-full bg-gold-500/20 text-gold-400 mb-2">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </span>
                      <h4 className="font-display font-bold text-white text-lg">Payment Pending</h4>
                      <p className="text-xs text-slate-300 mt-1">
                        USSD push confirmation is awaiting approval on your mobile device.
                      </p>
                    </div>
                  )}

                  {completedOrder.paymentStatus === 'failed' && (
                    <div className="rounded-xl border border-error-500/40 bg-error-500/10 p-4 text-center">
                      <span className="inline-grid h-12 w-12 place-items-center rounded-full bg-error-500/20 text-error-400 mb-2">
                        <AlertCircle className="h-6 w-6" />
                      </span>
                      <h4 className="font-display font-bold text-white text-lg">Payment Declined</h4>
                      <p className="text-xs text-slate-300 mt-1">
                        Transaction cancelled. You can retry anytime.
                      </p>
                    </div>
                  )}

                  {/* Official Receipt Card */}
                  <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 space-y-3 font-sans">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-primary-400" />
                        <span className="font-bold text-white text-sm">Payment Receipt</span>
                      </div>
                      <span className="text-xs font-mono text-slate-400">{completedOrder.id}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 block">Game / Package</span>
                        <span className="font-semibold text-white">{completedOrder.gameName} — {completedOrder.productName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Player ID</span>
                        <span className="font-mono font-semibold text-primary-300">{completedOrder.playerId}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Payment Method</span>
                        <span className="font-semibold text-white uppercase">{completedOrder.paymentMethod}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Receipt Reference</span>
                        <span className="font-mono text-slate-300">{completedOrder.receiptRef}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Time</span>
                        <span className="text-slate-300">{completedOrder.createdAt}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Amount Paid</span>
                        <span className="font-mono font-bold text-white text-sm">{formatETB(completedOrder.amountETB)}</span>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="pt-2 border-t border-white/10">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                        Delivery Timeline
                      </span>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-success-400 font-semibold flex items-center gap-1">
                          <Check className="h-3 w-3" /> Order Created
                        </span>
                        <span className="text-success-400 font-semibold flex items-center gap-1">
                          <Check className="h-3 w-3" /> Payment Verified
                        </span>
                        <span
                          className={`font-semibold flex items-center gap-1 ${
                            completedOrder.deliveryStatus === 'completed'
                              ? 'text-success-400'
                              : completedOrder.deliveryStatus === 'processing'
                              ? 'text-gold-300'
                              : 'text-slate-500'
                          }`}
                        >
                          <Check className="h-3 w-3" /> Delivered
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleCopyReceipt}
                      className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5" /> {copiedReceipt ? 'Copied!' : 'Copy Receipt'}
                    </button>

                    <div className="flex items-center gap-2">
                      {(completedOrder.paymentStatus === 'failed' || completedOrder.paymentStatus === 'pending') && (
                        <button
                          type="button"
                          onClick={() => {
                            setCompletedOrder(null);
                            setStep(5);
                          }}
                          className="flex items-center gap-1.5 rounded-xl border border-gold-400/40 bg-gold-500/15 px-4 py-2 text-xs font-bold text-gold-300 hover:bg-gold-500/25 cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Retry Payment
                        </button>
                      )}
                      {onNavigateToOrders && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onNavigateToOrders();
                          }}
                          className="rounded-xl border border-primary-500/40 bg-primary-500/10 px-4 py-2 text-xs font-bold text-primary-300 hover:bg-primary-500/20 cursor-pointer"
                        >
                          View in My Orders
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl bg-primary-500 px-5 py-2 text-xs font-bold text-ink-950 hover:bg-primary-400 shadow-glow cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Info, AlertTriangle, AlertCircle, X } from 'lucide-react';
import type { NotificationType } from '@/services/db';
import { useAccessibility } from '@/context/AccessibilityContext';

export interface Toast {
  id: number;
  message: string;
  title?: string;
  type?: NotificationType;
}

/**
 * Notification toast stack anchored on the bottom-left (desktop/tablet) so it never
 * overlaps the bottom-right Esports AI Assistant widget or top-right VisualAlertBanner.
 */
export default function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      role="region"
      aria-label="Notification toasts"
      aria-live="polite"
      className="fixed bottom-24 inset-x-4 sm:inset-x-auto sm:bottom-5 sm:left-5 sm:w-96 z-[80] flex flex-col gap-2.5 max-w-sm pointer-events-none"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const { reduceMotion } = useAccessibility();

  useEffect(() => {
    const removeTimer = window.setTimeout(() => onDismiss(toast.id), 4500);
    return () => {
      window.clearTimeout(removeTimer);
    };
  }, [toast.id, onDismiss]);

  const type = toast.type || 'success';
  const styleMap: Record<
    NotificationType,
    { border: string; icon: typeof CheckCircle2; color: string; badge: string; badgeBg: string }
  > = {
    success: {
      border: 'border-success-500/40',
      icon: CheckCircle2,
      color: 'text-success-400',
      badge: 'CONFIRMED',
      badgeBg: 'bg-success-500/20 text-success-300 border-success-500/40',
    },
    info: {
      border: 'border-primary-400/40',
      icon: Info,
      color: 'text-primary-400',
      badge: 'INFO ALERT',
      badgeBg: 'bg-[#00f0ff]/15 text-[#00f0ff] border-[#00f0ff]/40',
    },
    warning: {
      border: 'border-gold-400/40',
      icon: AlertTriangle,
      color: 'text-gold-400',
      badge: 'VISUAL ALERT',
      badgeBg: 'bg-gold-500/20 text-gold-300 border-gold-400/50',
    },
    error: {
      border: 'border-error-500/40',
      icon: AlertCircle,
      color: 'text-error-400',
      badge: 'ACTION NEEDED',
      badgeBg: 'bg-error-500/25 text-error-200 border-error-400/50',
    },
  };
  const cfg = styleMap[type];
  const Icon = cfg.icon;
  const isUrgent = type === 'error' || type === 'warning';

  return (
    <motion.div
      layout
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -24, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -20, scale: 0.95 }}
      transition={{ duration: reduceMotion ? 0.05 : 0.28, ease: [0.16, 1, 0.3, 1] }}
      role={isUrgent ? 'alert' : 'status'}
      aria-live={isUrgent ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={`pointer-events-auto glass-strong flex items-start gap-3 rounded-2xl border ${cfg.border} p-3.5 shadow-2xl`}
    >
      <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${cfg.color}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
          <span
            className={`rounded border px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider ${cfg.badgeBg}`}
          >
            {cfg.badge}
          </span>
          {toast.title && <p className="text-xs font-bold text-white">{toast.title}</p>}
        </div>
        <span className="text-xs sm:text-sm text-slate-200 leading-snug block">{toast.message}</span>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="ml-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/15 bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
        aria-label={`Close notification: ${toast.title || toast.message}`}
        title="Dismiss notification"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </motion.div>
  );
}

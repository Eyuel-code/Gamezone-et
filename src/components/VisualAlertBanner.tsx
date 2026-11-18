import { useState } from 'react';
import { BellRing, Check, Copy, Radio, Timer, X } from 'lucide-react';
import { useAccessibility } from '@/context/AccessibilityContext';

/**
 * Prominent visual badge + text-based pop-up container for Deaf / Hard-of-Hearing players.
 * Ensures tournament start countdown notifications and live match room code drops are
 * unmistakable visually and announced cleanly via ARIA live regions without relying on audio.
 */
export default function VisualAlertBanner() {
  const { visualAlerts, dismissVisualAlert } = useAccessibility();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (visualAlerts.length === 0) return null;

  const handleCopy = (id: string, roomId: string, roomPassword?: string) => {
    const payload = roomPassword
      ? `Room ID: ${roomId} | Password: ${roomPassword}`
      : `Room ID: ${roomId}`;
    navigator.clipboard?.writeText(payload).catch(() => {});
    setCopiedId(id);
    window.setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2200);
  };

  return (
    <section
      aria-label="Visual Match and Room Code Alerts"
      className="fixed top-20 right-4 z-[75] flex flex-col gap-3 w-[calc(100vw-2rem)] max-w-md pointer-events-none"
    >
      {visualAlerts.map((alert) => {
        const isRoomCode = alert.kind === 'room_code';
        const Icon = isRoomCode ? Radio : alert.kind === 'countdown' ? Timer : BellRing;

        return (
          <div
            key={alert.id}
            role={isRoomCode ? 'alert' : 'status'}
            aria-live={isRoomCode ? 'assertive' : 'polite'}
            aria-atomic="true"
            className={`pointer-events-auto rounded-2xl border-2 bg-[#0a0a0c]/95 backdrop-blur-xl p-4 shadow-[0_0_32px_rgba(0,240,255,0.28)] ${
              isRoomCode
                ? 'border-[#00f0ff]'
                : 'border-[#b000ff]'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                    isRoomCode
                      ? 'bg-[#00f0ff] text-[#0a0a0c]'
                      : 'bg-[#b000ff] text-white'
                  }`}
                >
                  <Icon className="h-3 w-3" aria-hidden="true" />
                  VISUAL ALERT
                </span>
                <span className="rounded-md border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  {alert.badge}
                </span>
                <span className="text-[10px] font-mono text-slate-400">{alert.timestamp}</span>
              </div>

              <button
                type="button"
                onClick={() => dismissVisualAlert(alert.id)}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
                aria-label={`Dismiss visual alert: ${alert.title}`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-2.5">
              <h4 className="font-display text-sm font-bold text-white">{alert.title}</h4>
              <p className="mt-1 text-xs leading-relaxed text-slate-200">{alert.message}</p>
            </div>

            {alert.roomId && (
              <div className="mt-3 rounded-xl border border-[#00f0ff]/45 bg-[#00f0ff]/10 p-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0 font-mono text-xs">
                  <div className="text-slate-300">
                    Room ID: <strong className="text-[#00f0ff] select-all">{alert.roomId}</strong>
                  </div>
                  {alert.roomPassword && (
                    <div className="text-slate-300 mt-0.5">
                      Passcode: <strong className="text-white select-all">{alert.roomPassword}</strong>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(alert.id, alert.roomId!, alert.roomPassword)}
                  className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-[#00f0ff] px-2.5 py-1.5 text-[11px] font-black text-[#0a0a0c] hover:brightness-110 cursor-pointer"
                  aria-label={`Copy room code ${alert.roomId}`}
                >
                  {copiedId === alert.id ? (
                    <>
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            )}

            {alert.actionLabel && alert.onAction && (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    alert.onAction?.();
                    dismissVisualAlert(alert.id);
                  }}
                  className="rounded-lg border border-[#00f0ff]/60 bg-[#00f0ff]/15 px-3 py-1.5 text-xs font-bold text-[#00f0ff] hover:bg-[#00f0ff]/25 cursor-pointer"
                >
                  {alert.actionLabel}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

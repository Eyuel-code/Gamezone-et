import { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  X,
  Minus,
  Sparkles,
  RotateCcw,
  Trophy,
  Zap,
  Gamepad2,
  AlertCircle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { PageId } from '@/hooks/useRouter';
import { db, type UserAccount } from '@/services/db';
import { ONLINE_GAMES } from '@/data/gamesCatalog';
import { useAccessibility } from '@/context/AccessibilityContext';
import { securityEngine } from '@/services/securityEngine';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isError?: boolean;
}

const QUICK_PROMPTS = [
  { label: 'Where Do I Unlock Room Codes?', prompt: 'Where do I register for free 0 ETB tournaments and unlock custom Room IDs and Passwords?' },
  { label: 'ID Verification & Fair Play', prompt: 'How do Passport vs Ethiopian National ID verification, matching names, and the 2-hour daily / 1-tournament-per-week limits work?' },
  { label: 'Telebirr & CBE Birr Guide', prompt: 'How do I navigate the Top-Up Store, pay with Telebirr or CBE Birr, and track my receipt?' },
  { label: 'In-App Arcade & Wellness', prompt: 'Where are the in-browser HTML5 games and the Mindful Companion wellness coach?' },
];

function renderInlineFormatting(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, pIdx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={pIdx} className="font-bold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={pIdx} className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-primary-300">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={pIdx}>{part}</span>;
  });
}

function formatSimpleMarkdown(text: string) {
  return text.split('\n').map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return <div key={idx} className="h-1.5" />;
    }
    if (/^-{3,}$/.test(trimmed)) {
      return <hr key={idx} className="my-1.5 border-white/10" />;
    }
    const headingMatch = trimmed.match(/^#{1,4}\s+(.+)$/);
    if (headingMatch) {
      return (
        <p key={idx} className="font-display font-bold text-primary-300 text-[12px] pt-1">
          {renderInlineFormatting(headingMatch[1])}
        </p>
      );
    }
    const isBullet = /^[-*•]\s+/.test(trimmed);
    const cleanLine = isBullet ? trimmed.replace(/^[-*•]\s+/, '') : line;

    if (isBullet) {
      return (
        <div key={idx} className="flex items-start gap-2 pl-1">
          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary-400 shrink-0" />
          <span className="flex-1">{renderInlineFormatting(cleanLine)}</span>
        </div>
      );
    }
    return <p key={idx}>{renderInlineFormatting(cleanLine)}</p>;
  });
}

export default function EsportsAiAssistant({
  currentUser,
  currentPage,
  onNavigate,
  onOpenHelp,
  helpOpen = false,
  externalPrompt,
}: {
  currentUser: UserAccount | null;
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  onOpenHelp?: () => void;
  helpOpen?: boolean;
  externalPrompt?: { text?: string; nonce: number } | null;
}) {
  const { reduceMotion, readAloud, toggleReadAloud, ttsSupported, speak, stopSpeaking } =
    useAccessibility();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        'Selam! I am your **GameZone ET Website Navigator & AI Assistant** for Addis Ababa (Finfinnee).\n\nAsk me to guide you anywhere on the site:\n- **Tournaments & Profile:** 0 ETB entry (Free Fire, PUBG, EAFC) & unlocking Room IDs/Passwords\n- **Top-Up Store:** Diamonds, UC & FC Points via Telebirr & CBE Birr\n- **In-App Arcade & Wellness:** Browser games, Mindful Companion & daily/weekly limits\n- **Fair Play & Help (`?`):** Passport or Ethiopian National ID verification rules',
      timestamp: 'Online',
    },
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const lastExternalNonceRef = useRef<number>(0);
  const sendMessageRef = useRef<(rawText: string) => Promise<void>>(async () => {});

  useEffect(() => {
    if (isOpen && !isMinimized && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, isOpen, isMinimized]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      wasOpenRef.current = true;
      const t = window.setTimeout(() => inputRef.current?.focus(), 140);
      return () => window.clearTimeout(t);
    }
    if (wasOpenRef.current && (!isOpen || isMinimized)) {
      wasOpenRef.current = false;
      window.setTimeout(() => launcherRef.current?.focus(), 40);
    }
  }, [isOpen, isMinimized]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const sendMessage = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || loading) return;

    const rate = securityEngine.checkRateLimit(
      { key: 'ai-chat-ui', maxRequests: 10, windowMs: 60_000, label: 'AI Assistant' },
      { userId: currentUser?.id, gamerTag: currentUser?.gamerTag }
    );
    if (!rate.allowed) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-rate-${Date.now()}`,
          role: 'assistant',
          content: rate.message || `Rate limit active. Please retry in ${rate.retryAfterSec}s.`,
          timestamp: 'Shield',
          isError: true,
        },
      ]);
      return;
    }

    const timeLabel = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: timeLabel,
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);

    try {
      const tournamentsSnapshot = db.getTournaments().slice(0, 8).map((t) => ({
        title: t.title,
        gameName: t.gameName,
        format: t.format,
        date: t.date,
        startTime: t.startTime,
        registeredCount: t.registeredCount,
        capacity: t.capacity,
        status: t.status,
        lobbyStatus: t.lobbyStatus,
        currentMatchLabel: t.currentMatchLabel,
        roomPublished: Boolean(t.roomCredentials?.published),
      }));

      const recentOrdersSnapshot = currentUser
        ? db.getOrders(currentUser.id).slice(0, 5).map((o) => ({
            id: o.id,
            gameName: o.gameName,
            productName: o.productName,
            paymentMethod: o.paymentMethod,
            paymentStatus: o.paymentStatus,
            deliveryStatus: o.deliveryStatus,
            receiptRef: o.receiptRef,
          }))
        : [];

      const gamesSnapshot = ONLINE_GAMES.slice(0, 10).map((g) => ({
        title: g.title,
        category: g.category,
        genre: g.genre,
      }));

      const apiMessages = nextHistory
        .filter((m) => !m.isError && m.id !== 'welcome-msg')
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          context: {
            page: currentPage,
            gamerTag: currentUser?.gamerTag,
            tournaments: tournamentsSnapshot,
            recentOrders: recentOrdersSnapshot,
            sampleBrowserGames: gamesSnapshot,
          },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After') || data?.retryAfterSec || '15';
        throw new Error(
          typeof data?.error === 'string' && data.error
            ? data.error
            : `Rate limit protection triggered. Please retry in ${retryAfter}s.`
        );
      }
      if (!res.ok) {
        throw new Error(
          typeof data?.error === 'string' && data.error
            ? data.error
            : `Assistant temporarily unavailable (HTTP ${res.status}).`
        );
      }

      const replyText = String(
        data.reply || 'I am ready to help with GameZone ET tournaments, top-ups, and games.'
      );
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: replyText,
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setMessages((prev) => [...prev, aiMsg]);
      if (readAloud) {
        speak(replyText, { interrupt: true });
      }
    } catch (err) {
      const errorText =
        err instanceof Error
          ? err.message
          : 'Unable to reach the GameZone ET Assistant right now. Please try again.';
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: errorText,
          timestamp: 'Notice',
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  sendMessageRef.current = sendMessage;

  useEffect(() => {
    if (!externalPrompt || externalPrompt.nonce <= 0) return;
    if (lastExternalNonceRef.current === externalPrompt.nonce) return;
    lastExternalNonceRef.current = externalPrompt.nonce;
    setIsOpen(true);
    setIsMinimized(false);
    const promptText = externalPrompt.text?.trim();
    if (promptText) {
      const timer = window.setTimeout(() => {
        void sendMessageRef.current(promptText);
      }, 120);
      return () => window.clearTimeout(timer);
    }
  }, [externalPrompt]);

  const handleReset = () => {
    setMessages([
      {
        id: 'welcome-msg',
        role: 'assistant',
        content:
          'Chat refreshed. Ask anything about **Free Fire / PUBG / EAFC tournaments**, **Telebirr & CBE Birr verification**, or **HTML5 browser games**!',
        timestamp: 'Online',
      },
    ]);
  };

  return (
    <>
      {/* Floating Help ("?") & Glowing AI Launcher Dock (Bottom-Right) */}
      {(!isOpen || isMinimized) && (
        <div className="fixed bottom-5 right-5 z-[70] flex items-center gap-3">
          {isMinimized && (
            <button
              type="button"
              onClick={() => {
                setIsMinimized(false);
                setIsOpen(true);
              }}
              className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-primary-400/40 bg-ink-950/85 backdrop-blur-xl px-3.5 py-2 text-xs font-bold text-white shadow-[0_0_24px_rgba(0,240,255,0.28)] cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary-400" aria-hidden="true" />
              Resume AI Support
            </button>
          )}

          {onOpenHelp && (
            <button
              type="button"
              onClick={onOpenHelp}
              aria-label="Help and Platform Guide"
              aria-expanded={helpOpen}
              title="How GameZone ET Works (Help & Guide)"
              className="btn-help-launcher group relative grid h-12 w-12 sm:h-13 sm:w-13 place-items-center rounded-full border border-sky-400/55 bg-[#0c1024]/88 backdrop-blur-xl text-white shadow-[0_0_22px_rgba(0,210,255,0.34),0_0_32px_rgba(139,92,246,0.28)] cursor-pointer"
            >
              <span
                aria-hidden="true"
                className="relative grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full bg-gradient-to-br from-[#00d2ff] via-[#3a7bd5] to-[#8b5cf6] font-display text-lg font-black text-white shadow-inner"
              >
                ?
              </span>
            </button>
          )}

          <button
            ref={launcherRef}
            type="button"
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            aria-label="Open GameZone ET AI Esports & Top-Up Assistant"
            aria-expanded={isOpen && !isMinimized}
            title="GameZone ET AI Assistant"
            className="btn-ai-launcher group relative grid h-14 w-14 place-items-center rounded-2xl border border-primary-400/55 bg-[#0c1024]/88 backdrop-blur-xl text-white shadow-[0_0_28px_rgba(0,240,255,0.42),0_0_42px_rgba(139,92,246,0.34)] cursor-pointer"
          >
            {!reduceMotion && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-tr from-[#00d2ff]/40 via-[#8b5cf6]/35 to-[#c084fc]/35 blur-md animate-pulse"
              />
            )}
            <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary-400 via-cyan-300 to-violet-500 text-ink-950 shadow-inner">
              <Bot className="h-5 w-5" aria-hidden="true" />
            </span>
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-ink-950 bg-emerald-400 shadow-[0_0_10px_#34d399]"
            />
          </button>
        </div>
      )}

      {/* Glassmorphic AI Chat Interface */}
      {isOpen && !isMinimized && (
        <section
          role="dialog"
          aria-modal="false"
          aria-labelledby="esports-ai-dialog-title"
          className="fixed bottom-5 right-5 z-[75] flex w-[calc(100vw-2rem)] sm:w-[400px] max-h-[min(600px,calc(100vh-5.5rem))] flex-col overflow-hidden rounded-3xl glass-strong border border-cyan-400/40 shadow-[0_24px_70px_-12px_rgba(4,6,17,0.95),0_0_40px_-8px_rgba(0,245,212,0.28)]"
        >
          {/* Chat Header */}
          <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-primary-500/15 via-violet-500/14 to-amber-500/10 px-4 py-3.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary-400 via-cyan-300 to-violet-500 text-ink-950 shadow-glow">
                <Bot className="h-5 w-5" aria-hidden="true" />
                <span aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#040611] bg-emerald-400" />
              </span>
              <div className="min-w-0">
                <h2 id="esports-ai-dialog-title" className="font-display text-sm font-extrabold text-white truncate flex items-center gap-1.5">
                  GameZone ET AI
                  <span className="rounded border border-primary-400/40 bg-primary-500/15 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider text-primary-300">
                    Live
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400 truncate">
                  Esports Rules • Telebirr / CBE Birr • Games
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {ttsSupported && (
                <button
                  type="button"
                  onClick={() => {
                    if (readAloud) {
                      stopSpeaking();
                    }
                    toggleReadAloud();
                  }}
                  aria-pressed={readAloud}
                  title={readAloud ? 'Disable Read AI Replies Aloud' : 'Read AI Replies Aloud'}
                  aria-label={readAloud ? 'Turn off Read AI Replies Aloud' : 'Turn on Read AI Replies Aloud'}
                  className={`grid h-8 w-8 place-items-center rounded-lg transition-colors cursor-pointer ${
                    readAloud
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                      : 'text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {readAloud ? (
                    <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={handleReset}
                title="Reset chat"
                aria-label="Reset conversation"
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                title="Minimize chat"
                aria-label="Minimize AI assistant"
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close chat"
                aria-label="Close AI assistant"
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Messages Scroll Viewport */}
          <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            aria-label="AI Assistant conversation transcript"
            className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3 text-xs"
          >
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 leading-relaxed space-y-1 ${
                      isUser
                        ? 'rounded-br-sm border border-primary-400/45 bg-gradient-to-br from-primary-500/25 via-cyan-500/20 to-violet-500/25 text-white shadow-[0_8px_24px_-8px_rgba(0,240,255,0.25)]'
                        : m.isError
                        ? 'rounded-bl-sm border border-amber-400/45 bg-amber-500/10 text-amber-100'
                        : 'rounded-bl-sm border border-white/12 bg-[#0c1024]/78 text-slate-200 shadow-sm'
                    }`}
                  >
                    {m.isError && (
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300 mb-0.5">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Assistant Notice
                      </div>
                    )}
                    <div className="space-y-1 break-words">{formatSimpleMarkdown(m.content)}</div>
                  </div>
                  <span className="mt-1 px-1 text-[10px] text-slate-400">
                    {isUser ? currentUser?.gamerTag || 'You' : 'GameZone ET AI'} &bull; {m.timestamp}
                  </span>
                </div>
              );
            })}

            {loading && (
              <div className="flex flex-col items-start" role="status" aria-live="polite">
                <div className="rounded-2xl rounded-bl-sm border border-primary-400/25 bg-[#0c1024]/82 px-3.5 py-2.5 flex items-center gap-2 text-slate-300">
                  <div className="flex items-center gap-1" aria-hidden="true">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-400 animate-bounce [animation-delay:-0.25s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:-0.12s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce" />
                  </div>
                  <span className="text-[11px] text-slate-300">Checking GameZone ET info...</span>
                </div>
              </div>
            )}

            {/* Quick Starter Prompts when conversation is fresh */}
            {messages.length <= 2 && !loading && (
              <div className="pt-1 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Quick Topics
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((qp) => (
                    <button
                      key={qp.label}
                      type="button"
                      onClick={() => void sendMessage(qp.prompt)}
                      className="rounded-xl border border-primary-400/30 bg-primary-500/10 hover:bg-primary-500/20 px-2.5 py-1.5 text-[11px] font-semibold text-primary-200 transition-colors cursor-pointer text-left"
                    >
                      {qp.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Platform Shortcuts */}
          <div className="flex items-center gap-1.5 border-t border-white/10 bg-[#0c1024]/60 px-3 py-2 text-[10px]">
            <button
              type="button"
              onClick={() => {
                onNavigate('tournaments');
                setIsMinimized(true);
              }}
              className="flex-1 min-h-[28px] inline-flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 py-1 font-semibold text-slate-300 hover:text-white hover:border-primary-400/40 cursor-pointer"
            >
              <Trophy className="h-3 w-3 text-amber-400" aria-hidden="true" /> Tournaments
            </button>
            <button
              type="button"
              onClick={() => {
                onNavigate('topup');
                setIsMinimized(true);
              }}
              className="flex-1 min-h-[28px] inline-flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 py-1 font-semibold text-slate-300 hover:text-white hover:border-primary-400/40 cursor-pointer"
            >
              <Zap className="h-3 w-3 text-primary-400" aria-hidden="true" /> Top-Ups
            </button>
            <button
              type="button"
              onClick={() => {
                onNavigate('games');
                setIsMinimized(true);
              }}
              className="flex-1 min-h-[28px] inline-flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 py-1 font-semibold text-slate-300 hover:text-white hover:border-primary-400/40 cursor-pointer"
            >
              <Gamepad2 className="h-3 w-3 text-violet-400" aria-hidden="true" /> Browser Games
            </button>
          </div>

          {/* Message Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage(input);
            }}
            className="flex items-center gap-2 border-t border-white/10 bg-ink-950/90 p-3"
          >
            <label htmlFor="ai-assistant-input" className="sr-only">
              Ask GameZone ET AI Assistant
            </label>
            <input
              ref={inputRef}
              id="ai-assistant-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about brackets, Telebirr, or games..."
              maxLength={800}
              disabled={loading}
              className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-400 focus:border-primary-400 focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-r from-primary-400 to-violet-500 text-ink-950 shadow-glow hover:brightness-110 disabled:opacity-40 cursor-pointer transition-all"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </section>
      )}
    </>
  );
}

import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  HeartHandshake,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  Wind,
} from 'lucide-react';
import { useAccessibility } from '@/context/AccessibilityContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface MindfulCompanionChatProps {
  gamerTag?: string;
  dailySecondsUsed: number;
  dailyLimitSeconds: number;
  weeklyTournamentUsed: boolean;
  externalMoodPrompt?: string | null;
  onMoodPromptConsumed?: () => void;
}

const MOOD_PRESETS: { id: string; label: string; prompt: string }[] = [
  {
    id: 'tilt',
    label: 'Tilted after a loss',
    prompt: 'I just lost a tough match and feel frustrated and tilted. Can you walk me through a quick reset?',
  },
  {
    id: 'strain',
    label: 'Tired / eye strain',
    prompt: 'My eyes and wrists feel tired after playing today. What quick stretches and eye rest should I do right now?',
  },
  {
    id: 'anxiety',
    label: 'Tournament nerves',
    prompt: 'I have match anxiety before competing. Can we do a quick breathing exercise together?',
  },
  {
    id: 'balance',
    label: 'Study vs gaming balance',
    prompt: 'How can I stick to healthy gaming limits without feeling like I am missing out on ranked progress?',
  },
];

function createWelcomeMessage(gamerTag?: string): ChatMessage {
  return {
    id: 'wellness-welcome',
    role: 'assistant',
    text: `Selam${gamerTag ? ` ${gamerTag}` : ''} — I’m **Mindful Companion**, your dedicated esports wellness coach on GameZone ET.\n\nWhether you’re cooling down after a tough loss, feeling match nerves, or noticing tired eyes and wrists, we can take 60 seconds together to breathe, ground, and reset. How are you feeling right now?`,
    timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function MindfulCompanionChat({
  gamerTag,
  dailySecondsUsed,
  dailyLimitSeconds,
  weeklyTournamentUsed,
  externalMoodPrompt,
  onMoodPromptConsumed,
}: MindfulCompanionChatProps) {
  const { reduceMotion, readAloud, toggleReadAloud, ttsSupported, speak } = useAccessibility();
  const [messages, setMessages] = useState<ChatMessage[]>(() => [createWelcomeMessage(gamerTag)]);
  const [input, setInput] = useState('');
  const [moodHint, setMoodHint] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [messages, loading, reduceMotion]);

  const sendMessage = async (textOverride?: string, selectedMood?: string) => {
    const clean = (textOverride ?? input).trim();
    if (!clean || loading) return;

    setErrorText('');
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: clean,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (!textOverride) setInput('');
    if (selectedMood) setMoodHint(selectedMood);
    setLoading(true);

    try {
      const response = await fetch('/api/wellness/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextHistory.slice(-14).map((m) => ({
            role: m.role,
            text: m.text,
          })),
          context: {
            gamerTag: gamerTag || undefined,
            moodHint: selectedMood || moodHint || undefined,
            dailySecondsUsed,
            dailyLimitSeconds,
            weeklyTournamentUsed,
          },
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.reply) {
        const msg =
          data?.error ||
          (response.status === 429
            ? 'Take a slow breath — too many messages at once. Please wait a few seconds.'
            : 'Mindful Companion is temporarily unavailable. Please try again in a moment.');
        throw new Error(msg);
      }

      const replyText = String(data.reply);
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      if (readAloud) {
        speak(replyText, { interrupt: true });
      }
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Unable to reach Mindful Companion.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (externalMoodPrompt && !loading) {
      void sendMessage(externalMoodPrompt, 'Tilt recovery prompt');
      onMoodPromptConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalMoodPrompt]);

  const handleReset = () => {
    setErrorText('');
    setMoodHint('');
    setMessages([createWelcomeMessage(gamerTag)]);
  };

  return (
    <div className="glass-strong rounded-3xl border border-emerald-400/30 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 sm:px-6 py-4 border-b border-white/10 bg-gradient-to-r from-emerald-500/12 via-cyan-500/8 to-transparent flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400/25 to-cyan-400/25 border border-emerald-400/40 text-emerald-300 shadow-glow">
            <HeartHandshake className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-extrabold text-white">
                Mindful Companion
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                <span>Dedicated Wellness AI</span>
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Guided breathing, tilt recovery, and calm check-ins after intense sessions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {ttsSupported && (
            <button
              type="button"
              onClick={toggleReadAloud}
              aria-pressed={readAloud}
              aria-label={readAloud ? 'Disable read companion replies aloud' : 'Read companion replies aloud'}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                readAloud
                  ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
                  : 'border-white/15 bg-white/5 text-slate-200 hover:text-white hover:bg-white/10'
              }`}
            >
              {readAloud ? (
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">{readAloud ? 'Voice On' : 'Read Aloud'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>New Check-In</span>
          </button>
        </div>
      </div>

      {/* Mood Check-In Buttons */}
      <div className="px-5 sm:px-6 py-3 border-b border-white/10 bg-white/[0.02] flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
          <Wind className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
          Quick check-in:
        </span>
        {MOOD_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            disabled={loading}
            onClick={() => void sendMessage(preset.prompt, preset.label)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
              moodHint === preset.label
                ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
                : 'border-white/10 bg-white/[0.04] text-slate-200 hover:border-emerald-400/40 hover:text-white'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Conversation Stream */}
      <div
        className="h-80 sm:h-96 overflow-y-auto px-5 sm:px-6 py-4 space-y-3.5"
        aria-live="polite"
        aria-label="Mindful Companion conversation"
      >
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                  isUser
                    ? 'bg-gradient-to-br from-cyan-500/25 to-primary-500/20 border border-cyan-400/35 text-white'
                    : 'bg-white/[0.045] border border-white/10 text-slate-200'
                }`}
              >
                <p>{msg.text.replace(/\*\*/g, '')}</p>
                <span className="mt-1.5 block text-[10px] text-slate-400 font-mono">
                  {isUser ? gamerTag || 'You' : 'Mindful Companion'} · {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              <span>Mindful Companion is writing a calm response...</span>
            </div>
          </div>
        )}

        {errorText && (
          <div
            role="alert"
            className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200 flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
            <span>{errorText}</span>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage();
        }}
        className="px-5 sm:px-6 py-4 border-t border-white/10 bg-ink-950/40 flex items-center gap-2.5"
      >
        <label htmlFor="mindful-companion-input" className="sr-only">
          Share how you feel with Mindful Companion
        </label>
        <input
          id="mindful-companion-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          placeholder="Tell Mindful Companion how your session feels (e.g., tilted, tired eyes, stressed)..."
          className="flex-1 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:border-emerald-400 focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send message to Mindful Companion"
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2.5 text-xs font-black text-ink-950 hover:opacity-95 disabled:opacity-45 transition-opacity cursor-pointer"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
}

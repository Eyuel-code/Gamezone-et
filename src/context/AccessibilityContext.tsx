import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type TextScaleOption = 1 | 1.125 | 1.25 | 1.5;

export interface AccessibilityPreferences {
  highContrast: boolean;
  reduceMotion: boolean;
  backgroundPaused: boolean;
  readAloud: boolean;
  textScale: TextScaleOption;
}

export interface VisualAlertItem {
  id: string;
  kind: 'room_code' | 'countdown' | 'match_alert';
  badge: string;
  title: string;
  message: string;
  roomId?: string;
  roomPassword?: string;
  tournamentTitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  timestamp: string;
}

interface AccessibilityContextValue extends AccessibilityPreferences {
  setHighContrast: (enabled: boolean) => void;
  toggleHighContrast: () => void;
  setReduceMotion: (enabled: boolean) => void;
  toggleReduceMotion: () => void;
  setBackgroundPaused: (paused: boolean) => void;
  toggleBackgroundPaused: () => void;
  setReadAloud: (enabled: boolean) => void;
  toggleReadAloud: () => void;
  setTextScale: (scale: TextScaleOption) => void;
  resetAccessibility: () => void;
  ttsSupported: boolean;
  isSpeaking: boolean;
  speak: (text: string, opts?: { interrupt?: boolean; force?: boolean }) => void;
  stopSpeaking: () => void;
  readMainContent: () => void;
  visualAlerts: VisualAlertItem[];
  pushVisualAlert: (alert: Omit<VisualAlertItem, 'id' | 'timestamp'>) => void;
  dismissVisualAlert: (id: string) => void;
  clearVisualAlerts: () => void;
}

const STORAGE_KEY = 'gz_a11y_prefs_v1';

function getSystemReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function loadInitialPreferences(): AccessibilityPreferences {
  if (typeof window === 'undefined') {
    return {
      highContrast: false,
      reduceMotion: false,
      backgroundPaused: false,
      readAloud: false,
      textScale: 1,
    };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AccessibilityPreferences>;
      const validScale: TextScaleOption =
        parsed.textScale === 1.125 ||
        parsed.textScale === 1.25 ||
        parsed.textScale === 1.5
          ? parsed.textScale
          : 1;
      return {
        highContrast: Boolean(parsed.highContrast),
        reduceMotion:
          typeof parsed.reduceMotion === 'boolean'
            ? parsed.reduceMotion
            : getSystemReducedMotion(),
        backgroundPaused: Boolean(parsed.backgroundPaused),
        readAloud: Boolean(parsed.readAloud),
        textScale: validScale,
      };
    }
  } catch {
    // Ignore storage read errors
  }
  return {
    highContrast: false,
    reduceMotion: getSystemReducedMotion(),
    backgroundPaused: false,
    readAloud: false,
    textScale: 1,
  };
}

function cleanSpeechText(raw: string): string {
  return raw
    .replace(/[*_`#>~]/g, ' ')
    .replace(/•|·|\|/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<AccessibilityPreferences>(() => loadInitialPreferences());
  const [visualAlerts, setVisualAlerts] = useState<VisualAlertItem[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const readAloudRef = useRef(prefs.readAloud);
  readAloudRef.current = prefs.readAloud;

  const ttsSupported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined';

  // Apply DOM attributes & root rem font size whenever preferences update
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.dataset.a11yContrast = prefs.highContrast ? 'high' : 'normal';
    root.dataset.a11yMotion = prefs.reduceMotion ? 'reduced' : 'full';
    root.dataset.a11yBgPaused = prefs.backgroundPaused ? 'true' : 'false';
    root.dataset.a11yScale = String(prefs.textScale);
    root.style.fontSize = `${16 * prefs.textScale}px`;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore storage write errors
    }
  }, [prefs]);

  // Cancel speech cleanly on unmount
  useEffect(() => {
    return () => {
      if (ttsSupported) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignore synthesis cancel errors
        }
      }
    };
  }, [ttsSupported]);

  const stopSpeaking = useCallback(() => {
    if (!ttsSupported) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore cancel errors
    }
    setIsSpeaking(false);
  }, [ttsSupported]);

  const speak = useCallback(
    (text: string, opts?: { interrupt?: boolean; force?: boolean }) => {
      if (!ttsSupported) return;
      if (!opts?.force && !readAloudRef.current) return;
      const cleaned = cleanSpeechText(text);
      if (!cleaned) return;
      try {
        if (opts?.interrupt !== false) {
          window.speechSynthesis.cancel();
        }
        const utterance = new SpeechSynthesisUtterance(cleaned.slice(0, 1200));
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      } catch {
        setIsSpeaking(false);
      }
    },
    [ttsSupported]
  );

  const readMainContent = useCallback(() => {
    if (!ttsSupported || typeof document === 'undefined') return;
    const main = document.getElementById('main-content');
    if (!main) return;
    const heading = main.querySelector('h1, h2')?.textContent?.trim() || 'GameZone ET';
    const visibleText = (main.innerText || main.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 950);
    speak(`${heading}. ${visibleText}`, { interrupt: true, force: true });
  }, [speak, ttsSupported]);

  const setHighContrast = useCallback((highContrast: boolean) => {
    setPrefs((prev) => ({ ...prev, highContrast }));
  }, []);

  const toggleHighContrast = useCallback(() => {
    setPrefs((prev) => ({ ...prev, highContrast: !prev.highContrast }));
  }, []);

  const setReduceMotion = useCallback((reduceMotion: boolean) => {
    setPrefs((prev) => ({ ...prev, reduceMotion }));
  }, []);

  const toggleReduceMotion = useCallback(() => {
    setPrefs((prev) => ({ ...prev, reduceMotion: !prev.reduceMotion }));
  }, []);

  const setBackgroundPaused = useCallback((backgroundPaused: boolean) => {
    setPrefs((prev) => ({ ...prev, backgroundPaused }));
  }, []);

  const toggleBackgroundPaused = useCallback(() => {
    setPrefs((prev) => ({ ...prev, backgroundPaused: !prev.backgroundPaused }));
  }, []);

  const setReadAloud = useCallback(
    (readAloud: boolean) => {
      setPrefs((prev) => ({ ...prev, readAloud }));
      if (!readAloud) {
        stopSpeaking();
      }
    },
    [stopSpeaking]
  );

  const toggleReadAloud = useCallback(() => {
    setPrefs((prev) => {
      const next = !prev.readAloud;
      if (!next) {
        stopSpeaking();
      } else if (ttsSupported) {
        speak('Read aloud enabled for AI replies and page summaries.', {
          interrupt: true,
          force: true,
        });
      }
      return { ...prev, readAloud: next };
    });
  }, [speak, stopSpeaking, ttsSupported]);

  const setTextScale = useCallback((textScale: TextScaleOption) => {
    setPrefs((prev) => ({ ...prev, textScale }));
  }, []);

  const resetAccessibility = useCallback(() => {
    stopSpeaking();
    setPrefs({
      highContrast: false,
      reduceMotion: getSystemReducedMotion(),
      backgroundPaused: false,
      readAloud: false,
      textScale: 1,
    });
  }, [stopSpeaking]);

  const pushVisualAlert = useCallback((alert: Omit<VisualAlertItem, 'id' | 'timestamp'>) => {
    const id = `va-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setVisualAlerts((prev) => {
      const filtered = prev.filter(
        (existing) => !(existing.title === alert.title && existing.roomId === alert.roomId)
      );
      return [{ ...alert, id, timestamp }, ...filtered].slice(0, 3);
    });
  }, []);

  const dismissVisualAlert = useCallback((id: string) => {
    setVisualAlerts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearVisualAlerts = useCallback(() => {
    setVisualAlerts([]);
  }, []);

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      ...prefs,
      setHighContrast,
      toggleHighContrast,
      setReduceMotion,
      toggleReduceMotion,
      setBackgroundPaused,
      toggleBackgroundPaused,
      setReadAloud,
      toggleReadAloud,
      setTextScale,
      resetAccessibility,
      ttsSupported,
      isSpeaking,
      speak,
      stopSpeaking,
      readMainContent,
      visualAlerts,
      pushVisualAlert,
      dismissVisualAlert,
      clearVisualAlerts,
    }),
    [
      prefs,
      setHighContrast,
      toggleHighContrast,
      setReduceMotion,
      toggleReduceMotion,
      setBackgroundPaused,
      toggleBackgroundPaused,
      setReadAloud,
      toggleReadAloud,
      setTextScale,
      resetAccessibility,
      ttsSupported,
      isSpeaking,
      speak,
      stopSpeaking,
      readMainContent,
      visualAlerts,
      pushVisualAlert,
      dismissVisualAlert,
      clearVisualAlerts,
    ]
  );

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    return {
      highContrast: false,
      reduceMotion: false,
      backgroundPaused: false,
      readAloud: false,
      textScale: 1,
      setHighContrast: () => {},
      toggleHighContrast: () => {},
      setReduceMotion: () => {},
      toggleReduceMotion: () => {},
      setBackgroundPaused: () => {},
      toggleBackgroundPaused: () => {},
      setReadAloud: () => {},
      toggleReadAloud: () => {},
      setTextScale: () => {},
      resetAccessibility: () => {},
      ttsSupported: false,
      isSpeaking: false,
      speak: () => {},
      stopSpeaking: () => {},
      readMainContent: () => {},
      visualAlerts: [],
      pushVisualAlert: () => {},
      dismissVisualAlert: () => {},
      clearVisualAlerts: () => {},
    };
  }
  return ctx;
}

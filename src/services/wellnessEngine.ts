/**
 * GameZoneET Responsible Gaming, Session Tracking & Digital Wellness Engine
 *
 * Implements:
 * 1. Daily 2-hour (7,200s) active screen/gameplay cap per calendar day with automatic midnight reset.
 * 2. Monday-to-Sunday calendar week helper & verification check for the 1-tournament-per-week limit.
 * 3. Ergonomic break / stretch check-in tracking synced locally and with Firestore user profiles.
 */

export const DAILY_PLAYTIME_LIMIT_SECONDS = 2 * 60 * 60; // 7,200 seconds = 2 hours
export const MAX_TOURNAMENTS_PER_WEEK = 1;

export interface DailyWellnessState {
  dateKey: string;
  totalSeconds: number;
  gameSeconds: number;
  platformSeconds: number;
  limitSeconds: number;
  locked: boolean;
  stretchBreaksLogged: number;
  updatedAtMs: number;
}

export interface CalendarWeekBounds {
  weekKey: string;
  startMs: number;
  endMs: number;
  rangeLabel: string;
  nextResetLabel: string;
  secondsUntilReset: number;
}

const STORAGE_PREFIX = 'gzet_wellness_daily_v1:';
const DEVICE_MIRROR_KEY = 'gzet_wellness_device_v1';

function pad2(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(2, '0');
}

export function getTodayCalendarKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
}

export function getSecondsUntilMidnight(date = new Date()): number {
  const nextMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, 0);
  return Math.max(0, Math.ceil((nextMidnight.getTime() - date.getTime()) / 1000));
}

export function formatDurationHMS(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

export function formatDurationShort(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${clamped % 60}s`;
  return `${clamped}s`;
}

/**
 * Computes Monday (00:00:00.000) through Sunday (23:59:59.999) local calendar week boundaries
 * and ISO week key (e.g., "2026-W46").
 */
export function getCalendarWeekBounds(date = new Date()): CalendarWeekBounds {
  const dayIndex = date.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const diffFromMonday = dayIndex === 0 ? 6 : dayIndex - 1;

  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - diffFromMonday, 0, 0, 0, 0);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);
  const nextMonday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7, 0, 0, 0, 0);

  // ISO week number (Thursday-based year)
  const thursday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 3);
  const isoYear = thursday.getFullYear();
  const jan4 = new Date(isoYear, 0, 4);
  const jan4Day = jan4.getDay() === 0 ? 7 : jan4.getDay();
  const week1Monday = new Date(isoYear, 0, 4 - (jan4Day - 1));
  const weekNum = Math.max(1, Math.round((monday.getTime() - week1Monday.getTime()) / (7 * 86400000)) + 1);
  const weekKey = `${isoYear}-W${pad2(weekNum)}`;

  const fmtOpts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
  const rangeLabel = `${monday.toLocaleDateString('en-US', fmtOpts)} – ${sunday.toLocaleDateString('en-US', fmtOpts)}`;
  const nextResetLabel = nextMonday.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  const secondsUntilReset = Math.max(0, Math.ceil((nextMonday.getTime() - date.getTime()) / 1000));

  return {
    weekKey,
    startMs: monday.getTime(),
    endMs: sunday.getTime(),
    rangeLabel,
    nextResetLabel,
    secondsUntilReset,
  };
}

export function parseRegistrationTimestampMs(reg: {
  createdAtMs?: number;
  registeredAt?: string;
}): number {
  if (typeof reg.createdAtMs === 'number' && Number.isFinite(reg.createdAtMs) && reg.createdAtMs > 0) {
    return reg.createdAtMs;
  }
  if (typeof reg.registeredAt === 'string' && reg.registeredAt.trim()) {
    const cleaned = reg.registeredAt.replace(/\s+EAT$/i, '').trim();
    const parsed = Date.parse(cleaned);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

export function isRegistrationInWeek(
  reg: { createdAtMs?: number; registeredAt?: string; weekKey?: string },
  week: CalendarWeekBounds = getCalendarWeekBounds()
): boolean {
  if (reg.weekKey && reg.weekKey === week.weekKey) {
    return true;
  }
  const ts = parseRegistrationTimestampMs(reg);
  if (!ts) return false;
  return ts >= week.startMs && ts <= week.endMs;
}

class WellnessEngine {
  private listeners = new Set<() => void>();
  private activeUserId: string | null = null;
  private state: DailyWellnessState;
  private tickerId: number | null = null;
  private ticksSinceCloudSync = 0;

  constructor() {
    this.state = this.loadState(null);
  }

  private createFreshState(dateKey = getTodayCalendarKey()): DailyWellnessState {
    return {
      dateKey,
      totalSeconds: 0,
      gameSeconds: 0,
      platformSeconds: 0,
      limitSeconds: DAILY_PLAYTIME_LIMIT_SECONDS,
      locked: false,
      stretchBreaksLogged: 0,
      updatedAtMs: Date.now(),
    };
  }

  private readStorage(key: string): DailyWellnessState | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<DailyWellnessState>;
      const today = getTodayCalendarKey();
      if (parsed.dateKey !== today) return null;
      const totalSeconds = Math.max(0, Math.floor(Number(parsed.totalSeconds) || 0));
      const gameSeconds = Math.max(0, Math.floor(Number(parsed.gameSeconds) || 0));
      const platformSeconds = Math.max(
        0,
        Math.floor(Number(parsed.platformSeconds) || Math.max(0, totalSeconds - gameSeconds))
      );
      return {
        dateKey: today,
        totalSeconds,
        gameSeconds,
        platformSeconds,
        limitSeconds: DAILY_PLAYTIME_LIMIT_SECONDS,
        locked: totalSeconds >= DAILY_PLAYTIME_LIMIT_SECONDS,
        stretchBreaksLogged: Math.max(0, Math.floor(Number(parsed.stretchBreaksLogged) || 0)),
        updatedAtMs: Number(parsed.updatedAtMs) || Date.now(),
      };
    } catch {
      return null;
    }
  }

  private loadState(userId: string | null): DailyWellnessState {
    const today = getTodayCalendarKey();
    const userSaved = this.readStorage(`${STORAGE_PREFIX}${userId || 'guest'}`);
    const deviceSaved = this.readStorage(DEVICE_MIRROR_KEY);

    if (!userSaved && !deviceSaved) {
      return this.createFreshState(today);
    }
    const base = userSaved || deviceSaved || this.createFreshState(today);
    const totalSeconds = Math.max(userSaved?.totalSeconds || 0, deviceSaved?.totalSeconds || 0);
    const gameSeconds = Math.max(userSaved?.gameSeconds || 0, deviceSaved?.gameSeconds || 0);
    const platformSeconds = Math.max(base.platformSeconds, Math.max(0, totalSeconds - gameSeconds));
    return {
      dateKey: today,
      totalSeconds,
      gameSeconds,
      platformSeconds,
      limitSeconds: DAILY_PLAYTIME_LIMIT_SECONDS,
      locked: totalSeconds >= DAILY_PLAYTIME_LIMIT_SECONDS,
      stretchBreaksLogged: Math.max(
        userSaved?.stretchBreaksLogged || 0,
        deviceSaved?.stretchBreaksLogged || 0
      ),
      updatedAtMs: Date.now(),
    };
  }

  private persistState(next: DailyWellnessState): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const payload = JSON.stringify(next);
      localStorage.setItem(`${STORAGE_PREFIX}${this.activeUserId || 'guest'}`, payload);
      localStorage.setItem(DEVICE_MIRROR_KEY, payload);
    } catch {
      // Ignore storage quota errors cleanly
    }
  }

  private emit(): void {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch {
        // Ignore listener errors
      }
    });
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  public getState(): DailyWellnessState {
    const today = getTodayCalendarKey();
    if (this.state.dateKey !== today) {
      this.state = this.createFreshState(today);
      this.persistState(this.state);
    }
    return this.state;
  }

  public getRemainingSeconds(): number {
    const s = this.getState();
    return Math.max(0, s.limitSeconds - s.totalSeconds);
  }

  public isDailyLimitReached(): boolean {
    return this.getState().locked;
  }

  public hydrateFromUser(user: {
    id?: string;
    dailyPlaytimeDate?: string;
    dailyPlaytimeSeconds?: number;
    dailyGameSeconds?: number;
  } | null): void {
    const nextUid = user?.id || null;
    if (nextUid !== this.activeUserId) {
      this.activeUserId = nextUid;
      this.state = this.loadState(nextUid);
    }
    const today = getTodayCalendarKey();
    if (user && user.dailyPlaytimeDate === today) {
      const remoteTotal = Math.max(0, Math.floor(Number(user.dailyPlaytimeSeconds) || 0));
      const remoteGame = Math.max(0, Math.floor(Number(user.dailyGameSeconds) || 0));
      if (remoteTotal > this.state.totalSeconds || remoteGame > this.state.gameSeconds) {
        const mergedTotal = Math.max(this.state.totalSeconds, remoteTotal);
        const mergedGame = Math.max(this.state.gameSeconds, remoteGame);
        this.state = {
          ...this.state,
          dateKey: today,
          totalSeconds: mergedTotal,
          gameSeconds: mergedGame,
          platformSeconds: Math.max(this.state.platformSeconds, Math.max(0, mergedTotal - mergedGame)),
          locked: mergedTotal >= DAILY_PLAYTIME_LIMIT_SECONDS,
          updatedAtMs: Date.now(),
        };
        this.persistState(this.state);
      }
    }
    this.emit();
  }

  public logStretchBreak(): DailyWellnessState {
    const cur = this.getState();
    this.state = {
      ...cur,
      stretchBreaksLogged: cur.stretchBreaksLogged + 1,
      updatedAtMs: Date.now(),
    };
    this.persistState(this.state);
    this.emit();
    return this.state;
  }

  public startSessionTracker(opts: {
    isPlayingGame: () => boolean;
    getUserId: () => string | null | undefined;
    onSyncUserUsage?: (state: DailyWellnessState) => void;
  }): () => void {
    if (typeof window === 'undefined') return () => {};
    if (this.tickerId !== null) {
      window.clearInterval(this.tickerId);
      this.tickerId = null;
    }

    this.tickerId = window.setInterval(() => {
      const uid = opts.getUserId() || null;
      if (uid !== this.activeUserId) {
        this.activeUserId = uid;
        this.state = this.loadState(uid);
      }

      const today = getTodayCalendarKey();
      if (this.state.dateKey !== today) {
        this.state = this.createFreshState(today);
        this.persistState(this.state);
        this.emit();
        return;
      }

      // Only accrue active engagement when the browser tab is visible
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }

      const inGame = opts.isPlayingGame();
      const prevLocked = this.state.locked;
      const nextTotal = Math.min(86400, this.state.totalSeconds + 1);
      const nextGame = inGame ? Math.min(86400, this.state.gameSeconds + 1) : this.state.gameSeconds;
      const nextPlatform = !inGame
        ? Math.min(86400, this.state.platformSeconds + 1)
        : this.state.platformSeconds;
      const nextLocked = nextTotal >= DAILY_PLAYTIME_LIMIT_SECONDS;

      this.state = {
        ...this.state,
        dateKey: today,
        totalSeconds: nextTotal,
        gameSeconds: nextGame,
        platformSeconds: nextPlatform,
        locked: nextLocked,
        updatedAtMs: Date.now(),
      };

      this.persistState(this.state);
      this.emit();

      this.ticksSinceCloudSync += 1;
      if ((nextLocked && !prevLocked) || this.ticksSinceCloudSync >= 20) {
        this.ticksSinceCloudSync = 0;
        opts.onSyncUserUsage?.(this.state);
      }
    }, 1000);

    return () => {
      if (this.tickerId !== null) {
        window.clearInterval(this.tickerId);
        this.tickerId = null;
      }
    };
  }
}

export const wellnessEngine = new WellnessEngine();

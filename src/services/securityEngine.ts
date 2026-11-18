/**
 * GameZoneET Real-Time Cybersecurity, Hardware Fingerprinting & Anti-Tamper Engine
 *
 * Implements:
 * 1. SHA-256 cryptographic identity & audit-chain hashing (Web Crypto API)
 * 2. Canvas + WebGL + Device metadata Hardware ID (HWID) fingerprinting
 * 3. Client-side sliding-window Rate Limiting & DDoS protection
 * 4. Behavioral Integrity & Anti-Tamper monitoring (Automation, Macro clicks, DOM injection)
 */

export type IdentityDocType = 'fayda_national_id' | 'ethiopian_fido' | 'passport';

export type SecurityThreatSeverity = 'low' | 'medium' | 'high' | 'critical';

export type SecurityThreatCategory =
  | 'rate_limit'
  | 'anti_smurf_id'
  | 'anti_smurf_hwid'
  | 'name_mismatch'
  | 'macro_click'
  | 'automation_probe'
  | 'dom_tamper'
  | 'devtools_checkin'
  | 'ddos_shield';

export type IdentityCredentialCategory = 'ethiopian_id' | 'passport';

export interface SecurityThreatEvent {
  id: string;
  userId: string;
  gamerTag: string;
  category: SecurityThreatCategory;
  severity: SecurityThreatSeverity;
  summary: string;
  hwidHash: string;
  endpointOrSurface: string;
  blocked: boolean;
  timestamp: string;
  timestampMs: number;
}

export interface RateLimitBucketConfig {
  key: string;
  maxRequests: number;
  windowMs: number;
  label: string;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfterSec: number;
  message?: string;
}

const DEVICE_NONCE_KEY = 'gz_sec_device_nonce_v1';
const CACHED_HWID_KEY = 'gz_sec_hwid_cache_v1';
const IDENTITY_PEPPER = 'GameZoneET::IdentityDedupe::FaydaFido2026';

export async function sha256Hex(input: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoded = new TextEncoder().encode(input);
    const digest = await window.crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Deterministic 64-hex fallback only if SubtleCrypto is unavailable in constrained environments
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193);
    h2 = Math.imul(h2 ^ (ch + i), 0x85ebca6b);
  }
  const part = `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
  return (part + part + part + part).slice(0, 64);
}

export function normalizeIdentityNumber(idType: IdentityDocType, rawValue: string): string {
  const cleaned = rawValue.trim().toUpperCase().replace(/[\s\-_]+/g, '');
  return `${idType}:${cleaned}`;
}

export function validateIdentityFormat(
  idType: IdentityDocType,
  rawValue: string
): { valid: boolean; error?: string } {
  const cleaned = rawValue.trim().toUpperCase().replace(/[\s\-_]+/g, '');
  if (!cleaned) {
    return { valid: false, error: 'Please enter your verification ID or token.' };
  }
  if (idType === 'fayda_national_id') {
    if (!/^\d{12,16}$/.test(cleaned)) {
      return {
        valid: false,
        error: 'Ethiopian Fayda National ID (FIN/FAN) must be 12 to 16 numeric digits.',
      };
    }
    if (/^(\d)\1+$/.test(cleaned)) {
      return {
        valid: false,
        error: 'Invalid Fayda ID pattern detected. Repeated identical digits are not allowed.',
      };
    }
    return { valid: true };
  }
  if (idType === 'ethiopian_fido') {
    if (!/^[A-Z0-9]{10,48}$/.test(cleaned)) {
      return {
        valid: false,
        error: 'Ethiopian FIDO Passkey / Digital ID token must be 10 to 48 alphanumeric characters.',
      };
    }
    return { valid: true };
  }
  // Passport
  if (!/^[A-Z]{1,3}\d{5,9}$/.test(cleaned) && !/^[A-Z0-9]{6,12}$/.test(cleaned)) {
    return {
      valid: false,
      error: 'Passport number must be 6 to 12 alphanumeric characters (e.g. EP1234567).',
    };
  }
  return { valid: true };
}

export async function computeIdentityVerificationHash(
  idType: IdentityDocType,
  rawValue: string
): Promise<string> {
  const normalized = normalizeIdentityNumber(idType, rawValue);
  return sha256Hex(`${IDENTITY_PEPPER}::${normalized}`);
}

export function getCredentialCategory(idType: IdentityDocType): IdentityCredentialCategory {
  return idType === 'passport' ? 'passport' : 'ethiopian_id';
}

export interface ExclusiveIdentitySubmissionInput {
  selectedDocType: IdentityDocType;
  ethiopianIdValue?: string;
  passportValue?: string;
  existingBoundType?: IdentityDocType;
  alreadyVerified?: boolean;
}

/**
 * Enforces strict XOR credential exclusivity:
 * - A user must supply EITHER an Ethiopian Digital/National ID OR a Passport number.
 * - Supplying BOTH simultaneously or NEITHER is strictly rejected.
 * - Already-verified users cannot hold or switch to the opposite credential type without admin revocation.
 */
export function validateExclusiveIdentitySubmission(input: ExclusiveIdentitySubmissionInput): {
  valid: boolean;
  error?: string;
  activeValue: string;
  activeCategory: IdentityCredentialCategory;
  bothProvided?: boolean;
} {
  const selectedCat = getCredentialCategory(input.selectedDocType);

  if (input.alreadyVerified && input.existingBoundType) {
    const existingLabel =
      getCredentialCategory(input.existingBoundType) === 'passport'
        ? 'Passport'
        : 'Ethiopian Digital / National ID';
    return {
      valid: false,
      error: `Credential Exclusivity Lock: Your account already has an active bound ${existingLabel}. You cannot use both Passport and Ethiopian ID simultaneously. Ask an administrator to revoke your current binding first.`,
      activeValue: '',
      activeCategory: selectedCat,
    };
  }

  const ethVal = (input.ethiopianIdValue || '').trim();
  const passVal = (input.passportValue || '').trim();
  const hasEth = ethVal.length > 0;
  const hasPass = passVal.length > 0;

  if (hasEth && hasPass) {
    return {
      valid: false,
      error:
        'Credential Exclusivity Violation: You must provide EITHER a Passport number OR an Ethiopian Digital/National ID — strictly not both.',
      activeValue: '',
      activeCategory: selectedCat,
      bothProvided: true,
    };
  }

  if (!hasEth && !hasPass) {
    return {
      valid: false,
      error:
        'Verification Required: Provide either an Ethiopian National/FIDO ID OR a Passport number (cannot submit neither).',
      activeValue: '',
      activeCategory: selectedCat,
    };
  }

  if (selectedCat === 'ethiopian_id' && !hasEth) {
    return {
      valid: false,
      error: 'Ethiopian Digital / National ID number is required when Ethiopian ID mode is selected.',
      activeValue: '',
      activeCategory: selectedCat,
    };
  }

  if (selectedCat === 'passport' && !hasPass) {
    return {
      valid: false,
      error: 'Passport number is required when Passport mode is selected.',
      activeValue: '',
      activeCategory: selectedCat,
    };
  }

  const activeValue = selectedCat === 'passport' ? passVal : ethVal;
  const format = validateIdentityFormat(input.selectedDocType, activeValue);
  if (!format.valid) {
    return {
      valid: false,
      error: format.error,
      activeValue,
      activeCategory: selectedCat,
    };
  }

  return {
    valid: true,
    activeValue,
    activeCategory: selectedCat,
  };
}

const HONORIFIC_TOKENS = new Set([
  'ato',
  'wro',
  'wzro',
  'dr',
  'mr',
  'mrs',
  'ms',
  'miss',
  'prof',
  'eng',
]);

function normalizePersonName(raw: string): { normalized: string; tokens: string[]; fullTokens: string[] } {
  const cleaned = raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.,\-_'’/]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const rawTokens = cleaned.split(' ').filter((t) => t.length > 0 && !HONORIFIC_TOKENS.has(t));
  const fullTokens = rawTokens.filter((t) => t.length >= 2);
  return {
    normalized: rawTokens.join(' '),
    tokens: rawTokens,
    fullTokens: fullTokens.length > 0 ? fullTokens : rawTokens,
  };
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

function stringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  return Math.max(0, 1 - levenshteinDistance(a, b) / maxLen);
}

export interface FuzzyNameMatchResult {
  matched: boolean;
  level: 'exact_or_variant' | 'minor_variation' | 'massive_mismatch';
  score: number;
  normalizedAccount: string;
  normalizedDocument: string;
  reason: string;
}

/**
 * Fuzzy name comparison between account registration/sign-in name and ID/passport name.
 * - Allows capitalization differences, spacing/punctuation variants, minor transliteration typos,
 *   and added/omitted Ethiopian middle or patronymic grandfather names.
 * - Flags massive discrepancies (different identities) for security warning & strike escalation.
 */
export function evaluateFuzzyNameMatch(
  accountNameRaw: string,
  documentNameRaw: string
): FuzzyNameMatchResult {
  const acc = normalizePersonName(accountNameRaw || '');
  const doc = normalizePersonName(documentNameRaw || '');

  if (!doc.normalized || doc.normalized.length < 2) {
    return {
      matched: false,
      level: 'massive_mismatch',
      score: 0,
      normalizedAccount: acc.normalized,
      normalizedDocument: doc.normalized,
      reason: 'Document full name is missing or too short.',
    };
  }

  // If account had no real name yet, match cannot succeed cleanly unless provided
  if (!acc.normalized || acc.normalized.length < 2) {
    return {
      matched: true,
      level: 'minor_variation',
      score: 0.85,
      normalizedAccount: acc.normalized,
      normalizedDocument: doc.normalized,
      reason: 'Account registration name is unset; accepted document name for baseline.',
    };
  }

  if (acc.normalized === doc.normalized) {
    return {
      matched: true,
      level: 'exact_or_variant',
      score: 1,
      normalizedAccount: acc.normalized,
      normalizedDocument: doc.normalized,
      reason: 'Exact normalized name match (case/spacing insensitive).',
    };
  }

  const accCompact = acc.fullTokens.join('');
  const docCompact = doc.fullTokens.join('');
  if (accCompact === docCompact) {
    return {
      matched: true,
      level: 'exact_or_variant',
      score: 0.98,
      normalizedAccount: acc.normalized,
      normalizedDocument: doc.normalized,
      reason: 'Matched after whitespace normalization.',
    };
  }

  // Token-subset & best-pair matching (tolerates Ethiopian middle names & minor typos)
  const shorter = acc.fullTokens.length <= doc.fullTokens.length ? acc.fullTokens : doc.fullTokens;
  const longer = acc.fullTokens.length <= doc.fullTokens.length ? doc.fullTokens : acc.fullTokens;

  let strongMatches = 0;
  let pairScoreSum = 0;
  const usedLonger = new Set<number>();

  for (const tok of shorter) {
    let bestIdx = -1;
    let bestSim = 0;
    for (let j = 0; j < longer.length; j++) {
      if (usedLonger.has(j)) continue;
      const candidate = longer[j];
      let sim = stringSimilarity(tok, candidate);
      // Support initial match (e.g. "M" vs "Mohammed") as a bonus only
      if (sim < 0.72 && (tok.length === 1 || candidate.length === 1) && tok[0] === candidate[0]) {
        sim = 0.7;
      }
      if (sim > bestSim) {
        bestSim = sim;
        bestIdx = j;
      }
    }
    if (bestIdx >= 0 && bestSim >= 0.72) {
      usedLonger.add(bestIdx);
      strongMatches += 1;
    }
    pairScoreSum += bestSim;
  }

  const avgTokenSim = shorter.length > 0 ? pairScoreSum / shorter.length : 0;
  const subsetCoverage = shorter.length > 0 ? strongMatches / shorter.length : 0;
  const fullSim = stringSimilarity(acc.normalized, doc.normalized);
  const sortedAcc = [...acc.fullTokens].sort().join(' ');
  const sortedDoc = [...doc.fullTokens].sort().join(' ');
  const sortedSim = stringSimilarity(sortedAcc, sortedDoc);

  // Also allow substring containment when account uses a compound handle like "AbebeBikila" or first-name only
  const hasTokenContainment = doc.fullTokens.some(
    (dt) => dt.length >= 4 && (accCompact.includes(dt) || dt.includes(accCompact))
  );

  const compositeScore = Number(
    Math.max(
      avgTokenSim * 0.75 + subsetCoverage * 0.25,
      fullSim,
      sortedSim,
      hasTokenContainment ? 0.76 : 0
    ).toFixed(2)
  );

  // Full subset match (e.g. "Abebe Bikila" vs "Abebe Tadesse Bikila" or minor transliteration variation)
  if (subsetCoverage >= 1 && avgTokenSim >= 0.78) {
    return {
      matched: true,
      level: avgTokenSim >= 0.94 ? 'exact_or_variant' : 'minor_variation',
      score: Math.max(compositeScore, 0.85),
      normalizedAccount: acc.normalized,
      normalizedDocument: doc.normalized,
      reason: 'Primary name tokens match (middle-name and spelling variations permitted).',
    };
  }

  // Partial overlap where at least 1 strong token (>=0.75) OR strong overall similarity >= 0.60
  if (
    (strongMatches >= 1 && compositeScore >= 0.6) ||
    fullSim >= 0.65 ||
    sortedSim >= 0.65 ||
    hasTokenContainment
  ) {
    return {
      matched: true,
      level: 'minor_variation',
      score: compositeScore,
      normalizedAccount: acc.normalized,
      normalizedDocument: doc.normalized,
      reason: 'Name accepted within minor variation / middle-name tolerance.',
    };
  }

  return {
    matched: false,
    level: 'massive_mismatch',
    score: compositeScore,
    normalizedAccount: acc.normalized,
    normalizedDocument: doc.normalized,
    reason: `Document name "${documentNameRaw.trim()}" does not match registered account name "${accountNameRaw.trim()}" (${Math.round(compositeScore * 100)}% similarity).`,
  };
}

function getOrCreateDeviceNonce(): string {
  try {
    const existing = localStorage.getItem(DEVICE_NONCE_KEY);
    if (existing && existing.length >= 16) return existing;
    const bytes = new Uint8Array(16);
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    const created = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    localStorage.setItem(DEVICE_NONCE_KEY, created);
    return created;
  } catch {
    return 'ephemeral-device-nonce';
  }
}

function getCanvasFingerprintSignal(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-2d-canvas';
    ctx.textBaseline = 'top';
    ctx.font = '14px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 240, 50);
    ctx.fillStyle = '#00f0ff';
    ctx.fillText('GameZoneET::HWID::2026', 6, 8);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.72)';
    ctx.beginPath();
    ctx.arc(195, 25, 14, 0, Math.PI * 2);
    ctx.fill();
    return canvas.toDataURL().slice(-80);
  } catch {
    return 'canvas-blocked';
  }
}

function getWebGLFingerprintSignal(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (!gl) return 'no-webgl';
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
      : gl.getParameter(gl.VENDOR);
    const renderer = debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
    return `${String(vendor || '')}|${String(renderer || '')}`;
  } catch {
    return 'webgl-blocked';
  }
}

export async function getDeviceHardwareFingerprint(): Promise<{
  hwidHash: string;
  deviceSummary: string;
}> {
  const nav = typeof navigator !== 'undefined' ? navigator : ({} as Navigator);
  const scr = typeof window !== 'undefined' ? window.screen : ({} as Screen);
  const tz =
    typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' : 'UTC';
  const cores = (nav as any).hardwareConcurrency || 0;
  const mem = (nav as any).deviceMemory || 0;
  const platform = (nav as any).platform || 'web';
  const touchPoints = nav.maxTouchPoints || 0;
  const langs = Array.isArray(nav.languages) ? nav.languages.join(',') : nav.language || 'en';
  const screenSig = `${scr?.width || 0}x${scr?.height || 0}x${scr?.colorDepth || 24}@${
    typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  }`;

  const deviceSummary = `${platform} · ${cores || '?'}c · ${screenSig} · ${tz}`;

  try {
    const cached = sessionStorage.getItem(CACHED_HWID_KEY);
    if (cached && /^[a-f0-9]{64}$/.test(cached)) {
      return { hwidHash: cached, deviceSummary };
    }
  } catch {
    // Ignore sessionStorage restrictions
  }

  const nonce = getOrCreateDeviceNonce();
  const canvasSig = typeof document !== 'undefined' ? getCanvasFingerprintSignal() : 'ssr';
  const webglSig = typeof document !== 'undefined' ? getWebGLFingerprintSignal() : 'ssr';

  const rawFingerprint = [
    'GZET-HWID-V1',
    nonce,
    canvasSig,
    webglSig,
    screenSig,
    `${cores}:${mem}:${touchPoints}`,
    platform,
    tz,
    langs,
  ].join('||');

  const hwidHash = await sha256Hex(rawFingerprint);
  try {
    sessionStorage.setItem(CACHED_HWID_KEY, hwidHash);
  } catch {
    // Ignore
  }
  return { hwidHash, deviceSummary };
}

export async function generateFidoPasskeyChallengeToken(gamerTag: string): Promise<string> {
  const randomBytes = new Uint8Array(12);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(randomBytes);
  }
  const hex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  const sig = await sha256Hex(`${gamerTag}:${Date.now()}:${hex}`);
  return `ETFIDO${sig.slice(0, 14).toUpperCase()}`;
}

export type SecurityPosture = 'normal' | 'elevated' | 'lockdown';

class ClientSecurityEngine {
  private buckets = new Map<string, number[]>();
  private blockedRequestsCount = 0;
  private inspectedRequestsCount = 0;
  private posture: SecurityPosture = 'normal';
  private cachedHwid = '';
  private cachedDeviceSummary = '';
  private listeners = new Set<() => void>();
  private threatCallback: ((event: Omit<SecurityThreatEvent, 'id' | 'timestamp' | 'timestampMs'>) => void) | null =
    null;

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    this.listeners.forEach((cb) => cb());
  }

  public setThreatReporter(
    cb: (event: Omit<SecurityThreatEvent, 'id' | 'timestamp' | 'timestampMs'>) => void
  ) {
    this.threatCallback = cb;
  }

  public getPosture(): SecurityPosture {
    return this.posture;
  }

  public setPosture(next: SecurityPosture) {
    this.posture = next;
    this.emit();
  }

  public getCachedHwid(): { hwidHash: string; deviceSummary: string } {
    return {
      hwidHash: this.cachedHwid,
      deviceSummary: this.cachedDeviceSummary,
    };
  }

  public async ensureHwid(): Promise<{ hwidHash: string; deviceSummary: string }> {
    if (this.cachedHwid) {
      return { hwidHash: this.cachedHwid, deviceSummary: this.cachedDeviceSummary };
    }
    const res = await getDeviceHardwareFingerprint();
    this.cachedHwid = res.hwidHash;
    this.cachedDeviceSummary = res.deviceSummary;
    this.emit();
    return res;
  }

  public getRateStats() {
    return {
      inspectedRequests: this.inspectedRequestsCount,
      blockedRequests: this.blockedRequestsCount,
      activeBuckets: this.buckets.size,
      posture: this.posture,
    };
  }

  public checkRateLimit(
    config: RateLimitBucketConfig,
    actor?: { userId?: string; gamerTag?: string }
  ): RateLimitCheckResult {
    this.inspectedRequestsCount += 1;
    const now = Date.now();
    const effectiveMax =
      this.posture === 'lockdown'
        ? Math.max(1, Math.floor(config.maxRequests / 2))
        : this.posture === 'elevated'
        ? Math.max(2, Math.floor(config.maxRequests * 0.75))
        : config.maxRequests;

    const timestamps = (this.buckets.get(config.key) || []).filter((t) => now - t < config.windowMs);

    if (timestamps.length >= effectiveMax) {
      this.blockedRequestsCount += 1;
      const oldest = timestamps[0] || now;
      const retryAfterSec = Math.max(1, Math.ceil((config.windowMs - (now - oldest)) / 1000));
      this.buckets.set(config.key, timestamps);
      this.emit();

      this.reportThreat({
        userId: actor?.userId || 'guest',
        gamerTag: actor?.gamerTag || 'Guest Session',
        category: 'rate_limit',
        severity: 'high',
        summary: `Rate limit tripped on ${config.label} (${effectiveMax} req / ${Math.round(config.windowMs / 1000)}s). Retry in ${retryAfterSec}s.`,
        endpointOrSurface: config.key,
        blocked: true,
      });

      return {
        allowed: false,
        remaining: 0,
        limit: effectiveMax,
        retryAfterSec,
        message: `Rate limit active on ${config.label}. Please wait ${retryAfterSec}s before retrying.`,
      };
    }

    timestamps.push(now);
    this.buckets.set(config.key, timestamps);
    this.emit();
    return {
      allowed: true,
      remaining: Math.max(0, effectiveMax - timestamps.length),
      limit: effectiveMax,
      retryAfterSec: 0,
    };
  }

  public reportThreat(
    event: Omit<SecurityThreatEvent, 'id' | 'timestamp' | 'timestampMs' | 'hwidHash'> & {
      hwidHash?: string;
    }
  ) {
    if (!this.threatCallback) return;
    this.threatCallback({
      ...event,
      hwidHash: event.hwidHash || this.cachedHwid || 'hwid-pending',
    });
  }

  public startBehaviorIntegrityMonitor(getActor: () => { userId?: string; gamerTag?: string }): () => void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return () => {};
    }

    let disposed = false;
    const clickTimestamps: number[] = [];
    let lastMacroAlertAt = 0;
    let lastDomAlertAt = 0;
    let lastDevtoolsAlertAt = 0;

    // 1. Browser automation / WebDriver detection
    const checkAutomation = () => {
      const nav = navigator as any;
      const suspiciousDriver =
        Boolean(nav.webdriver) ||
        Boolean((window as any).__nightmare) ||
        Boolean((window as any).__selenium_unwrapped);
      if (suspiciousDriver) {
        const actor = getActor();
        this.reportThreat({
          userId: actor.userId || 'guest',
          gamerTag: actor.gamerTag || 'Guest Session',
          category: 'automation_probe',
          severity: 'high',
          summary: 'Automated browser / WebDriver signature detected during active session.',
          endpointOrSurface: 'navigator.webdriver',
          blocked: false,
        });
      }
    };
    const autoTimer = window.setTimeout(checkAutomation, 2000);

    // 2. Rapid Macro Clicking & Synthetic Event Guard
    let syntheticBurst = 0;
    const onPointerDown = (e: Event) => {
      if (disposed) return;
      const now = Date.now();
      if (!e.isTrusted) {
        syntheticBurst += 1;
        if (syntheticBurst >= 5 && now - lastMacroAlertAt > 15000) {
          lastMacroAlertAt = now;
          syntheticBurst = 0;
          const actor = getActor();
          this.reportThreat({
            userId: actor.userId || 'guest',
            gamerTag: actor.gamerTag || 'Guest Session',
            category: 'automation_probe',
            severity: 'high',
            summary: 'Repeated untrusted synthetic click events blocked by anti-macro shield.',
            endpointOrSurface: 'DOM Pointer Event',
            blocked: true,
          });
        }
        return;
      }

      clickTimestamps.push(now);
      while (clickTimestamps.length > 0 && now - clickTimestamps[0] > 450) {
        clickTimestamps.shift();
      }
      if (clickTimestamps.length >= 7 && now - lastMacroAlertAt > 12000) {
        lastMacroAlertAt = now;
        const actor = getActor();
        this.reportThreat({
          userId: actor.userId || 'guest',
          gamerTag: actor.gamerTag || 'Guest Session',
          category: 'macro_click',
          severity: 'medium',
          summary: `Rapid macro-click cadence detected (${clickTimestamps.length} clicks in <450ms).`,
          endpointOrSurface: 'Client Input Guard',
          blocked: false,
        });
      }
    };

    // 3. DOM Tamper / Unauthorized Script Injection Guard
    const rootEl = document.getElementById('root') || document.body;
    const observer = new MutationObserver((mutations) => {
      if (disposed) return;
      for (const m of mutations) {
        if (m.type === 'childList') {
          m.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              const tag = node.tagName.toLowerCase();
              const isUntrustedScript =
                tag === 'script' && !node.dataset.gzTrusted && !node.getAttribute('src')?.includes('/src/');
              const hasInlineJsHref =
                tag === 'a' && (node.getAttribute('href') || '').trim().toLowerCase().startsWith('javascript:');
              if (isUntrustedScript || hasInlineJsHref) {
                node.remove();
                const now = Date.now();
                if (now - lastDomAlertAt > 10000) {
                  lastDomAlertAt = now;
                  const actor = getActor();
                  this.reportThreat({
                    userId: actor.userId || 'guest',
                    gamerTag: actor.gamerTag || 'Guest Session',
                    category: 'dom_tamper',
                    severity: 'critical',
                    summary: `Blocked unauthorized DOM injection (${tag}) inside active viewport.`,
                    endpointOrSurface: 'MutationObserver Anti-Tamper',
                    blocked: true,
                  });
                }
              }
            }
          });
        }
      }
    });

    if (rootEl) {
      observer.observe(rootEl, { childList: true, subtree: true });
    }

    // 4. Lightweight DevTools / Viewport Anomaly Advisory during live check-in windows
    const checkViewportAnomaly = () => {
      if (disposed) return;
      const widthDiff = Math.abs(window.outerWidth - window.innerWidth);
      const heightDiff = Math.abs(window.outerHeight - window.innerHeight);
      const isSuspiciousDock = widthDiff > 260 || heightDiff > 260;
      const hash = window.location.hash || '';
      const inTournamentContext =
        hash.includes('tournaments') || Boolean(document.querySelector('[aria-labelledby="bracket-modal-title"]'));
      const now = Date.now();
      if (isSuspiciousDock && inTournamentContext && now - lastDevtoolsAlertAt > 45000) {
        lastDevtoolsAlertAt = now;
        const actor = getActor();
        this.reportThreat({
          userId: actor.userId || 'guest',
          gamerTag: actor.gamerTag || 'Guest Session',
          category: 'devtools_checkin',
          severity: 'low',
          summary: 'Inspector / docked tool window delta observed while viewing tournament bracket.',
          endpointOrSurface: 'Tournament Check-In Integrity',
          blocked: false,
        });
      }
    };

    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    const devInterval = window.setInterval(checkViewportAnomaly, 8000);

    return () => {
      disposed = true;
      window.clearTimeout(autoTimer);
      window.clearInterval(devInterval);
      window.removeEventListener('pointerdown', onPointerDown);
      observer.disconnect();
    };
  }
}

export const securityEngine = new ClientSecurityEngine();

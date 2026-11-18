import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, dbFirestore, handleFirestoreError, OperationType } from '@/lib/firebase';
import { ADMIN_EMAIL } from '@/lib/env';
import { DEFAULT_AVATAR_URL } from '@/utils/avatarUtils';
import { formatEthiopianCity } from '@/utils/location';
import type {
  AdminAuditLogEntry,
  DeliveryStatus,
  HwidRegistryRecord,
  IdentityBindingRecord,
  OrderItem,
  PaymentStatus,
  SupportTicket,
  SupportTicketCategory,
  TournamentDispute,
  TournamentEntity,
  TournamentRegistration,
  TournamentRoomCredentials,
  UserAccount,
  UserNotification,
} from '@/services/db';
import type {
  IdentityDocType,
  SecurityThreatCategory,
  SecurityThreatEvent,
  SecurityThreatSeverity,
} from '@/services/securityEngine';

function extractTimestampMs(ts: unknown): number {
  if (ts instanceof Timestamp) {
    return ts.toMillis();
  }
  if (typeof ts === 'number' && Number.isFinite(ts)) {
    return ts;
  }
  if (typeof ts === 'string' && ts.trim()) {
    const parsed = Date.parse(ts);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now();
}

function sanitizeSavedPlayerIds(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result: Record<string, string> = {};
  const entries = Object.entries(raw as Record<string, unknown>).slice(0, 10);
  for (const [k, v] of entries) {
    const cleanKey = String(k).trim().slice(0, 32);
    const cleanVal = String(v ?? '').trim().slice(0, 64);
    if (cleanKey && cleanVal) {
      result[cleanKey] = cleanVal;
    }
  }
  return result;
}

function sanitizeNotifications(raw: unknown): UserNotification[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 30).map((item: any, idx) => ({
    id: String(item?.id || `notif-${idx}-${Date.now()}`).slice(0, 64),
    title: String(item?.title || 'Notification').slice(0, 100),
    message: String(item?.message || '').slice(0, 300),
    type:
      item?.type === 'error' || item?.type === 'warning' || item?.type === 'info'
        ? item.type
        : 'success',
    createdAt: String(item?.createdAt || 'Just now').slice(0, 64),
    createdAtMs: Number(item?.createdAtMs) || Date.now(),
    read: Boolean(item?.read),
    targetPage: item?.targetPage ? String(item.targetPage).slice(0, 40) : undefined,
  }));
}

function formatTimestamp(ts: unknown): string {
  if (ts instanceof Timestamp) {
    return ts.toDate().toISOString().split('T')[0];
  }
  if (typeof ts === 'string' && ts.trim()) {
    return ts;
  }
  return new Date().toISOString().split('T')[0];
}

function formatDateTimeEAT(ts: unknown): string {
  if (ts instanceof Timestamp) {
    const d = ts.toDate();
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} EAT`;
  }
  if (typeof ts === 'string' && ts.trim()) return ts;
  const now = new Date();
  return `${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} EAT`;
}

export async function createFirestoreUserProfile(user: UserAccount): Promise<void> {
  const publicPath = `users/${user.id}`;
  const privatePath = `users/${user.id}/private/info`;

  const cleanUsername = (user.username || user.gamerTag || 'gamer')
    .toLowerCase()
    .replace(/[^a-z0-9_\-]/g, '_')
    .slice(0, 40);
  const safeUsername = cleanUsername.length >= 2 ? cleanUsername : `gamer_${user.id.slice(0, 6)}`;
  const rawTag = (user.gamerTag || 'Player').trim();
  const safeGamerTag = rawTag.length >= 3 ? rawTag.slice(0, 40) : `${rawTag}_ET`.slice(0, 40);

  const safeAvatar = (user.avatar || DEFAULT_AVATAR_URL).slice(0, 40000);
  const safeCity = formatEthiopianCity(user.city).slice(0, 80);
  const safeFavoriteGame = (user.favoriteGame || 'Free Fire & Battle Royale').slice(0, 80);
  const safeRank = Math.max(1, Math.min(999999, Math.floor(user.rank || 99)));
  const safePoints = Math.max(0, Math.min(10000000, Math.floor(user.loyaltyPoints || 0)));
  const safeGamesPlayed = Math.max(0, Math.min(1000000, Math.floor(user.gamesPlayed || 0)));
  const safeHighScore = Math.max(0, Math.min(100000000, Math.floor(user.highScore || 0)));
  const safeFavGames = (user.favoriteGames || []).slice(0, 20);
  const safeAchievements = (user.achievements || []).slice(0, 50);
  const safeLastPage = (user.lastPage || 'home').slice(0, 40);
  const safeLastGameId = (user.lastGameId || 'freefire').slice(0, 40);
  const safeProfileCompleted = Boolean(user.profileCompleted);

  const publicRef = doc(dbFirestore, 'users', user.id);
  let publicExists = false;
  try {
    const existingPublic = await getDoc(publicRef);
    publicExists = existingPublic.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, publicPath);
  }

  if (!publicExists) {
    const publicPayload: Record<string, any> = {
      uid: user.id,
      username: safeUsername,
      gamerTag: safeGamerTag,
      avatar: safeAvatar,
      city: safeCity,
      favoriteGame: safeFavoriteGame,
      role: user.role === 'admin' ? ('admin' as const) : ('gamer' as const),
      rank: safeRank,
      loyaltyPoints: safePoints,
      gamesPlayed: safeGamesPlayed,
      highScore: safeHighScore,
      favoriteGames: safeFavGames,
      achievements: safeAchievements,
      lastPage: safeLastPage,
      lastGameId: safeLastGameId,
      profileCompleted: safeProfileCompleted,
      identityVerified: Boolean(user.identityVerified),
      isBanned: Boolean(user.isBanned),
      identityMismatchWarnings: Math.max(0, Math.min(100, Math.floor(user.identityMismatchWarnings || 0))),
      isFlaggedForReview: Boolean(user.isFlaggedForReview),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (user.identityType) publicPayload.identityType = user.identityType;
    if (user.identityMasked) publicPayload.identityMasked = user.identityMasked.slice(0, 64);
    if (user.hwidHash) publicPayload.hwidHash = user.hwidHash.slice(0, 64);
    if (user.banReason) publicPayload.banReason = user.banReason.slice(0, 300);

    try {
      await setDoc(publicRef, publicPayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, publicPath);
    }
  } else {
    const publicUpdate: Record<string, any> = {
      gamerTag: safeGamerTag,
      avatar: safeAvatar,
      city: safeCity,
      favoriteGame: safeFavoriteGame,
      rank: safeRank,
      loyaltyPoints: safePoints,
      gamesPlayed: safeGamesPlayed,
      highScore: safeHighScore,
      favoriteGames: safeFavGames,
      achievements: safeAchievements,
      lastPage: safeLastPage,
      lastGameId: safeLastGameId,
      profileCompleted: safeProfileCompleted,
      updatedAt: serverTimestamp(),
    };
    if (typeof user.identityVerified === 'boolean') publicUpdate.identityVerified = user.identityVerified;
    if (user.identityType) publicUpdate.identityType = user.identityType;
    if (user.identityMasked) publicUpdate.identityMasked = user.identityMasked.slice(0, 64);
    if (user.hwidHash) publicUpdate.hwidHash = user.hwidHash.slice(0, 64);

    try {
      await updateDoc(publicRef, publicUpdate);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, publicPath);
    }
  }

  const rawEmail = (user.email || '').trim();
  const safeEmail = rawEmail.length >= 3 ? rawEmail.slice(0, 160) : 'gamer@gamezone.et';
  const safeFullName = (user.fullName || safeGamerTag).slice(0, 100);
  const safePhone = (user.phone || '').slice(0, 32);
  const safeWallet = Math.max(0, Math.min(10000000, Number(user.walletBalance || 0)));
  const safePlayerIds = sanitizeSavedPlayerIds(user.savedPlayerIds);
  const safePayMethod =
    user.lastPaymentMethod === 'cbe' || user.lastPaymentMethod === 'wallet'
      ? user.lastPaymentMethod
      : ('telebirr' as const);
  const safeNotifs = sanitizeNotifications(user.notifications);
  const safeKnownHwids = Array.isArray(user.knownHwidHashes)
    ? user.knownHwidHashes.map((h) => String(h).slice(0, 64)).filter(Boolean).slice(0, 10)
    : [];

  const privateRef = doc(dbFirestore, 'users', user.id, 'private', 'info');
  let privateExists = false;
  try {
    const existingPrivate = await getDoc(privateRef);
    privateExists = existingPrivate.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, privatePath);
  }

  if (!privateExists) {
    const privatePayload: Record<string, any> = {
      uid: user.id,
      email: safeEmail,
      fullName: safeFullName,
      phone: safePhone,
      walletBalance: safeWallet,
      savedPlayerIds: safePlayerIds,
      lastPaymentMethod: safePayMethod,
      notifications: safeNotifs,
      knownHwidHashes: safeKnownHwids,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (user.identityHash) privatePayload.identityHash = user.identityHash.slice(0, 64);
    if (user.identityVerifiedAt) privatePayload.identityVerifiedAt = user.identityVerifiedAt.slice(0, 64);
    if (user.dailyPlaytimeDate) privatePayload.dailyPlaytimeDate = user.dailyPlaytimeDate.slice(0, 16);
    if (typeof user.dailyPlaytimeSeconds === 'number') {
      privatePayload.dailyPlaytimeSeconds = Math.max(0, Math.min(86400, Math.floor(user.dailyPlaytimeSeconds)));
    }
    if (typeof user.dailyGameSeconds === 'number') {
      privatePayload.dailyGameSeconds = Math.max(0, Math.min(86400, Math.floor(user.dailyGameSeconds)));
    }
    try {
      await setDoc(privateRef, privatePayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, privatePath);
    }
  } else {
    const privateUpdate: Record<string, any> = {
      fullName: safeFullName,
      phone: safePhone,
      walletBalance: safeWallet,
      savedPlayerIds: safePlayerIds,
      lastPaymentMethod: safePayMethod,
      notifications: safeNotifs,
      knownHwidHashes: safeKnownHwids,
      updatedAt: serverTimestamp(),
    };
    if (user.identityHash) privateUpdate.identityHash = user.identityHash.slice(0, 64);
    if (user.identityVerifiedAt) privateUpdate.identityVerifiedAt = user.identityVerifiedAt.slice(0, 64);
    if (user.dailyPlaytimeDate) privateUpdate.dailyPlaytimeDate = user.dailyPlaytimeDate.slice(0, 16);
    if (typeof user.dailyPlaytimeSeconds === 'number') {
      privateUpdate.dailyPlaytimeSeconds = Math.max(0, Math.min(86400, Math.floor(user.dailyPlaytimeSeconds)));
    }
    if (typeof user.dailyGameSeconds === 'number') {
      privateUpdate.dailyGameSeconds = Math.max(0, Math.min(86400, Math.floor(user.dailyGameSeconds)));
    }
    try {
      await updateDoc(privateRef, privateUpdate);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, privatePath);
    }
  }
}

export async function fetchFirestoreUserProfile(
  uid: string,
  fallbackEmail?: string | null,
  emailVerified?: boolean
): Promise<UserAccount | null> {
  const publicPath = `users/${uid}`;
  const privatePath = `users/${uid}/private/info`;

  let publicSnap;
  try {
    publicSnap = await getDoc(doc(dbFirestore, 'users', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, publicPath);
  }

  if (!publicSnap.exists()) {
    return null;
  }

  const pub = publicSnap.data();

  let priv: Record<string, any> = {};
  try {
    const privSnap = await getDoc(doc(dbFirestore, 'users', uid, 'private', 'info'));
    if (privSnap.exists()) {
      priv = privSnap.data();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, privatePath);
  }

  const phone = String(priv.phone || '');
  const fullName = String(priv.fullName || pub.gamerTag || '');
  const city = String(pub.city || '');
  const inferredComplete = Boolean(
    pub.profileCompleted ||
      (phone.replace(/\D/g, '').length >= 9 && fullName.trim().length >= 2 && city.trim().length >= 2)
  );

  return {
    id: uid,
    username: String(pub.username || 'gamer'),
    gamerTag: String(pub.gamerTag || 'Gamer'),
    email: String(priv.email || fallbackEmail || ''),
    fullName,
    phone,
    city: formatEthiopianCity(city),
    favoriteGame: String(pub.favoriteGame || 'Free Fire & Battle Royale'),
    walletBalance: Number(priv.walletBalance ?? 0),
    emailVerified: Boolean(emailVerified),
    role: pub.role === 'admin' ? 'admin' : 'gamer',
    avatar: String(pub.avatar || DEFAULT_AVATAR_URL),
    rank: Number(pub.rank || 99),
    loyaltyPoints: Number(pub.loyaltyPoints || 0),
    gamesPlayed: Number(pub.gamesPlayed || 0),
    highScore: Number(pub.highScore || 0),
    favoriteGames: Array.isArray(pub.favoriteGames) ? pub.favoriteGames : [],
    achievements: Array.isArray(pub.achievements) ? pub.achievements : [],
    lastPage: pub.lastPage ? String(pub.lastPage) : 'home',
    lastGameId: pub.lastGameId ? String(pub.lastGameId) : 'freefire',
    profileCompleted: inferredComplete,
    savedPlayerIds: sanitizeSavedPlayerIds(priv.savedPlayerIds),
    lastPaymentMethod:
      priv.lastPaymentMethod === 'cbe' || priv.lastPaymentMethod === 'wallet'
        ? priv.lastPaymentMethod
        : 'telebirr',
    notifications: sanitizeNotifications(priv.notifications),
    identityVerified: Boolean(pub.identityVerified),
    identityType:
      pub.identityType === 'fayda_national_id' ||
      pub.identityType === 'ethiopian_fido' ||
      pub.identityType === 'passport'
        ? (pub.identityType as IdentityDocType)
        : undefined,
    identityMasked: pub.identityMasked ? String(pub.identityMasked) : undefined,
    identityHash: priv.identityHash ? String(priv.identityHash) : undefined,
    identityVerifiedAt: priv.identityVerifiedAt ? String(priv.identityVerifiedAt) : undefined,
    hwidHash: pub.hwidHash ? String(pub.hwidHash) : undefined,
    knownHwidHashes: Array.isArray(priv.knownHwidHashes) ? priv.knownHwidHashes.map(String) : undefined,
    isBanned: Boolean(pub.isBanned),
    banReason: pub.banReason ? String(pub.banReason) : undefined,
    identityMismatchWarnings: Number(pub.identityMismatchWarnings || 0),
    isFlaggedForReview: Boolean(pub.isFlaggedForReview),
    dailyPlaytimeDate: priv.dailyPlaytimeDate ? String(priv.dailyPlaytimeDate) : undefined,
    dailyPlaytimeSeconds:
      typeof priv.dailyPlaytimeSeconds === 'number' ? Number(priv.dailyPlaytimeSeconds) : undefined,
    dailyGameSeconds:
      typeof priv.dailyGameSeconds === 'number' ? Number(priv.dailyGameSeconds) : undefined,
    createdAt: formatTimestamp(pub.createdAt),
  };
}

export async function syncUserProfileUpdateToFirestore(user: UserAccount): Promise<void> {
  const activeUid = auth.currentUser?.uid;
  if (!activeUid || activeUid !== user.id) return;

  const rawTag = (user.gamerTag || 'Player').trim();
  const safeGamerTag = rawTag.length >= 3 ? rawTag.slice(0, 40) : `${rawTag}_ET`.slice(0, 40);

  const publicPath = `users/${user.id}`;
  const publicPatch: Record<string, any> = {
    gamerTag: safeGamerTag,
    avatar: (user.avatar || DEFAULT_AVATAR_URL).slice(0, 40000),
    city: formatEthiopianCity(user.city).slice(0, 80),
    favoriteGame: (user.favoriteGame || 'Free Fire & Battle Royale').slice(0, 80),
    rank: Math.max(1, Math.min(999999, Math.floor(user.rank || 99))),
    loyaltyPoints: Math.max(0, Math.min(10000000, Math.floor(user.loyaltyPoints || 0))),
    gamesPlayed: Math.max(0, Math.min(1000000, Math.floor(user.gamesPlayed || 0))),
    highScore: Math.max(0, Math.min(100000000, Math.floor(user.highScore || 0))),
    favoriteGames: (user.favoriteGames || []).slice(0, 20),
    achievements: (user.achievements || []).slice(0, 50),
    lastPage: (user.lastPage || 'home').slice(0, 40),
    lastGameId: (user.lastGameId || 'freefire').slice(0, 40),
    profileCompleted: Boolean(user.profileCompleted),
    identityVerified: Boolean(user.identityVerified),
    identityMismatchWarnings: Math.max(0, Math.min(100, Math.floor(user.identityMismatchWarnings || 0))),
    isFlaggedForReview: Boolean(user.isFlaggedForReview),
    updatedAt: serverTimestamp(),
  };
  if (user.identityType) publicPatch.identityType = user.identityType;
  if (typeof user.identityMasked === 'string') publicPatch.identityMasked = user.identityMasked.slice(0, 64);
  if (typeof user.hwidHash === 'string' && user.hwidHash) publicPatch.hwidHash = user.hwidHash.slice(0, 64);
  if (user.isBanned && (user.identityMismatchWarnings || 0) >= 3) {
    publicPatch.isBanned = true;
    publicPatch.banReason = (user.banReason || 'Auto-suspended after repeated ID name mismatches.').slice(0, 300);
  }

  try {
    await updateDoc(doc(dbFirestore, 'users', user.id), publicPatch);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, publicPath);
  }

  const privatePath = `users/${user.id}/private/info`;
  const privatePatch: Record<string, any> = {
    fullName: (user.fullName || safeGamerTag).slice(0, 100),
    phone: (user.phone || '').slice(0, 32),
    walletBalance: Math.max(0, Math.min(10000000, Number(user.walletBalance || 0))),
    savedPlayerIds: sanitizeSavedPlayerIds(user.savedPlayerIds),
    lastPaymentMethod:
      user.lastPaymentMethod === 'cbe' || user.lastPaymentMethod === 'wallet'
        ? user.lastPaymentMethod
        : ('telebirr' as const),
    notifications: sanitizeNotifications(user.notifications),
    knownHwidHashes: Array.isArray(user.knownHwidHashes)
      ? user.knownHwidHashes.map((h) => String(h).slice(0, 64)).filter(Boolean).slice(0, 10)
      : [],
    updatedAt: serverTimestamp(),
  };
  if (typeof user.identityHash === 'string') privatePatch.identityHash = user.identityHash.slice(0, 64);
  if (typeof user.identityVerifiedAt === 'string') {
    privatePatch.identityVerifiedAt = user.identityVerifiedAt.slice(0, 64);
  }
  if (typeof user.dailyPlaytimeDate === 'string' && user.dailyPlaytimeDate) {
    privatePatch.dailyPlaytimeDate = user.dailyPlaytimeDate.slice(0, 16);
  }
  if (typeof user.dailyPlaytimeSeconds === 'number') {
    privatePatch.dailyPlaytimeSeconds = Math.max(0, Math.min(86400, Math.floor(user.dailyPlaytimeSeconds)));
  }
  if (typeof user.dailyGameSeconds === 'number') {
    privatePatch.dailyGameSeconds = Math.max(0, Math.min(86400, Math.floor(user.dailyGameSeconds)));
  }

  try {
    await updateDoc(doc(dbFirestore, 'users', user.id, 'private', 'info'), privatePatch);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, privatePath);
  }
}

function mapOrderDoc(d: { id: string; data: () => Record<string, any> }, fallbackUid = ''): OrderItem {
  const data = d.data();
  return {
    id: String(data.id || d.id),
    userId: String(data.userId || fallbackUid),
    customerName: String(data.customerName || ''),
    customerPhone: String(data.customerPhone || ''),
    gameId: String(data.gameId || ''),
    gameName: String(data.gameName || ''),
    productId: String(data.productId || ''),
    productName: String(data.productName || ''),
    playerId: String(data.playerId || ''),
    playerZone: data.playerZone ? String(data.playerZone) : undefined,
    amountETB: Number(data.amountETB || 0),
    paymentMethod:
      data.paymentMethod === 'cbe' || data.paymentMethod === 'wallet' ? data.paymentMethod : 'telebirr',
    paymentStatus: data.paymentStatus || 'success',
    deliveryStatus: data.deliveryStatus || 'completed',
    createdAt: formatDateTimeEAT(data.createdAt),
    createdAtMs: extractTimestampMs(data.createdAt),
    receiptRef: String(data.receiptRef || ''),
    note: String(data.note || ''),
  };
}

export async function saveOrderToFirestore(order: OrderItem): Promise<void> {
  const activeUid = auth.currentUser?.uid;
  if (!activeUid || order.userId !== activeUid) return;

  const safePhone = (order.customerPhone || '').trim();
  const validPhone = safePhone.length >= 6 ? safePhone.slice(0, 32) : '+251000000000';
  const safePlayerId = (order.playerId || '').trim() || 'N/A';
  const safeReceipt = (order.receiptRef || '').trim();
  const validReceipt = safeReceipt.length >= 3 ? safeReceipt.slice(0, 64) : `ET-${Date.now()}`;

  const path = `orders/${order.id}`;
  try {
    await setDoc(doc(dbFirestore, 'orders', order.id), {
      id: order.id.slice(0, 64),
      userId: activeUid,
      customerName: (order.customerName || 'Gamer').trim().slice(0, 100) || 'Gamer',
      customerPhone: validPhone,
      gameId: order.gameId.slice(0, 40),
      gameName: order.gameName.slice(0, 80),
      productId: order.productId.slice(0, 64),
      productName: order.productName.slice(0, 100),
      playerId: safePlayerId.slice(0, 64),
      playerZone: (order.playerZone || 'Africa (Addis Ababa Server)').slice(0, 80),
      amountETB: Math.max(1, Math.min(1000000, Number(order.amountETB) || 1)),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      deliveryStatus: order.deliveryStatus,
      receiptRef: validReceipt,
      note: (order.note || '').slice(0, 300),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateOrderStatusInFirestore(
  orderId: string,
  paymentStatus: PaymentStatus,
  deliveryStatus: DeliveryStatus,
  note?: string
): Promise<void> {
  if (!auth.currentUser) return;
  const path = `orders/${orderId}`;
  try {
    const payload: Record<string, any> = {
      paymentStatus,
      deliveryStatus,
    };
    if (typeof note === 'string') {
      payload.note = note.slice(0, 300);
    }
    await updateDoc(doc(dbFirestore, 'orders', orderId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function fetchUserOrdersFromFirestore(uid: string): Promise<OrderItem[]> {
  const path = 'orders';
  try {
    const q = query(collection(dbFirestore, 'orders'), where('userId', '==', uid), limit(200));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => mapOrderDoc(d, uid))
      .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchAllOrdersFromFirestore(): Promise<OrderItem[]> {
  const path = 'orders';
  try {
    const q = query(collection(dbFirestore, 'orders'), limit(200));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => mapOrderDoc(d))
      .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchAllUsersFromFirestore(): Promise<UserAccount[]> {
  const path = 'users';
  try {
    const q = query(collection(dbFirestore, 'users'), limit(200));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const pub = d.data();
      return {
        id: String(pub.uid || d.id),
        username: String(pub.username || 'gamer'),
        gamerTag: String(pub.gamerTag || 'Gamer'),
        email: '',
        city: formatEthiopianCity(typeof pub.city === 'string' ? pub.city : undefined),
        favoriteGame: String(pub.favoriteGame || 'Free Fire & Battle Royale'),
        role: pub.role === 'admin' ? 'admin' : 'gamer',
        avatar: String(pub.avatar || DEFAULT_AVATAR_URL),
        rank: Number(pub.rank || 99),
        loyaltyPoints: Number(pub.loyaltyPoints || 0),
        gamesPlayed: Number(pub.gamesPlayed || 0),
        highScore: Number(pub.highScore || 0),
        favoriteGames: Array.isArray(pub.favoriteGames) ? pub.favoriteGames : [],
        achievements: Array.isArray(pub.achievements) ? pub.achievements : [],
        identityVerified: Boolean(pub.identityVerified),
        identityType:
          pub.identityType === 'fayda_national_id' ||
          pub.identityType === 'ethiopian_fido' ||
          pub.identityType === 'passport'
            ? (pub.identityType as IdentityDocType)
            : undefined,
        identityMasked: pub.identityMasked ? String(pub.identityMasked) : undefined,
        hwidHash: pub.hwidHash ? String(pub.hwidHash) : undefined,
        isBanned: Boolean(pub.isBanned),
        banReason: pub.banReason ? String(pub.banReason) : undefined,
        identityMismatchWarnings: Number(pub.identityMismatchWarnings || 0),
        isFlaggedForReview: Boolean(pub.isFlaggedForReview),
        createdAt: formatTimestamp(pub.createdAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveRegistrationToFirestore(reg: TournamentRegistration): Promise<void> {
  const activeUid = auth.currentUser?.uid;
  if (!activeUid || reg.userId !== activeUid) return;

  const safeContact = (reg.contactNumber || '').trim();
  const validContact = safeContact.length >= 6 ? safeContact.slice(0, 32) : '+251000000000';
  const safeSquad = Array.isArray(reg.squadMemberIds)
    ? reg.squadMemberIds.map((s) => String(s).trim().slice(0, 64)).filter(Boolean).slice(0, 4)
    : [];

  const path = `registrations/${reg.id}`;
  const regPayload: Record<string, any> = {
    id: reg.id.slice(0, 128),
    tournamentId: reg.tournamentId.slice(0, 80),
    tournamentTitle: reg.tournamentTitle.slice(0, 160),
    userId: activeUid,
    gamerTag: (reg.gamerTag.trim() || 'Gamer').slice(0, 60),
    gameId: reg.gameId.slice(0, 40),
    playerId: (reg.playerId.trim() || 'N/A').slice(0, 64),
    teamName: (reg.teamName || '').slice(0, 80),
    contactNumber: validContact,
    status: reg.status,
    registeredAt: reg.registeredAt.slice(0, 64),
    confirmationCode: (reg.confirmationCode || `GZ-REG-${reg.id.slice(-4).toUpperCase()}`).slice(0, 32),
    slotNumber: Math.max(1, Math.min(512, Math.floor(reg.slotNumber || 1))),
    entryType: reg.entryType === 'squad' ? 'squad' : 'solo',
    squadMemberIds: safeSquad,
    createdAt: serverTimestamp(),
  };
  if (reg.identityHash) regPayload.identityHash = reg.identityHash.slice(0, 64);
  if (reg.identityMasked) regPayload.identityMasked = reg.identityMasked.slice(0, 64);
  if (reg.hwidHash) regPayload.hwidHash = reg.hwidHash.slice(0, 64);
  if (reg.weekKey) regPayload.weekKey = reg.weekKey.slice(0, 16);
  if (typeof reg.createdAtMs === 'number' && Number.isFinite(reg.createdAtMs)) {
    regPayload.createdAtMs = Math.max(0, Math.floor(reg.createdAtMs));
  }

  try {
    await setDoc(doc(dbFirestore, 'registrations', reg.id), regPayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchUserRegistrationsFromFirestore(uid: string): Promise<TournamentRegistration[]> {
  const path = 'registrations';
  try {
    const q = query(collection(dbFirestore, 'registrations'), where('userId', '==', uid), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: String(data.id || d.id),
        tournamentId: String(data.tournamentId || ''),
        tournamentTitle: String(data.tournamentTitle || ''),
        userId: String(data.userId || uid),
        gamerTag: String(data.gamerTag || ''),
        gameId: String(data.gameId || ''),
        playerId: String(data.playerId || ''),
        teamName: data.teamName ? String(data.teamName) : undefined,
        contactNumber: String(data.contactNumber || ''),
        status: data.status || 'confirmed',
        registeredAt: String(data.registeredAt || ''),
        confirmationCode: data.confirmationCode ? String(data.confirmationCode) : undefined,
        slotNumber: typeof data.slotNumber === 'number' ? data.slotNumber : undefined,
        entryType: data.entryType === 'squad' ? 'squad' : 'solo',
        squadMemberIds: Array.isArray(data.squadMemberIds) ? data.squadMemberIds.map(String) : undefined,
        identityHash: data.identityHash ? String(data.identityHash) : undefined,
        identityMasked: data.identityMasked ? String(data.identityMasked) : undefined,
        hwidHash: data.hwidHash ? String(data.hwidHash) : undefined,
        weekKey: data.weekKey ? String(data.weekKey) : undefined,
        createdAtMs: typeof data.createdAtMs === 'number' ? Number(data.createdAtMs) : extractTimestampMs(data.createdAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchAllRegistrationsFromFirestore(): Promise<TournamentRegistration[]> {
  const path = 'registrations';
  try {
    const q = query(collection(dbFirestore, 'registrations'), limit(200));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: String(data.id || d.id),
        tournamentId: String(data.tournamentId || ''),
        tournamentTitle: String(data.tournamentTitle || ''),
        userId: String(data.userId || ''),
        gamerTag: String(data.gamerTag || ''),
        gameId: String(data.gameId || ''),
        playerId: String(data.playerId || ''),
        teamName: data.teamName ? String(data.teamName) : undefined,
        contactNumber: String(data.contactNumber || ''),
        status: data.status || 'confirmed',
        registeredAt: String(data.registeredAt || ''),
        confirmationCode: data.confirmationCode ? String(data.confirmationCode) : undefined,
        slotNumber: typeof data.slotNumber === 'number' ? data.slotNumber : undefined,
        entryType: data.entryType === 'squad' ? 'squad' : 'solo',
        squadMemberIds: Array.isArray(data.squadMemberIds) ? data.squadMemberIds.map(String) : undefined,
        identityHash: data.identityHash ? String(data.identityHash) : undefined,
        identityMasked: data.identityMasked ? String(data.identityMasked) : undefined,
        hwidHash: data.hwidHash ? String(data.hwidHash) : undefined,
        weekKey: data.weekKey ? String(data.weekKey) : undefined,
        createdAtMs: typeof data.createdAtMs === 'number' ? Number(data.createdAtMs) : extractTimestampMs(data.createdAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveTournamentToFirestore(tournament: TournamentEntity): Promise<void> {
  if (!auth.currentUser) return;
  const path = `tournaments/${tournament.id}`;
  const docRef = doc(dbFirestore, 'tournaments', tournament.id);
  let existsDoc = false;
  try {
    const snap = await getDoc(docRef);
    existsDoc = snap.exists();
  } catch {
    existsDoc = false;
  }

  const isVerifiedAdmin =
    Boolean(auth.currentUser.emailVerified) &&
    auth.currentUser.email?.trim().toLowerCase() === ADMIN_EMAIL;

  if (!existsDoc && !isVerifiedAdmin) {
    // Only admins can create new tournament documents in Firestore; skip client seed-create for non-admins
    return;
  }

  const basePayload = {
    id: tournament.id.slice(0, 128),
    gameId: tournament.gameId,
    gameName: tournament.gameName.slice(0, 80),
    title: tournament.title.slice(0, 160),
    banner: (tournament.banner || '').slice(0, 500),
    format: tournament.format.slice(0, 80),
    entryMode: tournament.entryMode || 'either',
    date: tournament.date.slice(0, 64),
    startTime: tournament.startTime.slice(0, 64),
    capacity: Math.max(2, Math.min(512, Math.floor(tournament.capacity || 16))),
    registeredCount: Math.max(0, Math.min(512, Math.floor(tournament.registeredCount || 0))),
    status: tournament.status,
    lobbyStatus: tournament.lobbyStatus || 'waiting',
    currentMatchLabel: (tournament.currentMatchLabel || 'Round 1 Scheduled').slice(0, 80),
    prizeRecognition: tournament.prizeRecognition.slice(0, 240),
    organizer: tournament.organizer.slice(0, 120),
    description: tournament.description.slice(0, 1000),
    rules: (tournament.rules || []).slice(0, 20),
    schedule: (tournament.schedule || []).slice(0, 20),
    faqs: (tournament.faqs || []).slice(0, 20),
    matches: (tournament.matches || []).slice(0, 64),
    roomPublished: Boolean(tournament.roomCredentials?.published),
    roomUnlockMode: tournament.roomCredentials?.unlockMode || 'at_start',
    roomUnlockAt: (tournament.roomCredentials?.unlockAt || `${tournament.date} ${tournament.startTime}`).slice(0, 80),
    updatedAt: serverTimestamp(),
  };

  try {
    if (!existsDoc) {
      await setDoc(docRef, {
        ...basePayload,
        createdAt: serverTimestamp(),
      });
    } else if (isVerifiedAdmin) {
      await updateDoc(docRef, basePayload);
    } else {
      await updateDoc(docRef, {
        registeredCount: basePayload.registeredCount,
        status: basePayload.status,
        matches: basePayload.matches,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, existsDoc ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteTournamentFromFirestore(tournamentId: string): Promise<void> {
  if (!auth.currentUser) return;
  const path = `tournaments/${tournamentId}`;
  try {
    await deleteDoc(doc(dbFirestore, 'tournaments', tournamentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveTournamentLobbyToFirestore(
  tournamentId: string,
  creds: TournamentRoomCredentials
): Promise<void> {
  if (!auth.currentUser) return;
  const path = `tournaments/${tournamentId}/lobby/credentials`;
  try {
    await setDoc(doc(dbFirestore, 'tournaments', tournamentId, 'lobby', 'credentials'), {
      tournamentId: tournamentId.slice(0, 128),
      roomId: (creds.roomId || '').slice(0, 64),
      roomPassword: (creds.roomPassword || '').slice(0, 64),
      server: (creds.server || 'Africa (Addis Ababa)').slice(0, 80),
      notes: (creds.notes || '').slice(0, 300),
      published: Boolean(creds.published),
      unlockMode: creds.unlockMode === 'immediate' ? 'immediate' : 'at_start',
      unlockAt: (creds.unlockAt || '').slice(0, 80),
      publishedAt: (creds.publishedAt || '').slice(0, 64),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchTournamentLobbyFromFirestore(
  tournamentId: string
): Promise<TournamentRoomCredentials | null> {
  try {
    const snap = await getDoc(doc(dbFirestore, 'tournaments', tournamentId, 'lobby', 'credentials'));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      roomId: String(data.roomId || ''),
      roomPassword: String(data.roomPassword || ''),
      server: String(data.server || 'Africa (Addis Ababa)'),
      notes: data.notes ? String(data.notes) : undefined,
      published: Boolean(data.published),
      unlockMode: data.unlockMode === 'immediate' ? 'immediate' : 'at_start',
      unlockAt: data.unlockAt ? String(data.unlockAt) : undefined,
      publishedAt: data.publishedAt ? String(data.publishedAt) : undefined,
    };
  } catch {
    return null;
  }
}

export async function fetchTournamentsFromFirestore(): Promise<TournamentEntity[]> {
  try {
    const q = query(collection(dbFirestore, 'tournaments'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: String(data.id || d.id),
        gameId: (data.gameId === 'pubg' || data.gameId === 'eafc' ? data.gameId : 'freefire') as TournamentEntity['gameId'],
        gameName: String(data.gameName || 'Free Fire'),
        title: String(data.title || 'Tournament'),
        banner: String(data.banner || ''),
        format: (data.format || 'Single Elimination 1v1') as TournamentEntity['format'],
        entryMode: data.entryMode === 'solo' || data.entryMode === 'squad' ? data.entryMode : 'either',
        date: String(data.date || ''),
        startTime: String(data.startTime || ''),
        capacity: Number(data.capacity || 16),
        registeredCount: Number(data.registeredCount || 0),
        status: data.status || 'open',
        lobbyStatus: data.lobbyStatus || 'waiting',
        currentMatchLabel: data.currentMatchLabel ? String(data.currentMatchLabel) : undefined,
        prizeRecognition: String(data.prizeRecognition || ''),
        organizer: String(data.organizer || 'GameZoneET'),
        description: String(data.description || ''),
        rules: Array.isArray(data.rules) ? data.rules.map(String) : [],
        schedule: Array.isArray(data.schedule) ? data.schedule.map(String) : [],
        faqs: Array.isArray(data.faqs) ? data.faqs : [],
        matches: Array.isArray(data.matches) ? data.matches : undefined,
        roomCredentials: data.roomPublished
          ? {
              roomId: '',
              roomPassword: '',
              server: 'Africa (Addis Ababa)',
              published: true,
              unlockMode: data.roomUnlockMode === 'immediate' ? 'immediate' : 'at_start',
              unlockAt: data.roomUnlockAt ? String(data.roomUnlockAt) : undefined,
            }
          : undefined,
      };
    });
  } catch {
    return [];
  }
}

export async function deleteRegistrationFromFirestore(regId: string): Promise<void> {
  if (!auth.currentUser) return;
  const path = `registrations/${regId}`;
  try {
    await deleteDoc(doc(dbFirestore, 'registrations', regId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

function mapTicketDoc(d: { id: string; data: () => Record<string, any> }, fallbackUid = ''): SupportTicket {
  const data = d.data();
  const validCats: SupportTicketCategory[] = ['support', 'payment', 'bug', 'abuse'];
  const cat = validCats.includes(data.category) ? (data.category as SupportTicketCategory) : 'support';
  return {
    id: String(data.id || d.id),
    userId: String(data.userId || fallbackUid),
    userName: String(data.userName || ''),
    email: String(data.email || ''),
    category: cat,
    subject: String(data.subject || ''),
    message: String(data.message || ''),
    status: data.status || 'open',
    adminNotes: String(data.adminNotes || ''),
    createdAt: formatDateTimeEAT(data.createdAt),
  };
}

export async function saveSupportTicketToFirestore(ticket: {
  id: string;
  userId: string;
  userName: string;
  email: string;
  category: SupportTicketCategory;
  subject: string;
  message: string;
}): Promise<void> {
  const activeUid = auth.currentUser?.uid;
  if (!activeUid || ticket.userId !== activeUid) return;

  const safeSubject = ticket.subject.trim();
  const safeMessage = ticket.message.trim();
  const path = `support_tickets/${ticket.id}`;
  try {
    await setDoc(doc(dbFirestore, 'support_tickets', ticket.id), {
      id: ticket.id.slice(0, 64),
      userId: activeUid,
      userName: (ticket.userName.trim() || 'Gamer').slice(0, 100),
      email: (ticket.email.trim() || 'gamer@gamezone.et').slice(0, 160),
      category: ticket.category,
      subject: (safeSubject.length >= 2 ? safeSubject : 'Support Inquiry').slice(0, 160),
      message: (safeMessage.length >= 5 ? safeMessage : `${safeMessage} (details)`).slice(0, 2000),
      status: 'open',
      adminNotes: '',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchUserSupportTicketsFromFirestore(uid: string): Promise<SupportTicket[]> {
  const path = 'support_tickets';
  try {
    const q = query(collection(dbFirestore, 'support_tickets'), where('userId', '==', uid), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapTicketDoc(d, uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchAllSupportTicketsFromFirestore(): Promise<SupportTicket[]> {
  const path = 'support_tickets';
  try {
    const q = query(collection(dbFirestore, 'support_tickets'), limit(200));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapTicketDoc(d));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function updateSupportTicketStatusInFirestore(
  ticketId: string,
  status: 'open' | 'in_progress' | 'resolved',
  adminNotes: string
): Promise<void> {
  if (!auth.currentUser) return;
  const path = `support_tickets/${ticketId}`;
  try {
    await updateDoc(doc(dbFirestore, 'support_tickets', ticketId), {
      status,
      adminNotes: adminNotes.slice(0, 500),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

function mapDisputeDoc(d: { id: string; data: () => Record<string, any> }, fallbackUid = ''): TournamentDispute {
  const data = d.data();
  return {
    id: String(data.id || d.id),
    userId: String(data.userId || fallbackUid),
    matchId: String(data.matchId || ''),
    tournamentId: String(data.tournamentId || ''),
    reportedBy: String(data.reportedBy || ''),
    reason: String(data.reason || ''),
    description: String(data.description || ''),
    status: data.status || 'open',
    adminNotes: String(data.adminNotes || ''),
    createdAt: formatDateTimeEAT(data.createdAt),
  };
}

export async function saveDisputeToFirestore(dispute: TournamentDispute): Promise<void> {
  const activeUid = auth.currentUser?.uid;
  if (!activeUid || dispute.userId !== activeUid) return;

  const path = `disputes/${dispute.id}`;
  try {
    await setDoc(doc(dbFirestore, 'disputes', dispute.id), {
      id: dispute.id.slice(0, 64),
      userId: activeUid,
      matchId: (dispute.matchId || 'match').slice(0, 64),
      tournamentId: (dispute.tournamentId || 'tournament').slice(0, 80),
      reportedBy: (dispute.reportedBy || 'Gamer').slice(0, 60),
      reason: (dispute.reason || 'Match Dispute').slice(0, 160),
      description: (dispute.description.trim().length >= 3 ? dispute.description.trim() : 'Dispute submitted').slice(0, 1000),
      status: 'open',
      adminNotes: '',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchUserDisputesFromFirestore(uid: string): Promise<TournamentDispute[]> {
  const path = 'disputes';
  try {
    const q = query(collection(dbFirestore, 'disputes'), where('userId', '==', uid), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapDisputeDoc(d, uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchAllDisputesFromFirestore(): Promise<TournamentDispute[]> {
  const path = 'disputes';
  try {
    const q = query(collection(dbFirestore, 'disputes'), limit(200));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapDisputeDoc(d));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function resolveDisputeInFirestore(
  disputeId: string,
  status: 'resolved' | 'dismissed',
  adminNotes: string
): Promise<void> {
  if (!auth.currentUser) return;
  const path = `disputes/${disputeId}`;
  try {
    await updateDoc(doc(dbFirestore, 'disputes', disputeId), {
      status,
      adminNotes: adminNotes.slice(0, 500),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// -------------------------------------------------------------
// SECURITY, IDENTITY DEDUPLICATION, HWID & AUDIT LOG SYNC
// -------------------------------------------------------------

export async function updateUserBanInFirestore(
  uid: string,
  isBanned: boolean,
  banReason: string
): Promise<void> {
  if (!auth.currentUser) return;
  const path = `users/${uid}`;
  try {
    const patch: Record<string, any> = {
      isBanned: Boolean(isBanned),
      banReason: banReason.slice(0, 300),
      updatedAt: serverTimestamp(),
    };
    if (!isBanned) {
      patch.isFlaggedForReview = false;
      patch.identityMismatchWarnings = 0;
    }
    await updateDoc(doc(dbFirestore, 'users', uid), patch);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function revokeUserIdentityInFirestore(
  uid: string,
  identityHash?: string
): Promise<void> {
  if (!auth.currentUser) return;
  try {
    await updateDoc(doc(dbFirestore, 'users', uid), {
      identityVerified: false,
      identityType: deleteField(),
      identityMasked: '',
      updatedAt: serverTimestamp(),
    });
    if (identityHash) {
      await deleteDoc(doc(dbFirestore, 'identity_bindings', identityHash));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

export async function lookupIdentityBindingFromFirestore(
  identityHash: string
): Promise<IdentityBindingRecord | null> {
  if (!auth.currentUser) return null;
  try {
    const snap = await getDoc(doc(dbFirestore, 'identity_bindings', identityHash));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      identityHash: String(data.identityHash || identityHash),
      userId: String(data.userId || ''),
      idType: (data.idType || 'fayda_national_id') as IdentityDocType,
      maskedIdentifier: String(data.maskedIdentifier || ''),
      hwidHash: data.hwidHash ? String(data.hwidHash) : undefined,
      verifiedAt: String(data.verifiedAt || ''),
    };
  } catch {
    return null;
  }
}

export async function createIdentityBindingInFirestore(
  record: IdentityBindingRecord
): Promise<void> {
  const activeUid = auth.currentUser?.uid;
  if (!activeUid || record.userId !== activeUid) return;
  const path = `identity_bindings/${record.identityHash}`;
  const payload: Record<string, any> = {
    identityHash: record.identityHash.slice(0, 64),
    userId: activeUid,
    idType: record.idType,
    maskedIdentifier: record.maskedIdentifier.slice(0, 64),
    verifiedAt: record.verifiedAt.slice(0, 64),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (record.hwidHash) payload.hwidHash = record.hwidHash.slice(0, 64);

  try {
    await setDoc(doc(dbFirestore, 'identity_bindings', record.identityHash), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchAllIdentityBindingsFromFirestore(): Promise<IdentityBindingRecord[]> {
  if (!auth.currentUser) return [];
  try {
    const snap = await getDocs(query(collection(dbFirestore, 'identity_bindings'), limit(200)));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        identityHash: String(data.identityHash || d.id),
        userId: String(data.userId || ''),
        idType: (data.idType || 'fayda_national_id') as IdentityDocType,
        maskedIdentifier: String(data.maskedIdentifier || ''),
        hwidHash: data.hwidHash ? String(data.hwidHash) : undefined,
        verifiedAt: String(data.verifiedAt || ''),
      };
    });
  } catch {
    return [];
  }
}

export async function fetchHwidRecordFromFirestore(
  hwidHash: string
): Promise<HwidRegistryRecord | null> {
  if (!auth.currentUser || !hwidHash) return null;
  try {
    const snap = await getDoc(doc(dbFirestore, 'hwid_registry', hwidHash));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      hwidHash: String(data.hwidHash || hwidHash),
      lastUserId: String(data.lastUserId || ''),
      associatedUserIds: Array.isArray(data.associatedUserIds) ? data.associatedUserIds.map(String) : [],
      deviceSummary: String(data.deviceSummary || ''),
      flagged: Boolean(data.flagged),
      blocked: Boolean(data.blocked),
      flaggedReason: data.flaggedReason ? String(data.flaggedReason) : undefined,
      updatedAt: formatDateTimeEAT(data.updatedAt),
    };
  } catch {
    return null;
  }
}

export async function upsertHwidRecordInFirestore(
  record: HwidRegistryRecord
): Promise<HwidRegistryRecord | null> {
  const activeUid = auth.currentUser?.uid;
  if (!activeUid || !record.hwidHash) return null;

  const ref = doc(dbFirestore, 'hwid_registry', record.hwidHash);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const payload: Record<string, any> = {
        hwidHash: record.hwidHash.slice(0, 64),
        lastUserId: activeUid,
        associatedUserIds: Array.from(new Set([activeUid, ...record.associatedUserIds])).slice(0, 10),
        deviceSummary: (record.deviceSummary || 'Web Client').slice(0, 160),
        flagged: Boolean(record.flagged),
        blocked: false,
        updatedAt: serverTimestamp(),
      };
      if (record.flaggedReason) payload.flaggedReason = record.flaggedReason.slice(0, 300);
      await setDoc(ref, payload);
      return {
        ...record,
        associatedUserIds: payload.associatedUserIds,
        blocked: false,
      };
    }

    const existing = snap.data();
    const existingUids: string[] = Array.isArray(existing.associatedUserIds)
      ? existing.associatedUserIds.map(String)
      : [];
    const mergedUids = Array.from(new Set([...existingUids, activeUid])).slice(0, 10);
    const isMultiAccount = mergedUids.length > 1;
    const nextFlagged = Boolean(existing.flagged) || Boolean(record.flagged) || isMultiAccount;
    const nextReason =
      record.flaggedReason ||
      (isMultiAccount
        ? `Hardware fingerprint observed across ${mergedUids.length} distinct accounts.`
        : existing.flaggedReason);

    const updatePayload: Record<string, any> = {
      hwidHash: record.hwidHash.slice(0, 64),
      lastUserId: activeUid,
      associatedUserIds: mergedUids,
      deviceSummary: (record.deviceSummary || existing.deviceSummary || 'Web Client').slice(0, 160),
      flagged: nextFlagged,
      blocked: Boolean(existing.blocked),
      updatedAt: serverTimestamp(),
    };
    if (nextReason) updatePayload.flaggedReason = String(nextReason).slice(0, 300);

    await setDoc(ref, updatePayload);
    return {
      hwidHash: record.hwidHash,
      lastUserId: activeUid,
      associatedUserIds: mergedUids,
      deviceSummary: updatePayload.deviceSummary,
      flagged: nextFlagged,
      blocked: Boolean(existing.blocked),
      flaggedReason: updatePayload.flaggedReason,
      updatedAt: formatDateTimeEAT(Date.now()),
    };
  } catch {
    return null;
  }
}

export async function fetchAllHwidRecordsFromFirestore(): Promise<HwidRegistryRecord[]> {
  if (!auth.currentUser) return [];
  try {
    const snap = await getDocs(query(collection(dbFirestore, 'hwid_registry'), limit(200)));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        hwidHash: String(data.hwidHash || d.id),
        lastUserId: String(data.lastUserId || ''),
        associatedUserIds: Array.isArray(data.associatedUserIds) ? data.associatedUserIds.map(String) : [],
        deviceSummary: String(data.deviceSummary || ''),
        flagged: Boolean(data.flagged),
        blocked: Boolean(data.blocked),
        flaggedReason: data.flaggedReason ? String(data.flaggedReason) : undefined,
        updatedAt: formatDateTimeEAT(data.updatedAt),
      };
    });
  } catch {
    return [];
  }
}

export async function updateHwidStatusInFirestore(
  hwidHash: string,
  patch: { blocked: boolean; flagged: boolean; flaggedReason?: string }
): Promise<void> {
  if (!auth.currentUser) return;
  const path = `hwid_registry/${hwidHash}`;
  try {
    const updatePayload: Record<string, any> = {
      blocked: Boolean(patch.blocked),
      flagged: Boolean(patch.flagged),
      updatedAt: serverTimestamp(),
    };
    if (typeof patch.flaggedReason === 'string') {
      updatePayload.flaggedReason = patch.flaggedReason.slice(0, 300);
    }
    await updateDoc(doc(dbFirestore, 'hwid_registry', hwidHash), updatePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveSecurityEventToFirestore(event: SecurityThreatEvent): Promise<void> {
  const activeUid = auth.currentUser?.uid;
  if (!activeUid) return;
  const safeId = event.id.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 64);
  try {
    await setDoc(doc(dbFirestore, 'security_events', safeId), {
      id: safeId,
      userId: (event.userId && event.userId !== 'guest' ? event.userId : activeUid).slice(0, 128),
      gamerTag: (event.gamerTag || 'Session').slice(0, 60),
      category: event.category,
      severity: event.severity,
      summary: (event.summary || 'Security event').slice(0, 400),
      hwidHash: (event.hwidHash || '').slice(0, 64),
      endpointOrSurface: (event.endpointOrSurface || 'web').slice(0, 120),
      blocked: Boolean(event.blocked),
      createdAt: serverTimestamp(),
    });
  } catch {
    // Do not crash UI on security telemetry sync
  }
}

export async function fetchAllSecurityEventsFromFirestore(): Promise<SecurityThreatEvent[]> {
  if (!auth.currentUser) return [];
  try {
    const snap = await getDocs(query(collection(dbFirestore, 'security_events'), limit(200)));
    return snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: String(data.id || d.id),
          userId: String(data.userId || ''),
          gamerTag: String(data.gamerTag || 'Unknown'),
          category: (data.category || 'rate_limit') as SecurityThreatCategory,
          severity: (data.severity || 'medium') as SecurityThreatSeverity,
          summary: String(data.summary || ''),
          hwidHash: String(data.hwidHash || ''),
          endpointOrSurface: String(data.endpointOrSurface || ''),
          blocked: Boolean(data.blocked),
          timestamp: formatDateTimeEAT(data.createdAt),
          timestampMs: extractTimestampMs(data.createdAt),
        };
      })
      .sort((a, b) => b.timestampMs - a.timestampMs);
  } catch {
    return [];
  }
}

export async function saveAuditLogToFirestore(entry: AdminAuditLogEntry): Promise<void> {
  const activeUid = auth.currentUser?.uid;
  if (!activeUid) return;
  const safeId = entry.id.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 64);
  const path = `audit_logs/${safeId}`;
  try {
    await setDoc(doc(dbFirestore, 'audit_logs', safeId), {
      id: safeId,
      adminUid: activeUid,
      adminEmail: (entry.adminEmail || auth.currentUser?.email || ADMIN_EMAIL).slice(0, 160),
      action: entry.action.slice(0, 64),
      targetType: entry.targetType.slice(0, 40),
      targetId: entry.targetId.slice(0, 128),
      summary: entry.summary.slice(0, 400),
      ipMasked: (entry.ipMasked || 'hidden').slice(0, 64),
      sessionFingerprint: (entry.sessionFingerprint || '').slice(0, 160),
      prevHash: entry.prevHash.slice(0, 64),
      entryHash: entry.entryHash.slice(0, 64),
      timestampLabel: entry.timestamp.slice(0, 64),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchAllAuditLogsFromFirestore(): Promise<AdminAuditLogEntry[]> {
  if (!auth.currentUser) return [];
  try {
    const snap = await getDocs(query(collection(dbFirestore, 'audit_logs'), limit(200)));
    return snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: String(data.id || d.id),
          adminUid: String(data.adminUid || ''),
          adminEmail: String(data.adminEmail || ''),
          action: String(data.action || ''),
          targetType: String(data.targetType || ''),
          targetId: String(data.targetId || ''),
          summary: String(data.summary || ''),
          ipMasked: String(data.ipMasked || 'hidden'),
          sessionFingerprint: String(data.sessionFingerprint || ''),
          prevHash: String(data.prevHash || ''),
          entryHash: String(data.entryHash || ''),
          timestamp: String(data.timestampLabel || formatDateTimeEAT(data.createdAt)),
          timestampMs: extractTimestampMs(data.createdAt),
        };
      })
      .sort((a, b) => b.timestampMs - a.timestampMs);
  } catch {
    return [];
  }
}

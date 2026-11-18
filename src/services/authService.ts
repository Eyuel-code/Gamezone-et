import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ADMIN_EMAIL } from '@/lib/env';
import { db, type UserAccount } from '@/services/db';
import { DEFAULT_AVATAR_URL } from '@/utils/avatarUtils';
import { formatEthiopianCity } from '@/utils/location';
import {
  createFirestoreUserProfile,
  fetchFirestoreUserProfile,
  fetchUserDisputesFromFirestore,
  fetchUserOrdersFromFirestore,
  fetchUserRegistrationsFromFirestore,
  fetchUserSupportTicketsFromFirestore,
} from '@/services/firestoreSync';

export { ADMIN_EMAIL };

export const BOOTSTRAP_ADMIN_EMAILS = [ADMIN_EMAIL];

export function isBootstrapAdminEmail(email?: string | null, emailVerified?: boolean): boolean {
  if (!email || !emailVerified) return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL;
}

/**
 * Strict Admin Portal access gate: returns true ONLY when the currently authenticated
 * account's email matches the verified ADMIN_EMAIL.
 */
export function isAuthorizedAdminUser(
  user?: { email?: string | null; emailVerified?: boolean } | null
): boolean {
  if (!user?.email) return false;
  if (user.emailVerified === false) return false;
  const userEmail = user.email.trim().toLowerCase();
  if (userEmail !== ADMIN_EMAIL) return false;
  if (auth.currentUser) {
    if (!auth.currentUser.emailVerified) return false;
    if (auth.currentUser.email?.trim().toLowerCase() !== ADMIN_EMAIL) return false;
  }
  return true;
}

export interface SignUpInput {
  email: string;
  password: string;
  gamerTag: string;
  fullName: string;
  phone: string;
  city: string;
  favoriteGame: string;
  avatar: string;
}

export interface AuthResult {
  user: UserAccount;
  emailVerificationSent: boolean;
}

export function mapAuthErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please double-check and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few moments before trying again.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in window was closed before completing sign-in.';
    case 'auth/cancelled-popup-request':
      return 'Google sign-in popup was cancelled. Please try again.';
    case 'auth/popup-blocked':
      return 'Popup was blocked by your browser. Please allow popups for this site and try again.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method.';
    case 'auth/unauthorized-domain':
      return 'This domain is not yet authorized in Firebase Authentication -> Settings -> Authorized domains.';
    case 'auth/operation-not-allowed':
      return 'This sign-in provider is not enabled in the Firebase Console yet. Enable it under Authentication -> Sign-in method.';
    case 'auth/network-request-failed':
      return 'Network error while connecting to authentication server. Please check your connection.';
    default:
      return err instanceof Error ? err.message : 'Authentication failed. Please try again.';
  }
}

let signUpInProgress = false;
const hydrationInFlight = new Map<string, Promise<UserAccount>>();

async function performHydrateSessionFromFirebaseUser(fbUser: FirebaseUser): Promise<UserAccount> {
  const isAdminAccount = isBootstrapAdminEmail(fbUser.email, fbUser.emailVerified);

  let profile = await fetchFirestoreUserProfile(
    fbUser.uid,
    fbUser.email,
    fbUser.emailVerified
  );

  if (!profile) {
    const rawTag = fbUser.displayName?.trim() || fbUser.email?.split('@')[0] || 'EthiopianGamer';
    const safeTag = rawTag.length >= 3 ? rawTag.slice(0, 40) : `${rawTag}_ET`.slice(0, 40);
    const safeAvatar =
      fbUser.photoURL && fbUser.photoURL.length <= 40000 ? fbUser.photoURL : DEFAULT_AVATAR_URL;

    const phone = fbUser.phoneNumber || '';
    const hasMandatory = Boolean(phone.replace(/\D/g, '').length >= 9 && safeTag.length >= 3);

    profile = {
      id: fbUser.uid,
      username: safeTag.toLowerCase().replace(/[^a-z0-9_\-]/g, '_').slice(0, 40) || 'gamer',
      gamerTag: safeTag,
      email: fbUser.email || '',
      fullName: fbUser.displayName?.trim() || safeTag,
      phone,
      city: 'Addis Ababa (Finfinnee)',
      favoriteGame: 'Free Fire & Battle Royale',
      walletBalance: 0,
      emailVerified: fbUser.emailVerified,
      role: isAdminAccount ? 'admin' : 'gamer',
      avatar: safeAvatar,
      rank: 99,
      loyaltyPoints: 0,
      gamesPlayed: 0,
      highScore: 0,
      favoriteGames: [],
      achievements: [
        {
          id: 'ach-joined',
          title: 'Arena Challenger',
          desc: 'Registered a verified GameZoneET account',
          date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          icon: 'zap',
        },
      ],
      savedPlayerIds: {},
      lastPaymentMethod: 'telebirr',
      lastPage: 'home',
      lastGameId: 'freefire',
      profileCompleted: hasMandatory,
      notifications: [
        {
          id: `notif-welcome-${Date.now()}`,
          title: 'Welcome to GameZoneET',
          message: hasMandatory
            ? `Your profile (${safeTag}) is active and synced with Cloud Firestore.`
            : 'Complete your mandatory phone & city info in Profile to speed up Telebirr/CBE top-ups.',
          type: hasMandatory ? 'success' : 'info',
          createdAt: 'Just now',
          createdAtMs: Date.now(),
          read: false,
          targetPage: hasMandatory ? 'home' : 'profile',
        },
      ],
      createdAt: new Date().toISOString().split('T')[0],
    };
    await createFirestoreUserProfile(profile);
  } else {
    profile.emailVerified = fbUser.emailVerified;
    profile.city = formatEthiopianCity(profile.city);
    if (isAdminAccount) {
      profile.role = 'admin';
    }
  }

  db.upsertAuthenticatedUser(profile);

  // Hydrate user-scoped orders, tournament registrations, support tickets, and disputes from Firestore
  try {
    const [orders, regs, tickets, disputes] = await Promise.all([
      fetchUserOrdersFromFirestore(fbUser.uid),
      fetchUserRegistrationsFromFirestore(fbUser.uid),
      fetchUserSupportTicketsFromFirestore(fbUser.uid),
      fetchUserDisputesFromFirestore(fbUser.uid),
    ]);
    db.hydrateUserOrders(fbUser.uid, orders);
    db.hydrateUserRegistrations(fbUser.uid, regs);
    db.hydrateUserSupportTickets(fbUser.uid, tickets);
    db.hydrateUserDisputes(fbUser.uid, disputes);
    await db.syncTournamentsFromFirestore(fbUser.uid, isAdminAccount);
  } catch (err) {
    console.warn('Could not sync user Firestore records:', err);
  }

  void db.registerDeviceHwid(profile.id, profile.gamerTag);

  return profile;
}

function hydrateSessionFromFirebaseUser(fbUser: FirebaseUser): Promise<UserAccount> {
  const existing = hydrationInFlight.get(fbUser.uid);
  if (existing) {
    return existing;
  }
  const promise = performHydrateSessionFromFirebaseUser(fbUser).finally(() => {
    hydrationInFlight.delete(fbUser.uid);
  });
  hydrationInFlight.set(fbUser.uid, promise);
  return promise;
}

export async function signInWithGoogle(): Promise<UserAccount> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const credential = await signInWithPopup(auth, provider);
  return hydrateSessionFromFirebaseUser(credential.user);
}

export async function signUpWithEmail(input: SignUpInput): Promise<AuthResult> {
  signUpInProgress = true;
  try {
    const credential = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
    const fbUser = credential.user;

    try {
      await updateProfile(fbUser, { displayName: input.gamerTag.trim() });
    } catch (err) {
      console.warn('updateProfile skipped:', err);
    }

    let emailVerificationSent = false;
    try {
      await sendEmailVerification(fbUser);
      emailVerificationSent = true;
    } catch (err) {
      console.warn('Email verification dispatch skipped:', err);
    }

    const normalizedTag = input.gamerTag.trim().slice(0, 40);
    const cleanHandle =
      normalizedTag.toLowerCase().replace(/[^a-z0-9_\-]/g, '_').slice(0, 40) || `gamer_${fbUser.uid.slice(0, 6)}`;

    const profile: UserAccount = {
      id: fbUser.uid,
      username: cleanHandle,
      gamerTag: normalizedTag,
      email: input.email.trim(),
      fullName: input.fullName.trim() || normalizedTag,
      phone: input.phone.trim(),
      city: formatEthiopianCity(input.city),
      favoriteGame: input.favoriteGame || 'Free Fire & Battle Royale',
      walletBalance: 0,
      emailVerified: fbUser.emailVerified,
      role: 'gamer',
      avatar: input.avatar && input.avatar.length <= 40000 ? input.avatar : DEFAULT_AVATAR_URL,
      rank: 99,
      loyaltyPoints: 0,
      gamesPlayed: 0,
      highScore: 0,
      favoriteGames: [],
      achievements: [
        {
          id: 'ach-welcome',
          title: 'New Challenger',
          desc: 'Created an official GameZoneET gamer profile',
          date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          icon: 'zap',
        },
      ],
      savedPlayerIds: {},
      lastPaymentMethod: 'telebirr',
      lastPage: 'home',
      lastGameId: 'freefire',
      profileCompleted: true,
      notifications: [
        {
          id: `notif-signup-${Date.now()}`,
          title: 'Account Registered',
          message: 'Your gamer details are saved in Firestore. Verification link sent to your email.',
          type: 'success',
          createdAt: 'Just now',
          createdAtMs: Date.now(),
          read: false,
          targetPage: 'profile',
        },
      ],
      createdAt: new Date().toISOString().split('T')[0],
    };

    await createFirestoreUserProfile(profile);
    db.upsertAuthenticatedUser(profile);
    void db.registerDeviceHwid(profile.id, profile.gamerTag);

    return { user: profile, emailVerificationSent };
  } finally {
    signUpInProgress = false;
  }
}

export async function signInWithEmail(email: string, password: string): Promise<UserAccount> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return hydrateSessionFromFirebaseUser(credential.user);
}

export async function resendVerificationEmail(): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('No signed-in account found.');
  }
  await sendEmailVerification(auth.currentUser);
}

export async function refreshEmailVerification(): Promise<boolean> {
  if (!auth.currentUser) return false;
  await reload(auth.currentUser);
  const verified = Boolean(auth.currentUser.emailVerified);
  const current = db.getCurrentUser();
  if (current && current.id === auth.currentUser.uid) {
    const isAdminAccount = isBootstrapAdminEmail(auth.currentUser.email, verified);
    db.upsertAuthenticatedUser({
      ...current,
      emailVerified: verified,
      role: isAdminAccount ? 'admin' : current.role,
    });
  }
  return verified;
}

export async function resetPasswordWithEmail(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function signOutAccount(): Promise<void> {
  await signOut(auth);
  db.clearSessionRecords();
}

export function initAuthObserver(onReady?: () => void): () => void {
  let firstEmission = true;
  return onAuthStateChanged(auth, async (fbUser) => {
    try {
      if (fbUser) {
        if (signUpInProgress) {
          return;
        }
        await hydrateSessionFromFirebaseUser(fbUser);
      } else {
        db.setCurrentUserId(null);
      }
    } catch (err) {
      console.error('Auth state hydration error:', err);
    } finally {
      if (firstEmission) {
        firstEmission = false;
        onReady?.();
      }
    }
  });
}

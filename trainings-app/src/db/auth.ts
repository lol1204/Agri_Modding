import { getFirebaseAuth, loadAuthModule } from '@/integrations/firebase';
import type { Unsubscribe } from './types';

export type AuthUser = { uid: string; email: string | null };

/** Meldet Änderungen am Login-Status (auch offline: der Login bleibt gespeichert). */
export async function watchAuth(cb: (user: AuthUser | null) => void): Promise<Unsubscribe> {
  const [auth, { onAuthStateChanged }] = await Promise.all([getFirebaseAuth(), loadAuthModule()]);
  return onAuthStateChanged(auth, (user) => cb(user ? { uid: user.uid, email: user.email } : null));
}

export async function signIn(email: string, password: string): Promise<void> {
  const [auth, { signInWithEmailAndPassword }] = await Promise.all([getFirebaseAuth(), loadAuthModule()]);
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signUp(email: string, password: string): Promise<void> {
  const [auth, { createUserWithEmailAndPassword }] = await Promise.all([getFirebaseAuth(), loadAuthModule()]);
  await createUserWithEmailAndPassword(auth, email.trim(), password);
}

export async function resetPassword(email: string): Promise<void> {
  const [auth, { sendPasswordResetEmail }] = await Promise.all([getFirebaseAuth(), loadAuthModule()]);
  await sendPasswordResetEmail(auth, email.trim());
}

export async function signOutUser(): Promise<void> {
  const [auth, { signOut }] = await Promise.all([getFirebaseAuth(), loadAuthModule()]);
  await signOut(auth);
}

/**
 * Konto löschen: zuerst Passwort bestätigen (Firebase verlangt eine frische
 * Anmeldung), dann alle Daten löschen, dann das Konto selbst.
 */
export async function deleteAccount(password: string, deleteAllData: () => Promise<void>): Promise<void> {
  const [auth, { EmailAuthProvider, reauthenticateWithCredential, deleteUser }] = await Promise.all([
    getFirebaseAuth(),
    loadAuthModule(),
  ]);
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('Nicht angemeldet.');
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  await deleteAllData();
  await deleteUser(user);
}

/** Verständliche deutsche Fehlermeldungen. */
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-Mail oder Passwort stimmt nicht.';
    case 'auth/invalid-email':
      return 'Bitte eine gültige E-Mail-Adresse eingeben.';
    case 'auth/email-already-in-use':
      return 'Für diese E-Mail gibt es schon ein Konto. Melde dich einfach an.';
    case 'auth/weak-password':
      return 'Das Passwort braucht mindestens 6 Zeichen.';
    case 'auth/missing-password':
      return 'Bitte ein Passwort eingeben.';
    case 'auth/network-request-failed':
      return 'Keine Verbindung. Für die Anmeldung brauchst du einmal Internet.';
    case 'auth/too-many-requests':
      return 'Zu viele Versuche. Bitte warte kurz und versuche es dann erneut.';
    case 'auth/requires-recent-login':
      return 'Bitte bestätige dein Passwort noch einmal.';
    default:
      if (code.startsWith('auth/api-key') || code === 'auth/invalid-api-key' || code === 'auth/configuration-not-found') {
        return 'Die Firebase-Einstellungen passen nicht. Bitte die Werte in .env prüfen (siehe README).';
      }
      return 'Das hat nicht geklappt. Bitte versuche es erneut.';
  }
}

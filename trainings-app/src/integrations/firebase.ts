/**
 * Firebase-Start. Wird nur im Browser und erst bei Bedarf geladen (lazy):
 * – nie während des Builds (statischer Export läuft in Node),
 * – die Firebase-Bibliothek wird per dynamischem Import nachgeladen,
 *   damit der erste Bildschirm schneller erscheint.
 */
import type { FirebaseApp, FirebaseOptions } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

// Expo ersetzt EXPO_PUBLIC_-Variablen beim Build durch die Werte aus `.env`.
const config: FirebaseOptions = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

/** Sind Firebase-Werte hinterlegt? Wenn nicht, läuft die App im lokalen Modus. */
export function isFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.projectId && config.appId);
}

function assertBrowser(): void {
  if (typeof window === 'undefined') {
    throw new Error('Firebase darf nur im Browser genutzt werden.');
  }
}

let appPromise: Promise<FirebaseApp> | null = null;
let dbPromise: Promise<Firestore> | null = null;
let authPromise: Promise<Auth> | null = null;

function getFirebaseApp(): Promise<FirebaseApp> {
  assertBrowser();
  if (!isFirebaseConfigured()) throw new Error('Firebase ist nicht konfiguriert (.env fehlt).');
  appPromise ??= import('firebase/app').then(({ initializeApp, getApps, getApp }) =>
    getApps().length ? getApp() : initializeApp(config),
  );
  return appPromise;
}

/** Firestore-Modul (Funktionen wie doc, setDoc …), ebenfalls nachgeladen. */
export function loadFirestoreModule(): Promise<typeof import('firebase/firestore')> {
  return import('firebase/firestore');
}

/** Firestore mit Offline-Cache im Browser (IndexedDB), auch über mehrere Tabs. */
export function getDb(): Promise<Firestore> {
  dbPromise ??= Promise.all([getFirebaseApp(), loadFirestoreModule()]).then(
    ([app, { initializeFirestore, persistentLocalCache, persistentMultipleTabManager }]) =>
      initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
        ignoreUndefinedProperties: true,
      }),
  );
  return dbPromise;
}

/** Auth-Modul (signInWithEmailAndPassword …), nachgeladen. */
export function loadAuthModule(): Promise<typeof import('firebase/auth')> {
  return import('firebase/auth');
}

/** Firebase Authentication; der Login bleibt im Browser gespeichert (auch offline). */
export function getFirebaseAuth(): Promise<Auth> {
  authPromise ??= Promise.all([getFirebaseApp(), loadAuthModule()]).then(
    ([app, { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence }]) => {
      const auth = initializeAuth(app, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      });
      auth.languageCode = 'de';
      return auth;
    },
  );
  return authPromise;
}

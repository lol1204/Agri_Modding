import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getDb, isFirebaseConfigured, loadFirestoreModule } from '@/integrations/firebase';
import { watchAuth, type AuthUser } from './auth';
import { createFirestoreRepositories } from './firestore';
import { dataStore } from './store';

export type Session =
  | { status: 'loading' }
  /** Firebase-Werte fehlen (.env) – die App zeigt eine Einrichtungs-Hilfe. */
  | { status: 'notConfigured' }
  | { status: 'signedOut' }
  | { status: 'ready'; user: AuthUser };

const SessionContext = createContext<Session>({ status: 'loading' });

/**
 * Die App läuft komplett über Firebase: Login (Authentication) und Daten (Firestore).
 * Nach dem Login wird der zentrale Datenspeicher mit Firestore verbunden.
 */
export function SessionProvider({ children, onError }: { children: ReactNode; onError: (e: unknown) => void }) {
  const [session, setSession] = useState<Session>({ status: 'loading' });

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setSession({ status: 'notConfigured' });
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    watchAuth(async (user) => {
      if (cancelled) return;
      if (!user) {
        dataStore.detach();
        setSession({ status: 'signedOut' });
        return;
      }
      try {
        const [db, fs] = await Promise.all([getDb(), loadFirestoreModule()]);
        if (cancelled) return;
        dataStore.attach(createFirestoreRepositories(db, fs, user.uid, onError));
        setSession({ status: 'ready', user });
      } catch (e) {
        onError(e);
      }
    })
      .then((u) => {
        unsubscribe = u;
      })
      .catch((e) => {
        onError(e);
        setSession({ status: 'signedOut' });
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
      dataStore.detach();
    };
  }, [onError]);

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  return useContext(SessionContext);
}

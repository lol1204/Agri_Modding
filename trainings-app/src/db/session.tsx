import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { isFirebaseConfigured, getDb, loadFirestoreModule } from '@/integrations/firebase';
import { watchAuth, type AuthUser } from './auth';
import { createFirestoreRepositories } from './firestore';
import { createLocalRepositories } from './local';
import { dataStore } from './store';

export type Session =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'ready'; mode: 'local' | 'firebase'; user: AuthUser | null };

const SessionContext = createContext<Session>({ status: 'loading' });

/**
 * Entscheidet beim Start: lokaler Modus (keine Firebase-Werte) oder Firebase
 * mit Login. Verbindet danach den zentralen Datenspeicher.
 */
export function SessionProvider({ children, onError }: { children: ReactNode; onError: (e: unknown) => void }) {
  const [session, setSession] = useState<Session>({ status: 'loading' });

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      dataStore.attach(createLocalRepositories());
      setSession({ status: 'ready', mode: 'local', user: null });
      return () => dataStore.detach();
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
        setSession({ status: 'ready', mode: 'firebase', user });
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

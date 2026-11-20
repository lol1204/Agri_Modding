import type { Firestore } from 'firebase/firestore';
import type { Checkin, Exercise, Pause, Plan, SetEntry, UserProfile, Workout } from '@/domain/types';
import type { ErrorHandler, Repositories, Unsubscribe } from './types';

type FirestoreModule = typeof import('firebase/firestore');

/**
 * Firestore-Umsetzung der Repositories.
 * Pfade (alles unter dem eigenen Nutzer):
 *   users/{uid}                          Profil
 *   users/{uid}/exercises/{id}           eigene Übungen
 *   users/{uid}/plans/{id}               Pläne
 *   users/{uid}/workouts/{id}            Trainings
 *   users/{uid}/workouts/{id}/sets/{id}  Sätze (mit Feld uid)
 *   users/{uid}/checkins/{datum}         Tagesform
 *   users/{uid}/pauses/{id}              Krank/Pause
 *
 * Schreiben wartet nicht auf den Server (offline würde das nie fertig);
 * Firestore zeigt Änderungen sofort lokal an und gleicht später ab.
 */
export function createFirestoreRepositories(
  db: Firestore,
  fs: FirestoreModule,
  uid: string,
  onError: ErrorHandler,
): Repositories {
  const { doc, collection, collectionGroup, onSnapshot, setDoc, deleteDoc, query, where, getDocs, getDocsFromCache, writeBatch } = fs;

  const userDoc = () => doc(db, 'users', uid);
  const col = (name: string) => collection(db, 'users', uid, name);
  const setsCol = (workoutId: string) => collection(db, 'users', uid, 'workouts', workoutId, 'sets');

  const fire = (p: Promise<unknown>) => {
    p.catch(onError);
  };

  function watchCollection<T>(name: string, cb: (items: T[]) => void): Unsubscribe {
    return onSnapshot(
      col(name),
      (snap) => cb(snap.docs.map((d) => d.data() as T)),
      onError,
    );
  }

  function collectionRepo<T extends { id: string }>(name: string) {
    return {
      watch: (cb: (items: T[]) => void) => watchCollection<T>(name, cb),
      save: (item: T) => fire(setDoc(doc(col(name), item.id), item)),
      remove: (id: string) => fire(deleteDoc(doc(col(name), id))),
    };
  }

  async function deleteWorkoutWithSets(workoutId: string): Promise<void> {
    const snap = await getDocs(setsCol(workoutId)).catch(() => getDocsFromCache(setsCol(workoutId)));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(col('workouts'), workoutId));
    await batch.commit();
  }

  return {
    uid,
    profile: {
      watch: (cb) =>
        onSnapshot(
          userDoc(),
          (snap) => cb(snap.exists() ? (snap.data() as UserProfile) : null),
          onError,
        ),
      save: (patch) => fire(setDoc(userDoc(), patch, { merge: true })),
    },
    exercises: collectionRepo<Exercise>('exercises'),
    plans: collectionRepo<Plan>('plans'),
    workouts: {
      watch: (cb) => watchCollection<Workout>('workouts', cb),
      save: (item) => fire(setDoc(doc(col('workouts'), item.id), item)),
      remove: (id) => fire(deleteWorkoutWithSets(id)),
    },
    sets: {
      watchSince(sinceMs, cb) {
        const q = query(collectionGroup(db, 'sets'), where('uid', '==', uid), where('performedAt', '>=', sinceMs));
        return onSnapshot(q, (snap) => cb(snap.docs.map((d) => d.data() as SetEntry)), onError);
      },
      async forWorkout(workoutId) {
        // Zuerst aus dem lokalen Speicher (schnell, offline), sonst vom Server.
        try {
          const cached = await getDocsFromCache(setsCol(workoutId));
          if (!cached.empty) return cached.docs.map((d) => d.data() as SetEntry);
        } catch {
          // nicht im Cache
        }
        const snap = await getDocs(setsCol(workoutId));
        return snap.docs.map((d) => d.data() as SetEntry);
      },
      save: (item) => fire(setDoc(doc(setsCol(item.workoutId), item.id), { ...item, uid })),
      remove: (item) => fire(deleteDoc(doc(setsCol(item.workoutId), item.id))),
    },
    checkins: {
      watch: (cb) => watchCollection<Checkin>('checkins', cb),
      save: (item) => fire(setDoc(doc(col('checkins'), item.id), item)),
    },
    pauses: collectionRepo<Pause>('pauses'),

    async deleteAllData() {
      const workouts = await getDocs(col('workouts'));
      for (const w of workouts.docs) await deleteWorkoutWithSets(w.id);
      for (const name of ['exercises', 'plans', 'checkins', 'pauses']) {
        const snap = await getDocs(col(name));
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      await deleteDoc(userDoc());
    },
  };
}

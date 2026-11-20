import type { Checkin, Exercise, Pause, Plan, SetEntry, UserProfile, Workout } from '@/domain/types';

export type Unsubscribe = () => void;
export type ErrorHandler = (error: unknown) => void;

/**
 * Zugriff auf die gespeicherten Daten. Die Oberfläche spricht NIE direkt mit
 * Firestore, sondern nur über diese Schnittstelle.
 *
 * - `watch…` liefert Live-Updates (auch offline aus dem lokalen Speicher).
 * - Schreiben ist „feuern und vergessen“: Die Änderung ist sofort lokal sichtbar,
 *   der Abgleich mit der Cloud passiert im Hintergrund (auch später, wenn wieder Netz da ist).
 */
export interface Repositories {
  readonly uid: string;

  profile: {
    watch(cb: (profile: UserProfile | null) => void): Unsubscribe;
    save(patch: Partial<UserProfile>): void;
  };
  exercises: {
    watch(cb: (items: Exercise[]) => void): Unsubscribe;
    save(item: Exercise): void;
    remove(id: string): void;
  };
  plans: {
    watch(cb: (items: Plan[]) => void): Unsubscribe;
    save(item: Plan): void;
    remove(id: string): void;
  };
  workouts: {
    watch(cb: (items: Workout[]) => void): Unsubscribe;
    save(item: Workout): void;
    /** Löscht das Training samt Sätzen. */
    remove(id: string): void;
  };
  sets: {
    /** Live: alle Sätze ab `sinceMs` (z. B. letzte 8 Wochen). */
    watchSince(sinceMs: number, cb: (items: SetEntry[]) => void): Unsubscribe;
    /** Einmalig: alle Sätze eines Trainings (auch ältere). */
    forWorkout(workoutId: string): Promise<SetEntry[]>;
    save(item: SetEntry): void;
    remove(item: Pick<SetEntry, 'id' | 'workoutId'>): void;
  };
  checkins: {
    watch(cb: (items: Checkin[]) => void): Unsubscribe;
    save(item: Checkin): void;
  };
  pauses: {
    watch(cb: (items: Pause[]) => void): Unsubscribe;
    save(item: Pause): void;
    remove(id: string): void;
  };

  /** Alle Daten dieses Nutzers löschen (Konto-Löschung). */
  deleteAllData(): Promise<void>;
}

import type { Checkin, Exercise, Pause, Plan, SetEntry, UserProfile, Workout } from '@/domain/types';
import type { Repositories, Unsubscribe } from './types';

/**
 * Lokaler Speicher (ohne Firebase): Daten liegen nur auf diesem Gerät
 * im Browser (localStorage). Gleiche Schnittstelle wie Firestore –
 * wird im lokalen Modus und in den Tests genutzt.
 */

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Speicher im Arbeitsspeicher (Tests / wenn localStorage fehlt). */
export function createMemoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

export function browserStorage(): KeyValueStorage {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const probe = '__probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return window.localStorage;
    }
  } catch {
    // z. B. privater Modus – dann nur im Arbeitsspeicher
  }
  return createMemoryStorage();
}

type Listener<T> = (value: T) => void;

/** Eine Sammlung (z. B. Pläne) mit Live-Benachrichtigung. */
class LocalCollection<T extends { id: string }> {
  private items = new Map<string, T>();
  private listeners = new Set<Listener<T[]>>();

  constructor(
    private storage: KeyValueStorage,
    private key: string,
  ) {
    const raw = storage.getItem(key);
    if (raw) {
      try {
        for (const item of JSON.parse(raw) as T[]) this.items.set(item.id, item);
      } catch {
        // beschädigte Daten ignorieren
      }
    }
  }

  all(): T[] {
    return [...this.items.values()];
  }

  watch(cb: Listener<T[]>): Unsubscribe {
    this.listeners.add(cb);
    cb(this.all());
    return () => void this.listeners.delete(cb);
  }

  save(item: T): void {
    this.items.set(item.id, structuredCloneSafe(item));
    this.commit();
  }

  remove(id: string): void {
    if (this.items.delete(id)) this.commit();
  }

  removeWhere(pred: (item: T) => boolean): void {
    let changed = false;
    for (const [id, item] of this.items) {
      if (pred(item)) {
        this.items.delete(id);
        changed = true;
      }
    }
    if (changed) this.commit();
  }

  clear(): void {
    this.items.clear();
    this.storage.removeItem(this.key);
    this.emit();
  }

  private commit(): void {
    this.storage.setItem(this.key, JSON.stringify(this.all()));
    this.emit();
  }

  private emit(): void {
    const snapshot = this.all();
    for (const l of this.listeners) l(snapshot);
  }
}

function structuredCloneSafe<T>(value: T): T {
  // undefined-Felder entfernen (wie Firestore mit ignoreUndefinedProperties)
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createLocalRepositories(storage: KeyValueStorage = browserStorage(), uid = 'local'): Repositories {
  const prefix = `trainings-app:v1:${uid}:`;
  const exercises = new LocalCollection<Exercise>(storage, prefix + 'exercises');
  const plans = new LocalCollection<Plan>(storage, prefix + 'plans');
  const workouts = new LocalCollection<Workout>(storage, prefix + 'workouts');
  const sets = new LocalCollection<SetEntry>(storage, prefix + 'sets');
  const checkins = new LocalCollection<Checkin>(storage, prefix + 'checkins');
  const pauses = new LocalCollection<Pause>(storage, prefix + 'pauses');

  const profileKey = prefix + 'profile';
  let profile: UserProfile | null = null;
  try {
    const raw = storage.getItem(profileKey);
    profile = raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    profile = null;
  }
  const profileListeners = new Set<Listener<UserProfile | null>>();

  return {
    mode: 'local',
    uid,
    profile: {
      watch(cb) {
        profileListeners.add(cb);
        cb(profile);
        return () => void profileListeners.delete(cb);
      },
      save(patch) {
        profile = structuredCloneSafe({ ...(profile ?? {}), ...patch } as UserProfile);
        storage.setItem(profileKey, JSON.stringify(profile));
        for (const l of profileListeners) l(profile);
      },
    },
    exercises: {
      watch: (cb) => exercises.watch(cb),
      save: (item) => exercises.save(item),
      remove: (id) => exercises.remove(id),
    },
    plans: {
      watch: (cb) => plans.watch(cb),
      save: (item) => plans.save(item),
      remove: (id) => plans.remove(id),
    },
    workouts: {
      watch: (cb) => workouts.watch(cb),
      save: (item) => workouts.save(item),
      remove(id) {
        sets.removeWhere((s) => s.workoutId === id);
        workouts.remove(id);
      },
    },
    sets: {
      watchSince(sinceMs, cb) {
        return sets.watch((all) => cb(all.filter((s) => s.performedAt >= sinceMs)));
      },
      async forWorkout(workoutId) {
        return sets.all().filter((s) => s.workoutId === workoutId);
      },
      save: (item) => sets.save({ ...item, uid }),
      remove: (item) => sets.remove(item.id),
    },
    checkins: {
      watch: (cb) => checkins.watch(cb),
      save: (item) => checkins.save(item),
    },
    pauses: {
      watch: (cb) => pauses.watch(cb),
      save: (item) => pauses.save(item),
      remove: (id) => pauses.remove(id),
    },
    async deleteAllData() {
      for (const c of [exercises, plans, workouts, sets, checkins, pauses]) c.clear();
      profile = null;
      storage.removeItem(profileKey);
      for (const l of profileListeners) l(null);
    },
  };
}

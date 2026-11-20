import { useSyncExternalStore } from 'react';
import { normalizeProfile } from '@/domain/defaults';
import type { Checkin, Exercise, Pause, Plan, SetEntry, UserProfile, Workout } from '@/domain/types';
import { DAY_MS } from '@/engine/dates';
import type { Repositories, Unsubscribe } from './types';

/** Wie weit zurück Sätze live mitgelesen werden (ältere werden bei Bedarf geladen). */
export const LIVE_SETS_WINDOW_DAYS = 56;

export interface DataState {
  /** 'loading' bis die ersten Daten (aus dem lokalen Speicher) da sind. */
  status: 'idle' | 'loading' | 'ready';
  repos: Repositories | null;
  /** Profil mit Standardwerten aufgefüllt. */
  profile: UserProfile;
  /** Wurde das Profil schon einmal gespeichert? */
  hasProfile: boolean;
  customExercises: Exercise[];
  plans: Plan[];
  /** Neueste zuerst. */
  workouts: Workout[];
  /** Sätze der letzten Wochen, älteste zuerst. */
  sets: SetEntry[];
  checkins: Checkin[];
  pauses: Pause[];
}

const initialState = (): DataState => ({
  status: 'idle',
  repos: null,
  profile: normalizeProfile(null),
  hasProfile: false,
  customExercises: [],
  plans: [],
  workouts: [],
  sets: [],
  checkins: [],
  pauses: [],
});

type Part = 'profile' | 'exercises' | 'plans' | 'workouts' | 'sets' | 'checkins' | 'pauses';
const ALL_PARTS: Part[] = ['profile', 'exercises', 'plans', 'workouts', 'sets', 'checkins', 'pauses'];

/**
 * Zentraler Datenspeicher im Arbeitsspeicher. Hört auf alle Repositories und
 * hält die Daten synchron vor – die Oberfläche liest daraus ohne Ladezeiten.
 */
class DataStore {
  private state: DataState = initialState();
  private listeners = new Set<() => void>();
  private unsubs: Unsubscribe[] = [];
  private loaded = new Set<Part>();

  getState = (): DataState => this.state;

  subscribe = (listener: () => void): Unsubscribe => {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  };

  attach(repos: Repositories, now = Date.now()): void {
    this.detach();
    this.state = { ...initialState(), status: 'loading', repos };
    this.loaded.clear();
    this.emit();

    const mark = (part: Part, patch: Partial<DataState>) => {
      this.loaded.add(part);
      const ready = ALL_PARTS.every((p) => this.loaded.has(p));
      this.state = { ...this.state, ...patch, status: ready ? 'ready' : 'loading' };
      this.emit();
    };

    this.unsubs = [
      repos.profile.watch((p) => mark('profile', { profile: normalizeProfile(p), hasProfile: p !== null })),
      repos.exercises.watch((items) => mark('exercises', { customExercises: items })),
      repos.plans.watch((items) => mark('plans', { plans: [...items].sort((a, b) => a.createdAt - b.createdAt) })),
      repos.workouts.watch((items) =>
        mark('workouts', { workouts: [...items].sort((a, b) => b.startedAt - a.startedAt) }),
      ),
      repos.sets.watchSince(now - LIVE_SETS_WINDOW_DAYS * DAY_MS, (items) =>
        mark('sets', { sets: [...items].sort((a, b) => a.performedAt - b.performedAt) }),
      ),
      repos.checkins.watch((items) => mark('checkins', { checkins: [...items].sort((a, b) => a.id.localeCompare(b.id)) })),
      repos.pauses.watch((items) => mark('pauses', { pauses: [...items].sort((a, b) => a.start.localeCompare(b.start)) })),
    ];
  }

  detach(): void {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    this.state = initialState();
    this.emit();
  }

  /** Repositories für Schreibzugriffe; wirft, wenn noch nichts verbunden ist. */
  get repos(): Repositories {
    if (!this.state.repos) throw new Error('Datenspeicher ist noch nicht bereit.');
    return this.state.repos;
  }

  private emit(): void {
    for (const l of this.listeners) l();
  }
}

export const dataStore = new DataStore();

/** Alle Daten (re-rendert bei jeder Änderung). Abgeleitete Werte mit useMemo bilden. */
export function useData(): DataState {
  return useSyncExternalStore(dataStore.subscribe, dataStore.getState, dataStore.getState);
}

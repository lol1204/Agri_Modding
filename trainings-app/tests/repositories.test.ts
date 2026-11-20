import { createMemoryRepositories, createMemoryStorage } from './helpers/memoryRepositories';
import { dataStore } from '@/db/store';
import type { Plan, SetEntry, Workout } from '@/domain/types';
import { createId } from '@/engine/ids';

const plan = (id: string): Plan => ({ id, name: 'Plan ' + id, split: 'eigener', days: [], createdAt: 1, updatedAt: 1 });
const workout = (id: string, startedAt: number): Workout => ({
  id, name: 'Training', status: 'beendet', startedAt, endedAt: startedAt + 1000, planId: null, planDayId: null, items: [], updatedAt: startedAt,
});
const set = (id: string, workoutId: string, performedAt: number): SetEntry => ({
  id, uid: 'x', workoutId, itemId: 'i', exerciseId: 'e', type: 'work', weightKg: 60, reps: 10, rir: 2, painFlag: false, performedAt,
});

describe('Repositories (Test-Speicher)', () => {
  it('speichert, meldet live und überlebt einen Neustart', () => {
    const storage = createMemoryStorage();
    const repos = createMemoryRepositories(storage);
    const seen: number[] = [];
    const unsub = repos.plans.watch((items) => seen.push(items.length));
    repos.plans.save(plan('a'));
    repos.plans.save(plan('b'));
    repos.plans.remove('a');
    unsub();
    expect(seen).toEqual([0, 1, 2, 1]);

    const again = createMemoryRepositories(storage);
    let items: Plan[] = [];
    again.plans.watch((p) => (items = p));
    expect(items.map((p) => p.id)).toEqual(['b']);
  });

  it('setzt die uid bei Sätzen und löscht Sätze mit dem Training', async () => {
    const repos = createMemoryRepositories(createMemoryStorage(), 'nutzer1');
    repos.workouts.save(workout('w1', 1000));
    repos.sets.save(set('s1', 'w1', 1000));
    repos.sets.save(set('s2', 'w1', 2000));
    expect((await repos.sets.forWorkout('w1')).map((s) => s.uid)).toEqual(['nutzer1', 'nutzer1']);
    repos.workouts.remove('w1');
    expect(await repos.sets.forWorkout('w1')).toHaveLength(0);
  });

  it('liefert live nur Sätze im Zeitfenster', () => {
    const repos = createMemoryRepositories(createMemoryStorage());
    repos.sets.save(set('alt', 'w', 100));
    repos.sets.save(set('neu', 'w', 5000));
    let ids: string[] = [];
    repos.sets.watchSince(1000, (s) => (ids = s.map((x) => x.id)));
    expect(ids).toEqual(['neu']);
  });

  it('Profil wird zusammengeführt und kann gelöscht werden', async () => {
    const repos = createMemoryRepositories(createMemoryStorage());
    let profile: unknown = 'leer';
    repos.profile.watch((p) => (profile = p));
    expect(profile).toBeNull();
    repos.profile.save({ goal: 'kraft' });
    repos.profile.save({ unit: 'lb' });
    expect(profile).toMatchObject({ goal: 'kraft', unit: 'lb' });
    await repos.deleteAllData();
    expect(profile).toBeNull();
  });
});

describe('Zentraler Datenspeicher', () => {
  it('ist nach dem Verbinden sofort bereit und sortiert Trainings (neueste zuerst)', () => {
    const repos = createMemoryRepositories(createMemoryStorage());
    repos.workouts.save(workout('alt', 1000));
    repos.workouts.save(workout('neu', 5000));
    dataStore.attach(repos, 6000);
    const state = dataStore.getState();
    expect(state.status).toBe('ready');
    expect(state.hasProfile).toBe(false);
    expect(state.profile.unit).toBe('kg');
    expect(state.workouts.map((w) => w.id)).toEqual(['neu', 'alt']);
    dataStore.detach();
    expect(dataStore.getState().status).toBe('idle');
  });
});

describe('IDs', () => {
  it('sind 20 Zeichen lang und verschieden', () => {
    const a = createId();
    const b = createId();
    expect(a).toHaveLength(20);
    expect(a).not.toBe(b);
  });
});

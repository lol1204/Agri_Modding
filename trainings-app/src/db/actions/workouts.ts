import type { SessionItem, SetEntry, SetType, Workout } from '@/domain/types';
import { createId } from '@/engine/ids';
import { fitToTimeBudget, itemsFromPlanDay } from '@/engine/session';
import { summarizeWorkout } from '@/engine/summary';
import { currentCatalog } from '../exercises';
import { dataStore } from '../store';

function saveWorkout(workout: Workout): void {
  dataStore.repos.workouts.save({ ...workout, updatedAt: Date.now() });
}

function getWorkout(workoutId: string): Workout | undefined {
  return dataStore.getState().workouts.find((w) => w.id === workoutId);
}

export function findActiveWorkout(workouts: Workout[]): Workout | undefined {
  return workouts.find((w) => w.status === 'aktiv');
}

/** Training aus einem Plan-Tag starten (optional mit Zeitbudget). */
export function startWorkoutFromPlan(planId: string, dayId: string, timeBudgetMin?: number | null): string {
  const { plans } = dataStore.getState();
  const plan = plans.find((p) => p.id === planId);
  const day = plan?.days.find((d) => d.id === dayId);
  if (!plan || !day) throw new Error('Plan-Tag nicht gefunden');
  let items = itemsFromPlanDay(day);
  if (timeBudgetMin) items = fitToTimeBudget(items, timeBudgetMin, currentCatalog().byId).items;
  const now = Date.now();
  const workout: Workout = {
    id: createId(),
    name: day.name,
    status: 'aktiv',
    startedAt: now,
    endedAt: null,
    planId,
    planDayId: dayId,
    items,
    timeBudgetMin: timeBudgetMin ?? null,
    updatedAt: now,
  };
  saveWorkout(workout);
  return workout.id;
}

/** Freies Training ohne Plan – Übungen kommen im Training dazu. */
export function startFreeWorkout(): string {
  const now = Date.now();
  const workout: Workout = {
    id: createId(),
    name: 'Freies Training',
    status: 'aktiv',
    startedAt: now,
    endedAt: null,
    planId: null,
    planDayId: null,
    items: [],
    updatedAt: now,
  };
  saveWorkout(workout);
  return workout.id;
}

export function updateWorkout(workoutId: string, patch: Partial<Workout>): void {
  const w = getWorkout(workoutId);
  if (w) saveWorkout({ ...w, ...patch });
}

export function updateItem(workoutId: string, itemId: string, patch: Partial<SessionItem>): void {
  const w = getWorkout(workoutId);
  if (!w) return;
  saveWorkout({ ...w, items: w.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) });
}

export function addItem(workoutId: string, exerciseId: string): string | null {
  const w = getWorkout(workoutId);
  const ex = currentCatalog().get(exerciseId);
  if (!w || !ex) return null;
  const item: SessionItem = {
    id: createId(),
    exerciseId,
    targetSets: 3,
    repMin: ex.repRange[0],
    repMax: ex.repRange[1],
    restSec: null,
    supersetGroup: null,
    skipped: false,
  };
  saveWorkout({ ...w, items: [...w.items, item] });
  return item.id;
}

/** Übung im laufenden Training tauschen (Gerät besetzt, Zwicken …). */
export function swapItem(workoutId: string, itemId: string, exerciseId: string, reason: string | null): void {
  const w = getWorkout(workoutId);
  const ex = currentCatalog().get(exerciseId);
  if (!w || !ex) return;
  saveWorkout({
    ...w,
    items: w.items.map((i) =>
      i.id === itemId
        ? { ...i, exerciseId, swappedFrom: i.swappedFrom ?? i.exerciseId, swapReason: reason, repMin: ex.repRange[0], repMax: ex.repRange[1] }
        : i,
    ),
  });
}

export function applyTimeBudget(workoutId: string, minutes: number | null): boolean {
  const w = getWorkout(workoutId);
  if (!w) return false;
  if (!minutes) {
    saveWorkout({ ...w, timeBudgetMin: null });
    return false;
  }
  const { items, changed } = fitToTimeBudget(w.items, minutes, currentCatalog().byId);
  saveWorkout({ ...w, items, timeBudgetMin: minutes });
  return changed;
}

export type LogSetInput = {
  workoutId: string;
  itemId: string;
  exerciseId: string;
  type: SetType;
  weightKg: number;
  reps: number;
  rir: number | null;
  painFlag?: boolean;
  suggestedKg?: number | null;
  dropOf?: string | null;
};

/** Satz sofort speichern (lokal sichtbar, Cloud-Abgleich im Hintergrund). */
export function logSet(input: LogSetInput): SetEntry {
  const repos = dataStore.repos;
  const entry: SetEntry = {
    id: createId(),
    uid: repos.uid,
    workoutId: input.workoutId,
    itemId: input.itemId,
    exerciseId: input.exerciseId,
    type: input.type,
    weightKg: input.weightKg,
    reps: input.reps,
    rir: input.rir,
    painFlag: input.painFlag ?? false,
    performedAt: Date.now(),
    suggestedKg: input.suggestedKg ?? null,
    dropOf: input.dropOf ?? null,
  };
  repos.sets.save(entry);
  return entry;
}

export function updateSet(entry: SetEntry): void {
  dataStore.repos.sets.save(entry);
}

export function removeSet(entry: SetEntry): void {
  dataStore.repos.sets.remove(entry);
}

export function workoutSets(workoutId: string): SetEntry[] {
  return dataStore.getState().sets.filter((s) => s.workoutId === workoutId);
}

/** Training beenden: Kennzahlen und Rekorde berechnen und mitspeichern. */
export function finishWorkout(workoutId: string): Workout | null {
  const w = getWorkout(workoutId);
  if (!w) return null;
  const state = dataStore.getState();
  const history = state.workouts.filter((x) => x.id !== workoutId && x.status === 'beendet');
  const summary = summarizeWorkout(workoutSets(workoutId), currentCatalog().byId, history);
  const done: Workout = { ...w, status: 'beendet', endedAt: Date.now(), summary };
  saveWorkout(done);
  return done;
}

/** Training verwerfen (löscht auch die Sätze). */
export function discardWorkout(workoutId: string): void {
  dataStore.repos.workouts.remove(workoutId);
}

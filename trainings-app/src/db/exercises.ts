import { useMemo } from 'react';
import builtIn from '@data/exercises.json';
import type { Exercise } from '@/domain/types';
import { createId } from '@/engine/ids';
import { dataStore, useData } from './store';

/** Mitgelieferte Übungen aus data/exercises.json. */
export const builtInExercises = builtIn as Exercise[];

export function mergeExercises(custom: Exercise[]): Exercise[] {
  const customIds = new Set(custom.map((e) => e.id));
  return [...builtInExercises.filter((e) => !customIds.has(e.id)), ...custom.map((e) => ({ ...e, custom: true }))];
}

export type ExerciseCatalog = {
  list: Exercise[];
  byId: Map<string, Exercise>;
  get: (id: string) => Exercise | undefined;
};

/** Alle Übungen (mitgeliefert + eigene) mit schnellem Zugriff per ID. */
export function useExercises(): ExerciseCatalog {
  const { customExercises } = useData();
  return useMemo(() => buildCatalog(customExercises), [customExercises]);
}

export function buildCatalog(custom: Exercise[]): ExerciseCatalog {
  const list = mergeExercises(custom);
  const byId = new Map(list.map((e) => [e.id, e] as const));
  return { list, byId, get: (id) => byId.get(id) };
}

/** Katalog außerhalb von React (z. B. in Aktionen). */
export function currentCatalog(): ExerciseCatalog {
  return buildCatalog(dataStore.getState().customExercises);
}

export function saveCustomExercise(exercise: Omit<Exercise, 'id' | 'custom' | 'createdAt'> & { id?: string }): string {
  const id = exercise.id ?? `eigen-${createId(12)}`;
  dataStore.repos.exercises.save({ ...exercise, id, custom: true, createdAt: Date.now() });
  return id;
}

export function deleteCustomExercise(id: string): void {
  dataStore.repos.exercises.remove(id);
}

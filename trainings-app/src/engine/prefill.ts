import type { SetEntry } from '@/domain/types';
import { isHardSet } from './session';

/**
 * Sätze dieser Übung aus dem letzten Training (ohne das aktuelle),
 * nur Arbeits-/Versagenssätze, in Reihenfolge.
 */
export function previousSessionSets(exerciseId: string, sets: SetEntry[], currentWorkoutId: string): SetEntry[] {
  const relevant = sets.filter((s) => s.exerciseId === exerciseId && s.workoutId !== currentWorkoutId && isHardSet(s.type));
  if (!relevant.length) return [];
  const latest = relevant.reduce((a, b) => (b.performedAt > a.performedAt ? b : a));
  return relevant.filter((s) => s.workoutId === latest.workoutId).sort((a, b) => a.performedAt - b.performedAt);
}

/** Vorausgefüllte Werte für den nächsten Satz: wie im letzten Satz bzw. wie letztes Mal. */
export function prefillValues(params: {
  doneSets: SetEntry[];
  previous: SetEntry[];
  repMax: number;
  bodyweight: boolean;
}): { weightKg: number; reps: number; source: 'heute' | 'letztes_mal' | 'neu' } {
  const { doneSets, previous, repMax, bodyweight } = params;
  const doneHard = doneSets.filter((s) => isHardSet(s.type));
  const lastDone = doneHard[doneHard.length - 1];
  if (lastDone) return { weightKg: lastDone.weightKg, reps: lastDone.reps, source: 'heute' };
  const prev = previous[doneHard.length] ?? previous[previous.length - 1];
  if (prev) return { weightKg: prev.weightKg, reps: prev.reps, source: 'letztes_mal' };
  return { weightKg: 0, reps: bodyweight ? repMax : repMax, source: 'neu' };
}

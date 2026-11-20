import type { Exercise, ExerciseSummary, MuscleGroup, RecordEntry, SetEntry, Workout, WorkoutSummary } from '@/domain/types';
import { estimateOneRepMax } from './oneRepMax';
import { isHardSet } from './session';
import { roundTo } from './units';

/** Kennzahlen einer Übung aus ihren Sätzen. Drops zählen ins Volumen, aber getrennt. */
export function summarizeExercise(exerciseId: string, sets: SetEntry[], exercise: Exercise | undefined): ExerciseSummary {
  const hard = sets.filter((s) => isHardSet(s.type));
  const drops = sets.filter((s) => s.type === 'drop');
  let topWeightKg = 0;
  let topReps = 0;
  let e1rmKg = 0;
  let bestSetVolumeKg = 0;
  let maxReps = 0;
  let volumeKg = 0;
  let totalReps = 0;
  for (const s of hard) {
    if (s.weightKg > topWeightKg || (s.weightKg === topWeightKg && s.reps > topReps)) {
      topWeightKg = s.weightKg;
      topReps = s.reps;
    }
    e1rmKg = Math.max(e1rmKg, estimateOneRepMax(s.weightKg, s.reps));
    bestSetVolumeKg = Math.max(bestSetVolumeKg, s.weightKg * s.reps);
    maxReps = Math.max(maxReps, s.reps);
    volumeKg += s.weightKg * s.reps;
    totalReps += s.reps;
  }
  const dropVolumeKg = drops.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
  return {
    exerciseId,
    topWeightKg,
    topReps,
    e1rmKg,
    bestSetVolumeKg: roundTo(bestSetVolumeKg, 1),
    maxReps,
    workSets: hard.length,
    volumeKg: roundTo(volumeKg, 1),
    dropVolumeKg: roundTo(dropVolumeKg, 1),
    totalReps,
    bodyweight: !!exercise?.bodyweight,
  };
}

/** Bisherige Bestwerte je Übung aus früheren Trainings (nur deren Zusammenfassungen). */
export function bestsFromHistory(history: Workout[]): Map<string, { e1rm: number; weight: number; reps: number }> {
  const bests = new Map<string, { e1rm: number; weight: number; reps: number }>();
  for (const w of history) {
    for (const ex of w.summary?.exercises ?? []) {
      const b = bests.get(ex.exerciseId) ?? { e1rm: 0, weight: 0, reps: 0 };
      bests.set(ex.exerciseId, {
        e1rm: Math.max(b.e1rm, ex.e1rmKg),
        weight: Math.max(b.weight, ex.topWeightKg),
        reps: Math.max(b.reps, ex.maxReps),
      });
    }
  }
  return bests;
}

/** Neue Rekorde gegenüber der Historie (beim ersten Mal gibt es noch keinen Vergleich). */
export function findRecords(exercises: ExerciseSummary[], history: Workout[]): RecordEntry[] {
  const bests = bestsFromHistory(history);
  const records: RecordEntry[] = [];
  for (const ex of exercises) {
    const prev = bests.get(ex.exerciseId);
    if (!prev || ex.workSets === 0) continue;
    if (ex.topWeightKg > 0 && prev.weight > 0 && ex.topWeightKg > prev.weight) {
      records.push({ exerciseId: ex.exerciseId, kind: 'gewicht', value: ex.topWeightKg, previous: prev.weight });
    }
    if (ex.e1rmKg > 0 && prev.e1rm > 0 && ex.e1rmKg > prev.e1rm + 0.05) {
      records.push({ exerciseId: ex.exerciseId, kind: 'e1rm', value: ex.e1rmKg, previous: prev.e1rm });
    }
    if (ex.bodyweight && ex.topWeightKg === 0 && ex.maxReps > prev.reps && prev.reps > 0) {
      records.push({ exerciseId: ex.exerciseId, kind: 'wiederholungen', value: ex.maxReps, previous: prev.reps });
    }
  }
  return records;
}

export function summarizeWorkout(sets: SetEntry[], catalog: Map<string, Exercise>, history: Workout[]): WorkoutSummary {
  const byExercise = new Map<string, SetEntry[]>();
  for (const s of sets) byExercise.set(s.exerciseId, [...(byExercise.get(s.exerciseId) ?? []), s]);

  const exercises = [...byExercise.entries()].map(([id, list]) => summarizeExercise(id, list, catalog.get(id)));
  const hardSetsByMuscle: Partial<Record<MuscleGroup, number>> = {};
  for (const s of sets) {
    if (!isHardSet(s.type)) continue;
    const ex = catalog.get(s.exerciseId);
    if (!ex) continue;
    for (const m of ex.primary) hardSetsByMuscle[m] = (hardSetsByMuscle[m] ?? 0) + 1;
    for (const m of ex.secondary) hardSetsByMuscle[m] = (hardSetsByMuscle[m] ?? 0) + 0.5;
  }
  return {
    exercises,
    hardSetsByMuscle,
    totalVolumeKg: roundTo(exercises.reduce((sum, e) => sum + e.volumeKg, 0), 1),
    dropVolumeKg: roundTo(exercises.reduce((sum, e) => sum + e.dropVolumeKg, 0), 1),
    workSets: exercises.reduce((sum, e) => sum + e.workSets, 0),
    records: findRecords(exercises, history),
  };
}

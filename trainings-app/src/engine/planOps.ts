import type { Exercise, Plan, PlanDay, PlanExercise } from '@/domain/types';
import { createId } from './ids';

/**
 * Reine Funktionen zum Bearbeiten von Plänen. Jede Funktion gibt ein neues
 * Objekt zurück (nichts wird verändert) – das macht „Rückgängig“ einfach.
 */

export function newPlanExercise(exercise: Exercise, idFactory: () => string = createId): PlanExercise {
  return {
    id: idFactory(),
    exerciseId: exercise.id,
    sets: exercise.category === 'grund' ? 3 : 3,
    repMin: exercise.repRange[0],
    repMax: exercise.repRange[1],
    restSec: null,
    supersetGroup: null,
  };
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= list.length) return list;
  const target = Math.max(0, Math.min(list.length - 1, to));
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(target, 0, item as T);
  return copy;
}

/**
 * Supersätze müssen direkt aufeinander folgen. Getrennte Mitglieder fliegen
 * aus der Gruppe, Gruppen mit nur einer Übung werden aufgelöst.
 */
export function normalizeSupersets(exercises: PlanExercise[]): PlanExercise[] {
  const result = exercises.map((e) => ({ ...e }));
  // Gruppen auf zusammenhängende Blöcke beschränken (erster Block gewinnt).
  const seenBlocks = new Map<string, number>();
  let prevGroup: string | null = null;
  for (let i = 0; i < result.length; i++) {
    const item = result[i]!;
    const g = item.supersetGroup ?? null;
    if (g) {
      if (g !== prevGroup) {
        if (seenBlocks.has(g)) item.supersetGroup = null; // zweiter, getrennter Block
        else seenBlocks.set(g, i);
      }
    }
    prevGroup = item.supersetGroup ?? null;
  }
  // Einzelne Mitglieder auflösen.
  const counts = new Map<string, number>();
  for (const e of result) if (e.supersetGroup) counts.set(e.supersetGroup, (counts.get(e.supersetGroup) ?? 0) + 1);
  for (const e of result) if (e.supersetGroup && (counts.get(e.supersetGroup) ?? 0) < 2) e.supersetGroup = null;
  return result;
}

/** Verbindet Übung `index` mit der nächsten zum Supersatz – oder löst die Verbindung. */
export function toggleSupersetWithNext(
  exercises: PlanExercise[],
  index: number,
  idFactory: () => string = createId,
): PlanExercise[] {
  const a = exercises[index];
  const b = exercises[index + 1];
  if (!a || !b) return exercises;
  const result = exercises.map((e) => ({ ...e }));
  if (a.supersetGroup && a.supersetGroup === b.supersetGroup) {
    // Verbindung trennen: alles ab b bekommt eine neue Gruppe (oder keine).
    const old = a.supersetGroup;
    const fresh = idFactory();
    for (let i = index + 1; i < result.length && result[i]!.supersetGroup === old; i++) {
      result[i]!.supersetGroup = fresh;
    }
  } else {
    const group = a.supersetGroup ?? b.supersetGroup ?? idFactory();
    const oldB = b.supersetGroup;
    result[index]!.supersetGroup = group;
    // b und ggf. sein bisheriger Block schließen sich an
    for (let i = index + 1; i < result.length; i++) {
      const cur = result[i]!;
      if (i === index + 1 || (oldB && cur.supersetGroup === oldB)) cur.supersetGroup = group;
      else break;
    }
  }
  return normalizeSupersets(result);
}

export function isLinkedWithNext(exercises: PlanExercise[], index: number): boolean {
  const a = exercises[index];
  const b = exercises[index + 1];
  return !!(a?.supersetGroup && a.supersetGroup === b?.supersetGroup);
}

export function updateDay(plan: Plan, dayId: string, update: (day: PlanDay) => PlanDay): Plan {
  return {
    ...plan,
    days: plan.days.map((d) => (d.id === dayId ? update(d) : d)),
    updatedAt: Date.now(),
  };
}

export function setDayExercises(plan: Plan, dayId: string, exercises: PlanExercise[]): Plan {
  return updateDay(plan, dayId, (d) => ({ ...d, exercises: normalizeSupersets(exercises) }));
}

export function addDay(plan: Plan, name?: string, idFactory: () => string = createId): Plan {
  const letter = String.fromCharCode(65 + plan.days.length); // A, B, C …
  return {
    ...plan,
    days: [...plan.days, { id: idFactory(), name: name ?? `Tag ${letter}`, exercises: [] }],
    updatedAt: Date.now(),
  };
}

export function removeDay(plan: Plan, dayId: string): Plan {
  return { ...plan, days: plan.days.filter((d) => d.id !== dayId), updatedAt: Date.now() };
}

/** Übung tauschen, Sätze und Bereich passend zur neuen Übung. */
export function replaceExercise(item: PlanExercise, exercise: Exercise): PlanExercise {
  return { ...item, exerciseId: exercise.id, repMin: exercise.repRange[0], repMax: exercise.repRange[1] };
}

export function emptyPlan(name = 'Mein Plan', idFactory: () => string = createId, now = Date.now()): Plan {
  return {
    id: idFactory(),
    name,
    split: 'eigener',
    days: [{ id: idFactory(), name: 'Tag A', exercises: [] }],
    templateId: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Geschätzte Dauer eines Trainingstags in Minuten (Satz ~45 s + Pause). */
export function estimateDayMinutes(day: PlanDay, catalog: Map<string, Exercise>): number {
  let sec = 0;
  for (const item of day.exercises) {
    const ex = catalog.get(item.exerciseId);
    const rest = item.restSec ?? (ex?.category === 'grund' ? 150 : 90);
    const supersetFactor = item.supersetGroup ? 0.6 : 1;
    sec += item.sets * (45 + rest * supersetFactor);
    if (ex?.category === 'grund') sec += 120; // Aufwärmen
  }
  return Math.round(sec / 60);
}

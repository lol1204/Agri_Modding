import { muscleRegions } from '@/domain/labels';
import type { ExerciseSummary, MuscleGroup, Pause, RecordEntry, Workout } from '@/domain/types';
import { addWeeks, fromDateKey, startOfWeek, toDateKey } from './dates';
import { roundTo } from './units';

/**
 * Auswertungen für den Fortschritt. Alles basiert auf den Zusammenfassungen
 * der beendeten Trainings – ältere Sätze müssen dafür nicht geladen werden.
 */

export function finished(workouts: Workout[]): Workout[] {
  return workouts.filter((w) => w.status === 'beendet' && w.summary).sort((a, b) => a.startedAt - b.startedAt);
}

export interface WeekStat {
  /** Montag 00:00 */
  weekStart: number;
  volumeKg: number;
  dropVolumeKg: number;
  workSets: number;
  workouts: number;
}

/** Kennzahlen der letzten `weeks` Wochen (älteste zuerst, aktuelle Woche zuletzt). */
export function weeklyStats(workouts: Workout[], now: number, weeks = 8): WeekStat[] {
  const current = startOfWeek(now);
  const result: WeekStat[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    result.push({ weekStart: addWeeks(current, -i), volumeKg: 0, dropVolumeKg: 0, workSets: 0, workouts: 0 });
  }
  for (const w of finished(workouts)) {
    const ws = startOfWeek(w.startedAt);
    const stat = result.find((r) => r.weekStart === ws);
    if (!stat || !w.summary) continue;
    stat.volumeKg = roundTo(stat.volumeKg + w.summary.totalVolumeKg, 1);
    stat.dropVolumeKg = roundTo(stat.dropVolumeKg + w.summary.dropVolumeKg, 1);
    stat.workSets += w.summary.workSets;
    stat.workouts += 1;
  }
  return result;
}

/** Harte Sätze pro Muskelgruppe in einem Zeitraum (Wochenschnitt bei mehreren Wochen). */
export function hardSetsByMuscle(workouts: Workout[], fromMs: number, toMs: number, weeks = 1): Partial<Record<MuscleGroup, number>> {
  const totals: Partial<Record<MuscleGroup, number>> = {};
  for (const w of finished(workouts)) {
    if (w.startedAt < fromMs || w.startedAt >= toMs) continue;
    for (const [m, v] of Object.entries(w.summary?.hardSetsByMuscle ?? {}) as [MuscleGroup, number][]) {
      totals[m] = (totals[m] ?? 0) + v;
    }
  }
  for (const k of Object.keys(totals) as MuscleGroup[]) totals[k] = roundTo((totals[k] ?? 0) / weeks, 1);
  return totals;
}

/** Zusammengefasst auf grobe Muskelgruppen (Brust, Rücken, …). */
export function hardSetsByRegion(byMuscle: Partial<Record<MuscleGroup, number>>): { id: string; label: string; sets: number }[] {
  return muscleRegions.map((r) => ({
    id: r.id,
    label: r.label,
    // Pro Region zählt der am stärksten trainierte Teilmuskel plus die Hälfte der übrigen
    sets: roundTo(
      (() => {
        const values = r.muscles.map((m) => byMuscle[m] ?? 0).sort((a, b) => b - a);
        return (values[0] ?? 0) + values.slice(1).reduce((s, v) => s + v * 0.5, 0);
      })(),
      1,
    ),
  }));
}

export interface ExercisePoint extends ExerciseSummary {
  date: number;
  workoutId: string;
}

/** Verlauf einer Übung (älteste zuerst). */
export function exerciseHistory(workouts: Workout[], exerciseId: string): ExercisePoint[] {
  const points: ExercisePoint[] = [];
  for (const w of finished(workouts)) {
    const e = w.summary?.exercises.find((x) => x.exerciseId === exerciseId);
    if (e && e.workSets > 0) points.push({ ...e, date: w.startedAt, workoutId: w.id });
  }
  return points;
}

/** Vergleich mit einem früheren Wert (z. B. vor ~4 Wochen), null wenn es keinen gibt. */
export function compareWithPast(points: { date: number; value: number }[], now: number, weeksBack = 4): { delta: number; since: number } | null {
  if (points.length < 2) return null;
  const last = points[points.length - 1]!;
  const target = addWeeks(now, -weeksBack);
  // Ältester Punkt, der nicht jünger als `weeksBack` ist – sonst der erste Punkt
  const past = [...points].reverse().find((p) => p.date <= target) ?? points[0]!;
  if (past === last) return null;
  return { delta: roundTo(last.value - past.value, 2), since: past.date };
}

export interface DatedRecord extends RecordEntry {
  date: number;
  workoutId: string;
}

export function recentRecords(workouts: Workout[], limit = 5): DatedRecord[] {
  const all: DatedRecord[] = [];
  for (const w of finished(workouts)) {
    for (const r of w.summary?.records ?? []) all.push({ ...r, date: w.startedAt, workoutId: w.id });
  }
  // pro Training und Übung nur der wichtigste Rekord (Gewicht vor 1RM vor Wdh.)
  const order = { gewicht: 0, e1rm: 1, wiederholungen: 2, satzvolumen: 3 } as const;
  const unique = new Map<string, DatedRecord>();
  for (const r of all) {
    const key = `${r.workoutId}:${r.exerciseId}`;
    const existing = unique.get(key);
    if (!existing || order[r.kind] < order[existing.kind]) unique.set(key, r);
  }
  return [...unique.values()].sort((a, b) => b.date - a.date).slice(0, limit);
}

/** Trainierte Übungen, häufigste zuerst. */
export function trainedExercises(workouts: Workout[]): { exerciseId: string; sessions: number; lastDate: number; last: ExerciseSummary }[] {
  const map = new Map<string, { exerciseId: string; sessions: number; lastDate: number; last: ExerciseSummary }>();
  for (const w of finished(workouts)) {
    for (const e of w.summary?.exercises ?? []) {
      if (e.workSets === 0) continue;
      const cur = map.get(e.exerciseId);
      map.set(e.exerciseId, {
        exerciseId: e.exerciseId,
        sessions: (cur?.sessions ?? 0) + 1,
        lastDate: w.startedAt,
        last: e,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.sessions - a.sessions || b.lastDate - a.lastDate);
}

/** Liegt die Woche (ganz oder teilweise) in einer Pause/Krankheit? */
export function weekInPause(weekStart: number, pauses: Pause[], now: number): boolean {
  const weekEnd = addWeeks(weekStart, 1) - 1;
  return pauses.some((p) => {
    const start = fromDateKey(p.start);
    const end = p.end ? fromDateKey(p.end) + 24 * 3600 * 1000 - 1 : now;
    return start <= weekEnd && end >= weekStart;
  });
}

export interface StreakInfo {
  /** Wochen in Folge mit erreichtem Wochenziel. */
  weeks: number;
  /** Trainings in der aktuellen Woche. */
  thisWeek: number;
  goal: number;
  /** Aktuelle Woche liegt in einer Pause. */
  paused: boolean;
}

/**
 * Wochen-Streak: Wochen in Folge mit erreichtem Wochenziel.
 * - Die laufende Woche zählt mit, sobald das Ziel erreicht ist – sonst bricht sie nichts.
 * - Wochen mit Krankheit/Pause sind neutral: Sie zählen nicht, brechen aber auch nichts.
 */
export function weeklyStreak(workouts: Workout[], pauses: Pause[], goal: number, now: number): StreakInfo {
  const counts = new Map<string, number>();
  for (const w of finished(workouts)) {
    const key = toDateKey(startOfWeek(w.startedAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const current = startOfWeek(now);
  const thisWeek = counts.get(toDateKey(current)) ?? 0;
  let weeks = thisWeek >= goal ? 1 : 0;
  let week = addWeeks(current, -1);
  // Höchstens 5 Jahre zurück
  for (let i = 0; i < 260; i++) {
    const n = counts.get(toDateKey(week)) ?? 0;
    if (n >= goal) weeks++;
    else if (!weekInPause(week, pauses, now)) break;
    week = addWeeks(week, -1);
  }
  return { weeks, thisWeek, goal, paused: weekInPause(current, pauses, now) };
}

/** Trainingstage der aktuellen Woche (Mo … So). */
export function trainedDaysThisWeek(workouts: Workout[], now: number): boolean[] {
  const start = startOfWeek(now);
  const days = [false, false, false, false, false, false, false];
  for (const w of finished(workouts)) {
    if (w.startedAt < start || w.startedAt >= addWeeks(start, 1)) continue;
    const idx = (new Date(w.startedAt).getDay() + 6) % 7;
    days[idx] = true;
  }
  return days;
}

/** Prozentuale Veränderung, null wenn kein Vergleichswert. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

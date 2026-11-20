import type { ExerciseSummary, Pause, Workout, WorkoutSummary } from '@/domain/types';
import { addDays, fromDateKey, toDateKey } from '@/engine/dates';
import {
  compareWithPast,
  exerciseHistory,
  hardSetsByMuscle,
  hardSetsByRegion,
  percentChange,
  recentRecords,
  trainedDaysThisWeek,
  trainedExercises,
  weeklyStats,
  weeklyStreak,
} from '@/engine/progress';
import { nextPlanDay } from '@/engine/schedule';

const NOW = fromDateKey('2026-11-20') + 18 * 3600 * 1000; // Freitag
const ex = (exerciseId: string, top: number, e1rm: number, volume = 1000): ExerciseSummary => ({
  exerciseId, topWeightKg: top, topReps: 8, e1rmKg: e1rm, bestSetVolumeKg: top * 8, maxReps: 8, workSets: 3, volumeKg: volume, dropVolumeKg: 0, totalReps: 24, bodyweight: false,
});
let n = 0;
const workout = (date: string, exercises: ExerciseSummary[], extra: Partial<WorkoutSummary> = {}, planDayId: string | null = null): Workout => {
  const startedAt = fromDateKey(date) + 17 * 3600 * 1000;
  return {
    id: `w${++n}`, name: 'T', status: 'beendet', startedAt, endedAt: startedAt + 3600000, planId: 'p', planDayId, items: [], updatedAt: startedAt,
    summary: {
      exercises,
      hardSetsByMuscle: { brust: 3, trizeps: 1.5 },
      totalVolumeKg: exercises.reduce((s, e) => s + e.volumeKg, 0),
      dropVolumeKg: 0,
      workSets: exercises.reduce((s, e) => s + e.workSets, 0),
      records: [],
      ...extra,
    },
  };
};

describe('Wochenstatistik', () => {
  const ws = [
    workout('2026-11-10', [ex('bank', 60, 80)]),
    workout('2026-11-17', [ex('bank', 62.5, 83, 1200)]),
    workout('2026-11-19', [ex('bank', 62.5, 84, 800)]),
  ];
  it('summiert pro Woche, aktuelle Woche zuletzt', () => {
    const stats = weeklyStats(ws, NOW, 4);
    expect(stats).toHaveLength(4);
    expect(stats[3]!.volumeKg).toBe(2000);
    expect(stats[3]!.workouts).toBe(2);
    expect(stats[2]!.volumeKg).toBe(1000);
    expect(percentChange(stats[3]!.volumeKg, stats[2]!.volumeKg)).toBe(100);
    expect(percentChange(5, 0)).toBeNull();
  });
  it('harte Sätze pro Muskel und Region', () => {
    const byMuscle = hardSetsByMuscle(ws, fromDateKey('2026-11-16'), NOW + 1);
    expect(byMuscle.brust).toBe(6);
    const regions = hardSetsByRegion({ lat: 6, oberer_ruecken: 4, brust: 8 });
    expect(regions.find((r) => r.id === 'ruecken')!.sets).toBe(8);
    expect(regions.find((r) => r.id === 'brust')!.sets).toBe(8);
  });
  it('Trainingstage der Woche', () => {
    const days = trainedDaysThisWeek(ws, NOW);
    expect(days).toEqual([false, true, false, true, false, false, false]);
  });
});

describe('Verlauf pro Übung', () => {
  const ws = [
    workout('2026-10-01', [ex('bank', 55, 73)]),
    workout('2026-10-20', [ex('bank', 60, 80)]),
    workout('2026-11-19', [ex('bank', 62.5, 83)]),
  ];
  it('liefert Punkte in zeitlicher Reihenfolge', () => {
    expect(exerciseHistory(ws, 'bank').map((p) => p.topWeightKg)).toEqual([55, 60, 62.5]);
  });
  it('vergleicht mit dem Stand vor ~4 Wochen', () => {
    const points = exerciseHistory(ws, 'bank').map((p) => ({ date: p.date, value: p.topWeightKg }));
    const cmp = compareWithPast(points, NOW, 4);
    expect(cmp?.delta).toBe(2.5);
    expect(toDateKey(cmp!.since)).toBe('2026-10-20');
  });
  it('häufigste Übungen zuerst', () => {
    const list = trainedExercises([...ws, workout('2026-11-18', [ex('squat', 80, 100)])]);
    expect(list[0]!.exerciseId).toBe('bank');
    expect(list[0]!.sessions).toBe(3);
  });
  it('neueste Rekorde, pro Übung und Training einer', () => {
    const w = workout('2026-11-19', [ex('bank', 62.5, 83)], {
      records: [
        { exerciseId: 'bank', kind: 'e1rm', value: 83, previous: 80 },
        { exerciseId: 'bank', kind: 'gewicht', value: 62.5, previous: 60 },
      ],
    });
    const recs = recentRecords([w]);
    expect(recs).toHaveLength(1);
    expect(recs[0]!.kind).toBe('gewicht');
  });
});

describe('Wochen-Streak (ohne schlechtes Gewissen)', () => {
  const weekly = (dates: string[]) => dates.map((d) => workout(d, [ex('bank', 60, 80)]));
  it('zählt Wochen in Folge mit erreichtem Ziel', () => {
    const ws = weekly(['2026-11-03', '2026-11-10', '2026-11-17']);
    expect(weeklyStreak(ws, [], 1, NOW).weeks).toBe(3);
  });
  it('die laufende Woche bricht nichts, solange sie läuft', () => {
    const ws = weekly(['2026-11-03', '2026-11-10']);
    const s = weeklyStreak(ws, [], 1, NOW);
    expect(s.weeks).toBe(2);
    expect(s.thisWeek).toBe(0);
  });
  it('Krankheit/Pause lässt den Streak nicht verfallen', () => {
    const ws = weekly(['2026-10-20', '2026-10-27', '2026-11-17']);
    const pause: Pause = { id: 'p', kind: 'krank', start: '2026-11-02', end: '2026-11-14', createdAt: 0 };
    expect(weeklyStreak(ws, [], 1, NOW).weeks).toBe(1);
    expect(weeklyStreak(ws, [pause], 1, NOW).weeks).toBe(3);
  });
  it('ohne Pause bricht eine leere Woche den Streak', () => {
    const ws = weekly(['2026-10-27', '2026-11-17']);
    expect(weeklyStreak(ws, [], 1, NOW).weeks).toBe(1);
  });
});

describe('Nächster Trainingstag', () => {
  const plan = { id: 'p', name: 'P', split: 'abc' as const, days: [{ id: 'a', name: 'A', exercises: [] }, { id: 'b', name: 'B', exercises: [] }, { id: 'c', name: 'C', exercises: [] }], createdAt: 0, updatedAt: 0 };
  it('läuft der Reihe nach weiter – nichts wird nachgeholt', () => {
    expect(nextPlanDay(plan, [])?.id).toBe('a');
    expect(nextPlanDay(plan, [workout('2026-11-10', [], {}, 'a')])?.id).toBe('b');
    expect(nextPlanDay(plan, [workout('2026-11-10', [], {}, 'a'), workout('2026-11-12', [], {}, 'c')])?.id).toBe('a');
  });
});

it('Hilfsfunktion addDays', () => {
  expect(toDateKey(addDays(fromDateKey('2026-11-20'), 3))).toBe('2026-11-23');
});

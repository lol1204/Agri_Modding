import { buildCatalog } from '@/db/exercises';
import { defaultEquipment } from '@/domain/defaults';
import type { SessionItem, SetEntry, SetType } from '@/domain/types';
import { loadProfileFor, roundToAchievable, stepDown, stepUp } from '@/engine/loading';
import { estimateOneRepMax } from '@/engine/oneRepMax';
import { plateChange, platesPerSide } from '@/engine/plates';
import { prefillValues, previousSessionSets } from '@/engine/prefill';
import { fitToTimeBudget, nextItemId, restSeconds, shouldRestAfter, estimateItemsMinutes } from '@/engine/session';
import { summarizeWorkout } from '@/engine/summary';

const catalog = buildCatalog([]).byId;
const eq = defaultEquipment();
let t = 1000;
const item = (id: string, exerciseId: string, targetSets = 3, group: string | null = null): SessionItem => ({
  id, exerciseId, targetSets, repMin: 8, repMax: 10, supersetGroup: group,
});
const set = (itemId: string, exerciseId: string, weightKg: number, reps: number, type: SetType = 'work', workoutId = 'w1', rir: number | null = 2): SetEntry => ({
  id: `s${t}`, uid: 'u', workoutId, itemId, exerciseId, type, weightKg, reps, rir, painFlag: false, performedAt: t++,
});

describe('Machbare Gewichte', () => {
  const bar = loadProfileFor(catalog.get('bankdruecken-lh')!, eq);
  const db = loadProfileFor(catalog.get('bankdruecken-kh')!, eq);
  const machine = loadProfileFor(catalog.get('brustpresse')!, eq);
  const bw = loadProfileFor(catalog.get('klimmzug')!, eq);

  it('Langhantel: Stange + Scheibenpaare (Sprung 2,5 kg)', () => {
    expect(roundToAchievable(61, bar)).toBe(60);
    expect(roundToAchievable(56.25, bar)).toBe(57.5);
    expect(roundToAchievable(10, bar)).toBe(20);
    expect(stepUp(60, bar)).toBe(62.5);
    expect(stepDown(20, bar)).toBe(20);
  });
  it('Kurzhanteln: nur vorhandene Gewichte', () => {
    expect(roundToAchievable(23, db)).toBe(22.5);
    expect(stepUp(22.5, db)).toBe(24);
    expect(stepDown(22.5, db)).toBe(22);
  });
  it('Maschine: feste Schritte', () => {
    expect(roundToAchievable(47, machine)).toBe(45);
    expect(stepUp(45, machine)).toBe(50);
  });
  it('Bodyweight: Zusatzgewicht, nie negativ', () => {
    expect(stepDown(0, bw)).toBe(0);
    expect(stepUp(0, bw)).toBe(2.5);
    const noVest = loadProfileFor(catalog.get('klimmzug')!, { ...eq, addedWeightStepKg: 0 });
    expect(stepUp(0, noVest)).toBe(0);
  });
});

describe('Scheibenrechner', () => {
  it('berechnet Scheiben pro Seite', () => {
    expect(platesPerSide(100, 20, eq.platesKg).plates).toEqual([25, 15]);
    expect(platesPerSide(62.5, 20, eq.platesKg).plates).toEqual([20, 1.25]);
  });
  it('zeigt, was beim Umladen runter muss', () => {
    expect(plateChange(100, 75, 20, eq.platesKg)).toEqual({ remove: [15], add: [2.5] });
  });
});

describe('1RM', () => {
  it('Epley-Schätzung', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
    expect(estimateOneRepMax(60, 10)).toBe(80);
    expect(estimateOneRepMax(0, 10)).toBe(0);
  });
});

describe('Ablauf im Training', () => {
  it('bleibt bei der Übung, bis alle Sätze erledigt sind', () => {
    const items = [item('a', 'bankdruecken-lh', 2), item('b', 'rudern-lh', 2)];
    const sets = [set('a', 'bankdruecken-lh', 60, 10)];
    expect(nextItemId(items, sets, 'a')).toBe('a');
    sets.push(set('a', 'bankdruecken-lh', 60, 9));
    expect(nextItemId(items, sets, 'a')).toBe('b');
  });
  it('Supersatz: abwechselnd, Pause erst nach der Runde', () => {
    const items = [item('a', 'bizepscurl-kh', 2, 'g'), item('b', 'trizepsdruecken-kabel', 2, 'g'), item('c', 'crunches', 1)];
    const sets: SetEntry[] = [set('a', 'bizepscurl-kh', 12, 10)];
    expect(nextItemId(items, sets, 'a')).toBe('b');
    expect(shouldRestAfter(items, sets, 'a', 'work')).toBe(false);
    sets.push(set('b', 'trizepsdruecken-kabel', 20, 12));
    expect(nextItemId(items, sets, 'b')).toBe('a');
    expect(shouldRestAfter(items, sets, 'b', 'work')).toBe(true);
    sets.push(set('a', 'bizepscurl-kh', 12, 9), set('b', 'trizepsdruecken-kabel', 20, 11));
    expect(nextItemId(items, sets, 'b')).toBe('c');
  });
  it('übersprungene Übungen werden ausgelassen', () => {
    const items = [item('a', 'bankdruecken-lh', 1), { ...item('b', 'rudern-lh', 2), skipped: true }, item('c', 'crunches', 1)];
    const sets = [set('a', 'bankdruecken-lh', 60, 10)];
    expect(nextItemId(items, sets, 'a')).toBe('c');
  });
  it('Pausen: länger nach schweren Sätzen und bei Grundübungen', () => {
    const compound = catalog.get('kniebeuge-lh');
    const iso = catalog.get('seitheben-kh');
    expect(restSeconds({ exercise: compound, setType: 'work', rir: 2 })).toBe(150);
    expect(restSeconds({ exercise: compound, setType: 'work', rir: 0 })).toBe(210);
    expect(restSeconds({ exercise: iso, setType: 'work', rir: 2 })).toBe(90);
    expect(restSeconds({ exercise: iso, setType: 'failure', rir: 0 })).toBe(120);
    expect(restSeconds({ exercise: iso, setType: 'warmup', rir: null })).toBe(60);
    expect(restSeconds({ exercise: iso, setType: 'drop', rir: null })).toBe(0);
    expect(restSeconds({ exercise: iso, setType: 'work', rir: 2, overrideSec: 120 })).toBe(120);
  });
});

describe('Zeitbudget', () => {
  const items = [
    item('a', 'kniebeuge-lh', 4),
    item('b', 'bankdruecken-lh', 4),
    item('c', 'rudern-lh', 3),
    item('d', 'seitheben-kh', 3),
    item('e', 'bizepscurl-kh', 3),
    item('f', 'trizepsdruecken-kabel', 3),
  ];
  it('kürzt bei 30 Minuten zuerst Isolation, Grundübungen bleiben', () => {
    const before = estimateItemsMinutes(items, catalog);
    expect(before).toBeGreaterThan(30);
    const { items: fitted, changed } = fitToTimeBudget(items, 30, catalog);
    expect(changed).toBe(true);
    expect(estimateItemsMinutes(fitted, catalog)).toBeLessThanOrEqual(30);
    const kept = fitted.filter((i) => !i.skipped).map((i) => i.exerciseId);
    expect(kept[0]).toBe('kniebeuge-lh');
    expect(kept).toContain('bankdruecken-lh');
    expect(kept).not.toContain('trizepsdruecken-kabel');
  });
  it('ändert nichts, wenn die Zeit reicht', () => {
    expect(fitToTimeBudget(items, 300, catalog).changed).toBe(false);
  });
});

describe('Vorausfüllen', () => {
  it('nimmt die Werte vom letzten Mal, Satz für Satz', () => {
    const history = [set('x', 'bankdruecken-lh', 60, 10, 'work', 'alt'), set('x', 'bankdruecken-lh', 60, 8, 'work', 'alt'), set('x', 'bankdruecken-lh', 40, 10, 'warmup', 'alt')];
    const prev = previousSessionSets('bankdruecken-lh', history, 'neu');
    expect(prev).toHaveLength(2);
    expect(prefillValues({ doneSets: [], previous: prev, repMax: 10, bodyweight: false })).toMatchObject({ weightKg: 60, reps: 10, source: 'letztes_mal' });
    const today = [set('a', 'bankdruecken-lh', 62.5, 9, 'work', 'neu')];
    expect(prefillValues({ doneSets: today, previous: prev, repMax: 10, bodyweight: false })).toMatchObject({ weightKg: 62.5, reps: 9, source: 'heute' });
    expect(prefillValues({ doneSets: [], previous: [], repMax: 12, bodyweight: false }).source).toBe('neu');
  });
});

describe('Zusammenfassung und Rekorde', () => {
  it('trennt Drops vom Arbeitsvolumen und zählt harte Sätze pro Muskel', () => {
    const sets = [
      set('a', 'bankdruecken-lh', 40, 10, 'warmup'),
      set('a', 'bankdruecken-lh', 60, 10),
      set('a', 'bankdruecken-lh', 60, 8),
      set('a', 'bankdruecken-lh', 45, 8, 'drop', 'w1', null),
    ];
    const s = summarizeWorkout(sets, catalog, []);
    const bench = s.exercises[0]!;
    expect(bench.workSets).toBe(2);
    expect(bench.volumeKg).toBe(1080);
    expect(bench.dropVolumeKg).toBe(360);
    expect(bench.topWeightKg).toBe(60);
    expect(bench.e1rmKg).toBe(80);
    expect(s.hardSetsByMuscle.brust).toBe(2);
    expect(s.hardSetsByMuscle.trizeps).toBe(1);
    expect(s.records).toEqual([]);
  });
  it('erkennt neue Rekorde gegenüber früheren Trainings', () => {
    const old = summarizeWorkout([set('a', 'bankdruecken-lh', 60, 10)], catalog, []);
    const history = [{ id: 'alt', name: '', status: 'beendet' as const, startedAt: 0, endedAt: 1, planId: null, planDayId: null, items: [], updatedAt: 0, summary: old }];
    const now = summarizeWorkout([set('a', 'bankdruecken-lh', 62.5, 10)], catalog, history);
    expect(now.records.map((r) => r.kind).sort()).toEqual(['e1rm', 'gewicht']);
    const same = summarizeWorkout([set('a', 'bankdruecken-lh', 60, 9)], catalog, history);
    expect(same.records).toEqual([]);
  });
});

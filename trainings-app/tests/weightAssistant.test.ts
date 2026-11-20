import { buildCatalog } from '@/db/exercises';
import { defaultEquipment } from '@/domain/defaults';
import type { SetEntry } from '@/domain/types';
import { loadProfileFor } from '@/engine/loading';
import {
  deloadDue,
  detectStagnation,
  learnBias,
  shouldSuggestDrop,
  suggestNextSet,
  suggestSessionStart,
  warmupSets,
} from '@/engine/weightAssistant';

const catalog = buildCatalog([]).byId;
const eq = defaultEquipment();
const bench = catalog.get('bankdruecken-lh')!;
const barbell = loadProfileFor(bench, eq); // Stange 20 kg, Sprung 2,5 kg
const dumbbells = loadProfileFor(catalog.get('bankdruecken-kh')!, eq);
const machine = loadProfileFor(catalog.get('beinstrecker')!, eq);
const bodyweight = loadProfileFor(catalog.get('klimmzug')!, eq);
const noVest = loadProfileFor(catalog.get('klimmzug')!, { ...eq, addedWeightStepKg: 0 });

const next = (weightKg: number, reps: number, rir: number | null, extra: Partial<{ painFlag: boolean; setIndex: number; repMin: number; repMax: number; load: typeof barbell; bias: number }> = {}) =>
  suggestNextSet({
    repMin: extra.repMin ?? 8,
    repMax: extra.repMax ?? 10,
    last: { weightKg, reps, rir, painFlag: extra.painFlag ?? false },
    setIndex: extra.setIndex ?? 1,
    load: extra.load ?? barbell,
    bias: extra.bias,
  });

describe('Gewichtsassistent: Beispiele aus der Beschreibung (Bankdrücken, Ziel 8–10)', () => {
  it('60 kg × 10 bei RIR 3 → nächster Satz 62,5 kg', () => {
    const s = next(60, 10, 3);
    expect(s.action).toBe('erhoehen');
    expect(s.weightKg).toBe(62.5);
    expect(s.why).toContain('62,5 kg');
  });
  it('62,5 kg × 8 bei RIR 1 → halten', () => {
    const s = next(62.5, 8, 1, { setIndex: 2 });
    expect(s.action).toBe('halten');
    expect(s.weightKg).toBe(62.5);
  });
  it('62,5 kg × 6 bei RIR 0 → 57,5 kg', () => {
    const s = next(62.5, 6, 0, { setIndex: 3 });
    expect(s.action).toBe('senken');
    expect(s.weightKg).toBe(57.5);
  });
});

describe('Gewichtsassistent: Regeln', () => {
  it('Bereich übertroffen → erhöhen', () => {
    const s = next(60, 11, 1);
    expect(s.action).toBe('erhoehen');
    expect(s.reason).toBe('ueber_bereich');
    expect(s.weightKg).toBe(62.5);
  });
  it('der Sprung pro Satz ist begrenzt (max. ~5 %)', () => {
    const s = next(60, 16, 5); // weit drüber
    expect(s.weightKg).toBeLessThanOrEqual(63);
    const heavy = next(100, 16, 5);
    expect(heavy.weightKg).toBe(105); // zwei Stufen = 5 %
  });
  it('im Bereich bei RIR 1–2 → halten', () => {
    expect(next(60, 9, 2).action).toBe('halten');
    expect(next(60, 10, 1).action).toBe('halten');
  });
  it('unter dem Bereich ohne RIR 0 → ca. 5 % leichter', () => {
    const s = next(60, 6, 1);
    expect(s.action).toBe('senken');
    expect(s.weightKg).toBe(57.5);
  });
  it('RIR 0 im Bereich → leichter', () => {
    const s = next(100, 9, 0);
    expect(s.action).toBe('senken');
    expect(s.weightKg).toBe(95);
  });
  it('Ermüdung: ab Satz 2 eine Wiederholung unter dem Bereich bei RIR ≥ 1 → halten', () => {
    const s = next(62.5, 7, 1, { setIndex: 2 });
    expect(s.action).toBe('halten');
    expect(s.reason).toBe('ermuedung');
    // im ersten Satz gilt die Ausnahme nicht
    expect(next(62.5, 7, 1, { setIndex: 1 }).action).toBe('senken');
  });
  it('Schmerz-Flag → nie erhöhen', () => {
    const s = next(60, 12, 4, { painFlag: true });
    expect(s.action).toBe('halten');
    expect(s.weightKg).toBe(60);
    expect(next(60, 6, 0, { painFlag: true }).weightKg).toBeLessThan(60);
  });
  it('schlägt nur machbare Gewichte vor (Kurzhanteln, Maschine)', () => {
    expect(next(22.5, 10, 3, { load: dumbbells }).weightKg).toBe(24);
    expect(next(45, 16, 3, { load: machine, repMin: 10, repMax: 15 }).weightKg).toBe(50);
    expect(next(45, 7, 0, { load: machine, repMin: 10, repMax: 15 }).weightKg).toBe(40);
  });
  it('Bodyweight: Zusatzgewicht oder mehr Wiederholungen', () => {
    expect(next(0, 12, 3, { load: bodyweight, repMin: 5, repMax: 10 }).weightKg).toBe(2.5);
    const s = next(0, 12, 3, { load: noVest, repMin: 5, repMax: 10 });
    expect(s.weightKg).toBe(0);
    expect(s.reps).toBe(13);
    expect(s.why).toMatch(/Variante/);
  });
  it('jeder Vorschlag hat einen „Warum?“-Satz', () => {
    for (const s of [next(60, 10, 3), next(60, 9, 2), next(60, 6, 0), next(60, 7, 1, { setIndex: 2 }), next(60, 12, 4, { painFlag: true })]) {
      expect(s.why.length).toBeGreaterThan(10);
      expect(s.why.endsWith('.')).toBe(true);
    }
  });
});

describe('Start-Vorschlag (doppelte Progression)', () => {
  const prev = (reps: number[], weightKg = 60, rir = 1) => reps.map((r) => ({ weightKg, reps: r, rir, painFlag: false, type: 'work' as const }));

  it('neue Übung → Tastsatz mit leichtem Gewicht', () => {
    const s = suggestSessionStart({ repMin: 8, repMax: 10, previous: [], load: barbell });
    expect(s.feeler).toBe(true);
    expect(s.weightKg).toBe(20);
  });
  it('nicht alle Sätze am oberen Ende → Gewicht halten, eine Wdh. mehr', () => {
    const s = suggestSessionStart({ repMin: 8, repMax: 10, previous: prev([9, 8, 8]), load: barbell });
    expect(s.weightKg).toBe(60);
    expect(s.reps).toBe(10);
    expect(s.action).toBe('halten');
  });
  it('alle Sätze am oberen Ende → mehr Gewicht', () => {
    const s = suggestSessionStart({ repMin: 8, repMax: 10, previous: prev([10, 10, 10]), load: barbell });
    expect(s.weightKg).toBe(62.5);
    expect(s.reps).toBe(8);
  });
  it('unter dem Bereich → etwas leichter', () => {
    const s = suggestSessionStart({ repMin: 8, repMax: 10, previous: prev([6, 6, 5], 60, 0), load: barbell });
    expect(s.weightKg).toBeLessThan(60);
  });
  it('niedrige Tagesform → konservativer', () => {
    const normal = suggestSessionStart({ repMin: 8, repMax: 10, previous: prev([9, 9]), load: barbell });
    const low = suggestSessionStart({ repMin: 8, repMax: 10, previous: prev([9, 9]), load: barbell, readiness: 'leichter' });
    expect(low.weightKg).toBeLessThan(normal.weightKg);
    expect(low.why).toMatch(/Tagesform/);
  });
  it('Schmerz beim letzten Mal → nicht erhöhen', () => {
    const p = prev([10, 10, 10]).map((s, i) => ({ ...s, painFlag: i === 1 }));
    expect(suggestSessionStart({ repMin: 8, repMax: 10, previous: p, load: barbell }).weightKg).toBe(60);
  });
});

describe('Aufwärmsätze', () => {
  it('Prozent vom Arbeitsgewicht, auf machbare Gewichte gerundet', () => {
    const w = warmupSets(100, barbell, bench);
    expect(w.map((x) => x.weightKg)).toEqual([50, 70, 85]);
    expect(w.map((x) => x.percent)).toEqual([50, 70, 85]);
  });
  it('kein Aufwärmen bei Bodyweight', () => {
    expect(warmupSets(10, bodyweight, catalog.get('klimmzug')!)).toEqual([]);
  });
  it('leichte Gewichte: weniger Aufwärmsätze, nichts über der Stange doppelt', () => {
    const w = warmupSets(30, barbell, bench);
    expect(w.every((x) => x.weightKg >= 20 && x.weightKg < 30)).toBe(true);
    expect(new Set(w.map((x) => x.weightKg)).size).toBe(w.length);
  });
});

describe('Lernen aus Korrekturen', () => {
  const s = (weightKg: number, suggestedKg: number, i: number): SetEntry => ({
    id: String(i), uid: 'u', workoutId: 'w', itemId: 'i', exerciseId: 'e', type: 'work', weightKg, reps: 8, rir: 2, painFlag: false, performedAt: i, suggestedKg,
  });
  it('erst ab 3 Korrekturen, begrenzt auf ±5 %', () => {
    expect(learnBias([s(105, 100, 1), s(105, 100, 2)])).toBe(0);
    expect(learnBias([s(105, 100, 1), s(105, 100, 2), s(104, 100, 3)])).toBeCloseTo(0.047, 3);
    expect(learnBias([s(115, 100, 1), s(115, 100, 2), s(115, 100, 3)])).toBe(0.05);
  });
  it('ignoriert Ausreißer (z. B. Tastsatz-Vorschlag 20 kg, genommen 60 kg)', () => {
    expect(learnBias([s(60, 20, 1), s(62.5, 62.5, 2), s(62.5, 62.5, 3)])).toBe(0);
  });
  it('verschiebt künftige Vorschläge', () => {
    const plain = suggestSessionStart({ repMin: 8, repMax: 10, previous: [{ weightKg: 100, reps: 9, rir: 2, painFlag: false }], load: barbell });
    const biased = suggestSessionStart({ repMin: 8, repMax: 10, previous: [{ weightKg: 100, reps: 9, rir: 2, painFlag: false }], load: barbell, bias: 0.05 });
    expect(biased.weightKg).toBeGreaterThan(plain.weightKg);
  });
});

describe('Langfristig: Stagnation, Deload, Drops', () => {
  it('erkennt Stagnation', () => {
    expect(detectStagnation([80, 82, 84, 84, 83, 84])).toBe(true);
    expect(detectStagnation([80, 82, 84, 85])).toBe(false);
    expect(detectStagnation([80, 82])).toBe(false);
  });
  it('Deload alle paar Wochen oder bei Stagnation', () => {
    expect(deloadDue({ weeksSinceDeload: 6, stagnating: false })).toBe(true);
    expect(deloadDue({ weeksSinceDeload: 2, stagnating: true })).toBe(true);
    expect(deloadDue({ weeksSinceDeload: 3, stagnating: false })).toBe(false);
  });
  it('Drops nur bei Isolation/Maschine, nicht jede Woche, nicht bei niedriger Tagesform', () => {
    const now = Date.now();
    const iso = catalog.get('beinstrecker')!;
    expect(shouldSuggestDrop({ exercise: iso, readiness: 'voll', lastDropAt: null, now })).toBe(true);
    expect(shouldSuggestDrop({ exercise: catalog.get('kniebeuge-lh')!, readiness: 'voll', lastDropAt: null, now })).toBe(false);
    expect(shouldSuggestDrop({ exercise: iso, readiness: 'leichter', lastDropAt: null, now })).toBe(false);
    expect(shouldSuggestDrop({ exercise: iso, readiness: 'voll', lastDropAt: now - 2 * 86400000, now })).toBe(false);
  });
});

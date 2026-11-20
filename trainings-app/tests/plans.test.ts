import { builtInExercises, buildCatalog } from '@/db/exercises';
import type { PlanExercise } from '@/domain/types';
import {
  addDay,
  emptyPlan,
  estimateDayMinutes,
  isLinkedWithNext,
  moveItem,
  normalizeSupersets,
  replaceExercise,
  toggleSupersetWithNext,
} from '@/engine/planOps';
import { planFromTemplate, planTemplates } from '@/engine/templates';

let n = 0;
const ids = () => `id${++n}`;
const pe = (id: string, group: string | null = null): PlanExercise => ({
  id, exerciseId: 'bankdruecken-lh', sets: 3, repMin: 8, repMax: 10, supersetGroup: group,
});
const catalog = buildCatalog([]);

describe('Vorlagen', () => {
  it('alle Vorlagen verweisen nur auf existierende Übungen', () => {
    for (const t of planTemplates) {
      for (const day of t.days) {
        for (const [exerciseId] of day.exercises) {
          expect(catalog.byId.has(exerciseId)).toBe(true);
        }
      }
    }
  });

  it('enthält die geforderten Vorlagen', () => {
    expect(planTemplates.map((t) => t.split).sort()).toEqual(['abc', 'calisthenics', 'ganzkoerper', 'ppl', 'upper_lower'].sort());
  });

  it('erzeugt einen Plan mit Supersatz-Gruppen', () => {
    const t = planTemplates.find((x) => x.id === 'ganzkoerper')!;
    const { plan, swaps } = planFromTemplate(t, catalog.byId, null, ids, 1000);
    expect(plan.days).toHaveLength(2);
    expect(swaps).toEqual([]);
    const dayA = plan.days[0]!;
    const arme = dayA.exercises.filter((e) => e.supersetGroup);
    expect(arme).toHaveLength(2);
    expect(arme[0]!.supersetGroup).toBe(arme[1]!.supersetGroup);
  });

  it('ersetzt Übungen, für die Equipment fehlt', () => {
    const t = planTemplates.find((x) => x.id === 'ganzkoerper')!;
    const { plan, swaps } = planFromTemplate(t, catalog.byId, ['kurzhantel', 'klimmzugstange'], ids);
    expect(swaps.length).toBeGreaterThan(0);
    for (const day of plan.days) {
      for (const e of day.exercises) {
        expect(['kurzhantel', 'klimmzugstange', 'koerpergewicht']).toContain(catalog.byId.get(e.exerciseId)!.equipment);
      }
    }
  });
});

describe('Plan bearbeiten', () => {
  it('verschiebt Einträge', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(moveItem(['a', 'b'], 1, 9)).toEqual(['a', 'b']);
  });

  it('verbindet und trennt Supersätze', () => {
    let list = [pe('a'), pe('b'), pe('c')];
    list = toggleSupersetWithNext(list, 0, ids);
    expect(isLinkedWithNext(list, 0)).toBe(true);
    list = toggleSupersetWithNext(list, 1, ids); // c dazu → Dreiersatz
    expect(isLinkedWithNext(list, 1)).toBe(true);
    expect(new Set(list.map((e) => e.supersetGroup)).size).toBe(1);
    list = toggleSupersetWithNext(list, 0, ids); // a abtrennen
    expect(list[0]!.supersetGroup).toBeNull();
    expect(isLinkedWithNext(list, 1)).toBe(true);
  });

  it('löst Supersätze auf, die durch Verschieben getrennt wurden', () => {
    const list = normalizeSupersets(moveItem([pe('a', 'g'), pe('b', 'g'), pe('c')], 1, 2));
    expect(list.map((e) => e.supersetGroup)).toEqual([null, null, null]);
  });

  it('fügt Tage hinzu und übernimmt beim Tauschen den Wiederholungsbereich', () => {
    const plan = addDay(emptyPlan('Test', ids, 1), undefined, ids);
    expect(plan.days.map((d) => d.name)).toEqual(['Tag A', 'Tag B']);
    const swapped = replaceExercise(pe('x'), catalog.byId.get('seitheben-kh')!);
    expect([swapped.repMin, swapped.repMax]).toEqual([12, 20]);
  });

  it('schätzt die Dauer eines Trainingstags', () => {
    const t = planTemplates.find((x) => x.id === 'ppl')!;
    const { plan } = planFromTemplate(t, catalog.byId, null, ids);
    const min = estimateDayMinutes(plan.days[0]!, catalog.byId);
    expect(min).toBeGreaterThan(30);
    expect(min).toBeLessThan(120);
  });
});

it('Startdaten sind geladen', () => {
  expect(builtInExercises.length).toBeGreaterThan(0);
});

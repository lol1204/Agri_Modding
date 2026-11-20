import { builtInExercises, mergeExercises } from '@/db/exercises';
import { muscleLabels, equipmentLabels } from '@/domain/labels';
import type { Exercise } from '@/domain/types';
import { filterExercises, findAlternatives, isDropFriendly, normalizeSearch, progressionNeighbors } from '@/engine/exercises';

const byId = (id: string) => builtInExercises.find((e) => e.id === id)!;

describe('Startdaten data/exercises.json', () => {
  it('hat genug Übungen mit eindeutigen IDs', () => {
    expect(builtInExercises.length).toBeGreaterThanOrEqual(60);
    const ids = new Set(builtInExercises.map((e) => e.id));
    expect(ids.size).toBe(builtInExercises.length);
  });
  it('nutzt nur gültige Muskeln, Equipment und sinnvolle Bereiche', () => {
    for (const ex of builtInExercises) {
      for (const m of [...ex.primary, ...ex.secondary]) expect(muscleLabels).toHaveProperty(m);
      expect(equipmentLabels).toHaveProperty(ex.equipment);
      expect(ex.primary.length).toBeGreaterThan(0);
      expect(ex.repRange[0]).toBeLessThanOrEqual(ex.repRange[1]);
      expect(ex.tips.length).toBeGreaterThan(0);
    }
  });
  it('Calisthenics-Ketten haben lückenlose Stufen ab 1', () => {
    const chains = new Map<string, number[]>();
    for (const ex of builtInExercises) {
      if (!ex.progression) continue;
      chains.set(ex.progression.chain, [...(chains.get(ex.progression.chain) ?? []), ex.progression.level]);
    }
    expect(chains.size).toBeGreaterThanOrEqual(5);
    for (const levels of chains.values()) {
      expect([...levels].sort()).toEqual(levels.map((_, i) => i + 1));
    }
  });
});

describe('Suche und Filter', () => {
  it('findet Übungen unabhängig von Umlauten', () => {
    expect(normalizeSearch('Bankdrücken')).toBe(normalizeSearch('bankdruecken'));
    const hits = filterExercises(builtInExercises, { query: 'bankdruck' });
    expect(hits.map((e) => e.id)).toContain('bankdruecken-lh');
  });
  it('filtert nach Muskelgruppe, Typ und Equipment', () => {
    const back = filterExercises(builtInExercises, { region: 'ruecken' });
    expect(back.every((e) => e.primary.some((m) => ['lat', 'oberer_ruecken', 'unterer_ruecken'].includes(m)))).toBe(true);
    const bw = filterExercises(builtInExercises, { kind: 'bodyweight' });
    expect(bw.every((e) => e.bodyweight)).toBe(true);
    const home = filterExercises(builtInExercises, { availableEquipment: ['klimmzugstange'] });
    expect(home.every((e) => ['koerpergewicht', 'klimmzugstange'].includes(e.equipment))).toBe(true);
  });
  it('zeigt Favoriten zuerst', () => {
    const list = filterExercises(builtInExercises, { favorites: ['wadenheben-sitzend'] });
    expect(list[0]?.id).toBe('wadenheben-sitzend');
  });
});

describe('Alternativen und Progression', () => {
  it('schlägt für Bankdrücken andere Druckübungen für die Brust vor', () => {
    const alts = findAlternatives(byId('bankdruecken-lh'), builtInExercises);
    expect(alts.length).toBeGreaterThan(2);
    expect(alts.every((a) => a.pattern === 'horizontal_druecken' || a.primary.includes('brust'))).toBe(true);
    expect(alts.map((a) => a.id)).not.toContain('bankdruecken-lh');
  });
  it('berücksichtigt das vorhandene Equipment', () => {
    const alts = findAlternatives(byId('latziehen'), builtInExercises, ['klimmzugstange']);
    expect(alts.every((a) => ['klimmzugstange', 'koerpergewicht'].includes(a.equipment))).toBe(true);
    expect(alts.map((a) => a.id)).toContain('klimmzug');
  });
  it('kennt leichtere und schwerere Varianten', () => {
    const n = progressionNeighbors(byId('liegestuetz'), builtInExercises);
    expect(n.easier?.id).toBe('liegestuetz-erhoeht');
    expect(n.harder?.id).toBe('liegestuetz-fuesse-erhoeht');
    expect(progressionNeighbors(byId('bankdruecken-lh'), builtInExercises)).toEqual({ easier: null, harder: null });
  });
  it('Drops eher bei Isolation und Maschinen, nicht bei Kniebeugen', () => {
    expect(isDropFriendly(byId('beinstrecker'))).toBe(true);
    expect(isDropFriendly(byId('brustpresse'))).toBe(true);
    expect(isDropFriendly(byId('kniebeuge-lh'))).toBe(false);
  });
});

describe('Eigene Übungen', () => {
  it('werden ergänzt und überschreiben gleiche IDs', () => {
    const custom: Exercise = { ...byId('crunches'), id: 'eigen-1', name: 'Meine Übung' };
    const merged = mergeExercises([custom]);
    expect(merged.find((e) => e.id === 'eigen-1')?.custom).toBe(true);
    expect(merged.length).toBe(builtInExercises.length + 1);
  });
});

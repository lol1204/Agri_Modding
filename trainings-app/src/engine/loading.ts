import type { EquipmentSettings, Exercise } from '@/domain/types';
import { roundTo } from './units';

/**
 * Welche Gewichte sind mit dem Equipment überhaupt einstellbar?
 * - Langhantel: Stange + Scheibenpaare (kleinster Sprung = 2 × kleinste Scheibe)
 * - Kurzhantel/Kettlebell: nur die vorhandenen Gewichte
 * - Maschine/Kabel: feste Schritte am Steckgewicht
 * - Bodyweight: Zusatzgewicht in Schritten (0 = ohne)
 */
export type LoadProfile =
  | { kind: 'barbell'; barKg: number; stepKg: number }
  | { kind: 'list'; values: number[] }
  | { kind: 'step'; stepKg: number }
  | { kind: 'added'; stepKg: number };

export function loadProfileFor(exercise: Pick<Exercise, 'equipment' | 'bodyweight'>, eq: EquipmentSettings): LoadProfile {
  if (exercise.bodyweight) return { kind: 'added', stepKg: eq.addedWeightStepKg };
  switch (exercise.equipment) {
    case 'langhantel':
      return { kind: 'barbell', barKg: eq.barbellKg, stepKg: eq.smallestPlateKg * 2 };
    case 'sz_stange':
      return { kind: 'barbell', barKg: eq.ezBarKg, stepKg: eq.smallestPlateKg * 2 };
    case 'kurzhantel':
      return eq.dumbbellsKg.length ? { kind: 'list', values: [...eq.dumbbellsKg].sort((a, b) => a - b) } : { kind: 'step', stepKg: 2 };
    case 'kettlebell':
      return eq.kettlebellsKg.length ? { kind: 'list', values: [...eq.kettlebellsKg].sort((a, b) => a - b) } : { kind: 'step', stepKg: 4 };
    case 'maschine':
      return { kind: 'step', stepKg: eq.machineStepKg };
    case 'kabelzug':
      return { kind: 'step', stepKg: eq.cableStepKg };
    default:
      return { kind: 'step', stepKg: 1 };
  }
}

export type RoundMode = 'nearest' | 'down' | 'up';

function roundSteps(value: number, step: number, mode: RoundMode): number {
  const n = value / step;
  const eps = 1e-9;
  const k = mode === 'down' ? Math.floor(n + eps) : mode === 'up' ? Math.ceil(n - eps) : Math.round(n);
  return k * step;
}

/** Auf das nächste machbare Gewicht runden. */
export function roundToAchievable(kg: number, profile: LoadProfile, mode: RoundMode = 'nearest'): number {
  switch (profile.kind) {
    case 'barbell': {
      if (kg <= profile.barKg) return profile.barKg;
      if (profile.stepKg <= 0) return profile.barKg;
      return roundTo(profile.barKg + roundSteps(kg - profile.barKg, profile.stepKg, mode), 3);
    }
    case 'list': {
      const values = profile.values;
      if (!values.length) return roundTo(kg, 1);
      if (mode === 'down') return [...values].reverse().find((v) => v <= kg + 1e-9) ?? values[0]!;
      if (mode === 'up') return values.find((v) => v >= kg - 1e-9) ?? values[values.length - 1]!;
      let best = values[0]!;
      for (const v of values) if (Math.abs(v - kg) < Math.abs(best - kg) - 1e-9 || (Math.abs(Math.abs(v - kg) - Math.abs(best - kg)) < 1e-9 && v > best)) best = v;
      return best;
    }
    case 'step': {
      if (profile.stepKg <= 0) return roundTo(kg, 2);
      return roundTo(Math.max(profile.stepKg, roundSteps(kg, profile.stepKg, mode)), 3);
    }
    case 'added': {
      if (profile.stepKg <= 0) return 0;
      return roundTo(Math.max(0, roundSteps(kg, profile.stepKg, mode)), 3);
    }
  }
}

/** Nächstes machbares Gewicht nach oben. */
export function stepUp(kg: number, profile: LoadProfile): number {
  switch (profile.kind) {
    case 'barbell':
      return kg < profile.barKg ? profile.barKg : roundToAchievable(kg + profile.stepKg, profile, 'nearest');
    case 'list':
      return profile.values.find((v) => v > kg + 1e-9) ?? kg;
    case 'step':
      return roundToAchievable(kg + profile.stepKg, profile, 'nearest');
    case 'added':
      return profile.stepKg > 0 ? roundToAchievable(kg + profile.stepKg, profile, 'nearest') : 0;
  }
}

/** Nächstes machbares Gewicht nach unten. */
export function stepDown(kg: number, profile: LoadProfile): number {
  switch (profile.kind) {
    case 'barbell':
      return Math.max(profile.barKg, roundToAchievable(kg - profile.stepKg, profile, 'nearest'));
    case 'list':
      return [...profile.values].reverse().find((v) => v < kg - 1e-9) ?? profile.values[0] ?? kg;
    case 'step':
      return roundToAchievable(Math.max(profile.stepKg, kg - profile.stepKg), profile, 'nearest');
    case 'added':
      return profile.stepKg > 0 ? Math.max(0, roundToAchievable(kg - profile.stepKg, profile, 'nearest')) : 0;
  }
}

/** Kleinster sinnvoller Sprung (für Texte wie „+2,5 kg“). */
export function smallestStep(kg: number, profile: LoadProfile): number {
  return Math.max(0, roundTo(stepUp(kg, profile) - kg, 3));
}

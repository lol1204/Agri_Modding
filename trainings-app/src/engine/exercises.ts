import { muscleRegions } from '@/domain/labels';
import type { Difficulty, Equipment, Exercise } from '@/domain/types';

/** Umlaute vereinheitlichen, damit „kreuzhe“, „Kreuzheben“ und „Bankdrucken“ gefunden werden. */
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export type ExerciseKind = 'grund' | 'isolation' | 'bodyweight';

export interface ExerciseFilter {
  query?: string;
  /** ID aus muscleRegions (z. B. „ruecken“). */
  region?: string | null;
  equipment?: Equipment | null;
  difficulty?: Difficulty | null;
  kind?: ExerciseKind | null;
  favoritesOnly?: boolean;
  favorites?: string[];
  /** Nur Übungen, deren Equipment vorhanden ist. */
  availableEquipment?: Equipment[] | null;
}

/** Equipment, das immer da ist (eigener Körper). */
const ALWAYS_AVAILABLE: Equipment[] = ['koerpergewicht'];

export function isEquipmentAvailable(exercise: Exercise, available: Equipment[]): boolean {
  return ALWAYS_AVAILABLE.includes(exercise.equipment) || available.includes(exercise.equipment);
}

export function filterExercises(list: Exercise[], filter: ExerciseFilter): Exercise[] {
  const q = filter.query ? normalizeSearch(filter.query) : '';
  const region = filter.region ? muscleRegions.find((r) => r.id === filter.region) : null;
  return list
    .filter((ex) => {
      if (q && !normalizeSearch(ex.name).includes(q)) return false;
      if (region && !ex.primary.some((m) => region.muscles.includes(m))) return false;
      if (filter.equipment && ex.equipment !== filter.equipment) return false;
      if (filter.difficulty && ex.difficulty !== filter.difficulty) return false;
      if (filter.kind === 'bodyweight' && !ex.bodyweight) return false;
      if ((filter.kind === 'grund' || filter.kind === 'isolation') && ex.category !== filter.kind) return false;
      if (filter.favoritesOnly && !(filter.favorites ?? []).includes(ex.id)) return false;
      if (filter.availableEquipment && !isEquipmentAvailable(ex, filter.availableEquipment)) return false;
      return true;
    })
    .sort((a, b) => {
      const fa = filter.favorites?.includes(a.id) ? 0 : 1;
      const fb = filter.favorites?.includes(b.id) ? 0 : 1;
      return fa - fb || a.name.localeCompare(b.name, 'de');
    });
}

/**
 * Gleichwertige Übungen (z. B. Gerät besetzt): gleiches Bewegungsmuster und
 * gleiche Zielmuskeln zählen am meisten.
 */
export function findAlternatives(
  exercise: Exercise,
  all: Exercise[],
  available: Equipment[] | null = null,
  limit = 6,
): Exercise[] {
  return all
    .filter((ex) => ex.id !== exercise.id)
    .filter((ex) => !available || isEquipmentAvailable(ex, available))
    .map((ex) => {
      let score = 0;
      if (ex.pattern === exercise.pattern) score += 4;
      const overlap = ex.primary.filter((m) => exercise.primary.includes(m)).length;
      score += overlap * 2;
      if (ex.category === exercise.category) score += 1;
      if (ex.bodyweight === exercise.bodyweight) score += 0.5;
      score -= Math.abs(ex.difficulty - exercise.difficulty) * 0.5;
      return { ex, score };
    })
    .filter((s) => s.score >= 3)
    .sort((a, b) => b.score - a.score || a.ex.name.localeCompare(b.ex.name, 'de'))
    .slice(0, limit)
    .map((s) => s.ex);
}

/** Leichtere und schwerere Variante in einer Calisthenics-Progression. */
export function progressionNeighbors(
  exercise: Exercise,
  all: Exercise[],
): { easier: Exercise | null; harder: Exercise | null } {
  const p = exercise.progression;
  if (!p) return { easier: null, harder: null };
  const chain = all
    .filter((ex) => ex.progression?.chain === p.chain)
    .sort((a, b) => (a.progression?.level ?? 0) - (b.progression?.level ?? 0));
  const idx = chain.findIndex((ex) => ex.id === exercise.id);
  return {
    easier: idx > 0 ? (chain[idx - 1] ?? null) : null,
    harder: idx >= 0 && idx < chain.length - 1 ? (chain[idx + 1] ?? null) : null,
  };
}

/** Isolationsübung oder Maschine/Kabel – hier sind Dropsätze sinnvoll. */
export function isDropFriendly(exercise: Exercise): boolean {
  if (exercise.bodyweight) return false;
  return exercise.category === 'isolation' || exercise.equipment === 'maschine' || exercise.equipment === 'kabelzug';
}

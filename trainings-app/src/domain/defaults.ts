import type { EquipmentSettings, UserProfile } from './types';

/** Typische Ausstattung eines Studios plus Calisthenics zuhause. */
export function defaultEquipment(): EquipmentSettings {
  return {
    available: [
      'langhantel',
      'sz_stange',
      'kurzhantel',
      'maschine',
      'kabelzug',
      'koerpergewicht',
      'klimmzugstange',
      'dipbarren',
    ],
    barbellKg: 20,
    ezBarKg: 10,
    smallestPlateKg: 1.25,
    platesKg: [25, 20, 15, 10, 5, 2.5, 1.25],
    dumbbellsKg: [2, 4, 6, 8, 10, 12, 12.5, 14, 15, 16, 17.5, 18, 20, 22, 22.5, 24, 25, 26, 27.5, 28, 30, 32, 32.5, 34, 35, 36, 37.5, 40, 42.5, 45, 47.5, 50],
    kettlebellsKg: [8, 12, 16, 20, 24, 28, 32],
    machineStepKg: 5,
    cableStepKg: 2.5,
    addedWeightStepKg: 2.5,
  };
}

export function defaultProfile(now = Date.now()): UserProfile {
  return {
    goal: 'muskelaufbau',
    level: 'fortgeschritten',
    trainingDaysPerWeek: 3,
    sessionMinutes: 60,
    unit: 'kg',
    equipment: defaultEquipment(),
    activePlanId: null,
    favorites: [],
    seenHints: [],
    hiddenStats: [],
    activePauseId: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Fehlende Felder (z. B. nach App-Updates) mit Standardwerten auffüllen. */
export function normalizeProfile(raw: Partial<UserProfile> | null | undefined): UserProfile {
  const base = defaultProfile(raw?.createdAt ?? Date.now());
  if (!raw) return base;
  return {
    ...base,
    ...raw,
    equipment: { ...base.equipment, ...(raw.equipment ?? {}) },
    favorites: raw.favorites ?? [],
    seenHints: raw.seenHints ?? [],
    hiddenStats: raw.hiddenStats ?? [],
  };
}

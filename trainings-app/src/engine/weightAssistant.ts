/**
 * Gewichtsassistent – regelbasiert, reine Funktionen (keine Oberfläche, kein Speicher).
 *
 * Nach jedem Satz:
 *  1. Schmerz-Flag → nie erhöhen.
 *  2. Bereich übertroffen oder RIR ≥ 3 → erhöhen (eine machbare Stufe, max. ~5 % bzw. 2 Stufen).
 *  3. Unter dem Bereich oder RIR 0 → senken (~5 %, bei beidem ~10 %).
 *     Ausnahme Ermüdung: ab Satz 2 nur 1 Wdh. unter dem Bereich bei RIR ≥ 1 → halten.
 *  4. Im Bereich bei RIR 1–2 → halten.
 *
 * Vor dem ersten Arbeitssatz (Start-Vorschlag):
 *  - doppelte Progression: erst Wiederholungen steigern, dann Gewicht,
 *  - neue Übung → Tastsatz, niedrige Tagesform → etwas konservativer,
 *  - Aufwärmsätze als Prozent vom Arbeitsgewicht.
 *
 * Jeder Vorschlag hat einen kurzen „Warum?“-Satz.
 */
import type { Exercise, Readiness, SetEntry, SetType } from '@/domain/types';
import { isDropFriendly } from './exercises';
import { roundToAchievable, stepDown, stepUp, type LoadProfile } from './loading';
import { roundTo, formatWeight } from './units';

export type AssistantAction = 'erhoehen' | 'halten' | 'senken' | 'start';

export interface Suggestion {
  weightKg: number;
  /** Ziel-Wiederholungen für den nächsten Satz. */
  reps: number;
  action: AssistantAction;
  /** Maschinenlesbarer Grund (für Tests und Auswertung). */
  reason: string;
  /** Ein Satz Erklärung für „Warum?“. */
  why: string;
}

export interface SetPerformance {
  weightKg: number;
  reps: number;
  rir: number | null;
  painFlag: boolean;
  type?: SetType;
}

type Fmt = (kg: number) => string;
const defaultFmt: Fmt = (kg) => formatWeight(kg, 'kg');

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Maximaler Sprung nach oben pro Satz: 5 % (mindestens eine Stufe). */
const MAX_INCREASE = 0.05;

function increaseWeight(w: number, load: LoadProfile, strong: boolean, bias: number): number {
  const one = stepUp(w, load);
  if (one <= w) return w; // nichts Schwereres verfügbar
  let target = one;
  if (strong) {
    const two = stepUp(one, load);
    if (two > one && two <= w * (1 + MAX_INCREASE) + 1e-9) target = two;
  }
  if (bias > 0) {
    const biased = roundToAchievable(target * (1 + bias), load, 'down');
    if (biased > target && biased <= w * (1 + MAX_INCREASE * 1.5)) target = biased;
  }
  return target;
}

function decreaseWeight(w: number, load: LoadProfile, pct: number, bias: number): number {
  const raw = w * (1 - pct) * (1 + Math.min(0, bias));
  let target = roundToAchievable(raw, load, 'nearest');
  const oneDown = stepDown(w, load);
  if (target > oneDown) target = oneDown; // mindestens eine Stufe runter
  return target;
}

/** Vorschlag für den nächsten Satz derselben Übung. */
export function suggestNextSet(input: {
  repMin: number;
  repMax: number;
  last: SetPerformance;
  /** Wievielter Arbeitssatz `last` heute war (1 = erster). */
  setIndex: number;
  load: LoadProfile;
  /** Gelernte Korrektur (−0,05 … +0,05). */
  bias?: number;
  fmt?: Fmt;
}): Suggestion {
  const { repMin, repMax, last, setIndex, load } = input;
  const fmt = input.fmt ?? defaultFmt;
  const bias = clamp(input.bias ?? 0, -0.05, 0.05);
  const w = last.weightKg;
  const rir = last.rir;
  const above = last.reps > repMax;
  const below = last.reps < repMin;
  const rirZero = rir === 0;
  const rirHigh = rir !== null && rir >= 3;
  const holdReps = clamp(last.reps, repMin, repMax);

  // 1. Schmerz: nie erhöhen
  if (last.painFlag) {
    if (below || rirZero) {
      const target = decreaseWeight(w, load, 0.05, 0);
      return { weightKg: target, reps: repMin, action: 'senken', reason: 'schmerz_senken', why: `Zwicken markiert – etwas leichter (${fmt(target)}). Wird es schlimmer, lieber aufhören.` };
    }
    return { weightKg: w, reps: holdReps, action: 'halten', reason: 'schmerz_halten', why: 'Zwicken markiert – das Gewicht wird nicht erhöht. Bei Schmerzen lieber aufhören.' };
  }

  // 2. Erhöhen
  if (above || rirHigh) {
    const strong = last.reps >= repMax + 3 || (rir !== null && rir >= 4);
    const target = increaseWeight(w, load, strong, bias);
    if (target <= w) {
      // Keine schwerere Stufe verfügbar (z. B. Bodyweight ohne Zusatzgewicht, letzte Kurzhantel)
      const reps = Math.min(last.reps + 1, repMax + 5);
      const why =
        load.kind === 'added'
          ? 'Ohne Zusatzgewicht: versuch eine Wiederholung mehr – oder die schwerere Variante.'
          : 'Schwerer geht mit deinem Equipment nicht – dafür eine Wiederholung mehr.';
      return { weightKg: w, reps, action: 'erhoehen', reason: 'mehr_wiederholungen', why };
    }
    const reps = Math.max(repMin, Math.min(repMax, last.reps - 2));
    const why = above
      ? `${last.reps} Wdh. – über deinem Bereich (${repMin}–${repMax}): nächster Satz ${fmt(target)}.`
      : `RIR ${rir} – da ist noch Luft: nächster Satz ${fmt(target)}.`;
    return { weightKg: target, reps, action: 'erhoehen', reason: above ? 'ueber_bereich' : 'rir_hoch', why };
  }

  // 3. Senken (mit Ermüdungs-Ausnahme)
  if (below || rirZero) {
    const fatigue = setIndex >= 2 && last.reps === repMin - 1 && rir !== null && rir >= 1;
    if (fatigue) {
      return { weightKg: w, reps: repMin, action: 'halten', reason: 'ermuedung', why: 'Eine Wiederholung weniger ist durch Ermüdung normal – Gewicht halten.' };
    }
    const both = below && rirZero;
    const target = decreaseWeight(w, load, both ? 0.1 : 0.05, bias);
    if (target >= w) {
      return { weightKg: w, reps: repMin, action: 'halten', reason: 'minimum', why: 'Leichter geht hier nicht – gleiches Gewicht, Ziel: sauber im Bereich.' };
    }
    const why = both
      ? `${last.reps} Wdh. bei RIR 0 – unter deinem Bereich: etwa 10 % leichter (${fmt(target)}).`
      : below
        ? `Unter deinem Bereich (${repMin}–${repMax}): etwas leichter (${fmt(target)}).`
        : `RIR 0 – am Limit: etwas leichter (${fmt(target)}), damit die nächsten Sätze sauber bleiben.`;
    return { weightKg: target, reps: repMin, action: 'senken', reason: both ? 'unter_bereich_rir0' : below ? 'unter_bereich' : 'rir0', why };
  }

  // 4. Halten
  return {
    weightKg: w,
    reps: holdReps,
    action: 'halten',
    reason: 'im_ziel',
    why: rir === null ? 'Im Zielbereich – Gewicht halten.' : `${last.reps} Wdh. bei RIR ${rir} – genau im Ziel, Gewicht halten.`,
  };
}

/** Konservativer Startwert für eine neue Übung (Tastsatz). */
export function feelerWeight(load: LoadProfile): number {
  switch (load.kind) {
    case 'barbell':
      return load.barKg;
    case 'list':
      return load.values[Math.min(2, load.values.length - 1)] ?? 0;
    case 'step':
      return load.stepKg * 4;
    case 'added':
      return 0;
  }
}

/**
 * Start-Vorschlag für den ersten Arbeitssatz – doppelte Progression:
 * Erst wenn alle Sätze am oberen Ende des Bereichs waren, steigt das Gewicht.
 */
export function suggestSessionStart(input: {
  repMin: number;
  repMax: number;
  /** Arbeitssätze dieser Übung vom letzten Training. */
  previous: SetPerformance[];
  load: LoadProfile;
  readiness?: Readiness | null;
  bias?: number;
  /** Sanfte Woche nach Pause/Krankheit. */
  gentle?: boolean;
  fmt?: Fmt;
}): Suggestion & { feeler: boolean } {
  const { repMin, repMax, previous, load, readiness } = input;
  const fmt = input.fmt ?? defaultFmt;
  const bias = clamp(input.bias ?? 0, -0.05, 0.05);
  const work = previous.filter((s) => s.type !== 'warmup' && s.type !== 'drop');

  if (!work.length) {
    const w = feelerWeight(load);
    return {
      weightKg: w,
      reps: repMax,
      action: 'start',
      reason: 'tastsatz',
      why: 'Neue Übung: Starte mit einem leichten Tastsatz – danach passe ich das Gewicht an.',
      feeler: true,
    };
  }

  const top = work.reduce((a, b) => (b.weightKg > a.weightKg ? b : a));
  const topSets = work.filter((s) => s.weightKg === top.weightKg);
  const painBefore = work.some((s) => s.painFlag);
  let weight = top.weightKg;
  let reps = clamp((topSets[0]?.reps ?? repMin) + 1, repMin, repMax);
  let action: AssistantAction = 'halten';
  let reason = 'doppelte_progression_wdh';
  let why = `Gleiches Gewicht wie letztes Mal – Ziel: ${reps} Wdh. (erst Wiederholungen, dann Gewicht).`;

  const allAtTop = topSets.every((s) => s.reps >= repMax && (s.rir === null || s.rir >= 1));
  const underRange = topSets.every((s) => s.reps < repMin);

  if (painBefore) {
    reps = clamp(topSets[0]?.reps ?? repMin, repMin, repMax);
    reason = 'schmerz_letztes_mal';
    why = 'Letztes Mal hat es gezwickt – das Gewicht bleibt gleich. Hör auf deinen Körper.';
  } else if (allAtTop) {
    const up = stepUp(weight, load);
    if (up > weight) {
      weight = up;
      reps = repMin;
      action = 'erhoehen';
      reason = 'doppelte_progression_gewicht';
      why = `Letztes Mal alle Sätze am oberen Ende (${repMax} Wdh.) – heute ${fmt(weight)}.`;
    } else {
      reps = Math.min(repMax + 2, (topSets[0]?.reps ?? repMax) + 1);
      reason = 'doppelte_progression_ohne_stufe';
      why = 'Oberes Ende erreicht – schwerer geht nicht, also eine Wiederholung mehr oder die schwerere Variante.';
    }
  } else if (underRange) {
    const down = roundToAchievable(weight * 0.95, load, 'nearest');
    weight = down < weight ? down : stepDown(weight, load);
    reps = repMin;
    action = 'senken';
    reason = 'unter_bereich_letztes_mal';
    why = `Letztes Mal unter dem Bereich – heute etwas leichter (${fmt(weight)}), um sauber im Bereich zu landen.`;
  }

  // Gelernte Korrektur (z. B. du nimmst regelmäßig mehr als vorgeschlagen)
  if (!painBefore && Math.abs(bias) >= 0.01) {
    const biased = roundToAchievable(weight * (1 + bias), load, 'nearest');
    if (biased !== weight) {
      weight = biased;
      why += ' Angepasst an deine bisherigen Korrekturen.';
    }
  }

  // Tagesform / sanfte Woche: konservativer starten
  const factor = input.gentle ? 0.9 : readiness === 'leichter' ? 0.95 : readiness === 'ruhetag' ? 0.9 : 1;
  if (factor < 1) {
    const lighter = roundToAchievable(weight * factor, load, 'down');
    if (lighter < weight) {
      weight = lighter;
      action = 'senken';
      why += input.gentle ? ' Sanfte Woche nach der Pause: etwas leichter.' : ' Tagesform: heute etwas leichter.';
    }
  }

  return { weightKg: roundTo(weight, 3), reps, action, reason, why, feeler: false };
}

/** Aufwärmsätze als Prozent vom Arbeitsgewicht (nur Grundübungen mit Gewicht). */
export function warmupSets(
  workingKg: number,
  load: LoadProfile,
  exercise: Pick<Exercise, 'category' | 'bodyweight'>,
): { weightKg: number; reps: number; percent: number }[] {
  if (exercise.bodyweight || workingKg <= 0) return [];
  const scheme: [number, number][] =
    exercise.category === 'grund'
      ? workingKg >= 60
        ? [[0.5, 8], [0.7, 5], [0.85, 3]]
        : [[0.5, 8], [0.75, 4]]
      : [[0.6, 10]];
  const result: { weightKg: number; reps: number; percent: number }[] = [];
  for (const [pct, reps] of scheme) {
    const w = roundToAchievable(workingKg * pct, load, 'down');
    if (w >= workingKg) continue;
    if (result.some((r) => r.weightKg === w)) continue;
    result.push({ weightKg: w, reps, percent: Math.round(pct * 100) });
  }
  return result;
}

/**
 * Lernen aus Korrekturen: Wie stark weicht das genommene Gewicht im Schnitt
 * vom Vorschlag ab? Ergebnis begrenzt auf ±5 %, erst ab 3 Korrekturen.
 */
export function learnBias(history: SetEntry[]): number {
  const relevant = history
    .filter((s) => (s.type === 'work' || s.type === 'failure') && s.suggestedKg && s.suggestedKg > 0 && s.weightKg > 0)
    // Große Abweichungen (> 20 %) sind keine Korrektur, sondern eine andere Situation.
    .filter((s) => Math.abs(s.weightKg - (s.suggestedKg ?? 0)) / (s.suggestedKg ?? 1) <= 0.2)
    .sort((a, b) => b.performedAt - a.performedAt)
    .slice(0, 10);
  if (relevant.length < 3) return 0;
  const mean = relevant.reduce((sum, s) => sum + (s.weightKg - (s.suggestedKg ?? 0)) / (s.suggestedKg ?? 1), 0) / relevant.length;
  if (Math.abs(mean) < 0.01) return 0;
  return roundTo(clamp(mean, -0.05, 0.05), 3);
}

/**
 * Stagnation: Das geschätzte 1RM ist in den letzten `window` Trainings nicht
 * über den vorherigen Bestwert gestiegen → Deload oder Übungswechsel vorschlagen.
 */
export function detectStagnation(e1rmBySession: number[], window = 3): boolean {
  if (e1rmBySession.length < window + 1) return false;
  const before = e1rmBySession.slice(0, -window);
  const recent = e1rmBySession.slice(-window);
  const bestBefore = Math.max(...before);
  return bestBefore > 0 && Math.max(...recent) <= bestBefore;
}

/** Deload fällig? Alle `everyWeeks` Wochen oder bei Stagnation. */
export function deloadDue(params: { weeksSinceDeload: number; stagnating: boolean; everyWeeks?: number }): boolean {
  return params.stagnating || params.weeksSinceDeload >= (params.everyWeeks ?? 6);
}

/** Dropsatz vorschlagen? Isolation/Maschine, nicht jede Woche, nicht bei niedriger Tagesform. */
export function shouldSuggestDrop(params: {
  exercise: Pick<Exercise, 'category' | 'equipment' | 'bodyweight'>;
  readiness: Readiness | null;
  lastDropAt: number | null;
  now: number;
}): boolean {
  if (!isDropFriendly(params.exercise as Exercise)) return false;
  if (params.readiness === 'leichter' || params.readiness === 'ruhetag') return false;
  if (params.lastDropAt && params.now - params.lastDropAt < 7 * 24 * 60 * 60 * 1000) return false;
  return true;
}

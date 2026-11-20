import type { Exercise, Readiness, SessionItem, SetEntry, SetType, UserProfile } from '@/domain/types';
import { loadProfileFor } from '@/engine/loading';
import { isHardSet } from '@/engine/session';
import { formatWeight } from '@/engine/units';
import { learnBias, suggestNextSet, suggestSessionStart, warmupSets } from '@/engine/weightAssistant';

export interface NextSetContext {
  exercise: Exercise;
  item: SessionItem;
  /** Bereits geloggte Sätze dieser Übung im aktuellen Training. */
  doneSets: SetEntry[];
  /** Arbeitssätze dieser Übung aus dem letzten Training. */
  previousSets: SetEntry[];
  /** Alle bekannten Sätze dieser Übung (für Lernen aus Korrekturen). */
  history: SetEntry[];
  profile: UserProfile;
  readiness: Readiness | null;
  /** Sanfte Woche nach Pause/Krankheit. */
  gentle?: boolean;
}

export interface NextSetProposal {
  weightKg: number;
  reps: number;
  type: SetType;
  /** Vorschlag des Assistenten (zum Lernen aus Korrekturen). */
  suggestedKg: number | null;
  /** Kurze Begründung („Warum?“). */
  why: string | null;
  action: 'erhoehen' | 'halten' | 'senken' | 'start' | null;
  /** Neue Übung – mit Tastsatz starten. */
  feeler: boolean;
  /** Geplante Aufwärmsätze (für die Anzeige). */
  warmups: { weightKg: number; reps: number; percent: number }[];
  /** Arbeitsgewicht/-Wdh. (falls Aufwärmen übersprungen wird). */
  workingKg: number;
  workingReps: number;
  workingWhy: string | null;
}

/**
 * Verbindet den Gewichtsassistenten (src/engine/weightAssistant.ts) mit dem
 * laufenden Training: Aufwärmsätze → Start-Vorschlag → Vorschlag nach jedem Satz.
 */
export function proposeNextSet(ctx: NextSetContext): NextSetProposal {
  const { exercise, item, doneSets, previousSets, history, profile } = ctx;
  const load = loadProfileFor(exercise, profile.equipment);
  const fmt = (kg: number) => formatWeight(kg, profile.unit);
  const bias = learnBias(history);
  const hard = doneSets.filter((s) => isHardSet(s.type));

  if (hard.length === 0) {
    const start = suggestSessionStart({
      repMin: item.repMin,
      repMax: item.repMax,
      previous: previousSets.map((s) => ({ weightKg: s.weightKg, reps: s.reps, rir: s.rir, painFlag: s.painFlag, type: s.type })),
      load,
      readiness: ctx.readiness,
      bias,
      gentle: ctx.gentle,
      fmt,
    });
    const warmups = start.feeler ? [] : warmupSets(start.weightKg, load, exercise);
    const warmupsDone = doneSets.filter((s) => s.type === 'warmup').length;
    const nextWarmup = warmups[warmupsDone];
    if (nextWarmup) {
      return {
        weightKg: nextWarmup.weightKg,
        reps: nextWarmup.reps,
        type: 'warmup',
        suggestedKg: null,
        why: `Aufwärmen mit ${nextWarmup.percent} % vom Arbeitsgewicht (${fmt(start.weightKg)}).`,
        action: 'start',
        feeler: false,
        warmups,
        workingKg: start.weightKg,
        workingReps: start.reps,
        workingWhy: start.why,
      };
    }
    return {
      weightKg: start.weightKg,
      reps: start.reps,
      type: 'work',
      // Tastsatz ist kein echter Vorschlag → nicht zum Lernen verwenden
      suggestedKg: start.feeler ? null : start.weightKg,
      why: start.why,
      action: start.action,
      feeler: start.feeler,
      warmups,
      workingKg: start.weightKg,
      workingReps: start.reps,
      workingWhy: start.why,
    };
  }

  const last = hard[hard.length - 1]!;
  const s = suggestNextSet({
    repMin: item.repMin,
    repMax: item.repMax,
    last: { weightKg: last.weightKg, reps: last.reps, rir: last.rir, painFlag: last.painFlag },
    setIndex: hard.length,
    load,
    bias,
    fmt,
  });
  return {
    weightKg: s.weightKg,
    reps: s.reps,
    type: 'work',
    suggestedKg: s.weightKg,
    why: s.why,
    action: s.action,
    feeler: false,
    warmups: [],
    workingKg: s.weightKg,
    workingReps: s.reps,
    workingWhy: s.why,
  };
}

import type { Exercise, Readiness, SessionItem, SetEntry, SetType, UserProfile } from '@/domain/types';
import { prefillValues } from '@/engine/prefill';

export interface NextSetContext {
  exercise: Exercise;
  item: SessionItem;
  /** Bereits geloggte Sätze dieser Übung im aktuellen Training. */
  doneSets: SetEntry[];
  /** Sätze dieser Übung aus dem letzten Training. */
  previousSets: SetEntry[];
  /** Alle bekannten Sätze dieser Übung (für Lernen aus Korrekturen). */
  history: SetEntry[];
  profile: UserProfile;
  readiness: Readiness | null;
}

export interface NextSetProposal {
  weightKg: number;
  reps: number;
  type: SetType;
  /** Vorschlag des Assistenten (zum Lernen aus Korrekturen), null = nur übernommen. */
  suggestedKg: number | null;
  /** Kurze Begründung („Warum?“). */
  why: string | null;
  action: 'erhoehen' | 'halten' | 'senken' | 'start' | null;
  /** Neue Übung – mit Tastsatz starten. */
  feeler: boolean;
}

/** Werte für den nächsten Satz (Vorausfüllen vom letzten Mal). */
export function proposeNextSet(ctx: NextSetContext): NextSetProposal {
  const p = prefillValues({
    doneSets: ctx.doneSets,
    previous: ctx.previousSets,
    repMax: ctx.item.repMax,
    bodyweight: ctx.exercise.bodyweight,
  });
  return {
    weightKg: p.weightKg,
    reps: p.reps,
    type: 'work',
    suggestedKg: null,
    why: p.source === 'letztes_mal' ? 'Werte vom letzten Training.' : null,
    action: null,
    feeler: p.source === 'neu',
  };
}

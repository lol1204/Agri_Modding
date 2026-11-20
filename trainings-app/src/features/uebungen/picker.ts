import { router } from 'expo-router';

/**
 * Übung auswählen (z. B. für den Plan-Editor oder zum Tauschen im Training).
 * Der aufrufende Screen hinterlegt, was mit der Auswahl passieren soll,
 * und öffnet die Bibliothek im Auswahl-Modus.
 */
type PickHandler = (exerciseId: string) => void;

let handler: PickHandler | null = null;
let title = 'Übung wählen';

export function startExercisePick(pickTitle: string, onPick: PickHandler): void {
  handler = onPick;
  title = pickTitle;
  router.push({ pathname: '/uebungen', params: { pick: '1' } });
}

export function pickTitle(): string {
  return title;
}

export function completeExercisePick(exerciseId: string): void {
  const h = handler;
  handler = null;
  router.back();
  h?.(exerciseId);
}

export function hasPendingPick(): boolean {
  return handler !== null;
}

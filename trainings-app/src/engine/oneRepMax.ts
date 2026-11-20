/**
 * Geschätztes 1RM (Maximalgewicht für eine Wiederholung) nach Epley:
 * 1RM ≈ Gewicht × (1 + Wiederholungen / 30).
 * Über 12 Wiederholungen wird die Schätzung ungenau, daher dort gedeckelt.
 */
export function estimateOneRepMax(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  const r = Math.min(reps, 12);
  return Math.round(weightKg * (1 + r / 30) * 10) / 10;
}

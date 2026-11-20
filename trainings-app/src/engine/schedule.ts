import type { Plan, PlanDay, Workout } from '@/domain/types';

/**
 * Welcher Trainingstag ist als Nächstes dran? Der Plan läuft der Reihe nach
 * weiter – nach einer Pause wird nichts „nachgeholt“, es geht einfach mit
 * dem nächsten Tag weiter.
 */
export function nextPlanDay(plan: Plan, workouts: Workout[]): PlanDay | null {
  if (!plan.days.length) return null;
  const last = workouts
    .filter((w) => w.planId === plan.id && w.status === 'beendet' && w.planDayId)
    .sort((a, b) => b.startedAt - a.startedAt)[0];
  if (!last) return plan.days[0] ?? null;
  const idx = plan.days.findIndex((d) => d.id === last.planDayId);
  if (idx < 0) return plan.days[0] ?? null;
  return plan.days[(idx + 1) % plan.days.length] ?? null;
}

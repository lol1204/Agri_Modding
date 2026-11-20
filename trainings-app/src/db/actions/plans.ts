import type { Plan } from '@/domain/types';
import { emptyPlan } from '@/engine/planOps';
import { planFromTemplate, planTemplates } from '@/engine/templates';
import { currentCatalog } from '../exercises';
import { dataStore } from '../store';
import { updateProfile } from './profile';

export function savePlan(plan: Plan): void {
  dataStore.repos.plans.save({ ...plan, updatedAt: Date.now() });
}

/** Löscht den Plan und gibt eine Funktion zum Wiederherstellen zurück. */
export function deletePlan(planId: string): () => void {
  const { plans, profile } = dataStore.getState();
  const plan = plans.find((p) => p.id === planId);
  const wasActive = profile.activePlanId === planId;
  dataStore.repos.plans.remove(planId);
  if (wasActive) {
    const next = plans.find((p) => p.id !== planId);
    updateProfile({ activePlanId: next?.id ?? null });
  }
  return () => {
    if (!plan) return;
    dataStore.repos.plans.save(plan);
    if (wasActive) updateProfile({ activePlanId: plan.id });
  };
}

export function setActivePlan(planId: string): void {
  updateProfile({ activePlanId: planId });
}

/** Neuer Plan aus Vorlage; wird automatisch aktiv, falls noch keiner aktiv ist. */
export function createPlanFromTemplate(templateId: string): { plan: Plan; swaps: { from: string; to: string }[] } | null {
  const template = planTemplates.find((t) => t.id === templateId);
  if (!template) return null;
  const { profile } = dataStore.getState();
  const result = planFromTemplate(template, currentCatalog().byId, profile.equipment.available);
  savePlan(result.plan);
  if (!profile.activePlanId) setActivePlan(result.plan.id);
  return result;
}

export function createEmptyPlan(): Plan {
  const plan = emptyPlan();
  savePlan(plan);
  if (!dataStore.getState().profile.activePlanId) setActivePlan(plan.id);
  return plan;
}

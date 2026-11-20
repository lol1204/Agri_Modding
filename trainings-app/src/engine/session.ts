import type { Exercise, PlanDay, SessionItem, SetEntry, SetType } from '@/domain/types';

/**
 * Ablauf eines laufenden Trainings (reine Logik):
 * welche Übung ist dran, wann gibt es eine Pause, wie lange?
 */

export function isHardSet(type: SetType): boolean {
  return type === 'work' || type === 'failure';
}

export function itemsFromPlanDay(day: PlanDay): SessionItem[] {
  return day.exercises.map((e) => ({
    id: e.id,
    exerciseId: e.exerciseId,
    targetSets: e.sets,
    repMin: e.repMin,
    repMax: e.repMax,
    restSec: e.restSec ?? null,
    supersetGroup: e.supersetGroup ?? null,
    skipped: false,
  }));
}

export function setsForItem(sets: SetEntry[], itemId: string): SetEntry[] {
  return sets.filter((s) => s.itemId === itemId).sort((a, b) => a.performedAt - b.performedAt);
}

export function hardSetCount(sets: SetEntry[]): number {
  return sets.filter((s) => isHardSet(s.type)).length;
}

export function isItemComplete(item: SessionItem, sets: SetEntry[]): boolean {
  return !!item.skipped || hardSetCount(setsForItem(sets, item.id)) >= item.targetSets;
}

/** Übungen, die mit `item` einen Supersatz bilden (zusammenhängend, inkl. item). */
export function supersetMembers(items: SessionItem[], item: SessionItem): SessionItem[] {
  if (!item.supersetGroup) return [item];
  const idx = items.findIndex((i) => i.id === item.id);
  let start = idx;
  while (start > 0 && items[start - 1]?.supersetGroup === item.supersetGroup) start--;
  let end = idx;
  while (end < items.length - 1 && items[end + 1]?.supersetGroup === item.supersetGroup) end++;
  return items.slice(start, end + 1);
}

/**
 * Welche Übung ist nach einem Satz dran?
 * Supersatz: reihum (A1 → B1 → A2 → B2 …). Sonst bleibt man bei der Übung,
 * bis alle Sätze erledigt sind, dann geht es zur nächsten offenen Übung.
 */
export function nextItemId(items: SessionItem[], sets: SetEntry[], currentId: string): string | null {
  const current = items.find((i) => i.id === currentId);
  if (!current) return items.find((i) => !isItemComplete(i, sets))?.id ?? null;

  const group = supersetMembers(items, current);
  if (group.length > 1) {
    const open = group.filter((i) => !isItemComplete(i, sets));
    if (open.length) {
      const pos = group.findIndex((i) => i.id === currentId);
      const done = (i: SessionItem) => hardSetCount(setsForItem(sets, i.id));
      const minDone = Math.min(...open.map(done));
      for (let k = 1; k <= group.length; k++) {
        const candidate = group[(pos + k) % group.length]!;
        if (open.includes(candidate) && done(candidate) === minDone) return candidate.id;
      }
    }
  } else if (!isItemComplete(current, sets)) {
    return current.id;
  }

  const lastIdx = items.findIndex((i) => i.id === group[group.length - 1]!.id);
  const after = items.slice(lastIdx + 1).find((i) => !isItemComplete(i, sets));
  if (after) return after.id;
  return items.find((i) => !isItemComplete(i, sets))?.id ?? null;
}

/** Im Supersatz gibt es erst nach der Runde eine Pause. */
export function shouldRestAfter(items: SessionItem[], sets: SetEntry[], itemId: string, setType: SetType): boolean {
  if (setType === 'drop') return false;
  const item = items.find((i) => i.id === itemId);
  if (!item) return true;
  const group = supersetMembers(items, item);
  if (group.length < 2) return true;
  const next = nextItemId(items, sets, itemId);
  if (!next || next === itemId) return true;
  const nextInGroup = group.some((g) => g.id === next);
  if (!nextInGroup) return true;
  // Weiter in derselben Runde → keine Pause.
  const done = (id: string) => hardSetCount(setsForItem(sets, id));
  return done(next) >= done(itemId);
}

/**
 * Pausendauer in Sekunden. Grundübungen und schwere Sätze (RIR 0 / Versagen)
 * bekommen mehr Pause, Aufwärmsätze weniger, Dropsätze keine.
 */
export function restSeconds(params: {
  exercise: Pick<Exercise, 'category'> | undefined;
  setType: SetType;
  rir: number | null;
  overrideSec?: number | null;
}): number {
  const { exercise, setType, rir, overrideSec } = params;
  if (setType === 'drop') return 0;
  if (setType === 'warmup') return 60;
  const compound = exercise?.category === 'grund';
  let sec = overrideSec ?? (compound ? 150 : 90);
  if (setType === 'failure' || rir === 0) sec += compound ? 60 : 30;
  else if (rir !== null && rir >= 3) sec -= 15;
  return Math.max(30, Math.round(sec / 15) * 15);
}

/** Geschätzte Restdauer der offenen Übungen in Minuten. */
export function estimateItemsMinutes(items: SessionItem[], catalog: Map<string, Exercise>): number {
  let sec = 0;
  for (const item of items) {
    if (item.skipped) continue;
    const ex = catalog.get(item.exerciseId);
    const rest = item.restSec ?? (ex?.category === 'grund' ? 150 : 90);
    const factor = item.supersetGroup ? 0.6 : 1;
    sec += item.targetSets * (45 + rest * factor);
    if (ex?.category === 'grund') sec += 120;
  }
  return Math.round(sec / 60);
}

/**
 * Zeitbudget („nur 30 Minuten“): Die wichtigsten Übungen (Grundübungen, vorn im Plan)
 * bleiben. Zuerst werden Sätze von Isolationsübungen gekürzt, dann
 * Isolationsübungen von hinten weggelassen, dann Sätze der Grundübungen.
 */
export function fitToTimeBudget(
  items: SessionItem[],
  minutes: number,
  catalog: Map<string, Exercise>,
): { items: SessionItem[]; changed: boolean } {
  let result = items.map((i) => ({ ...i }));
  const fits = () => estimateItemsMinutes(result, catalog) <= minutes;
  if (fits()) return { items: result, changed: false };
  const isIso = (i: SessionItem) => catalog.get(i.exerciseId)?.category !== 'grund';

  // 1. Isolationsübungen auf 2 Sätze kürzen (von hinten)
  for (let k = result.length - 1; k >= 0 && !fits(); k--) {
    const it = result[k]!;
    if (isIso(it) && !it.skipped && it.targetSets > 2) it.targetSets = 2;
  }
  // 2. Isolationsübungen von hinten weglassen
  for (let k = result.length - 1; k >= 0 && !fits(); k--) {
    const it = result[k]!;
    if (isIso(it) && !it.skipped) it.skipped = true;
  }
  // 3. Grundübungen auf 2 Sätze kürzen (von hinten)
  for (let k = result.length - 1; k >= 0 && !fits(); k--) {
    const it = result[k]!;
    if (!isIso(it) && !it.skipped && it.targetSets > 2) it.targetSets = 2;
  }
  // 4. Grundübungen von hinten weglassen – mindestens eine bleibt
  for (let k = result.length - 1; k >= 0 && !fits(); k--) {
    const it = result[k]!;
    const remaining = result.filter((i) => !i.skipped).length;
    if (!it.skipped && remaining > 1) it.skipped = true;
  }
  // Weggelassene Übungen ans Ende, Supersätze bleiben nur, wenn beide Partner dabei sind.
  result = [...result.filter((i) => !i.skipped), ...result.filter((i) => i.skipped)];
  return { items: result, changed: true };
}

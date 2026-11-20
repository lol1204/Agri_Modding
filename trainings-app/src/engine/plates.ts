import { roundTo } from './units';

/**
 * Scheibenrechner: Welche Scheiben gehören pro Seite auf die Stange?
 * Gierig von groß nach klein (so lädt man im Gym auch).
 */
export function platesPerSide(totalKg: number, barKg: number, platesKg: number[]): { plates: number[]; restKg: number } {
  let perSide = roundTo((totalKg - barKg) / 2, 4);
  const plates: number[] = [];
  if (perSide <= 0) return { plates, restKg: 0 };
  for (const p of [...platesKg].sort((a, b) => b - a)) {
    while (perSide + 1e-9 >= p) {
      plates.push(p);
      perSide = roundTo(perSide - p, 4);
    }
  }
  return { plates, restKg: roundTo(perSide * 2, 3) };
}

/** Was muss beim Umladen (z. B. Dropsatz) pro Seite runter bzw. drauf? */
export function plateChange(
  fromKg: number,
  toKg: number,
  barKg: number,
  platesKg: number[],
): { remove: number[]; add: number[] } {
  const a = platesPerSide(fromKg, barKg, platesKg).plates;
  const b = platesPerSide(toKg, barKg, platesKg).plates;
  // Scheiben, die in beiden Ladungen vorkommen, bleiben drauf (von innen nach außen).
  const remaining = [...b];
  const remove: number[] = [];
  for (const p of a) {
    const idx = remaining.indexOf(p);
    if (idx >= 0) remaining.splice(idx, 1);
    else remove.push(p);
  }
  return { remove, add: remaining };
}

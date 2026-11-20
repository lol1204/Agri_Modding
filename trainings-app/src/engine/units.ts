import type { WeightUnit } from '@/domain/types';

export const LB_PER_KG = 2.2046226218;

export function kgToUnit(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? kg : kg * LB_PER_KG;
}

export function unitToKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value / LB_PER_KG;
}

/** Rundet auf sinnvolle Nachkommastellen (max. 2, ohne Rauschen wie 62.50000001). */
export function roundTo(value: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

const formatters = new Map<number, Intl.NumberFormat>();
/** Zahl im deutschen Format: 62,5 · 1.250 */
export function formatNumber(value: number, maxDecimals = 2): string {
  let f = formatters.get(maxDecimals);
  if (!f) {
    f = new Intl.NumberFormat('de-DE', { maximumFractionDigits: maxDecimals, minimumFractionDigits: 0 });
    formatters.set(maxDecimals, f);
  }
  return f.format(roundTo(value, maxDecimals));
}

/** Gewicht für die Anzeige, z. B. „62,5 kg“ oder „137,8 lb“. */
export function formatWeight(kg: number, unit: WeightUnit, withUnit = true): string {
  const value = kgToUnit(kg, unit);
  const text = formatNumber(value, unit === 'kg' ? 2 : 1);
  return withUnit ? `${text} ${unit}` : text;
}

/** Große Mengen (Volumen) kompakt: 12.340 kg → „12,3 t“. */
export function formatVolume(kg: number, unit: WeightUnit): string {
  const value = kgToUnit(kg, unit);
  if (unit === 'kg' && value >= 10000) return `${formatNumber(value / 1000, 1)} t`;
  return `${formatNumber(Math.round(value), 0)} ${unit}`;
}

/** Vorzeichen-Differenz für Vergleiche, z. B. „+2,5 kg“. */
export function formatDelta(deltaKg: number, unit: WeightUnit): string {
  const value = kgToUnit(deltaKg, unit);
  const sign = value > 0 ? '+' : value < 0 ? '−' : '±';
  return `${sign}${formatNumber(Math.abs(value), 1)} ${unit}`;
}

/** Eingabe wie „62,5“ oder „62.5“ in eine Zahl umwandeln. */
export function parseDecimal(input: string): number | null {
  const cleaned = input.trim().replace(/\s/g, '').replace(',', '.');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

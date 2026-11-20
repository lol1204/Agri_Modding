/** Datums-Hilfen (lokale Zeit, Wochen beginnen am Montag). */

export const DAY_MS = 24 * 60 * 60 * 1000;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Zeitpunkt → 'YYYY-MM-DD' (lokaler Kalendertag). */
export function toDateKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 'YYYY-MM-DD' → Zeitpunkt (00:00 lokale Zeit). */
export function fromDateKey(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).getTime();
}

export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Montag 00:00 der Woche, in der `ms` liegt. */
export function startOfWeek(ms: number): number {
  const d = new Date(startOfDay(ms));
  const weekday = (d.getDay() + 6) % 7; // Mo = 0 … So = 6
  d.setDate(d.getDate() - weekday);
  return d.getTime();
}

export function addDays(ms: number, days: number): number {
  const d = new Date(ms);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

export function addWeeks(ms: number, weeks: number): number {
  return addDays(ms, weeks * 7);
}

/** Schlüssel der Woche (Datum des Montags). */
export function weekKey(ms: number): string {
  return toDateKey(startOfWeek(ms));
}

/** Ganze Tage zwischen zwei Zeitpunkten (Kalendertage). */
export function daysBetween(fromMs: number, toMs: number): number {
  return Math.round((startOfDay(toMs) - startOfDay(fromMs)) / DAY_MS);
}

const weekdayShort = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const monthShort = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'];

/** „Mo, 20. Nov.“ */
export function formatDayShort(ms: number): string {
  const d = new Date(ms);
  return `${weekdayShort[d.getDay()]}, ${d.getDate()}. ${monthShort[d.getMonth()]}`;
}

/** „20.11.“ */
export function formatDayNumeric(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.`;
}

/** Wochentags-Kürzel Mo…So für eine Woche ab Montag. */
export const weekdayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

/** „Heute“, „Gestern“, „vor 3 Tagen“ oder Datum. */
export function formatRelativeDay(ms: number, now = Date.now()): string {
  const diff = daysBetween(ms, now);
  if (diff === 0) return 'Heute';
  if (diff === 1) return 'Gestern';
  if (diff > 1 && diff < 7) return `vor ${diff} Tagen`;
  return formatDayShort(ms);
}

/** Sekunden → „1:05“ bzw. „1:02:05“. */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** Dauer → „1 Std. 5 Min.“ bzw. „45 Min.“ */
export function formatDuration(totalSec: number): string {
  const min = Math.max(0, Math.round(totalSec / 60));
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} Min.`;
  return m === 0 ? `${h} Std.` : `${h} Std. ${m} Min.`;
}

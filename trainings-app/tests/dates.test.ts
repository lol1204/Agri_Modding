import { addDays, daysBetween, formatClock, formatDuration, fromDateKey, startOfWeek, toDateKey, weekKey } from '@/engine/dates';

describe('Datum', () => {
  it('Wochen beginnen am Montag', () => {
    const wed = new Date(2026, 10, 18, 15, 30).getTime(); // Mi, 18.11.2026
    expect(toDateKey(startOfWeek(wed))).toBe('2026-11-16');
    const sun = new Date(2026, 10, 22, 23, 0).getTime(); // So
    expect(weekKey(sun)).toBe('2026-11-16');
    const mon = new Date(2026, 10, 23, 0, 5).getTime();
    expect(weekKey(mon)).toBe('2026-11-23');
  });
  it('Datums-Schlüssel hin und zurück', () => {
    expect(toDateKey(fromDateKey('2026-02-28'))).toBe('2026-02-28');
    expect(toDateKey(addDays(fromDateKey('2026-02-28'), 1))).toBe('2026-03-01');
  });
  it('zählt Kalendertage', () => {
    expect(daysBetween(new Date(2026, 0, 1, 23).getTime(), new Date(2026, 0, 2, 1).getTime())).toBe(1);
  });
  it('formatiert Zeiten', () => {
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(formatDuration(45 * 60)).toBe('45 Min.');
    expect(formatDuration(65 * 60)).toBe('1 Std. 5 Min.');
  });
});

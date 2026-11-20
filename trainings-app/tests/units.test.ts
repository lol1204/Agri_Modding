import { formatDelta, formatNumber, formatVolume, formatWeight, kgToUnit, parseDecimal, unitToKg } from '@/engine/units';

describe('Einheiten', () => {
  it('formatiert deutsch mit Komma', () => {
    expect(formatNumber(62.5)).toBe('62,5');
    expect(formatNumber(1250)).toBe('1.250');
    expect(formatWeight(62.5, 'kg')).toBe('62,5 kg');
  });
  it('rechnet kg ↔ lb hin und zurück', () => {
    expect(unitToKg(kgToUnit(100, 'lb'), 'lb')).toBeCloseTo(100, 6);
    expect(formatWeight(100, 'lb')).toBe('220,5 lb');
  });
  it('zeigt Vergleiche mit Vorzeichen', () => {
    expect(formatDelta(2.5, 'kg')).toBe('+2,5 kg');
    expect(formatDelta(-5, 'kg')).toBe('−5 kg');
    expect(formatDelta(0, 'kg')).toBe('±0 kg');
  });
  it('fasst große Volumen zusammen', () => {
    expect(formatVolume(12340, 'kg')).toBe('12,3 t');
    expect(formatVolume(980, 'kg')).toBe('980 kg');
  });
  it('liest Eingaben mit Komma oder Punkt', () => {
    expect(parseDecimal('62,5')).toBe(62.5);
    expect(parseDecimal(' 60.0 ')).toBe(60);
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
  });
});

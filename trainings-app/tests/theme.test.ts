import { inputFontSize, touch, colors } from '@/theme';

describe('Theme', () => {
  it('Touch-Flächen sind mindestens 48 px groß', () => {
    expect(touch.minTarget).toBeGreaterThanOrEqual(48);
  });
  it('Eingabefelder haben mindestens 16 px Schrift (kein Auto-Zoom in iOS)', () => {
    expect(inputFontSize).toBeGreaterThanOrEqual(16);
  });
  it('nutzt die vorgegebenen Kernfarben', () => {
    expect(colors.accent).toBe('#3DDC97');
    expect(colors.background).toBe('#0B0D10');
    expect(colors.surface).toBe('#14171C');
  });
});

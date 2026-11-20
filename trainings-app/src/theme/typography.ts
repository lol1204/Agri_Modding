import type { TextStyle } from 'react-native';

/**
 * Textstile. Zahlen nutzen `tabular-nums` (gleich breite Ziffern),
 * damit Gewichte und Timer beim Hochzählen nicht springen.
 */
const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

export const typography = {
  hero: { fontSize: 64, lineHeight: 70, fontWeight: '700', letterSpacing: -1.5, ...tabular },
  display: { fontSize: 44, lineHeight: 50, fontWeight: '700', letterSpacing: -1, ...tabular },
  number: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.5, ...tabular },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.5 },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  subheading: { fontSize: 17, lineHeight: 23, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '600' },
  label: { fontSize: 14, lineHeight: 19, fontWeight: '600' },
  small: { fontSize: 14, lineHeight: 19, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.4 },
} as const satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof typography;

/** Mindestgröße für Eingabefelder – verhindert den Auto-Zoom in iOS Safari. */
export const inputFontSize = 17;


/** Abstände in px (4er-Raster). */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Eckenradien. */
export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/** Touch-Vorgaben: jede tippbare Fläche ist mindestens so groß. */
export const touch = {
  minTarget: 48,
  largeTarget: 56,
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
} as const;

/** Breite, ab der der Inhalt zentriert wird (iPad/Desktop). */
export const layout = {
  maxContentWidth: 560,
  screenPadding: 16,
  tabBarHeight: 60,
} as const;

/** Dauer von Animationen in ms. */
export const motion = {
  press: 90,
  fast: 160,
  normal: 260,
  slow: 600,
  celebrate: 1200,
} as const;

export type SpacingName = keyof typeof spacing;

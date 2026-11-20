/**
 * Alle Farben der App. Nur hier dürfen Farbwerte stehen –
 * überall sonst wird `colors.<name>` verwendet.
 */
export const colors = {
  // Flächen
  background: '#0B0D10',
  surface: '#14171C',
  surfaceRaised: '#1B1F26',
  surfacePressed: '#222832',
  border: '#262C36',
  divider: '#1E232B',

  // Akzent (Mint)
  accent: '#3DDC97',
  accentPressed: '#2FC283',
  accentSoft: 'rgba(61, 220, 151, 0.14)',
  accentFaint: 'rgba(61, 220, 151, 0.06)',
  onAccent: '#05140D',

  // Text
  text: '#F2F4F7',
  textMuted: '#A0A9B4',
  textFaint: '#626B77',

  // Status
  danger: '#FF6B6B',
  dangerSoft: 'rgba(255, 107, 107, 0.14)',
  warning: '#FFC266',
  warningSoft: 'rgba(255, 194, 102, 0.14)',
  info: '#7AB8FF',
  infoSoft: 'rgba(122, 184, 255, 0.14)',

  // Satztypen
  setWarmup: '#7AB8FF',
  setWork: '#3DDC97',
  setDrop: '#B794FF',
  setDropSoft: 'rgba(183, 148, 255, 0.14)',
  setFailure: '#FF8A5C',

  // Sonstiges
  overlay: 'rgba(0, 0, 0, 0.62)',
  transparent: 'transparent',
  white: '#FFFFFF',
} as const;

export type ColorName = keyof typeof colors;

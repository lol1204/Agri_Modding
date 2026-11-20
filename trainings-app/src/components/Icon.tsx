import Svg, { Circle, Path } from 'react-native-svg';
import { colors, type ColorName } from '@/theme';

/**
 * Eigene, schlichte Linien-Icons (24×24) als SVG.
 * Keine Icon-Schrift → nichts muss nachgeladen werden, funktioniert offline.
 */
type Shape =
  | { kind: 'path'; d: string; fill?: boolean }
  | { kind: 'circle'; cx: number; cy: number; r: number; fill?: boolean };

const p = (d: string, fill?: boolean): Shape => ({ kind: 'path', d, fill });
const c = (cx: number, cy: number, r: number, fill?: boolean): Shape => ({ kind: 'circle', cx, cy, r, fill });

const icons = {
  today: [p('M6 5h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z'), p('M3 10h18'), p('M8 3v4'), p('M16 3v4'), c(12, 15.5, 1.6, true)],
  plans: [p('M7.5 4h9A2.5 2.5 0 0 1 19 6.5v12a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 18.5v-12A2.5 2.5 0 0 1 7.5 4z'), p('M9 9h6'), p('M9 13h6'), p('M9 17h3.5')],
  progress: [p('M4 17l5-6 4 3 7-8'), p('M15 6h5v5')],
  coach: [p('M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4 3.5V17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z'), c(8.5, 11, 1.1, true), c(12, 11, 1.1, true), c(15.5, 11, 1.1, true)],
  profile: [c(12, 8, 4), p('M4 20.5c1.6-3.6 4.6-5.3 8-5.3s6.4 1.7 8 5.3')],
  plus: [p('M12 5v14'), p('M5 12h14')],
  minus: [p('M5 12h14')],
  check: [p('M5 12.5l4.5 4.5L19 7.5')],
  close: [p('M6 6l12 12'), p('M18 6L6 18')],
  chevronRight: [p('M9 5l7 7-7 7')],
  chevronLeft: [p('M15 5l-7 7 7 7')],
  chevronDown: [p('M5 9l7 7 7-7')],
  chevronUp: [p('M5 15l7-7 7 7')],
  undo: [p('M9 5L4 10l5 5'), p('M4 10h10a6 6 0 0 1 0 12h-3')],
  info: [c(12, 12, 9), p('M12 11v5.5'), c(12, 7.6, 1.1, true)],
  link: [p('M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1'), p('M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1')],
  grip: [c(9, 6, 1.4, true), c(15, 6, 1.4, true), c(9, 12, 1.4, true), c(15, 12, 1.4, true), c(9, 18, 1.4, true), c(15, 18, 1.4, true)],
  swap: [p('M7 4L3 8l4 4'), p('M3 8h14'), p('M17 12l4 4-4 4'), p('M21 16H7')],
  star: [p('M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z')],
  starFilled: [p('M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z', true)],
  trash: [p('M4 7h16'), p('M9 7V4.5h6V7'), p('M6.5 7l1 13h9l1-13')],
  timer: [c(12, 13, 8), p('M12 13V9'), p('M10 2.5h4')],
  edit: [p('M4 20h4L19 9l-4-4L4 16z'), p('M13.5 6.5l4 4')],
  note: [p('M6 3.5h8l4.5 4.5v12.5H6z'), p('M14 3.5V8h4.5'), p('M9 13h6'), p('M9 16.5h4')],
  play: [p('M8 5v14l11-7z', true)],
  pause: [p('M9 5v14'), p('M15 5v14')],
  search: [c(11, 11, 6.5), p('M16 16l4.5 4.5')],
  filter: [p('M4 6h16'), p('M7 12h10'), p('M10 18h4')],
  more: [c(6, 12, 1.5, true), c(12, 12, 1.5, true), c(18, 12, 1.5, true)],
  flame: [p('M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 1.6 1.2 2.6 2.5 3 0-2.7-.8-5.6 0-8z')],
  trophy: [p('M8 4h8v5a4 4 0 0 1-8 0z'), p('M8 6H5v1.5A3.5 3.5 0 0 0 8.5 11'), p('M16 6h3v1.5A3.5 3.5 0 0 1 15.5 11'), p('M12 13v4'), p('M8.5 20h7'), p('M10 17h4v3h-4z')],
  dumbbell: [p('M6.5 7v10'), p('M17.5 7v10'), p('M3.5 9.5v5'), p('M20.5 9.5v5'), p('M6.5 12h11')],
  skip: [p('M6 5l7 7-7 7'), p('M17 5v14')],
  flag: [p('M5 21V4'), p('M5 4h11l-2 4 2 4H5')],
  logout: [p('M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3'), p('M10 8l-4 4 4 4'), p('M6 12h10')],
  bolt: [p('M13 3L5 13.5h6L10 21l8-10.5h-6z')],
  arrowUp: [p('M12 19V5'), p('M6 11l6-6 6 6')],
  arrowDown: [p('M12 5v14'), p('M6 13l6 6 6-6')],
  layers: [p('M12 4l8 4-8 4-8-4z'), p('M4 12l8 4 8-4'), p('M4 16l8 4 8-4')],
  calculator: [p('M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z'), p('M8 7h8v3H8z'), c(9, 14, 1, true), c(12, 14, 1, true), c(15, 14, 1, true), c(9, 17.5, 1, true), c(12, 17.5, 1, true), c(15, 17.5, 1, true)],
  cloudOff: [p('M7 18h10a4 4 0 0 0 1-7.9A6 6 0 0 0 7.2 9 4.5 4.5 0 0 0 7 18z'), p('M4 4l16 16')],
  sound: [p('M4 9.5h3.5L12 6v12l-4.5-3.5H4z'), p('M15.5 9.5a3.5 3.5 0 0 1 0 5'), p('M18 7a7 7 0 0 1 0 10')],
  soundOff: [p('M4 9.5h3.5L12 6v12l-4.5-3.5H4z'), p('M16 10l4 4'), p('M20 10l-4 4')],
  sparkle: [p('M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z'), p('M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z')],
} satisfies Record<string, Shape[]>;

export type IconName = keyof typeof icons;

type IconProps = {
  name: IconName;
  size?: number;
  color?: ColorName;
  strokeWidth?: number;
};

export function Icon({ name, size = 24, color = 'text', strokeWidth = 2 }: IconProps) {
  const stroke = colors[color];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden importantForAccessibility="no">
      {icons[name].map((shape: Shape, i: number) =>
        shape.kind === 'path' ? (
          <Path
            key={i}
            d={shape.d}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={shape.fill ? stroke : 'none'}
          />
        ) : (
          <Circle
            key={i}
            cx={shape.cx}
            cy={shape.cy}
            r={shape.r}
            stroke={shape.fill ? 'none' : stroke}
            strokeWidth={strokeWidth}
            fill={shape.fill ? stroke : 'none'}
          />
        ),
      )}
    </Svg>
  );
}

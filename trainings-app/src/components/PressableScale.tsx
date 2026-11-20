import { useRef, type ReactNode } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { motion } from '@/theme';

const useNativeDriver = Platform.OS !== 'web';

export type PressableScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  /** Stil, solange gedrückt wird (z. B. dunklere Fläche). */
  pressedStyle?: StyleProp<ViewStyle>;
  /** Wie stark beim Drücken verkleinert wird (1 = gar nicht). */
  scaleTo?: number;
  children?: ReactNode;
};

// Diese Stilangaben bestimmen die Position im Eltern-Layout und gehören an den äußeren Container.
const OUTER_KEYS = [
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'alignSelf',
  'width',
  'minWidth',
  'maxWidth',
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginHorizontal',
  'marginVertical',
  'position',
  'top',
  'left',
  'right',
  'bottom',
  'zIndex',
] as const;

function splitStyle(style: StyleProp<ViewStyle>): { outer: ViewStyle; inner: ViewStyle } {
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(flat)) {
    if ((OUTER_KEYS as readonly string[]).includes(k)) outer[k] = v;
    else inner[k] = v;
  }
  // Füllt der äußere Container Platz (flex/Breite), soll der innere mitwachsen.
  if (outer.flex !== undefined || outer.flexGrow !== undefined || outer.width !== undefined || outer.alignSelf === 'stretch') {
    inner.flexGrow = 1;
  }
  return { outer: outer as ViewStyle, inner: inner as ViewStyle };
}

/**
 * Tippbare Fläche mit kurzer Druck-Animation (leichtes Eindrücken).
 * Grundlage für Buttons, Karten und Chips.
 */
export function PressableScale({
  style,
  pressedStyle,
  scaleTo = 0.97,
  children,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const { outer, inner } = splitStyle(style);

  const animate = (to: number) => {
    Animated.timing(scale, {
      toValue: to,
      duration: motion.press,
      useNativeDriver,
    }).start();
  };

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      style={outer}
      onPressIn={(e) => {
        animate(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animate(1);
        onPressOut?.(e);
      }}
    >
      {({ pressed }) => (
        <Animated.View style={[inner, pressed && pressedStyle, { transform: [{ scale }] }, disabled && { opacity: 0.45 }]}>
          {children}
        </Animated.View>
      )}
    </Pressable>
  );
}

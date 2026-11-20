import { useRef, type ReactNode } from 'react';
import {
  Animated,
  Platform,
  Pressable,
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
        <Animated.View
          style={[style, pressed && pressedStyle, { transform: [{ scale }] }, disabled && { opacity: 0.45 }]}
        >
          {children}
        </Animated.View>
      )}
    </Pressable>
  );
}

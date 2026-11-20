import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, spacing, touch } from '@/theme';
import { PressableScale } from './PressableScale';

type CardProps = {
  children?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Hervorgehobene Karte (Akzent-Rahmen). */
  highlighted?: boolean;
  /** Zurückgenommene Karte (z. B. erledigte Sätze). */
  muted?: boolean;
  padded?: boolean;
  accessibilityLabel?: string;
};

/** Karte als Grundbaustein – statt Tabellen. */
export function Card({
  children,
  onPress,
  onLongPress,
  style,
  highlighted,
  muted,
  padded = true,
  accessibilityLabel,
}: CardProps) {
  const cardStyle = [
    styles.card,
    padded && styles.padded,
    highlighted && styles.highlighted,
    muted && styles.muted,
    style,
  ];

  if (onPress || onLongPress) {
    return (
      <PressableScale
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={[cardStyle, { minHeight: touch.minTarget }]}
        pressedStyle={styles.pressed}
        scaleTo={0.985}
      >
        {children}
      </PressableScale>
    );
  }
  return (
    <View style={cardStyle} accessibilityLabel={accessibilityLabel}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  padded: {
    padding: spacing.lg,
  },
  highlighted: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceRaised,
  },
  muted: {
    opacity: 0.55,
  },
  pressed: {
    backgroundColor: colors.surfacePressed,
  },
});

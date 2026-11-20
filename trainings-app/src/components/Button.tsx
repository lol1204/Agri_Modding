import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, spacing, touch, type ColorName } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  icon?: IconName;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
};

const variantStyles: Record<ButtonVariant, { bg: ColorName; fg: ColorName; pressed: ColorName }> = {
  primary: { bg: 'accent', fg: 'onAccent', pressed: 'accentPressed' },
  secondary: { bg: 'surfaceRaised', fg: 'text', pressed: 'surfacePressed' },
  ghost: { bg: 'transparent', fg: 'accent', pressed: 'accentFaint' },
  danger: { bg: 'dangerSoft', fg: 'danger', pressed: 'surfacePressed' },
};

/** Button mit Druck-Animation. Mindesthöhe 48 px (groß: 56 px). */
export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled,
  fullWidth,
  style,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const v = variantStyles[variant];
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      testID={testID}
      style={[
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        { backgroundColor: colors[v.bg] },
        fullWidth && styles.fullWidth,
        style,
      ]}
      pressedStyle={{ backgroundColor: colors[v.pressed] }}
    >
      <View style={styles.row}>
        {icon ? <Icon name={icon} size={size === 'lg' ? 22 : 20} color={v.fg} /> : null}
        <AppText variant={size === 'lg' ? 'subheading' : 'bodyStrong'} color={v.fg} numberOfLines={1}>
          {title}
        </AppText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  md: { minHeight: touch.minTarget },
  lg: { minHeight: touch.largeTarget, borderRadius: radii.lg },
  fullWidth: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});

import { ScrollView, StyleSheet, View } from 'react-native';
import { colors, radii, spacing, touch, type ColorName } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  tone?: 'accent' | 'danger' | 'info';
  testID?: string;
  accessibilityLabel?: string;
};

const toneColors: Record<NonNullable<ChipProps['tone']>, { bg: ColorName; fg: ColorName }> = {
  accent: { bg: 'accentSoft', fg: 'accent' },
  danger: { bg: 'dangerSoft', fg: 'danger' },
  info: { bg: 'infoSoft', fg: 'info' },
};

/** Auswahl-Chip (Filter, Schnellwahl). Mindesthöhe 48 px. */
export function Chip({ label, selected, onPress, icon, tone = 'accent', testID, accessibilityLabel }: ChipProps) {
  const t = toneColors[tone];
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      testID={testID}
      style={[
        styles.chip,
        selected ? { backgroundColor: colors[t.bg], borderColor: colors[t.fg] } : null,
      ]}
      pressedStyle={styles.pressed}
      scaleTo={0.95}
    >
      {icon ? <Icon name={icon} size={18} color={selected ? t.fg : 'textMuted'} /> : null}
      <AppText variant="label" color={selected ? t.fg : 'text'} numberOfLines={1}>
        {label}
      </AppText>
    </PressableScale>
  );
}

type Option<T extends string | number> = { value: T; label: string };

type ChipGroupProps<T extends string | number> = {
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** Eine Zeile mit horizontalem Scrollen statt Umbruch. */
  scroll?: boolean;
  testIDPrefix?: string;
};

/** Einfachauswahl als Chips. */
export function ChipGroup<T extends string | number>({ options, value, onChange, scroll, testIDPrefix }: ChipGroupProps<T>) {
  const chips = options.map((o) => (
    <Chip
      key={String(o.value)}
      label={o.label}
      selected={o.value === value}
      onPress={() => onChange(o.value)}
      testID={testIDPrefix ? `${testIDPrefix}-${o.value}` : undefined}
    />
  ));
  if (scroll) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {chips}
      </ScrollView>
    );
  }
  return <View style={[styles.row, styles.wrap]}>{chips}</View>;
}

const styles = StyleSheet.create({
  chip: {
    minHeight: touch.minTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: { backgroundColor: colors.surfacePressed },
  row: { flexDirection: 'row', gap: spacing.sm },
  wrap: { flexWrap: 'wrap' },
});

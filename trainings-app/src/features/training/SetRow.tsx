import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { setTypeLabels } from '@/domain/labels';
import type { SetEntry, WeightUnit } from '@/domain/types';
import { formatWeight } from '@/engine/units';
import { colors, radii, spacing, touch, type ColorName } from '@/theme';

const typeColor: Record<SetEntry['type'], ColorName> = {
  warmup: 'setWarmup',
  work: 'setWork',
  drop: 'setDrop',
  failure: 'setFailure',
};

type Props = {
  set: SetEntry;
  label: string;
  unit: WeightUnit;
  bodyweight: boolean;
  onPress: () => void;
};

/** Erledigter Satz – tritt optisch zurück, per Tap bearbeitbar. */
export function SetRow({ set, label, unit, bodyweight, onPress }: Props) {
  const weight = bodyweight
    ? set.weightKg > 0
      ? `+${formatWeight(set.weightKg, unit)}`
      : 'Körpergewicht'
    : formatWeight(set.weightKg, unit);
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${setTypeLabels[set.type]} ${label}: ${weight}, ${set.reps} Wiederholungen. Bearbeiten`}
      style={[styles.row, set.type === 'drop' && styles.dropRow]}
      pressedStyle={styles.pressed}
      scaleTo={0.99}
    >
      <View style={[styles.badge, { borderColor: colors[typeColor[set.type]] }]}>
        <AppText variant="caption" color={typeColor[set.type]}>
          {label}
        </AppText>
      </View>
      <AppText variant="bodyStrong" color="textMuted" tabular style={styles.flex}>
        {weight} × {set.reps}
      </AppText>
      {set.rir !== null ? (
        <AppText variant="small" color="textFaint" tabular>
          RIR {set.rir >= 4 ? '4+' : set.rir}
        </AppText>
      ) : null}
      {set.painFlag ? <Icon name="flag" size={16} color="warning" /> : null}
      <Icon name="check" size={18} color="textFaint" />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: touch.minTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    opacity: 0.8,
  },
  dropRow: { marginLeft: spacing.xl },
  pressed: { backgroundColor: colors.surfacePressed },
  badge: {
    minWidth: 30,
    height: 26,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
});

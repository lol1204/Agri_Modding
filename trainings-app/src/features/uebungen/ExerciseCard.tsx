import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { equipmentLabels, muscleLabels } from '@/domain/labels';
import type { Exercise } from '@/domain/types';
import { colors, radii, spacing, touch } from '@/theme';

type Props = {
  exercise: Exercise;
  favorite?: boolean;
  onPress: () => void;
  onToggleFavorite?: () => void;
  /** Zusatzzeile, z. B. „3 × 8–10“. */
  detail?: string;
  testID?: string;
};

export function ExerciseCard({ exercise, favorite, onPress, onToggleFavorite, detail, testID }: Props) {
  const muscles = exercise.primary.map((m) => muscleLabels[m]).join(', ');
  return (
    <Card onPress={onPress} style={styles.card} accessibilityLabel={exercise.name}>
      <View style={styles.row} testID={testID}>
        <View style={styles.texts}>
          <AppText variant="bodyStrong" numberOfLines={2}>
            {exercise.name}
          </AppText>
          <AppText variant="small" color="textMuted" numberOfLines={1}>
            {muscles} · {equipmentLabels[exercise.equipment]}
          </AppText>
          <View style={styles.badges}>
            <Badge text={exercise.category === 'grund' ? 'Grundübung' : 'Isolation'} />
            {exercise.bodyweight ? <Badge text="Bodyweight" /> : null}
            {exercise.custom ? <Badge text="Eigene" tone="accent" /> : null}
            {detail ? <Badge text={detail} tone="accent" /> : null}
          </View>
        </View>
        {onToggleFavorite ? (
          <PressableScale
            onPress={onToggleFavorite}
            accessibilityRole="button"
            accessibilityLabel={favorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten'}
            style={styles.star}
            scaleTo={0.85}
          >
            <Icon name={favorite ? 'starFilled' : 'star'} size={22} color={favorite ? 'warning' : 'textFaint'} />
          </PressableScale>
        ) : (
          <Icon name="chevronRight" size={20} color="textFaint" />
        )}
      </View>
    </Card>
  );
}

export function Badge({ text, tone }: { text: string; tone?: 'accent' | 'drop' | 'info' }) {
  const bg = tone === 'accent' ? colors.accentSoft : tone === 'drop' ? colors.setDropSoft : tone === 'info' ? colors.infoSoft : colors.surfaceRaised;
  const fg = tone === 'accent' ? 'accent' : tone === 'drop' ? 'setDrop' : tone === 'info' ? 'info' : 'textMuted';
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <AppText variant="caption" color={fg}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  texts: { flex: 1, gap: spacing.xxs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.sm },
  star: {
    width: touch.minTarget,
    height: touch.minTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.sm,
  },
});

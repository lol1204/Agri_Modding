import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { ProgressRing } from '@/components/ProgressRing';
import { formatClock } from '@/engine/dates';
import { colors, radii, spacing, touch } from '@/theme';
import { playBeep, useNow } from './sessionState';

type Props = {
  endsAt: number;
  totalSec: number;
  soundOn: boolean;
  onAdd: (sec: number) => void;
  onSkip: () => void;
  onToggleSound: () => void;
};

/** Pausentimer mit Fortschrittsring – rechnet mit dem Endzeitpunkt. */
export function RestTimer({ endsAt, totalSec, soundOn, onAdd, onSkip, onToggleSound }: Props) {
  const now = useNow(250);
  const remaining = Math.max(0, (endsAt - now) / 1000);
  const done = remaining <= 0;
  const beeped = useRef(false);

  useEffect(() => {
    beeped.current = false;
  }, [endsAt]);
  useEffect(() => {
    if (done && soundOn && !beeped.current) {
      beeped.current = true;
      playBeep();
    }
  }, [done, soundOn]);

  return (
    <Card style={[styles.card, done && styles.cardDone]} accessibilityLabel={done ? 'Pause vorbei' : `Pause, noch ${Math.ceil(remaining)} Sekunden`}>
      <ProgressRing size={84} strokeWidth={8} progress={totalSec > 0 ? remaining / totalSec : 0} color={done ? 'accent' : 'accent'}>
        <AppText variant="heading" tabular testID="rest-remaining">
          {formatClock(remaining)}
        </AppText>
      </ProgressRing>
      <View style={styles.right}>
        <AppText variant="bodyStrong">{done ? 'Los geht’s – nächster Satz' : 'Pause'}</AppText>
        <View style={styles.row}>
          <PressableScale onPress={() => onAdd(30)} style={styles.pill} accessibilityRole="button" accessibilityLabel="30 Sekunden länger">
            <AppText variant="label">+30 s</AppText>
          </PressableScale>
          <PressableScale onPress={onSkip} style={styles.pill} accessibilityRole="button" accessibilityLabel="Pause beenden" testID="rest-skip">
            <AppText variant="label">{done ? 'Ausblenden' : 'Überspringen'}</AppText>
          </PressableScale>
          <PressableScale
            onPress={onToggleSound}
            style={styles.iconPill}
            accessibilityRole="button"
            accessibilityLabel={soundOn ? 'Ton aus' : 'Ton an'}
          >
            <Icon name={soundOn ? 'sound' : 'soundOff'} size={18} color={soundOn ? 'accent' : 'textFaint'} />
          </PressableScale>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  cardDone: { borderColor: colors.accent },
  right: { flex: 1, gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  pill: {
    minHeight: touch.minTarget - 4,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPill: {
    minHeight: touch.minTarget - 4,
    width: touch.minTarget - 4,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

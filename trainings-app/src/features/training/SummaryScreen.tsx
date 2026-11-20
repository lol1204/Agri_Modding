import { useLocalSearchParams } from 'expo-router';
import { goHome } from '../navigation';
import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ChipGroup } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { SectionTitle } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { updateWorkout } from '@/db/actions/workouts';
import { useExercises } from '@/db/exercises';
import { useData } from '@/db/store';
import type { RecordEntry, WeightUnit } from '@/domain/types';
import { formatDuration } from '@/engine/dates';
import { formatNumber, formatVolume, formatWeight } from '@/engine/units';
import { colors, radii, spacing } from '@/theme';

const useNativeDriver = Platform.OS !== 'web';

function recordText(r: RecordEntry, unit: WeightUnit): string {
  switch (r.kind) {
    case 'gewicht':
      return `Neues Höchstgewicht: ${formatWeight(r.value, unit)}`;
    case 'e1rm':
      return `Geschätztes 1RM: ${formatWeight(r.value, unit)}`;
    case 'wiederholungen':
      return `Meiste Wiederholungen: ${r.value}`;
    default:
      return `Bestwert: ${formatNumber(r.value)}`;
  }
}

export function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workouts, profile } = useData();
  const catalog = useExercises();
  const workout = workouts.find((w) => w.id === id);
  const unit = profile.unit;

  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // Feier-Animation nach dem Training (nie zwischen den Sätzen).
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 60, useNativeDriver }).start();
  }, [pop]);

  if (!workout || !workout.summary) {
    return (
      <Screen title="Zusammenfassung" onBack={() => goHome()}>
        <AppText color="textMuted">Keine Daten zu diesem Training.</AppText>
      </Screen>
    );
  }

  const s = workout.summary;
  const duration = workout.endedAt ? (workout.endedAt - workout.startedAt) / 1000 : 0;
  // Pro Übung nur den wichtigsten Rekord zeigen
  const records = s.records.filter(
    (r, i, all) => all.findIndex((x) => x.exerciseId === r.exerciseId) === i,
  );

  return (
    <Screen footer={<Button title="Fertig" size="lg" onPress={() => goHome()} testID="summary-fertig" />} testID="screen-zusammenfassung">
      <Animated.View
        style={[
          styles.hero,
          { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] },
        ]}
      >
        <View style={styles.heroIcon}>
          <Icon name={records.length ? 'trophy' : 'check'} size={40} color="accent" />
        </View>
        <AppText variant="title" align="center">
          {records.length ? 'Neue Rekorde!' : 'Training geschafft'}
        </AppText>
        <AppText color="textMuted" align="center">
          {workout.name} · {formatDuration(duration)}
        </AppText>
      </Animated.View>

      <View style={styles.tiles}>
        <Tile label="Sätze" value={String(s.workSets)} />
        <Tile label="Volumen" value={formatVolume(s.totalVolumeKg, unit)} sub={s.dropVolumeKg ? `+ ${formatVolume(s.dropVolumeKg, unit)} Drops` : undefined} />
        <Tile label="Übungen" value={String(s.exercises.length)} />
      </View>

      {records.length ? (
        <>
          <SectionTitle>Rekorde</SectionTitle>
          {records.map((r, i) => (
            <RecordCard key={`${r.exerciseId}-${r.kind}`} index={i} title={catalog.get(r.exerciseId)?.name ?? 'Übung'} text={recordText(r, unit)} previous={r.previous} unit={unit} kind={r.kind} />
          ))}
        </>
      ) : null}

      <SectionTitle>Übungen</SectionTitle>
      {s.exercises.map((e) => (
        <Card key={e.exerciseId}>
          <AppText variant="bodyStrong">{catalog.get(e.exerciseId)?.name ?? 'Übung'}</AppText>
          <AppText variant="small" color="textMuted" tabular>
            {e.workSets} Sätze · bester Satz{' '}
            {e.bodyweight && e.topWeightKg === 0 ? `${e.maxReps} Wdh.` : `${formatWeight(e.topWeightKg, unit)} × ${e.topReps}`}
            {e.dropVolumeKg ? ' · mit Drops' : ''}
          </AppText>
        </Card>
      ))}

      <SectionTitle>Wie anstrengend war’s? (optional)</SectionTitle>
      <ChipGroup
        options={[3, 5, 7, 8, 9, 10].map((v) => ({
          value: v,
          label: v <= 3 ? 'Locker' : v <= 5 ? 'Mittel' : v <= 7 ? 'Fordernd' : v === 8 ? 'Hart' : v === 9 ? 'Sehr hart' : 'Maximal',
        }))}
        value={workout.rpe ?? null}
        onChange={(rpe) => updateWorkout(workout.id, { rpe })}
        scroll
      />
    </Screen>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card style={styles.tile}>
      <AppText variant="heading" tabular numberOfLines={1}>
        {value}
      </AppText>
      <AppText variant="caption" color="textMuted">
        {label.toUpperCase()}
      </AppText>
      {sub ? (
        <AppText variant="caption" color="setDrop">
          {sub}
        </AppText>
      ) : null}
    </Card>
  );
}

function RecordCard({ index, title, text, previous, unit, kind }: { index: number; title: string; text: string; previous: number | null; unit: WeightUnit; kind: RecordEntry['kind'] }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(250 + index * 180),
      Animated.spring(anim, { toValue: 1, friction: 4, tension: 80, useNativeDriver }),
    ]).start();
  }, [anim, index]);
  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }, { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }}>
      <Card highlighted style={styles.record}>
        <Icon name="trophy" color="warning" />
        <View style={styles.flex}>
          <AppText variant="bodyStrong">{title}</AppText>
          <AppText color="accent">{text}</AppText>
          {previous !== null ? (
            <AppText variant="small" color="textMuted">
              Vorher: {kind === 'wiederholungen' ? `${previous} Wdh.` : formatWeight(previous, unit)}
            </AppText>
          ) : null}
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.md },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: { flex: 1, gap: spacing.xxs, paddingHorizontal: spacing.md },
  record: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  flex: { flex: 1, gap: spacing.xxs },
});


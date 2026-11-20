import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ChipGroup } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { findActiveWorkout, startFreeWorkout, startWorkoutFromPlan } from '@/db/actions/workouts';
import { useExercises } from '@/db/exercises';
import { useData } from '@/db/store';
import { formatClock } from '@/engine/dates';
import { estimateDayMinutes } from '@/engine/planOps';
import { nextPlanDay } from '@/engine/schedule';
import { spacing } from '@/theme';

const budgetOptions = [
  { value: 0, label: 'Volle Zeit' },
  { value: 30, label: 'Nur 30 Min.' },
  { value: 45, label: '45 Min.' },
];

export function TodayScreen() {
  const { plans, workouts, profile } = useData();
  const catalog = useExercises();
  const [budget, setBudget] = useState(0);

  const active = findActiveWorkout(workouts);
  const plan = plans.find((p) => p.id === profile.activePlanId) ?? plans[0];
  const nextDay = useMemo(() => (plan ? nextPlanDay(plan, workouts) : null), [plan, workouts]);
  const minutes = nextDay ? estimateDayMinutes(nextDay, catalog.byId) : 0;

  const start = () => {
    if (!plan || !nextDay) return;
    const id = startWorkoutFromPlan(plan.id, nextDay.id, budget || null);
    router.push({ pathname: '/training', params: { id } });
  };

  return (
    <Screen title="Heute" inTabs testID="screen-heute">
      {active ? (
        <Card highlighted style={styles.group}>
          <View style={styles.row}>
            <Icon name="timer" color="accent" />
            <AppText variant="heading">Training läuft</AppText>
          </View>
          <AppText color="textMuted" tabular>
            {active.name} · seit {formatClock((Date.now() - active.startedAt) / 1000)}
          </AppText>
          <Button
            title="Training fortsetzen"
            size="lg"
            icon="play"
            onPress={() => router.push({ pathname: '/training', params: { id: active.id } })}
            testID="heute-fortsetzen"
          />
        </Card>
      ) : plan && nextDay ? (
        <Card style={styles.group}>
          <AppText variant="caption" color="textMuted">
            NÄCHSTES TRAINING · {plan.name.toUpperCase()}
          </AppText>
          <AppText variant="title">{nextDay.name}</AppText>
          <AppText color="textMuted">
            {nextDay.exercises.length} Übungen · ca. {minutes} Min.
          </AppText>
          <View style={styles.exerciseList}>
            {nextDay.exercises.slice(0, 6).map((e) => (
              <AppText key={e.id} variant="small" color="textMuted" numberOfLines={1}>
                · {catalog.get(e.exerciseId)?.name ?? 'Übung'} – {e.sets} × {e.repMin}–{e.repMax}
              </AppText>
            ))}
            {nextDay.exercises.length > 6 ? (
              <AppText variant="small" color="textFaint">
                … und {nextDay.exercises.length - 6} weitere
              </AppText>
            ) : null}
          </View>
          <ChipGroup options={budgetOptions} value={budget} onChange={setBudget} scroll />
          <Button title="Training starten" size="lg" icon="play" onPress={start} disabled={!nextDay.exercises.length} testID="heute-start" />
        </Card>
      ) : (
        <Card style={styles.group}>
          <Icon name="plans" size={32} color="accent" />
          <AppText variant="heading">Los geht’s</AppText>
          <AppText color="textMuted">Wähle eine Vorlage – in zwei Taps hast du deinen ersten Plan.</AppText>
          <Button title="Vorlage wählen" size="lg" icon="layers" onPress={() => router.push('/vorlagen')} testID="heute-vorlage" />
        </Card>
      )}

      {!active ? (
        <Button
          title="Freies Training"
          variant="secondary"
          icon="plus"
          onPress={() => {
            const id = startFreeWorkout();
            router.push({ pathname: '/training', params: { id } });
          }}
          testID="heute-frei"
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  exerciseList: { gap: spacing.xxs, marginVertical: spacing.xs },
});

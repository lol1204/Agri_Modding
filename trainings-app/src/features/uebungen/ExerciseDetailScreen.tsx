import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { ListRow, SectionTitle } from '@/components/ListRow';
import { PressableScale } from '@/components/PressableScale';
import { Screen } from '@/components/Screen';
import { ConfirmSheet } from '@/components/Sheet';
import { toggleFavorite } from '@/db/actions/profile';
import { deleteCustomExercise, useExercises } from '@/db/exercises';
import { useData } from '@/db/store';
import { categoryLabels, difficultyLabels, equipmentLabels, muscleLabels } from '@/domain/labels';
import { findAlternatives, progressionNeighbors } from '@/engine/exercises';
import { spacing, touch } from '@/theme';
import { Badge } from './ExerciseCard';

type Props = {
  /** Zusätzlicher Inhalt (z. B. Verlauf aus dem Fortschritt). */
  historySlot?: (exerciseId: string) => ReactNode;
};

export function ExerciseDetailScreen({ historySlot }: Props) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useData();
  const catalog = useExercises();
  const exercise = id ? catalog.get(id) : undefined;
  const [confirmDelete, setConfirmDelete] = useState(false);

  const alternatives = useMemo(
    () => (exercise ? findAlternatives(exercise, catalog.list, profile.equipment.available, 5) : []),
    [exercise, catalog.list, profile.equipment.available],
  );
  const neighbors = useMemo(
    () => (exercise ? progressionNeighbors(exercise, catalog.list) : { easier: null, harder: null }),
    [exercise, catalog.list],
  );

  if (!exercise) {
    return (
      <Screen title="Übung" onBack={() => router.back()}>
        <AppText color="textMuted">Diese Übung gibt es nicht (mehr).</AppText>
      </Screen>
    );
  }

  const favorite = profile.favorites.includes(exercise.id);
  const open = (exId: string) => router.push({ pathname: '/uebung', params: { id: exId } });

  return (
    <Screen
      title={exercise.name}
      onBack={() => router.back()}
      testID="screen-uebung"
      headerRight={
        <PressableScale
          onPress={() => toggleFavorite(exercise.id)}
          accessibilityRole="button"
          accessibilityLabel={favorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten'}
          style={styles.iconBtn}
        >
          <Icon name={favorite ? 'starFilled' : 'star'} color={favorite ? 'warning' : 'textMuted'} />
        </PressableScale>
      }
    >
      <View style={styles.badges}>
        <Badge text={categoryLabels[exercise.category]} />
        <Badge text={equipmentLabels[exercise.equipment]} />
        <Badge text={difficultyLabels[exercise.difficulty]} />
        {exercise.bodyweight ? <Badge text="Bodyweight" tone="info" /> : null}
        {exercise.unilateral ? <Badge text="Einseitig" /> : null}
      </View>

      <Card style={styles.group}>
        <AppText variant="label" color="textMuted">
          Zielmuskeln
        </AppText>
        <AppText variant="bodyStrong">{exercise.primary.map((m) => muscleLabels[m]).join(', ')}</AppText>
        {exercise.secondary.length ? (
          <AppText color="textMuted">Mit dabei: {exercise.secondary.map((m) => muscleLabels[m]).join(', ')}</AppText>
        ) : null}
        <AppText variant="small" color="textMuted">
          Empfohlener Bereich: {exercise.repRange[0]}–{exercise.repRange[1]} Wiederholungen
          {exercise.bodyweight ? ' · Gewicht = Zusatzgewicht' : ''}
        </AppText>
      </Card>

      {exercise.tips.length ? (
        <>
          <SectionTitle>Technik</SectionTitle>
          <Card style={styles.group}>
            {exercise.tips.map((tip, i) => (
              <View key={i} style={styles.tip}>
                <Icon name="check" size={18} color="accent" />
                <AppText style={styles.flex}>{tip}</AppText>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {historySlot ? historySlot(exercise.id) : null}

      {neighbors.easier || neighbors.harder ? (
        <>
          <SectionTitle>Progression</SectionTitle>
          <Card style={styles.group}>
            {neighbors.easier ? (
              <ListRow icon="arrowDown" title={neighbors.easier.name} subtitle="Leichtere Variante" onPress={() => open(neighbors.easier!.id)} />
            ) : null}
            {neighbors.harder ? (
              <ListRow icon="arrowUp" iconColor="accent" title={neighbors.harder.name} subtitle="Schwerere Variante" onPress={() => open(neighbors.harder!.id)} />
            ) : null}
          </Card>
        </>
      ) : null}

      {alternatives.length ? (
        <>
          <SectionTitle>Gleichwertige Übungen</SectionTitle>
          <Card style={styles.group}>
            {alternatives.map((alt) => (
              <ListRow
                key={alt.id}
                icon="swap"
                title={alt.name}
                subtitle={equipmentLabels[alt.equipment]}
                onPress={() => open(alt.id)}
              />
            ))}
          </Card>
        </>
      ) : null}

      {exercise.custom ? (
        <View style={styles.group}>
          <Button
            title="Bearbeiten"
            icon="edit"
            variant="secondary"
            onPress={() => router.push({ pathname: '/eigene-uebung', params: { id: exercise.id } })}
          />
          <Button title="Löschen" icon="trash" variant="danger" onPress={() => setConfirmDelete(true)} />
        </View>
      ) : null}

      <ConfirmSheet
        visible={confirmDelete}
        title="Eigene Übung löschen?"
        message="Bisherige Trainings mit dieser Übung bleiben erhalten."
        confirmLabel="Löschen"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          deleteCustomExercise(exercise.id);
          router.back();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  group: { gap: spacing.sm },
  tip: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  flex: { flex: 1 },
  iconBtn: { width: touch.minTarget, height: touch.minTarget, alignItems: 'center', justifyContent: 'center' },
});

import { router, useLocalSearchParams } from 'expo-router';
import { goHome } from '../navigation';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ChipGroup } from '@/components/Chip';
import { Icon, type IconName } from '@/components/Icon';
import { InfoTerm, glossary } from '@/components/InfoTerm';
import { PressableScale } from '@/components/PressableScale';
import { Sheet } from '@/components/Sheet';
import { Stepper } from '@/components/Stepper';
import { useToast } from '@/components/Toast';
import { markHintSeen } from '@/db/actions/profile';
import {
  addItem,
  applyTimeBudget,
  discardWorkout,
  finishWorkout,
  logSet,
  removeSet,
  swapItem,
  updateItem,
  updateSet,
  updateWorkout,
} from '@/db/actions/workouts';
import { useExercises } from '@/db/exercises';
import { dataStore, useData } from '@/db/store';
import { setTypeLabels } from '@/domain/labels';
import type { Exercise, SessionItem, SetEntry, SetType, Workout } from '@/domain/types';
import { formatClock } from '@/engine/dates';
import { findAlternatives } from '@/engine/exercises';
import { loadProfileFor, roundToAchievable, stepDown, stepUp } from '@/engine/loading';
import { previousSessionSets } from '@/engine/prefill';
import { hardSetCount, isHardSet, isItemComplete, nextItemId, restSeconds, setsForItem, shouldRestAfter } from '@/engine/session';
import { formatWeight, kgToUnit, unitToKg } from '@/engine/units';
import { detectStagnation, shouldSuggestDrop } from '@/engine/weightAssistant';
import { keepScreenOn } from '@/integrations/wakeLock';
import { colors, layout, radii, spacing, touch } from '@/theme';
import { Badge } from '../uebungen/ExerciseCard';
import { startExercisePick } from '../uebungen/picker';
import { proposeNextSet } from './nextSet';
import { RestTimer } from './RestTimer';
import { clearLiveState, unlockAudio, useLiveState, useNow } from './sessionState';
import { SetRow } from './SetRow';
import { EditSetSheet, NoteSheet, OverviewSheet, PlateSheet, SwapSheet } from './TrainingSheets';

export function LiveTrainingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workouts } = useData();
  const workout = workouts.find((w) => w.id === id);
  if (!workout || workout.status !== 'aktiv') {
    return (
      <View style={styles.missing}>
        <AppText color="textMuted" align="center">
          Dieses Training ist schon beendet.
        </AppText>
        <Button title="Zur Startseite" onPress={() => goHome()} />
      </View>
    );
  }
  return <LiveTraining workout={workout} />;
}

const typeOptions: { value: SetType; label: string }[] = [
  { value: 'warmup', label: 'Aufwärmen' },
  { value: 'work', label: 'Arbeitssatz' },
  { value: 'failure', label: 'Bis Versagen' },
];

function LiveTraining({ workout }: { workout: Workout }) {
  const insets = useSafeAreaInsets();
  const { sets: allSets, profile } = useData();
  const catalog = useExercises();
  const { showToast, hideToast, setPlacement } = useToast();
  const [live, setLive] = useLiveState(workout.id);
  const now = useNow(1000);
  const unit = profile.unit;

  const sets = useMemo(() => allSets.filter((s) => s.workoutId === workout.id), [allSets, workout.id]);
  const activeItems = workout.items.filter((i) => !i.skipped);
  const fallbackItem = activeItems.find((i) => !isItemComplete(i, sets)) ?? activeItems[activeItems.length - 1] ?? null;
  const item: SessionItem | null =
    activeItems.find((i) => i.id === live.currentItemId) ?? fallbackItem;
  const exercise: Exercise | undefined = item ? catalog.get(item.exerciseId) : undefined;
  const itemSets = useMemo(() => (item ? setsForItem(sets, item.id) : []), [sets, item]);
  const doneHard = hardSetCount(itemSets);
  const itemComplete = item ? isItemComplete(item, sets) : false;
  const nextId = item ? nextItemId(workout.items, sets, item.id) : null;
  const nextItem = workout.items.find((i) => i.id === nextId && i.id !== item?.id);
  const allDone = activeItems.length > 0 && activeItems.every((i) => isItemComplete(i, sets));

  // Sätze der Übung vom letzten Mal (inkl. älterer Trainings, falls nötig nachgeladen)
  const recentPrevious = useMemo(
    () => (exercise ? previousSessionSets(exercise.id, allSets, workout.id) : []),
    [exercise, allSets, workout.id],
  );
  const olderPrevious = useOlderPrevious(exercise?.id, workout.id, recentPrevious.length === 0);
  const previousSets = recentPrevious.length ? recentPrevious : olderPrevious;
  const history = useMemo(() => (exercise ? allSets.filter((s) => s.exerciseId === exercise.id) : []), [allSets, exercise]);
  const { workouts } = useData();
  const stagnating = useMemo(() => {
    if (!exercise) return false;
    const series = workouts
      .filter((w) => w.status === 'beendet' && w.summary)
      .sort((a, b) => a.startedAt - b.startedAt)
      .map((w) => w.summary?.exercises.find((e) => e.exerciseId === exercise.id)?.e1rmKg ?? 0)
      .filter((v) => v > 0);
    return detectStagnation(series);
  }, [workouts, exercise]);

  const loadProfile = exercise ? loadProfileFor(exercise, profile.equipment) : null;
  const dropParent = live.dropOf ? sets.find((s) => s.id === live.dropOf) : undefined;
  const inDrop = !!dropParent;

  const proposal = useMemo(
    () =>
      exercise && item
        ? proposeNextSet({
            exercise,
            item,
            doneSets: itemSets,
            previousSets,
            history,
            profile,
            readiness: workout.readiness ?? null,
          })
        : null,
    [exercise, item, itemSets, previousSets, history, profile, workout.readiness],
  );

  // Eingabefelder für den aktuellen Satz
  const [weightKg, setWeightKg] = useState(0);
  const [reps, setReps] = useState(8);
  const [setType, setSetType] = useState<SetType>('work');
  const [phase, setPhase] = useState<'input' | 'rir'>('input');
  const [pain, setPain] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const inputKey = `${item?.id}:${itemSets.length}:${live.dropOf ?? ''}:${proposal ? 1 : 0}`;
  useEffect(() => {
    setPhase('input');
    setPain(false);
    setShowWhy(false);
    if (dropParent && loadProfile) {
      const target = roundToAchievable(dropParent.weightKg * 0.75, loadProfile, 'nearest');
      setWeightKg(target < dropParent.weightKg ? target : stepDown(dropParent.weightKg, loadProfile));
      setReps(Math.max(1, dropParent.reps));
      setSetType('drop');
    } else if (proposal) {
      setWeightKg(proposal.weightKg);
      setReps(proposal.reps);
      setSetType(proposal.type);
    }
    // Nur neu befüllen, wenn sich Satz/Übung ändert – nicht bei jeder Datenänderung.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputKey]);

  // Sheets
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [plateOpen, setPlateOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [editing, setEditing] = useState<SetEntry | null>(null);

  useEffect(() => keepScreenOn(), []);
  useEffect(() => {
    // Hinweise oben anzeigen, damit Gewicht und Wiederholungen frei bleiben.
    setPlacement('top');
    return () => {
      hideToast();
      setPlacement('bottom');
    };
  }, [setPlacement, hideToast]);
  // Beim ersten Öffnen: aktuelle Übung merken
  useEffect(() => {
    if (!live.currentItemId && item) setLive({ currentItemId: item.id });
  }, [live.currentItemId, item, setLive]);

  const alternatives = useMemo(
    () => (exercise ? findAlternatives(exercise, catalog.list, profile.equipment.available, 6) : []),
    [exercise, catalog.list, profile.equipment.available],
  );

  // ---------- Aktionen ----------

  // Welcher Vorschlag galt für diesen Satz? (Aufwärmen übersprungen → Arbeitsgewicht)
  const suggestedForCommit = (type: SetType): number | null => {
    if (!proposal || type === 'warmup' || type === 'drop' || proposal.feeler) return null;
    return proposal.type === 'warmup' ? proposal.workingKg : proposal.suggestedKg;
  };
  const whyText = proposal ? (proposal.type === 'warmup' && setType !== 'warmup' ? proposal.workingWhy : proposal.why) : null;

  const commit = (rir: number | null) => {
    if (!item || !exercise) return;
    const type: SetType = inDrop ? 'drop' : setType;
    const entry = logSet({
      workoutId: workout.id,
      itemId: item.id,
      exerciseId: exercise.id,
      type,
      weightKg,
      reps,
      rir: type === 'drop' ? null : rir,
      painFlag: pain,
      suggestedKg: suggestedForCommit(type),
      dropOf: inDrop ? (dropParent?.id ?? null) : null,
    });
    const newSets = [...sets, entry];
    const prevLive = { ...live };

    if (type === 'drop') {
      // Weitere Dropstufe möglich, keine Pause dazwischen
      setLive({ dropOf: entry.id, restEndsAt: null, restTotalSec: 0 });
    } else {
      const rest = shouldRestAfter(workout.items, newSets, item.id, type)
        ? restSeconds({ exercise, setType: type, rir, overrideSec: item.restSec })
        : 0;
      const next = nextItemId(workout.items, newSets, item.id);
      const justCompleted = !isItemComplete(item, sets) && isItemComplete(item, newSets);
      const inSuperset = !!item.supersetGroup && next !== null && workout.items.find((i) => i.id === next)?.supersetGroup === item.supersetGroup;
      // Nach dem letzten Satz einer Übung erst „erledigt“ zeigen (Dropsatz möglich), außer im Supersatz.
      const stay = justCompleted && !inSuperset;
      setLive({
        currentItemId: stay ? item.id : (next ?? item.id),
        restEndsAt: rest > 0 ? Date.now() + rest * 1000 : null,
        restTotalSec: rest,
        dropOf: null,
      });
    }

    showToast({
      message: type === 'drop' ? 'Dropsatz gespeichert' : 'Satz gespeichert',
      actionLabel: 'Rückgängig',
      duration: 3500,
      onAction: () => {
        removeSet(entry);
        setLive({ currentItemId: prevLive.currentItemId ?? item.id, restEndsAt: prevLive.restEndsAt, restTotalSec: prevLive.restTotalSec, dropOf: prevLive.dropOf });
      },
    });
  };

  const onMain = () => {
    unlockAudio();
    if (inDrop || setType === 'warmup') return commit(null);
    if (setType === 'failure') return commit(0);
    setPhase('rir');
  };

  const startDrop = () => {
    const parent = [...itemSets].reverse().find((s) => isHardSet(s.type) || s.type === 'drop');
    if (parent) setLive({ dropOf: parent.id, restEndsAt: null, restTotalSec: 0 });
  };

  const endDrops = () => {
    const rest = restSeconds({ exercise, setType: 'failure', rir: 0, overrideSec: item?.restSec });
    setLive({ dropOf: null, restEndsAt: Date.now() + rest * 1000, restTotalSec: rest });
  };

  const goTo = (itemId: string) => setLive({ currentItemId: itemId, dropOf: null });
  const neighbors = (() => {
    const idx = activeItems.findIndex((i) => i.id === item?.id);
    return { prev: idx > 0 ? activeItems[idx - 1] : undefined, next: idx >= 0 ? activeItems[idx + 1] : undefined };
  })();

  const finish = () => {
    setFinishOpen(false);
    const done = finishWorkout(workout.id);
    clearLiveState(workout.id);
    if (done) router.replace({ pathname: '/zusammenfassung', params: { id: done.id } });
  };

  const discard = () => {
    setFinishOpen(false);
    clearLiveState(workout.id);
    discardWorkout(workout.id);
    goHome();
  };

  const addExercise = () => {
    setOverviewOpen(false);
    startExercisePick('Übung hinzufügen', (exerciseId) => {
      const newId = addItem(workout.id, exerciseId);
      if (newId) setLive({ currentItemId: newId, dropOf: null });
    });
  };

  // ---------- Darstellung ----------

  const elapsed = Math.max(0, (now - workout.startedAt) / 1000);
  const position = item ? activeItems.findIndex((i) => i.id === item.id) + 1 : 0;
  const resting = live.restEndsAt !== null && !inDrop;
  const weightLabel = exercise?.bodyweight ? `Zusatz (${unit})` : unit;
  const stepperProps = loadProfile
    ? {
        nextUp: (v: number) => kgToUnit(stepUp(unitToKg(v, unit), loadProfile), unit),
        nextDown: (v: number) => kgToUnit(stepDown(unitToKg(v, unit), loadProfile), unit),
      }
    : {};
  const setNumber = inDrop
    ? `Drop ${itemSets.filter((s) => s.type === 'drop').length + 1}`
    : setType === 'warmup'
      ? 'Aufwärmsatz'
      : `Satz ${doneHard + 1}${item ? ` von ${item.targetSets}` : ''}`;
  const isBarbell = loadProfile?.kind === 'barbell';
  const canDrop = !!exercise && !exercise.bodyweight && itemSets.some((s) => isHardSet(s.type));
  const lastDropAt = history.filter((s) => s.type === 'drop' && s.workoutId !== workout.id).reduce<number | null>((m, s) => (m === null || s.performedAt > m ? s.performedAt : m), null);
  const dropSuggested = !!exercise && shouldSuggestDrop({ exercise, readiness: workout.readiness ?? null, lastDropAt, now });
  const changeType = (t: SetType) => {
    // Aufwärmen überspringen → direkt mit dem Arbeitsgewicht starten
    if (proposal && proposal.type === 'warmup' && t !== 'warmup') {
      setWeightKg(proposal.workingKg);
      setReps(proposal.workingReps);
    }
    setSetType(t);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="screen-training">
      {/* Kopfzeile */}
      <View style={styles.topBar}>
        <IconButton icon="close" label="Training beenden" onPress={() => setFinishOpen(true)} testID="training-close" />
        <View style={styles.topCenter}>
          <AppText variant="label" numberOfLines={1}>
            {workout.name}
          </AppText>
          <AppText variant="caption" color="textMuted" tabular>
            {formatClock(elapsed)}
            {activeItems.length ? ` · Übung ${position} von ${activeItems.length}` : ''}
          </AppText>
        </View>
        <IconButton icon="more" label="Übersicht" onPress={() => setOverviewOpen(true)} testID="training-overview" />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {!item || !exercise ? (
          <Card style={styles.group}>
            <AppText variant="heading">Freies Training</AppText>
            <AppText color="textMuted">Füge deine erste Übung hinzu.</AppText>
            <Button title="Übung hinzufügen" icon="plus" onPress={addExercise} testID="training-add-first" />
          </Card>
        ) : (
          <>
            {/* Übung */}
            <View style={styles.exerciseHeader}>
              <View style={styles.flex}>
                <AppText variant="title" testID="training-exercise-name">
                  {exercise.name}
                </AppText>
                <View style={styles.metaRow}>
                  <AppText color="textMuted" tabular>
                    Ziel: {item.targetSets} × {item.repMin}–{item.repMax} Wdh.
                  </AppText>
                  {item.supersetGroup ? <Badge text="Supersatz" tone="info" /> : null}
                  {item.swappedFrom ? <Badge text="Getauscht" /> : null}
                </View>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionRow}>
              <SmallAction icon="swap" label="Tauschen" onPress={() => setSwapOpen(true)} />
              <SmallAction icon="note" label={item.note ? 'Notiz ✓' : 'Notiz'} onPress={() => setNoteOpen(true)} />
              <SmallAction icon="info" label="Technik" onPress={() => setInfoOpen(true)} />
              {isBarbell ? <SmallAction icon="calculator" label="Scheiben" onPress={() => setPlateOpen(true)} /> : null}
            </ScrollView>

            {resting && live.restEndsAt ? (
              <RestTimer
                endsAt={live.restEndsAt}
                totalSec={live.restTotalSec}
                soundOn={live.soundOn}
                onAdd={(sec) => setLive({ restEndsAt: (live.restEndsAt ?? Date.now()) + sec * 1000, restTotalSec: live.restTotalSec + sec })}
                onSkip={() => setLive({ restEndsAt: null })}
                onToggleSound={() => {
                  unlockAudio();
                  setLive({ soundOn: !live.soundOn });
                }}
              />
            ) : null}

            {proposal && proposal.warmups.length > 0 && doneHard === 0 ? (
              <AppText variant="small" color="setWarmup" tabular testID="training-aufwaermen">
                Aufwärmen:{' '}
                {proposal.warmups.map((w) => `${formatWeight(w.weightKg, unit, false)} × ${w.reps}`).join(' · ')} – dann {formatWeight(proposal.workingKg, unit)}
              </AppText>
            ) : null}
            {stagnating && itemSets.length === 0 ? (
              <AppText variant="small" color="textFaint">
                Seit ein paar Trainings kein neuer Bestwert – das ist normal. Eine leichtere Woche (Deload) oder ein Übungswechsel kann helfen.
              </AppText>
            ) : null}

            {/* Erledigte Sätze */}
            {itemSets.length ? (
              <View style={styles.doneList}>
                {itemSets.map((s, i) => (
                  <SetRow
                    key={s.id}
                    set={s}
                    label={s.type === 'warmup' ? 'A' : s.type === 'drop' ? 'D' : String(itemSets.slice(0, i + 1).filter((x) => isHardSet(x.type)).length)}
                    unit={unit}
                    bodyweight={exercise.bodyweight}
                    onPress={() => setEditing(s)}
                  />
                ))}
              </View>
            ) : previousSets.length ? (
              <AppText variant="small" color="textFaint" tabular>
                Letztes Mal:{' '}
                {previousSets
                  .map((s) => `${exercise.bodyweight && s.weightKg === 0 ? 'KG' : formatWeight(s.weightKg, unit, false)} × ${s.reps}`)
                  .join(' · ')}
              </AppText>
            ) : null}

            {/* Aktueller Satz oder „erledigt“ */}
            {itemComplete && !inDrop ? (
              <Card style={styles.group} highlighted>
                <View style={styles.row}>
                  <Icon name="check" color="accent" />
                  <AppText variant="heading">Übung erledigt</AppText>
                </View>
                {canDrop && dropSuggested ? (
                  <AppText variant="small" color="setDrop">
                    Tipp: Ein Dropsatz passt hier gut – optional.
                  </AppText>
                ) : null}
                {allDone ? (
                  <AppText color="textMuted">Alle Übungen geschafft. Stark!</AppText>
                ) : nextItem ? (
                  <AppText color="textMuted">Als Nächstes: {catalog.get(nextItem.exerciseId)?.name}</AppText>
                ) : null}
              </Card>
            ) : (
              <Card highlighted style={styles.currentCard}>
                <View style={styles.rowBetween}>
                  <AppText variant="label" color={inDrop ? 'setDrop' : 'accent'}>
                    {setNumber}
                  </AppText>
                  {inDrop ? <InfoTerm term="dropsatz" /> : null}
                </View>
                {!inDrop ? <ChipGroup options={typeOptions} value={setType} onChange={changeType} scroll testIDPrefix="satztyp" /> : null}
                <Stepper
                  value={kgToUnit(weightKg, unit)}
                  onChange={(v) => setWeightKg(unitToKg(v, unit))}
                  step={unit === 'kg' ? 2.5 : 5}
                  min={0}
                  size="lg"
                  label={weightLabel}
                  decimals={unit === 'kg' ? 2 : 1}
                  testID="input-gewicht"
                  {...stepperProps}
                />
                <Stepper value={reps} onChange={(v) => setReps(Math.max(0, Math.round(v)))} min={0} max={100} size="lg" label="Wiederholungen" decimals={0} testID="input-wdh" />
                {proposal?.feeler && !inDrop && setType !== 'warmup' ? (
                  <View style={styles.row}>
                    <AppText variant="small" color="info" style={styles.flex}>
                      Neue Übung: Starte mit einem Tastsatz – lieber etwas leichter.
                    </AppText>
                    <InfoTerm term="tastsatz" />
                  </View>
                ) : null}
                {proposal && whyText && !inDrop ? (
                  <PressableScale onPress={() => setShowWhy(!showWhy)} style={styles.whyRow} accessibilityRole="button" accessibilityLabel="Warum dieser Vorschlag?" testID="training-warum">
                    <Icon name={actionIcon(proposal.action)} size={16} color="accent" />
                    <AppText variant="small" color="textMuted" style={styles.flex} testID="training-warum-text">
                      {showWhy ? whyText : `${actionLabel(proposal.action)} · Warum?`}
                    </AppText>
                  </PressableScale>
                ) : null}
              </Card>
            )}
          </>
        )}
      </ScrollView>

      {/* Hauptbereich unten (Daumenzone) */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {item && exercise && phase === 'rir' && !inDrop && !itemComplete ? (
          <RirPicker
            showHint={!profile.seenHints.includes('rir')}
            pain={pain}
            onTogglePain={() => setPain(!pain)}
            onPick={(rir) => {
              markHintSeen('rir');
              commit(rir);
            }}
            onBack={() => setPhase('input')}
          />
        ) : item && exercise && inDrop ? (
          <>
            <Button title="Drop fertig" size="lg" onPress={onMain} testID="training-drop-fertig" />
            <Button title="Drops beenden" variant="secondary" onPress={endDrops} testID="training-drops-beenden" />
          </>
        ) : item && exercise && itemComplete ? (
          <>
            {allDone ? (
              <Button title="Training beenden" size="lg" icon="check" onPress={finish} testID="training-beenden" />
            ) : nextItem ? (
              <Button title={`Weiter: ${catalog.get(nextItem.exerciseId)?.name ?? 'Nächste Übung'}`} size="lg" icon="chevronRight" onPress={() => goTo(nextItem.id)} testID="training-weiter" />
            ) : null}
            <View style={styles.row}>
              <View style={styles.flex}>
                <Button title="Noch ein Satz" variant="secondary" onPress={() => updateItem(workout.id, item.id, { targetSets: item.targetSets + 1 })} />
              </View>
              {canDrop ? (
                <View style={styles.flex}>
                  <Button title="Dropsatz" variant="secondary" onPress={startDrop} testID="training-dropsatz" />
                </View>
              ) : null}
            </View>
          </>
        ) : item && exercise ? (
          <>
            <Button title={setType === 'warmup' ? 'Aufwärmsatz fertig' : 'Satz fertig'} size="lg" icon="check" onPress={onMain} testID="training-satz-fertig" />
            <View style={styles.navRow}>
              <IconButton icon="chevronLeft" label="Vorherige Übung" disabled={!neighbors.prev} onPress={() => neighbors.prev && goTo(neighbors.prev.id)} />
              {canDrop && dropSuggested && doneHard >= item.targetSets - 1 ? (
                <PressableScale onPress={startDrop} style={styles.navCenter} accessibilityRole="button" accessibilityLabel="Dropsatz anhängen">
                  <AppText variant="label" color="setDrop">
                    + Dropsatz
                  </AppText>
                </PressableScale>
              ) : (
                <PressableScale
                  onPress={() => {
                    updateItem(workout.id, item.id, { skipped: true });
                    if (nextItem) goTo(nextItem.id);
                  }}
                  style={styles.navCenter}
                  accessibilityRole="button"
                  accessibilityLabel="Übung überspringen"
                >
                  <AppText variant="label" color="textMuted">
                    Übung auslassen
                  </AppText>
                </PressableScale>
              )}
              <IconButton icon="chevronRight" label="Nächste Übung" disabled={!neighbors.next} onPress={() => neighbors.next && goTo(neighbors.next.id)} />
            </View>
          </>
        ) : null}
      </View>

      {/* Sheets */}
      <OverviewSheet
        visible={overviewOpen}
        onClose={() => setOverviewOpen(false)}
        items={workout.items}
        sets={sets}
        currentItemId={item?.id ?? null}
        catalog={catalog.byId}
        timeBudgetMin={workout.timeBudgetMin ?? null}
        onJump={(itemId) => {
          const target = workout.items.find((i) => i.id === itemId);
          if (target?.skipped) updateItem(workout.id, itemId, { skipped: false });
          goTo(itemId);
          setOverviewOpen(false);
        }}
        onToggleSkip={(it) => updateItem(workout.id, it.id, { skipped: !it.skipped })}
        onAddExercise={addExercise}
        onTimeBudget={(min) => {
          const changed = applyTimeBudget(workout.id, min);
          if (min && changed) showToast({ message: `Auf ca. ${min} Minuten gekürzt – die wichtigsten Übungen bleiben.` });
        }}
      />
      <SwapSheet
        visible={swapOpen}
        onClose={() => setSwapOpen(false)}
        exercise={exercise}
        alternatives={alternatives}
        onSwap={(exerciseId, reason) => {
          if (item) swapItem(workout.id, item.id, exerciseId, reason);
          setSwapOpen(false);
        }}
        onPickFromLibrary={(reason) => {
          setSwapOpen(false);
          const itemId = item?.id;
          startExercisePick('Übung tauschen', (exerciseId) => itemId && swapItem(workout.id, itemId, exerciseId, reason));
        }}
      />
      <NoteSheet
        visible={noteOpen}
        onClose={() => setNoteOpen(false)}
        exerciseName={exercise?.name ?? ''}
        exerciseNote={item?.note ?? ''}
        workoutNote={workout.note ?? ''}
        onSave={(exNote, woNote) => {
          const items = workout.items.map((i) => (i.id === item?.id ? { ...i, note: exNote } : i));
          updateWorkout(workout.id, { note: woNote, items });
        }}
      />
      <Sheet visible={infoOpen} onClose={() => setInfoOpen(false)} title={exercise?.name} footer={<Button title="Schließen" onPress={() => setInfoOpen(false)} />}>
        {exercise?.tips.map((tip, i) => (
          <View key={i} style={styles.row}>
            <Icon name="check" size={18} color="accent" />
            <AppText style={styles.flex}>{tip}</AppText>
          </View>
        ))}
      </Sheet>
      {exercise && loadProfile?.kind === 'barbell' ? (
        <PlateSheet
          visible={plateOpen}
          onClose={() => setPlateOpen(false)}
          equipment={profile.equipment}
          barKg={loadProfile.barKg}
          targetKg={weightKg}
          fromKg={dropParent ? dropParent.weightKg : null}
          unit={unit}
        />
      ) : null}
      <EditSetSheet
        set={editing}
        unit={unit}
        onClose={() => setEditing(null)}
        onSave={(s) => updateSet(s)}
        onDelete={(s) => {
          removeSet(s);
          showToast({ message: 'Satz gelöscht', actionLabel: 'Rückgängig', onAction: () => updateSet(s) });
        }}
      />
      <Sheet
        visible={finishOpen}
        onClose={() => setFinishOpen(false)}
        title={sets.length ? 'Training beenden?' : 'Training verlassen?'}
        footer={
          <>
            {sets.length ? <Button title="Beenden & speichern" size="lg" onPress={finish} testID="training-finish-save" /> : null}
            <Button title="Weiter trainieren" variant="secondary" onPress={() => setFinishOpen(false)} />
            <Button title={sets.length ? 'Training verwerfen' : 'Training nicht starten'} variant="ghost" onPress={discard} testID="training-discard" />
          </>
        }
      >
        <AppText color="textMuted">
          {sets.length
            ? 'Alles, was du gemacht hast, wird gespeichert. Ausgelassene Übungen sind völlig okay.'
            : 'Noch kein Satz geloggt – nichts wird gespeichert.'}
        </AppText>
      </Sheet>
    </View>
  );
}

/** Ältere Sätze (vor dem Live-Zeitfenster) bei Bedarf nachladen. */
function useOlderPrevious(exerciseId: string | undefined, currentWorkoutId: string, needed: boolean): SetEntry[] {
  const { workouts } = useData();
  const [loaded, setLoaded] = useState<{ key: string; sets: SetEntry[] }>({ key: '', sets: [] });
  const candidate = useMemo(
    () =>
      needed && exerciseId
        ? workouts.find((w) => w.id !== currentWorkoutId && w.status === 'beendet' && w.summary?.exercises.some((e) => e.exerciseId === exerciseId))
        : undefined,
    [needed, exerciseId, workouts, currentWorkoutId],
  );
  const key = candidate && exerciseId ? `${candidate.id}:${exerciseId}` : '';
  useEffect(() => {
    if (!key || !candidate || !exerciseId || loaded.key === key) return;
    let cancelled = false;
    dataStore.repos.sets
      .forWorkout(candidate.id)
      .then((list) => {
        if (cancelled) return;
        setLoaded({
          key,
          sets: list.filter((s) => s.exerciseId === exerciseId && isHardSet(s.type)).sort((a, b) => a.performedAt - b.performedAt),
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [key, candidate, exerciseId, loaded.key]);
  return loaded.key === key ? loaded.sets : [];
}

function RirPicker({
  showHint,
  pain,
  onTogglePain,
  onPick,
  onBack,
}: {
  showHint: boolean;
  pain: boolean;
  onTogglePain: () => void;
  onPick: (rir: number) => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.rirWrap} testID="rir-picker">
      {showHint ? (
        <Card style={styles.hint}>
          <AppText variant="small" color="textMuted">
            {glossary.rir?.text}
          </AppText>
        </Card>
      ) : null}
      <View style={styles.rowBetween}>
        <AppText variant="bodyStrong">Wie viele Wdh. wären noch drin?</AppText>
        <InfoTerm term="rir" label="RIR" />
      </View>
      <View style={styles.rirRow}>
        {[0, 1, 2, 3, 4].map((v) => (
          <PressableScale
            key={v}
            onPress={() => onPick(v)}
            style={styles.rirBtn}
            pressedStyle={styles.rirBtnPressed}
            accessibilityRole="button"
            accessibilityLabel={`RIR ${v === 4 ? '4 oder mehr' : v}`}
            testID={`rir-${v}`}
          >
            <AppText variant="number">{v === 4 ? '4+' : v}</AppText>
          </PressableScale>
        ))}
      </View>
      <View style={styles.row}>
        <PressableScale
          onPress={onTogglePain}
          style={[styles.painBtn, pain && styles.painBtnActive]}
          accessibilityRole="button"
          accessibilityState={{ selected: pain }}
          accessibilityLabel="Zwicken oder Schmerz markieren"
        >
          <Icon name="flag" size={18} color={pain ? 'warning' : 'textMuted'} />
          <AppText variant="label" color={pain ? 'warning' : 'textMuted'}>
            Zwicken
          </AppText>
        </PressableScale>
        <View style={styles.flex} />
        <Button title="Zurück" variant="ghost" onPress={onBack} />
      </View>
    </View>
  );
}

function actionLabel(action: string | null): string {
  switch (action) {
    case 'erhoehen':
      return 'Vorschlag: mehr Gewicht';
    case 'senken':
      return 'Vorschlag: etwas leichter';
    case 'halten':
      return 'Vorschlag: Gewicht halten';
    default:
      return 'Vorschlag des Assistenten';
  }
}

function actionIcon(action: string | null): IconName {
  return action === 'erhoehen' ? 'arrowUp' : action === 'senken' ? 'arrowDown' : 'sparkle';
}

function IconButton({ icon, label, onPress, disabled, testID }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean; testID?: string }) {
  return (
    <PressableScale onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} style={styles.iconBtn} testID={testID}>
      <Icon name={icon} size={24} />
    </PressableScale>
  );
}

function SmallAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      style={styles.smallAction}
      pressedStyle={styles.smallActionPressed}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
    >
      <Icon name={icon} size={18} color="textMuted" />
      <AppText variant="label" color="textMuted">
        {label}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  missing: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  topCenter: { flex: 1, alignItems: 'center' },
  content: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  exerciseHeader: { flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  actionRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xxs },
  smallAction: {
    minHeight: touch.minTarget - 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  smallActionPressed: { backgroundColor: colors.surfacePressed },
  doneList: { gap: spacing.xxs },
  currentCard: { gap: spacing.md },
  group: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  flex: { flex: 1 },
  whyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: touch.minTarget - 8 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
    paddingHorizontal: layout.screenPadding,
    gap: spacing.sm,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navCenter: { minHeight: touch.minTarget, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  iconBtn: { width: touch.minTarget, height: touch.minTarget, alignItems: 'center', justifyContent: 'center' },
  rirWrap: { gap: spacing.md },
  hint: { backgroundColor: colors.infoSoft, borderColor: colors.infoSoft },
  rirRow: { flexDirection: 'row', gap: spacing.sm },
  rirBtn: {
    flex: 1,
    minHeight: touch.largeTarget + 8,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rirBtnPressed: { backgroundColor: colors.accentSoft },
  painBtn: {
    minHeight: touch.minTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  painBtnActive: { borderColor: colors.warning, backgroundColor: colors.warningSoft },
});

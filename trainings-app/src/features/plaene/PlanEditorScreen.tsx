import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ChipGroup } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { SectionTitle } from '@/components/ListRow';
import { PressableScale } from '@/components/PressableScale';
import { ReorderList } from '@/components/ReorderList';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { Stepper } from '@/components/Stepper';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { deletePlan, savePlan, setActivePlan } from '@/db/actions/plans';
import { useExercises } from '@/db/exercises';
import { useData } from '@/db/store';
import { equipmentLabels } from '@/domain/labels';
import type { Plan, PlanExercise } from '@/domain/types';
import { findAlternatives } from '@/engine/exercises';
import {
  addDay,
  estimateDayMinutes,
  isLinkedWithNext,
  moveItem,
  newPlanExercise,
  removeDay,
  replaceExercise,
  setDayExercises,
  toggleSupersetWithNext,
  updateDay,
} from '@/engine/planOps';
import { colors, radii, spacing, touch } from '@/theme';
import { Badge } from '../uebungen/ExerciseCard';
import { startExercisePick } from '../uebungen/picker';

const restOptions = [
  { value: 0, label: 'Automatisch' },
  { value: 60, label: '1:00' },
  { value: 90, label: '1:30' },
  { value: 120, label: '2:00' },
  { value: 180, label: '3:00' },
];

export function PlanEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { plans, profile } = useData();
  const catalog = useExercises();
  const { showToast } = useToast();
  const plan = plans.find((p) => p.id === id);

  const [dayId, setDayId] = useState<string | null>(plan?.days[0]?.id ?? null);
  const [name, setName] = useState(plan?.name ?? '');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [showSwap, setShowSwap] = useState(false);
  const [dragging, setDragging] = useState(false);
  const currentDay = plan?.days.find((d) => d.id === dayId) ?? plan?.days[0];
  const [dayName, setDayName] = useState(currentDay?.name ?? '');
  useEffect(() => setDayName(currentDay?.name ?? ''), [currentDay?.id, currentDay?.name]);

  useEffect(() => {
    if (plan && (!dayId || !plan.days.some((d) => d.id === dayId))) setDayId(plan.days[0]?.id ?? null);
  }, [plan, dayId]);

  const day = plan?.days.find((d) => d.id === dayId) ?? plan?.days[0];
  const minutes = useMemo(() => (day ? estimateDayMinutes(day, catalog.byId) : 0), [day, catalog.byId]);

  if (!plan || !day) {
    return (
      <Screen title="Plan" onBack={() => router.back()}>
        <AppText color="textMuted">Dieser Plan existiert nicht mehr.</AppText>
      </Screen>
    );
  }

  const isActive = profile.activePlanId === plan.id;
  const update = (next: Plan) => savePlan(next);
  const setExercises = (exercises: PlanExercise[]) => update(setDayExercises(plan, day.id, exercises));
  const editing = editIndex !== null ? day.exercises[editIndex] : undefined;
  const editingExercise = editing ? catalog.get(editing.exerciseId) : undefined;

  const patchEditing = (patch: Partial<PlanExercise>) => {
    if (editIndex === null || !editing) return;
    setExercises(day.exercises.map((e, i) => (i === editIndex ? { ...e, ...patch } : e)));
  };

  const removeEditing = () => {
    if (editIndex === null) return;
    const before = day.exercises;
    setExercises(before.filter((_, i) => i !== editIndex));
    setEditIndex(null);
    showToast({
      message: 'Übung entfernt',
      actionLabel: 'Rückgängig',
      onAction: () => update(setDayExercises(plan, day.id, before)),
    });
  };

  const addExercise = () =>
    startExercisePick('Übung hinzufügen', (exerciseId) => {
      const ex = catalog.get(exerciseId);
      const current = plans.find((p) => p.id === plan.id) ?? plan;
      const currentDay = current.days.find((d) => d.id === day.id);
      if (!ex || !currentDay) return;
      savePlan(setDayExercises(current, day.id, [...currentDay.exercises, newPlanExercise(ex)]));
    });

  const swapTo = (exerciseId: string) => {
    const ex = catalog.get(exerciseId);
    if (!ex || !editing) return;
    patchEditing(replaceExercise(editing, ex));
    setShowSwap(false);
  };

  const alternatives = editingExercise ? findAlternatives(editingExercise, catalog.list, profile.equipment.available, 6) : [];

  const dayOptions = plan.days.map((d) => ({ value: d.id, label: d.name }));

  return (
    <Screen title="Plan bearbeiten" onBack={() => router.back()} scrollEnabled={!dragging} testID="screen-plan">
      <TextField
        label="Name"
        value={name}
        onChangeText={setName}
        onBlur={() => name.trim() && name.trim() !== plan.name && update({ ...plan, name: name.trim() })}
        testID="plan-name"
      />
      {isActive ? (
        <View style={styles.activeRow}>
          <Icon name="check" size={18} color="accent" />
          <AppText color="accent" variant="label">
            Aktiver Plan – „Heute“ schlägt daraus das nächste Training vor.
          </AppText>
        </View>
      ) : (
        <Button title="Als aktiven Plan nutzen" variant="secondary" icon="check" onPress={() => setActivePlan(plan.id)} />
      )}

      <SectionTitle>Trainingstage</SectionTitle>
      <View style={styles.dayRow}>
        <View style={styles.flex}>
          <ChipGroup options={dayOptions} value={day.id} onChange={setDayId} scroll />
        </View>
        <PressableScale
          onPress={() => {
            const next = addDay(plan);
            update(next);
            setDayId(next.days[next.days.length - 1]?.id ?? null);
          }}
          style={styles.addDay}
          accessibilityRole="button"
          accessibilityLabel="Trainingstag hinzufügen"
        >
          <Icon name="plus" size={22} color="accent" />
        </PressableScale>
      </View>

      <Card style={styles.dayCard}>
        <TextField
          label="Name des Tages"
          value={dayName}
          onChangeText={setDayName}
          onBlur={() => {
            const v = dayName.trim();
            if (v && v !== day.name) update(updateDay(plan, day.id, (d) => ({ ...d, name: v })));
          }}
        />
        <AppText variant="small" color="textMuted">
          {day.exercises.length} Übungen · ca. {minutes} Min. · Griff ⋮⋮ halten und ziehen zum Sortieren
        </AppText>
      </Card>

      <ReorderList
        items={day.exercises}
        keyOf={(e) => e.id}
        onDragStateChange={setDragging}
        onMove={(from, to) => setExercises(moveItem(day.exercises, from, to))}
        renderItem={(item, index, handle) => {
          const ex = catalog.get(item.exerciseId);
          const linkedPrev = isLinkedWithNext(day.exercises, index - 1);
          const linkedNext = isLinkedWithNext(day.exercises, index);
          return (
            <Card
              padded={false}
              style={[styles.exerciseCard, (linkedPrev || linkedNext) && styles.supersetCard]}
              onPress={() => setEditIndex(index)}
              accessibilityLabel={ex?.name ?? 'Übung'}
            >
              <View style={styles.exerciseRow} testID={`plan-uebung-${index}`}>
                {handle}
                <View style={styles.flex}>
                  <AppText variant="bodyStrong" numberOfLines={2}>
                    {ex?.name ?? 'Unbekannte Übung'}
                  </AppText>
                  <AppText variant="small" color="textMuted" tabular>
                    {item.sets} × {item.repMin}–{item.repMax} Wdh.
                    {item.restSec ? ` · Pause ${Math.floor(item.restSec / 60)}:${String(item.restSec % 60).padStart(2, '0')}` : ''}
                  </AppText>
                </View>
                {linkedPrev || linkedNext ? <Badge text="Supersatz" tone="info" /> : null}
                <View style={styles.chevron}>
                  <Icon name="chevronRight" size={20} color="textFaint" />
                </View>
              </View>
            </Card>
          );
        }}
        renderBetween={(index) => {
          const linked = isLinkedWithNext(day.exercises, index);
          return (
            <View style={styles.between}>
              <PressableScale
                onPress={() => setExercises(toggleSupersetWithNext(day.exercises, index))}
                accessibilityRole="button"
                accessibilityLabel={linked ? 'Supersatz trennen' : 'Mit nächster Übung zum Supersatz verbinden'}
                style={[styles.linkBtn, linked && styles.linkBtnActive]}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                testID={`plan-link-${index}`}
              >
                <Icon name="link" size={16} color={linked ? 'info' : 'textFaint'} />
                {linked ? (
                  <AppText variant="caption" color="info">
                    Supersatz
                  </AppText>
                ) : null}
              </PressableScale>
            </View>
          );
        }}
      />

      <Button title="Übung hinzufügen" icon="plus" onPress={addExercise} testID="plan-add-uebung" />

      <View style={styles.dangerZone}>
        {plan.days.length > 1 ? (
          <Button
            title={`„${day.name}“ entfernen`}
            variant="ghost"
            onPress={() => {
              const before = plan;
              update(removeDay(plan, day.id));
              showToast({ message: 'Trainingstag entfernt', actionLabel: 'Rückgängig', onAction: () => update(before) });
            }}
          />
        ) : null}
        <Button
          title="Plan löschen"
          variant="danger"
          icon="trash"
          onPress={() => {
            const undo = deletePlan(plan.id);
            router.back();
            showToast({ message: `„${plan.name}“ gelöscht`, actionLabel: 'Rückgängig', onAction: undo });
          }}
        />
      </View>

      <Sheet
        visible={editing !== undefined}
        onClose={() => {
          setEditIndex(null);
          setShowSwap(false);
        }}
        title={editingExercise?.name ?? 'Übung'}
        testID="plan-edit-sheet"
      >
        {editing && !showSwap ? (
          <>
            <AppText variant="label" color="textMuted">
              Arbeitssätze
            </AppText>
            <Stepper value={editing.sets} min={1} max={10} decimals={0} label="Sätze" onChange={(v) => patchEditing({ sets: Math.round(v) })} testID="plan-saetze" />
            <AppText variant="label" color="textMuted">
              Wiederholungsbereich
            </AppText>
            <Stepper
              value={editing.repMin}
              min={1}
              max={editing.repMax}
              decimals={0}
              label="Wdh. von"
              onChange={(v) => patchEditing({ repMin: Math.round(v) })}
            />
            <Stepper
              value={editing.repMax}
              min={editing.repMin}
              max={60}
              decimals={0}
              label="Wdh. bis"
              onChange={(v) => patchEditing({ repMax: Math.round(v) })}
            />
            <AppText variant="small" color="textFaint">
              Schaffst du das obere Ende, schlägt der Assistent mehr Gewicht vor (doppelte Progression).
            </AppText>
            <AppText variant="label" color="textMuted">
              Pause
            </AppText>
            <ChipGroup
              options={restOptions}
              value={editing.restSec ?? 0}
              onChange={(v) => patchEditing({ restSec: v === 0 ? null : v })}
              scroll
            />
            <Button title="Übung tauschen" icon="swap" variant="secondary" onPress={() => setShowSwap(true)} />
            <View style={styles.moveRow}>
              <View style={styles.flex}>
                <Button
                  title="Nach oben"
                  icon="chevronUp"
                  variant="secondary"
                  disabled={editIndex === 0}
                  onPress={() => {
                    if (editIndex === null || editIndex === 0) return;
                    setExercises(moveItem(day.exercises, editIndex, editIndex - 1));
                    setEditIndex(editIndex - 1);
                  }}
                />
              </View>
              <View style={styles.flex}>
                <Button
                  title="Nach unten"
                  icon="chevronDown"
                  variant="secondary"
                  disabled={editIndex === day.exercises.length - 1}
                  onPress={() => {
                    if (editIndex === null || editIndex >= day.exercises.length - 1) return;
                    setExercises(moveItem(day.exercises, editIndex, editIndex + 1));
                    setEditIndex(editIndex + 1);
                  }}
                />
              </View>
            </View>
            <Button title="Aus dem Tag entfernen" icon="trash" variant="danger" onPress={removeEditing} />
          </>
        ) : null}
        {editing && showSwap ? (
          <>
            <AppText color="textMuted">Gleichwertige Übungen mit deinem Equipment:</AppText>
            {alternatives.map((alt) => (
              <Card key={alt.id} onPress={() => swapTo(alt.id)} accessibilityLabel={alt.name}>
                <AppText variant="bodyStrong">{alt.name}</AppText>
                <AppText variant="small" color="textMuted">
                  {equipmentLabels[alt.equipment]}
                </AppText>
              </Card>
            ))}
            <Button
              title="Andere Übung aus der Bibliothek"
              icon="search"
              variant="secondary"
              onPress={() => {
                const idx = editIndex;
                setEditIndex(null);
                setShowSwap(false);
                startExercisePick('Übung tauschen', (exerciseId) => {
                  const ex = catalog.get(exerciseId);
                  const current = plans.find((p) => p.id === plan.id) ?? plan;
                  const currentDay = current.days.find((d) => d.id === day.id);
                  if (!ex || !currentDay || idx === null) return;
                  const list = currentDay.exercises.map((e, i) => (i === idx ? replaceExercise(e, ex) : e));
                  savePlan(setDayExercises(current, day.id, list));
                });
              }}
            />
            <Button title="Zurück" variant="ghost" onPress={() => setShowSwap(false)} />
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  activeRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addDay: {
    width: touch.minTarget,
    height: touch.minTarget,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCard: { gap: spacing.sm },
  exerciseCard: { paddingVertical: spacing.xs, paddingRight: spacing.sm },
  supersetCard: { borderColor: colors.info },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  chevron: { paddingLeft: spacing.xs },
  between: { alignItems: 'center', paddingVertical: spacing.xxs },
  linkBtn: {
    minHeight: touch.minTarget - 8,
    minWidth: touch.minTarget,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  linkBtnActive: { backgroundColor: colors.infoSoft },
  moveRow: { flexDirection: 'row', gap: spacing.sm },
  dangerZone: { gap: spacing.sm, marginTop: spacing.lg },
});

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip, ChipGroup } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { Sheet } from '@/components/Sheet';
import { Stepper } from '@/components/Stepper';
import { TextField } from '@/components/TextField';
import { equipmentLabels, setTypeLabels } from '@/domain/labels';
import type { EquipmentSettings, Exercise, SessionItem, SetEntry, SetType, WeightUnit } from '@/domain/types';
import { plateChange, platesPerSide } from '@/engine/plates';
import { hardSetCount, setsForItem } from '@/engine/session';
import { formatNumber, formatWeight, kgToUnit, unitToKg } from '@/engine/units';
import { colors, radii, spacing, touch } from '@/theme';

// ---------- Übersicht ----------

type OverviewProps = {
  visible: boolean;
  onClose: () => void;
  items: SessionItem[];
  sets: SetEntry[];
  currentItemId: string | null;
  catalog: Map<string, Exercise>;
  timeBudgetMin: number | null;
  onJump: (itemId: string) => void;
  onToggleSkip: (item: SessionItem) => void;
  onAddExercise: () => void;
  onTimeBudget: (minutes: number | null) => void;
};

const budgetOptions = [
  { value: 0, label: 'Normal' },
  { value: 30, label: '30 Min.' },
  { value: 45, label: '45 Min.' },
  { value: 60, label: '60 Min.' },
];

export function OverviewSheet(props: OverviewProps) {
  const { visible, onClose, items, sets, currentItemId, catalog, timeBudgetMin } = props;
  return (
    <Sheet visible={visible} onClose={onClose} title="Übersicht" testID="training-uebersicht">
      <AppText variant="label" color="textMuted">
        Wenig Zeit? Dann bleiben die wichtigsten Übungen.
      </AppText>
      <ChipGroup options={budgetOptions} value={timeBudgetMin ?? 0} onChange={(v) => props.onTimeBudget(v || null)} scroll />
      {items.map((item) => {
        const ex = catalog.get(item.exerciseId);
        const done = hardSetCount(setsForItem(sets, item.id));
        const complete = done >= item.targetSets;
        return (
          <Card
            key={item.id}
            highlighted={item.id === currentItemId}
            muted={item.skipped}
            onPress={() => props.onJump(item.id)}
            accessibilityLabel={ex?.name}
          >
            <View style={styles.row}>
              <Icon name={complete ? 'check' : item.skipped ? 'skip' : 'dumbbell'} size={20} color={complete ? 'accent' : 'textMuted'} />
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{ex?.name ?? 'Übung'}</AppText>
                <AppText variant="small" color="textMuted" tabular>
                  {item.skipped ? 'Übersprungen' : `${done} / ${item.targetSets} Sätze`}
                  {item.supersetGroup ? ' · Supersatz' : ''}
                </AppText>
              </View>
              <PressableScale
                onPress={() => props.onToggleSkip(item)}
                style={styles.smallBtn}
                accessibilityRole="button"
                accessibilityLabel={item.skipped ? 'Wieder aufnehmen' : 'Überspringen'}
              >
                <AppText variant="label" color="textMuted">
                  {item.skipped ? 'Zurückholen' : 'Auslassen'}
                </AppText>
              </PressableScale>
            </View>
          </Card>
        );
      })}
      <Button title="Übung hinzufügen" icon="plus" variant="secondary" onPress={props.onAddExercise} />
    </Sheet>
  );
}

// ---------- Übung tauschen ----------

type SwapProps = {
  visible: boolean;
  onClose: () => void;
  exercise: Exercise | undefined;
  alternatives: Exercise[];
  onSwap: (exerciseId: string, reason: string | null) => void;
  onPickFromLibrary: (reason: string | null) => void;
};

const reasons = ['Gerät besetzt', 'Zwicken', 'Anderes'];

export function SwapSheet({ visible, onClose, exercise, alternatives, onSwap, onPickFromLibrary }: SwapProps) {
  const [reason, setReason] = useState<string | null>(null);
  useEffect(() => {
    if (visible) setReason(null);
  }, [visible]);
  return (
    <Sheet visible={visible} onClose={onClose} title="Übung tauschen">
      <AppText color="textMuted">Statt „{exercise?.name}“ – warum?</AppText>
      <View style={styles.wrap}>
        {reasons.map((r) => (
          <Chip key={r} label={r} selected={reason === r} onPress={() => setReason(reason === r ? null : r)} />
        ))}
      </View>
      {reason === 'Zwicken' ? (
        <Card style={styles.warn}>
          <AppText variant="small" color="warning">
            Bei Schmerzen lieber vorsichtig sein: leichter oder eine schonendere Übung. Halten Beschwerden an, lass das
            von Ärztin, Arzt oder Physio anschauen.
          </AppText>
        </Card>
      ) : null}
      {alternatives.map((alt) => (
        <Card key={alt.id} onPress={() => onSwap(alt.id, reason)} accessibilityLabel={alt.name}>
          <AppText variant="bodyStrong">{alt.name}</AppText>
          <AppText variant="small" color="textMuted">
            {equipmentLabels[alt.equipment]}
          </AppText>
        </Card>
      ))}
      <Button title="Andere aus der Bibliothek" icon="search" variant="secondary" onPress={() => onPickFromLibrary(reason)} />
    </Sheet>
  );
}

// ---------- Notizen ----------

type NoteProps = {
  visible: boolean;
  onClose: () => void;
  exerciseName: string;
  exerciseNote: string;
  workoutNote: string;
  onSave: (exerciseNote: string, workoutNote: string) => void;
};

export function NoteSheet({ visible, onClose, exerciseName, exerciseNote, workoutNote, onSave }: NoteProps) {
  const [ex, setEx] = useState(exerciseNote);
  const [wo, setWo] = useState(workoutNote);
  useEffect(() => {
    if (visible) {
      setEx(exerciseNote);
      setWo(workoutNote);
    }
  }, [visible, exerciseNote, workoutNote]);
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Notizen"
      footer={
        <Button
          title="Speichern"
          onPress={() => {
            onSave(ex, wo);
            onClose();
          }}
        />
      }
    >
      <TextField label={`Zu „${exerciseName}“`} value={ex} onChangeText={setEx} multiline placeholder="z. B. Sitz Stufe 4, Griff eng" />
      <TextField label="Zum ganzen Training" value={wo} onChangeText={setWo} multiline placeholder="z. B. wenig geschlafen" />
    </Sheet>
  );
}

// ---------- Satz bearbeiten ----------

type EditSetProps = {
  set: SetEntry | null;
  unit: WeightUnit;
  onClose: () => void;
  onSave: (set: SetEntry) => void;
  onDelete: (set: SetEntry) => void;
};

const typeOptions: { value: SetType; label: string }[] = (['warmup', 'work', 'failure', 'drop'] as SetType[]).map((t) => ({
  value: t,
  label: setTypeLabels[t],
}));

export function EditSetSheet({ set, unit, onClose, onSave, onDelete }: EditSetProps) {
  const [draft, setDraft] = useState<SetEntry | null>(set);
  useEffect(() => setDraft(set), [set]);
  if (!draft) return <Sheet visible={false} onClose={onClose} />;
  return (
    <Sheet
      visible={!!set}
      onClose={onClose}
      title="Satz bearbeiten"
      footer={
        <>
          <Button
            title="Speichern"
            onPress={() => {
              onSave(draft);
              onClose();
            }}
          />
          <Button
            title="Satz löschen"
            variant="danger"
            icon="trash"
            onPress={() => {
              onDelete(draft);
              onClose();
            }}
          />
        </>
      }
    >
      <ChipGroup options={typeOptions} value={draft.type} onChange={(type) => setDraft({ ...draft, type, rir: type === 'drop' ? null : draft.rir })} />
      <Stepper
        value={kgToUnit(draft.weightKg, unit)}
        step={unit === 'kg' ? 2.5 : 5}
        label={unit}
        decimals={unit === 'kg' ? 2 : 1}
        onChange={(v) => setDraft({ ...draft, weightKg: unitToKg(v, unit) })}
      />
      <Stepper value={draft.reps} min={0} decimals={0} label="Wdh." onChange={(v) => setDraft({ ...draft, reps: Math.round(v) })} />
      {draft.type !== 'drop' ? (
        <ChipGroup
          options={[0, 1, 2, 3, 4].map((v) => ({ value: v, label: v === 4 ? 'RIR 4+' : `RIR ${v}` }))}
          value={draft.rir}
          onChange={(rir) => setDraft({ ...draft, rir })}
          scroll
        />
      ) : null}
      <Chip label="Zwicken / Schmerz" icon="flag" tone="danger" selected={draft.painFlag} onPress={() => setDraft({ ...draft, painFlag: !draft.painFlag })} />
    </Sheet>
  );
}

// ---------- Scheibenrechner ----------

type PlateProps = {
  visible: boolean;
  onClose: () => void;
  equipment: EquipmentSettings;
  barKg: number;
  targetKg: number;
  /** Beim Dropsatz: Gewicht vorher (zeigt, was runter muss). */
  fromKg: number | null;
  unit: WeightUnit;
};

function PlateList({ plates, unit }: { plates: number[]; unit: WeightUnit }) {
  if (!plates.length) return <AppText color="textMuted">nichts</AppText>;
  return (
    <View style={styles.wrap}>
      {plates.map((p, i) => (
        <View key={i} style={[styles.plate, { height: 28 + Math.min(40, p * 1.6) }]}>
          <AppText variant="label" tabular>
            {formatNumber(kgToUnit(p, unit), 2)}
          </AppText>
        </View>
      ))}
    </View>
  );
}

export function PlateSheet({ visible, onClose, equipment, barKg, targetKg, fromKg, unit }: PlateProps) {
  const load = platesPerSide(targetKg, barKg, equipment.platesKg);
  const change = fromKg !== null ? plateChange(fromKg, targetKg, barKg, equipment.platesKg) : null;
  return (
    <Sheet visible={visible} onClose={onClose} title="Scheibenrechner" footer={<Button title="Fertig" onPress={onClose} />}>
      <AppText color="textMuted">
        {formatWeight(targetKg, unit)} mit {formatWeight(barKg, unit)}-Stange – pro Seite:
      </AppText>
      <PlateList plates={load.plates} unit={unit} />
      {load.restKg > 0 ? (
        <AppText variant="small" color="warning">
          Mit deinen Scheiben fehlen {formatWeight(load.restKg, unit)} zum Zielgewicht.
        </AppText>
      ) : null}
      {change ? (
        <Card style={styles.group}>
          <AppText variant="label" color="textMuted">
            Umladen von {formatWeight(fromKg ?? 0, unit)} – pro Seite
          </AppText>
          <AppText variant="bodyStrong">Runter:</AppText>
          <PlateList plates={change.remove} unit={unit} />
          {change.add.length ? (
            <>
              <AppText variant="bodyStrong">Drauf:</AppText>
              <PlateList plates={change.add} unit={unit} />
            </>
          ) : null}
        </Card>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  smallBtn: { minHeight: touch.minTarget, paddingHorizontal: spacing.sm, justifyContent: 'center' },
  warn: { backgroundColor: colors.warningSoft, borderColor: colors.warningSoft },
  group: { gap: spacing.sm },
  plate: {
    minWidth: 44,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Chip, ChipGroup } from '@/components/Chip';
import { SectionTitle } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { Stepper } from '@/components/Stepper';
import { updateProfile } from '@/db/actions/profile';
import { useData } from '@/db/store';
import { equipmentLabels } from '@/domain/labels';
import type { Equipment, EquipmentSettings } from '@/domain/types';
import { formatNumber, kgToUnit, roundTo, unitToKg } from '@/engine/units';
import { spacing } from '@/theme';

const allEquipment = Object.keys(equipmentLabels) as Equipment[];

/** Liste von Gewichten aus Start, Ende und Schritt erzeugen. */
function range(from: number, to: number, step: number): number[] {
  const out: number[] = [];
  if (step <= 0 || to < from) return out;
  for (let v = from; v <= to + 1e-9; v += step) out.push(roundTo(v, 3));
  return out;
}

export function EquipmentScreen() {
  const { profile } = useData();
  const eq = profile.equipment;
  const unit = profile.unit;
  const show = (kg: number) => roundTo(kgToUnit(kg, unit), 2);
  const toKg = (v: number) => roundTo(unitToKg(v, unit), 4);

  const save = (patch: Partial<EquipmentSettings>) => updateProfile({ equipment: { ...eq, ...patch } });

  const dumbbellRange = useMemo(() => {
    const list = eq.dumbbellsKg;
    const min = list.length ? Math.min(...list) : 2;
    const max = list.length ? Math.max(...list) : 40;
    return { min, max };
  }, [eq.dumbbellsKg]);
  const [dbStep, setDbStep] = useState(unit === 'kg' ? 2 : 5);

  const toggleEquipment = (item: Equipment) => {
    const available = eq.available.includes(item) ? eq.available.filter((e) => e !== item) : [...eq.available, item];
    save({ available });
  };

  const plateOptions = (unit === 'kg' ? [0.5, 1, 1.25, 2.5] : [1.25, 2.5, 5]).map((v) => ({
    value: v,
    label: `${formatNumber(v)} ${unit}`,
  }));

  return (
    <Screen title="Equipment-Stufen" onBack={() => router.back()} testID="screen-ausruestung">
      <AppText color="textMuted">
        Der Gewichtsassistent schlägt nur Gewichte vor, die du mit deiner Ausrüstung auch wirklich einstellen kannst.
      </AppText>

      <SectionTitle>Was hast du zur Verfügung?</SectionTitle>
      <View style={styles.chips}>
        {allEquipment.map((item) => (
          <Chip
            key={item}
            label={equipmentLabels[item]}
            selected={eq.available.includes(item)}
            onPress={() => toggleEquipment(item)}
          />
        ))}
      </View>

      <SectionTitle>Langhantel</SectionTitle>
      <Card style={styles.group}>
        <AppText variant="label" color="textMuted">
          Gewicht der Stange
        </AppText>
        <Stepper
          value={show(eq.barbellKg)}
          step={unit === 'kg' ? 2.5 : 5}
          min={0}
          label={unit}
          decimals={unit === 'kg' ? 2 : 1}
          onChange={(v) => save({ barbellKg: toKg(v) })}
        />
        <AppText variant="label" color="textMuted">
          Kleinste Scheibe (eine Seite)
        </AppText>
        <ChipGroup
          options={plateOptions}
          value={plateOptions.find((o) => Math.abs(o.value - show(eq.smallestPlateKg)) < 0.01)?.value ?? null}
          onChange={(v) => save({ smallestPlateKg: toKg(v) })}
        />
        <AppText variant="small" color="textFaint">
          Kleinster Sprung an der Langhantel: {formatNumber(show(eq.smallestPlateKg) * 2)} {unit} (zwei Scheiben).
        </AppText>
        <AppText variant="label" color="textMuted">
          SZ-Stange
        </AppText>
        <Stepper
          value={show(eq.ezBarKg)}
          step={unit === 'kg' ? 0.5 : 1}
          min={0}
          label={unit}
          decimals={unit === 'kg' ? 2 : 1}
          onChange={(v) => save({ ezBarKg: toKg(v) })}
        />
      </Card>

      <SectionTitle>Kurzhanteln</SectionTitle>
      <Card style={styles.group}>
        <AppText variant="small" color="textMuted">
          Aktuell {eq.dumbbellsKg.length} Stufen von {formatNumber(show(dumbbellRange.min))} bis{' '}
          {formatNumber(show(dumbbellRange.max))} {unit}.
        </AppText>
        <AppText variant="label" color="textMuted">
          Schrittweite
        </AppText>
        <Stepper value={dbStep} step={unit === 'kg' ? 0.5 : 1} min={0.5} label={unit} onChange={setDbStep} />
        <View style={styles.row}>
          <View style={styles.flex}>
            <AppText variant="label" color="textMuted">
              Von
            </AppText>
            <Stepper
              value={show(dumbbellRange.min)}
              step={dbStep}
              min={0.5}
              label={unit}
          decimals={unit === 'kg' ? 2 : 1}
              onChange={(v) => save({ dumbbellsKg: range(v, show(dumbbellRange.max), dbStep).map(toKg) })}
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.flex}>
            <AppText variant="label" color="textMuted">
              Bis
            </AppText>
            <Stepper
              value={show(dumbbellRange.max)}
              step={dbStep}
              min={1}
              label={unit}
          decimals={unit === 'kg' ? 2 : 1}
              onChange={(v) => save({ dumbbellsKg: range(show(dumbbellRange.min), v, dbStep).map(toKg) })}
            />
          </View>
        </View>
      </Card>

      <SectionTitle>Maschinen & Kabelzug</SectionTitle>
      <Card style={styles.group}>
        <AppText variant="label" color="textMuted">
          Schritt am Steckgewicht (Maschine)
        </AppText>
        <Stepper
          value={show(eq.machineStepKg)}
          step={unit === 'kg' ? 0.5 : 1}
          min={0.5}
          label={unit}
          decimals={unit === 'kg' ? 2 : 1}
          onChange={(v) => save({ machineStepKg: toKg(v) })}
        />
        <AppText variant="label" color="textMuted">
          Schritt am Kabelzug
        </AppText>
        <Stepper
          value={show(eq.cableStepKg)}
          step={unit === 'kg' ? 0.5 : 1}
          min={0.5}
          label={unit}
          decimals={unit === 'kg' ? 2 : 1}
          onChange={(v) => save({ cableStepKg: toKg(v) })}
        />
      </Card>

      <SectionTitle>Körpergewicht-Übungen</SectionTitle>
      <Card style={styles.group}>
        <AppText variant="label" color="textMuted">
          Schritt für Zusatzgewicht (Dipgürtel, Weste) – 0 = keins vorhanden
        </AppText>
        <Stepper
          value={show(eq.addedWeightStepKg)}
          step={unit === 'kg' ? 1.25 : 2.5}
          min={0}
          label={unit}
          decimals={unit === 'kg' ? 2 : 1}
          onChange={(v) => save({ addedWeightStepKg: toKg(v) })}
        />
        <AppText variant="small" color="textFaint">
          Ohne Zusatzgewicht schlägt der Assistent mehr Wiederholungen oder eine schwerere Variante vor.
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  group: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1, gap: spacing.xs },
});

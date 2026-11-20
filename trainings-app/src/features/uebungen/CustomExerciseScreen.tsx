import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip, ChipGroup } from '@/components/Chip';
import { SectionTitle } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { Stepper } from '@/components/Stepper';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { saveCustomExercise, useExercises } from '@/db/exercises';
import { equipmentLabels, muscleLabels } from '@/domain/labels';
import type { Equipment, Exercise, ExerciseCategory, MovementPattern, MuscleGroup } from '@/domain/types';
import { spacing } from '@/theme';

const muscles = Object.keys(muscleLabels) as MuscleGroup[];
const equipmentList = Object.keys(equipmentLabels) as Equipment[];

/** Passendes Bewegungsmuster aus Muskel und Typ ableiten (für Alternativ-Vorschläge). */
function guessPattern(primary: MuscleGroup | undefined, category: ExerciseCategory): MovementPattern {
  switch (primary) {
    case 'brust':
      return category === 'grund' ? 'horizontal_druecken' : 'brust_isolation';
    case 'lat':
      return 'vertikal_ziehen';
    case 'oberer_ruecken':
      return 'horizontal_ziehen';
    case 'unterer_ruecken':
    case 'gesaess':
      return 'hueftstreckung';
    case 'schulter_vorne':
      return 'vertikal_druecken';
    case 'schulter_seite':
      return 'seitheben';
    case 'schulter_hinten':
      return 'hintere_schulter';
    case 'bizeps':
      return 'bizeps';
    case 'trizeps':
      return 'trizeps';
    case 'unterarme':
      return 'unterarm';
    case 'bauch':
      return 'bauch';
    case 'quadrizeps':
      return category === 'grund' ? 'kniebeuge' : 'beinstrecken';
    case 'beinbeuger':
      return category === 'grund' ? 'hueftstreckung' : 'beinbeugen';
    case 'waden':
      return 'wade';
    default:
      return 'horizontal_druecken';
  }
}

export function CustomExerciseScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const catalog = useExercises();
  const existing: Exercise | undefined = id ? catalog.get(id) : undefined;
  const { showToast } = useToast();

  const [name, setName] = useState(existing?.name ?? '');
  const [primary, setPrimary] = useState<MuscleGroup[]>(existing?.primary ?? []);
  const [secondary, setSecondary] = useState<MuscleGroup[]>(existing?.secondary ?? []);
  const [equipment, setEquipment] = useState<Equipment>(existing?.equipment ?? 'kurzhantel');
  const [category, setCategory] = useState<ExerciseCategory>(existing?.category ?? 'isolation');
  const [bodyweight, setBodyweight] = useState(existing?.bodyweight ?? false);
  const [repMin, setRepMin] = useState(existing?.repRange[0] ?? 8);
  const [repMax, setRepMax] = useState(existing?.repRange[1] ?? 12);
  const [tips, setTips] = useState(existing?.tips.join('\n') ?? '');
  const [error, setError] = useState<string | null>(null);

  const toggle = (list: MuscleGroup[], set: (l: MuscleGroup[]) => void, m: MuscleGroup) =>
    set(list.includes(m) ? list.filter((x) => x !== m) : [...list, m]);

  const save = () => {
    if (!name.trim()) return setError('Bitte gib der Übung einen Namen.');
    if (!primary.length) return setError('Wähle mindestens einen Zielmuskel.');
    const savedId = saveCustomExercise({
      id: existing?.id,
      name: name.trim(),
      primary,
      secondary: secondary.filter((m) => !primary.includes(m)),
      equipment,
      category,
      bodyweight,
      difficulty: existing?.difficulty ?? 2,
      pattern: guessPattern(primary[0], category),
      repRange: [Math.min(repMin, repMax), Math.max(repMin, repMax)],
      tips: tips
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean),
      progression: existing?.progression ?? null,
    });
    showToast({ message: existing ? 'Übung gespeichert' : 'Übung angelegt' });
    if (existing) router.back();
    else router.replace({ pathname: '/uebung', params: { id: savedId } });
  };

  return (
    <Screen
      title={existing ? 'Übung bearbeiten' : 'Eigene Übung'}
      onBack={() => router.back()}
      footer={<Button title="Speichern" size="lg" onPress={save} testID="eigene-speichern" />}
    >
      <TextField label="Name" value={name} onChangeText={setName} placeholder="z. B. Landmine Press" testID="eigene-name" />

      <SectionTitle>Zielmuskeln</SectionTitle>
      <View style={styles.wrap}>
        {muscles.map((m) => (
          <Chip key={m} label={muscleLabels[m]} selected={primary.includes(m)} onPress={() => toggle(primary, setPrimary, m)} />
        ))}
      </View>
      <SectionTitle>Mit beteiligt (optional)</SectionTitle>
      <View style={styles.wrap}>
        {muscles
          .filter((m) => !primary.includes(m))
          .map((m) => (
            <Chip
              key={m}
              label={muscleLabels[m]}
              tone="info"
              selected={secondary.includes(m)}
              onPress={() => toggle(secondary, setSecondary, m)}
            />
          ))}
      </View>

      <SectionTitle>Equipment</SectionTitle>
      <View style={styles.wrap}>
        {equipmentList.map((e) => (
          <Chip key={e} label={equipmentLabels[e]} selected={equipment === e} onPress={() => setEquipment(e)} />
        ))}
      </View>

      <Card style={styles.group}>
        <AppText variant="label" color="textMuted">
          Typ
        </AppText>
        <ChipGroup
          options={[
            { value: 'grund', label: 'Grundübung' },
            { value: 'isolation', label: 'Isolation' },
          ]}
          value={category}
          onChange={(v) => setCategory(v as ExerciseCategory)}
        />
        <Chip
          label="Mit Körpergewicht (Gewicht = Zusatzgewicht)"
          icon="check"
          selected={bodyweight}
          onPress={() => setBodyweight(!bodyweight)}
        />
        <AppText variant="label" color="textMuted">
          Wiederholungsbereich
        </AppText>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Stepper value={repMin} min={1} max={50} decimals={0} label="von" onChange={setRepMin} />
          </View>
          <View style={styles.flex}>
            <Stepper value={repMax} min={1} max={60} decimals={0} label="bis" onChange={setRepMax} />
          </View>
        </View>
      </Card>

      <TextField
        label="Technik-Hinweise (eine Zeile pro Hinweis)"
        value={tips}
        onChangeText={setTips}
        multiline
      />
      {error ? <AppText color="danger">{error}</AppText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  group: { gap: spacing.md },
  row: { flexDirection: 'column', gap: spacing.md },
  flex: { flex: 1 },
});

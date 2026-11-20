import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip, ChipGroup } from '@/components/Chip';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { TextField } from '@/components/TextField';
import { toggleFavorite } from '@/db/actions/profile';
import { useExercises } from '@/db/exercises';
import { useData } from '@/db/store';
import { difficultyLabels, equipmentLabels, muscleRegions } from '@/domain/labels';
import type { Difficulty, Equipment } from '@/domain/types';
import { filterExercises, type ExerciseKind } from '@/engine/exercises';
import { spacing } from '@/theme';
import { ExerciseCard } from './ExerciseCard';
import { completeExercisePick, hasPendingPick, pickTitle } from './picker';

const regionOptions = [{ value: 'alle', label: 'Alle' }, ...muscleRegions.map((r) => ({ value: r.id, label: r.label }))];
const kindOptions: { value: ExerciseKind | 'alle'; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  { value: 'grund', label: 'Grundübung' },
  { value: 'isolation', label: 'Isolation' },
  { value: 'bodyweight', label: 'Bodyweight' },
];
const difficultyOptions: { value: Difficulty | 0; label: string }[] = [
  { value: 0, label: 'Alle' },
  { value: 1, label: difficultyLabels[1] },
  { value: 2, label: difficultyLabels[2] },
  { value: 3, label: difficultyLabels[3] },
];

export function ExerciseLibraryScreen() {
  const params = useLocalSearchParams<{ pick?: string }>();
  const picking = params.pick === '1' && hasPendingPick();
  const { profile } = useData();
  const catalog = useExercises();

  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('alle');
  const [kind, setKind] = useState<ExerciseKind | 'alle'>('alle');
  const [difficulty, setDifficulty] = useState<Difficulty | 0>(0);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);

  const results = useMemo(
    () =>
      filterExercises(catalog.list, {
        query,
        region: region === 'alle' ? null : region,
        kind: kind === 'alle' ? null : kind,
        difficulty: difficulty === 0 ? null : difficulty,
        equipment,
        favoritesOnly,
        favorites: profile.favorites,
        availableEquipment: onlyAvailable ? profile.equipment.available : null,
      }),
    [catalog.list, query, region, kind, difficulty, equipment, favoritesOnly, onlyAvailable, profile.favorites, profile.equipment.available],
  );

  const activeFilters = [kind !== 'alle', difficulty !== 0, equipment !== null, favoritesOnly, !onlyAvailable].filter(Boolean).length;

  const resetFilters = () => {
    setKind('alle');
    setDifficulty(0);
    setEquipment(null);
    setFavoritesOnly(false);
    setOnlyAvailable(true);
  };

  return (
    <Screen
      title={picking ? pickTitle() : 'Übungsbibliothek'}
      onBack={() => router.back()}
      testID="screen-uebungen"
    >
      <TextField
        placeholder="Übung suchen …"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        returnKeyType="search"
        testID="uebungen-suche"
      />
      <ChipGroup options={regionOptions} value={region} onChange={setRegion} scroll testIDPrefix="region" />
      <View style={styles.toolbar}>
        <Chip
          label={activeFilters ? `Filter (${activeFilters})` : 'Filter'}
          icon="filter"
          selected={activeFilters > 0}
          onPress={() => setFilterOpen(true)}
        />
        <Chip
          label="Favoriten"
          icon="star"
          selected={favoritesOnly}
          onPress={() => setFavoritesOnly(!favoritesOnly)}
        />
        <View style={styles.flex} />
        <AppText variant="small" color="textMuted">
          {results.length} Übungen
        </AppText>
      </View>

      {results.map((ex) => (
        <ExerciseCard
          key={ex.id}
          exercise={ex}
          favorite={profile.favorites.includes(ex.id)}
          onToggleFavorite={() => toggleFavorite(ex.id)}
          onPress={() =>
            picking ? completeExercisePick(ex.id) : router.push({ pathname: '/uebung', params: { id: ex.id } })
          }
          testID={`uebung-${ex.id}`}
        />
      ))}
      {results.length === 0 ? (
        <AppText color="textMuted" align="center">
          Nichts gefunden. Probier einen anderen Begriff oder lege eine eigene Übung an.
        </AppText>
      ) : null}

      <Button
        title="Eigene Übung anlegen"
        icon="plus"
        variant="secondary"
        onPress={() => router.push('/eigene-uebung')}
      />

      <Sheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter"
        footer={
          <>
            <Button title={`${results.length} Übungen anzeigen`} onPress={() => setFilterOpen(false)} size="lg" />
            <Button title="Zurücksetzen" variant="ghost" onPress={resetFilters} />
          </>
        }
      >
        <AppText variant="label" color="textMuted">
          Typ
        </AppText>
        <ChipGroup options={kindOptions} value={kind} onChange={setKind} />
        <AppText variant="label" color="textMuted">
          Schwierigkeit
        </AppText>
        <ChipGroup options={difficultyOptions} value={difficulty} onChange={setDifficulty} />
        <AppText variant="label" color="textMuted">
          Equipment
        </AppText>
        <View style={styles.wrap}>
          <Chip label="Alle" selected={equipment === null} onPress={() => setEquipment(null)} />
          {(Object.keys(equipmentLabels) as Equipment[]).map((e) => (
            <Chip key={e} label={equipmentLabels[e]} selected={equipment === e} onPress={() => setEquipment(e)} />
          ))}
        </View>
        <Chip
          label="Nur mit meinem Equipment"
          icon="check"
          selected={onlyAvailable}
          onPress={() => setOnlyAvailable(!onlyAvailable)}
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});

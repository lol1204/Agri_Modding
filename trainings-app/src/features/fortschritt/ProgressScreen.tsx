import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { BarChart, RangeBar } from '@/components/charts';
import { Card } from '@/components/Card';
import { ChipGroup } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { InfoTerm } from '@/components/InfoTerm';
import { ListRow, SectionTitle } from '@/components/ListRow';
import { PressableScale } from '@/components/PressableScale';
import { Screen } from '@/components/Screen';
import { toggleHiddenStat } from '@/db/actions/profile';
import { useExercises } from '@/db/exercises';
import { useData } from '@/db/store';
import type { WeightUnit } from '@/domain/types';
import { addWeeks, formatRelativeDay, startOfWeek } from '@/engine/dates';
import { hardSetsByMuscle, hardSetsByRegion, percentChange, recentRecords, trainedExercises, weeklyStats } from '@/engine/progress';
import { formatNumber, formatVolume, formatWeight, kgToUnit } from '@/engine/units';
import { spacing, touch } from '@/theme';

const STATS = {
  woche: 'Diese Woche',
  trend: 'Trend: Wochenvolumen',
  rekorde: 'Neue Rekorde',
  muskeln: 'Harte Sätze pro Muskelgruppe',
  uebungen: 'Verlauf pro Übung',
} as const;
type StatId = keyof typeof STATS;

/** Kurz für Diagramm-Beschriftungen: 6.355 kg → „6,4 t“. */
function compactVolume(kg: number, unit: WeightUnit): string {
  const v = kgToUnit(kg, unit);
  if (v >= 1000) return `${formatNumber(v / 1000, 1)}${unit === 'kg' ? ' t' : 'k'}`;
  return formatNumber(Math.round(v), 0);
}

function changeText(pct: number | null, suffix = 'zur Vorwoche'): string {
  if (pct === null) return 'noch kein Vergleich';
  if (pct === 0) return `gleich ${suffix}`;
  return `${pct > 0 ? '+' : '−'}${Math.abs(pct)} % ${suffix}`;
}

export function ProgressScreen() {
  const { workouts, profile } = useData();
  const catalog = useExercises();
  const unit: WeightUnit = profile.unit;
  const [range, setRange] = useState<'woche' | 'schnitt'>('woche');
  const now = Date.now();

  const weeks = useMemo(() => weeklyStats(workouts, now, 8), [workouts, now]);
  const thisWeek = weeks[weeks.length - 1]!;
  const lastWeek = weeks[weeks.length - 2]!;
  const records = useMemo(() => recentRecords(workouts, 5), [workouts]);
  const exercises = useMemo(() => trainedExercises(workouts).slice(0, 12), [workouts]);
  const regions = useMemo(() => {
    const ws = startOfWeek(now);
    const byMuscle =
      range === 'woche' ? hardSetsByMuscle(workouts, ws, addWeeks(ws, 1)) : hardSetsByMuscle(workouts, addWeeks(ws, -4), ws, 4);
    return hardSetsByRegion(byMuscle);
  }, [workouts, range, now]);

  const hidden = profile.hiddenStats;
  const visible = (id: StatId) => !hidden.includes(id);
  const hasData = workouts.some((w) => w.status === 'beendet');

  if (!hasData) {
    return (
      <Screen title="Fortschritt" inTabs testID="screen-fortschritt">
        <Card style={styles.group}>
          <Icon name="progress" size={32} color="accent" />
          <AppText variant="heading">Hier wächst dein Fortschritt</AppText>
          <AppText color="textMuted">
            Nach deinem ersten Training siehst du hier Trend, Rekorde und dein Wochenvolumen.
          </AppText>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="Fortschritt" inTabs testID="screen-fortschritt">
      {visible('woche') ? (
        <StatSection id="woche">
          <View style={styles.tiles}>
            <Tile label="Volumen" value={formatVolume(thisWeek.volumeKg, unit)} sub={changeText(percentChange(thisWeek.volumeKg, lastWeek.volumeKg))} />
            <Tile label="Harte Sätze" value={String(thisWeek.workSets)} sub={changeText(percentChange(thisWeek.workSets, lastWeek.workSets))} />
            <Tile label="Trainings" value={`${thisWeek.workouts}`} sub={`Ziel: ${profile.trainingDaysPerWeek} pro Woche`} />
          </View>
        </StatSection>
      ) : null}

      {visible('trend') ? (
        <StatSection id="trend">
          <Card style={styles.group}>
            <BarChart
              bars={weeks.map((w, i) => ({
                label: i === weeks.length - 1 ? 'Jetzt' : `${new Date(w.weekStart).getDate()}.${new Date(w.weekStart).getMonth() + 1}`,
                value: w.volumeKg,
                secondary: w.dropVolumeKg,
                highlight: i === weeks.length - 1,
              }))}
              formatValue={(v) => compactVolume(v, unit)}
            />
            <AppText variant="small" color="textMuted">
              Gewicht × Wiederholungen aller Arbeitssätze pro Woche. Lila: Anteil aus Dropsätzen.
            </AppText>
          </Card>
        </StatSection>
      ) : null}

      {visible('rekorde') ? (
        <StatSection id="rekorde">
          <Card style={styles.group}>
            {records.length === 0 ? (
              <AppText color="textMuted">Rekorde erscheinen, sobald du eine Übung zum zweiten Mal machst und dich steigerst.</AppText>
            ) : (
              records.map((r) => (
                <ListRow
                  key={`${r.workoutId}-${r.exerciseId}`}
                  icon="trophy"
                  iconColor="warning"
                  title={catalog.get(r.exerciseId)?.name ?? 'Übung'}
                  subtitle={`${r.kind === 'wiederholungen' ? `${r.value} Wdh.` : formatWeight(r.value, unit)}${r.kind === 'e1rm' ? ' (1RM geschätzt)' : ''}${r.previous !== null ? ` · vorher ${r.kind === 'wiederholungen' ? r.previous : formatWeight(r.previous, unit)}` : ''}`}
                  value={formatRelativeDay(r.date, now)}
                  onPress={() => router.push({ pathname: '/uebung', params: { id: r.exerciseId } })}
                />
              ))
            )}
          </Card>
        </StatSection>
      ) : null}

      {visible('muskeln') ? (
        <StatSection id="muskeln" extra={<InfoTerm term="hartesatz" />}>
          <Card style={styles.group}>
            <ChipGroup
              options={[
                { value: 'woche', label: 'Diese Woche' },
                { value: 'schnitt', label: 'Ø letzte 4 Wochen' },
              ]}
              value={range}
              onChange={setRange}
            />
            {regions.map((r) => (
              <RangeBar key={r.id} label={r.label} value={r.sets} targetMin={10} targetMax={20} scaleMax={24} />
            ))}
            <AppText variant="small" color="textMuted">
              Der helle Bereich zeigt den Richtwert für Muskelaufbau: 10–20 harte Sätze pro Woche.
            </AppText>
          </Card>
        </StatSection>
      ) : null}

      {visible('uebungen') ? (
        <StatSection id="uebungen">
          <Card style={styles.group}>
            {exercises.map((e) => {
              const ex = catalog.get(e.exerciseId);
              const best = e.last.bodyweight && e.last.topWeightKg === 0 ? `${e.last.maxReps} Wdh.` : `${formatWeight(e.last.topWeightKg, unit)} × ${e.last.topReps}`;
              return (
                <ListRow
                  key={e.exerciseId}
                  icon="dumbbell"
                  title={ex?.name ?? 'Übung'}
                  subtitle={`Zuletzt ${best} · ${e.sessions}× trainiert`}
                  onPress={() => router.push({ pathname: '/uebung', params: { id: e.exerciseId } })}
                  testID={`verlauf-${e.exerciseId}`}
                />
              );
            })}
          </Card>
        </StatSection>
      ) : null}

      {hidden.length ? (
        <>
          <SectionTitle>Ausgeblendet</SectionTitle>
          <View style={styles.hiddenRow}>
            {(hidden.filter((h) => h in STATS) as StatId[]).map((id) => (
              <PressableScale key={id} onPress={() => toggleHiddenStat(id)} style={styles.showBtn} accessibilityRole="button" accessibilityLabel={`${STATS[id]} einblenden`}>
                <Icon name="plus" size={16} color="accent" />
                <AppText variant="label" color="accent">
                  {STATS[id]}
                </AppText>
              </PressableScale>
            ))}
          </View>
        </>
      ) : null}
      <AppText variant="small" color="textFaint" align="center">
        {formatNumber(workouts.filter((w) => w.status === 'beendet').length, 0)} Trainings gespeichert
      </AppText>
    </Screen>
  );
}

function StatSection({ id, children, extra }: { id: StatId; children: ReactNode; extra?: ReactNode }) {
  return (
    <View style={styles.section}>
      <SectionTitle
        right={
          <View style={styles.sectionRight}>
            {extra}
            <PressableScale
              onPress={() => toggleHiddenStat(id)}
              accessibilityRole="button"
              accessibilityLabel={`${STATS[id]} ausblenden`}
              style={styles.hideBtn}
              hitSlop={touch.hitSlop}
            >
              <AppText variant="caption" color="textFaint">
                Ausblenden
              </AppText>
            </PressableScale>
          </View>
        }
      >
        {STATS[id]}
      </SectionTitle>
      {children}
    </View>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card style={styles.tile}>
      <AppText variant="heading" tabular numberOfLines={1}>
        {value}
      </AppText>
      <AppText variant="caption" color="textMuted">
        {label.toUpperCase()}
      </AppText>
      <AppText variant="caption" color={sub.startsWith('+') ? 'accent' : 'textFaint'}>
        {sub}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  sectionRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  hideBtn: { minHeight: 32, justifyContent: 'center', paddingHorizontal: spacing.xs },
  group: { gap: spacing.sm },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: { flex: 1, gap: spacing.xxs, paddingHorizontal: spacing.md },
  hiddenRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  showBtn: { minHeight: touch.minTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm },
});

import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { LineChart } from '@/components/charts';
import { Card } from '@/components/Card';
import { ChipGroup } from '@/components/Chip';
import { InfoTerm } from '@/components/InfoTerm';
import { SectionTitle } from '@/components/ListRow';
import { useExercises } from '@/db/exercises';
import { useData } from '@/db/store';
import { formatDayShort } from '@/engine/dates';
import { compareWithPast, exerciseHistory } from '@/engine/progress';
import { formatDelta, formatWeight } from '@/engine/units';
import { spacing } from '@/theme';

type Metric = 'e1rm' | 'gewicht' | 'wdh';

/** Verlauf einer Übung: Gewicht, Wiederholungen und geschätztes 1RM. */
export function ExerciseHistory({ exerciseId }: { exerciseId: string }) {
  const { workouts, profile } = useData();
  const catalog = useExercises();
  const exercise = catalog.get(exerciseId);
  const unit = profile.unit;
  const points = useMemo(() => exerciseHistory(workouts, exerciseId), [workouts, exerciseId]);
  const pureBodyweight = !!exercise?.bodyweight && points.every((p) => p.topWeightKg === 0);
  const [metric, setMetric] = useState<Metric>(pureBodyweight ? 'wdh' : 'e1rm');
  const [width, setWidth] = useState(0);

  const values = points.map((p) => (metric === 'e1rm' ? p.e1rmKg : metric === 'gewicht' ? p.topWeightKg : p.maxReps));
  const cmp = compareWithPast(
    points.map((p, i) => ({ date: p.date, value: values[i] ?? 0 })),
    Date.now(),
    4,
  );
  const fmt = (v: number) => (metric === 'wdh' ? `${v} Wdh.` : formatWeight(v, unit));

  return (
    <>
      <SectionTitle right={metric === 'e1rm' ? <InfoTerm term="e1rm" /> : undefined}>Verlauf</SectionTitle>
      {points.length === 0 ? (
        <Card>
          <AppText color="textMuted">Noch keine Sätze – nach dem ersten Training siehst du hier deinen Verlauf.</AppText>
        </Card>
      ) : (
        <Card style={styles.group}>
          <ChipGroup
            options={[
              ...(pureBodyweight ? [] : [{ value: 'e1rm' as Metric, label: '1RM geschätzt' }, { value: 'gewicht' as Metric, label: 'Gewicht' }]),
              { value: 'wdh' as Metric, label: 'Wiederholungen' },
            ]}
            value={metric}
            onChange={setMetric}
            scroll
          />
          <View style={styles.headline}>
            <AppText variant="display" tabular>
              {fmt(values[values.length - 1] ?? 0)}
            </AppText>
            <AppText variant="small" color={cmp && cmp.delta > 0 ? 'accent' : 'textMuted'}>
              {cmp
                ? `${metric === 'wdh' ? `${cmp.delta > 0 ? '+' : cmp.delta < 0 ? '−' : '±'}${Math.abs(cmp.delta)} Wdh.` : formatDelta(cmp.delta, unit)} seit ${formatDayShort(cmp.since)}`
                : 'Ab dem zweiten Training mit Vergleich'}
            </AppText>
          </View>
          <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
            {width > 0 ? <LineChart values={values} width={width} formatValue={fmt} /> : null}
          </View>
          {[...points]
            .reverse()
            .slice(0, 5)
            .map((p) => (
              <View key={p.workoutId} style={styles.row}>
                <AppText variant="small" color="textMuted" style={styles.date}>
                  {formatDayShort(p.date)}
                </AppText>
                <AppText variant="small" tabular style={styles.flex}>
                  {p.bodyweight && p.topWeightKg === 0 ? `${p.maxReps} Wdh.` : `${formatWeight(p.topWeightKg, unit)} × ${p.topReps}`} · {p.workSets} Sätze
                </AppText>
                {!pureBodyweight ? (
                  <AppText variant="small" color="textFaint" tabular>
                    1RM {formatWeight(p.e1rmKg, unit)}
                  </AppText>
                ) : null}
              </View>
            ))}
        </Card>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.md },
  headline: { gap: spacing.xxs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  date: { width: 96 },
  flex: { flex: 1 },
});

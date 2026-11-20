import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { ListRow, SectionTitle } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { createEmptyPlan } from '@/db/actions/plans';
import { useData } from '@/db/store';
import { splitLabels } from '@/domain/labels';
import { spacing } from '@/theme';
import { Badge } from '../uebungen/ExerciseCard';

export function PlansScreen() {
  const { plans, profile } = useData();

  return (
    <Screen title="Pläne" inTabs testID="screen-plaene">
      {plans.length === 0 ? (
        <Card style={styles.empty}>
          <Icon name="plans" size={32} color="accent" />
          <AppText variant="heading">Dein erster Plan</AppText>
          <AppText color="textMuted">
            Starte mit einer Vorlage – in zwei Taps fertig und jederzeit frei umbaubar.
          </AppText>
        </Card>
      ) : (
        plans.map((plan) => {
          const active = plan.id === profile.activePlanId;
          const exerciseCount = plan.days.reduce((sum, d) => sum + d.exercises.length, 0);
          return (
            <Card
              key={plan.id}
              highlighted={active}
              onPress={() => router.push({ pathname: '/plan', params: { id: plan.id } })}
              accessibilityLabel={plan.name}
            >
              <View style={styles.planRow}>
                <View style={styles.flex}>
                  <AppText variant="subheading">{plan.name}</AppText>
                  <AppText variant="small" color="textMuted">
                    {splitLabels[plan.split]} · {plan.days.length} {plan.days.length === 1 ? 'Tag' : 'Tage'} ·{' '}
                    {exerciseCount} Übungen
                  </AppText>
                </View>
                {active ? <Badge text="Aktiv" tone="accent" /> : null}
                <Icon name="chevronRight" size={20} color="textFaint" />
              </View>
            </Card>
          );
        })
      )}

      <View style={styles.actions}>
        <Button title="Plan aus Vorlage" icon="layers" size="lg" onPress={() => router.push('/vorlagen')} testID="plaene-vorlage" />
        <Button
          title="Leeren Plan anlegen"
          icon="plus"
          variant="secondary"
          onPress={() => {
            const plan = createEmptyPlan();
            router.push({ pathname: '/plan', params: { id: plan.id } });
          }}
          testID="plaene-leer"
        />
      </View>

      <SectionTitle>Übungen</SectionTitle>
      <Card>
        <ListRow
          icon="dumbbell"
          title="Übungsbibliothek"
          subtitle="Alle Übungen mit Technik-Tipps, Filtern und Favoriten"
          onPress={() => router.push('/uebungen')}
          testID="plaene-bibliothek"
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { gap: spacing.sm, alignItems: 'flex-start' },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1, gap: spacing.xxs },
  actions: { gap: spacing.sm },
});

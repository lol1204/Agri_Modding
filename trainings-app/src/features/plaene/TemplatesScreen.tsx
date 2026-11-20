import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { useToast } from '@/components/Toast';
import { createPlanFromTemplate } from '@/db/actions/plans';
import { useExercises } from '@/db/exercises';
import { planTemplates } from '@/engine/templates';
import { spacing } from '@/theme';
import { Badge } from '../uebungen/ExerciseCard';

export function TemplatesScreen() {
  const { showToast } = useToast();
  const catalog = useExercises();

  const choose = (templateId: string) => {
    const result = createPlanFromTemplate(templateId);
    if (!result) return;
    if (result.swaps.length) {
      const names = result.swaps
        .slice(0, 2)
        .map((s) => catalog.get(s.to)?.name)
        .filter(Boolean)
        .join(', ');
      showToast({
        message: `Angepasst an dein Equipment: ${names}${result.swaps.length > 2 ? ' …' : ''}`,
      });
    }
    router.replace({ pathname: '/plan', params: { id: result.plan.id } });
  };

  return (
    <Screen title="Vorlage wählen" onBack={() => router.back()} testID="screen-vorlagen">
      <AppText color="textMuted">
        Alle Vorlagen setzen auf Grundübungen zuerst, danach Isolation. Du kannst danach alles umbauen.
      </AppText>
      {planTemplates.map((t) => (
        <Card key={t.id} onPress={() => choose(t.id)} accessibilityLabel={t.name}>
          <View style={styles.row} testID={`vorlage-${t.id}`}>
            <View style={styles.flex}>
              <AppText variant="subheading">{t.name}</AppText>
              <AppText variant="small" color="textMuted">
                {t.description}
              </AppText>
              <View style={styles.badges}>
                <Badge text={t.daysPerWeek} tone="accent" />
                <Badge text={t.location === 'gym' ? 'Gym' : 'Zuhause'} />
                <Badge text={`${t.days.length} Trainingstage`} />
              </View>
            </View>
            <Icon name="chevronRight" size={20} color="textFaint" />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1, gap: spacing.xs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
});

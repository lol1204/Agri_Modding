import { router } from 'expo-router';
import { Card } from '@/components/Card';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';

export default function PlansTab() {
  return (
    <Screen title="Pläne" inTabs>
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

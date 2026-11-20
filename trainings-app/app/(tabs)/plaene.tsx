import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';

export default function Placeholder() {
  return (
    <Screen title="Pläne" inTabs>
      <Card>
        <AppText color="textMuted">Deine Trainingspläne und die Übungsbibliothek.</AppText>
      </Card>
    </Screen>
  );
}

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';

export default function Placeholder() {
  return (
    <Screen title="Fortschritt" inTabs>
      <Card>
        <AppText color="textMuted">Trend, Rekorde und Wochenvolumen.</AppText>
      </Card>
    </Screen>
  );
}

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';

export default function Placeholder() {
  return (
    <Screen title="Heute" inTabs>
      <Card>
        <AppText color="textMuted">Hier startest du gleich dein Training.</AppText>
      </Card>
    </Screen>
  );
}

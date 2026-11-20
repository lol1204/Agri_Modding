import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';

export default function Placeholder() {
  return (
    <Screen title="Coach" inTabs>
      <Card>
        <AppText color="textMuted">Wochenreview, Empfehlungen und Fragen.</AppText>
      </Card>
    </Screen>
  );
}

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';

export default function Placeholder() {
  return (
    <Screen title="Profil" inTabs>
      <Card>
        <AppText color="textMuted">Ziel, Equipment und Einstellungen.</AppText>
      </Card>
    </Screen>
  );
}

import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Icon, type IconName } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { spacing } from '@/theme';

const upcoming: { icon: IconName; title: string; text: string }[] = [
  { icon: 'calendar', title: 'Wochenreview', text: 'Was lief gut, wo hakt es, was ist der Fokus der nächsten Woche?' },
  { icon: 'sparkle', title: 'Empfehlungen mit „Warum?“', text: 'Vorschläge aus deinen echten Daten – du entscheidest.' },
  { icon: 'coach', title: 'Fragen stellen', text: 'z. B. „Warum komme ich bei Bankdrücken nicht weiter?“' },
  { icon: 'bolt', title: 'Kurzer Check-in', text: 'Schlaf, Energie, Muskelkater – daraus wird „heute voll“ oder „lieber leichter“.' },
];

/** Platzhalter: Der Coach folgt nach dem MVP (Schritt 9). */
export function CoachScreen() {
  return (
    <Screen title="Coach" inTabs testID="screen-coach">
      <Card style={styles.group}>
        <Icon name="coach" size={32} color="accent" />
        <AppText variant="heading">Dein Coach lernt dich gerade kennen</AppText>
        <AppText color="textMuted">
          Im Training hilft dir schon der Gewichtsassistent bei jedem Satz. Hier kommt bald mehr:
        </AppText>
      </Card>
      {upcoming.map((u) => (
        <Card key={u.title}>
          <View style={styles.row}>
            <Icon name={u.icon} size={22} color="textMuted" />
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{u.title}</AppText>
              <AppText variant="small" color="textMuted">
                {u.text}
              </AppText>
            </View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  flex: { flex: 1, gap: spacing.xxs },
});

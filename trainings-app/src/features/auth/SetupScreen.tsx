import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { spacing } from '@/theme';

const steps = [
  'Firebase-Projekt anlegen (kostenloser Spark-Plan) und Google Analytics ausschalten.',
  'Authentication → Anmeldemethode „E-Mail/Passwort“ aktivieren.',
  'Firestore-Datenbank mit EU-Standort anlegen.',
  'Web-App registrieren und die Werte in die Datei .env eintragen.',
  'Neu bauen und veröffentlichen: npm run deploy',
];

/**
 * Wird nur angezeigt, wenn die App ohne Firebase-Werte gebaut wurde.
 * Die fertige App auf dem iPhone sieht diesen Bildschirm nie.
 */
export function SetupScreen() {
  return (
    <Screen title="Firebase einrichten" testID="screen-setup">
      <Card style={styles.group}>
        <Icon name="cloudOff" size={32} color="warning" />
        <AppText variant="heading">Noch nicht mit Firebase verbunden</AppText>
        <AppText color="textMuted">
          Die App speichert alles in deinem Firebase-Konto. Dafür fehlen noch die Werte deines Projekts in der Datei
          „.env“.
        </AppText>
      </Card>
      <Card style={styles.group}>
        {steps.map((text, i) => (
          <View key={i} style={styles.row}>
            <AppText variant="bodyStrong" color="accent" style={styles.num}>
              {i + 1}.
            </AppText>
            <AppText style={styles.flex}>{text}</AppText>
          </View>
        ))}
      </Card>
      <AppText variant="small" color="textMuted">
        Die ausführliche Anleitung steht in der Datei README.md im Ordner trainings-app.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  num: { width: 24 },
  flex: { flex: 1 },
});

import { useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { authErrorMessage, resetPassword, signIn, signUp } from '@/db/auth';
import { spacing } from '@/theme';

type Mode = 'login' | 'register';

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === 'login') await signIn(email, password);
      else await signUp(email, password);
      // Weiterleitung passiert automatisch, sobald der Login steht.
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    setError(null);
    if (!email.trim()) {
      setError('Trag oben deine E-Mail ein, dann schicken wir dir einen Link.');
      return;
    }
    try {
      await resetPassword(email);
      setInfo('Wir haben dir eine E-Mail zum Zurücksetzen geschickt.');
    } catch (e) {
      setError(authErrorMessage(e));
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding">
      <Screen>
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Icon name="dumbbell" size={40} color="accent" />
          </View>
          <AppText variant="title" align="center">
            {mode === 'login' ? 'Willkommen zurück' : 'Konto anlegen'}
          </AppText>
          <AppText color="textMuted" align="center">
            Deine Trainingsdaten liegen sicher in deinem Konto – auf allen Geräten und auch offline.
          </AppText>
        </View>

        <Card style={styles.form}>
          <TextField
            label="E-Mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            textContentType="emailAddress"
            placeholder="du@beispiel.de"
            testID="login-email"
          />
          <TextField
            label="Passwort"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            textContentType={mode === 'login' ? 'password' : 'newPassword'}
            placeholder={mode === 'register' ? 'Mindestens 6 Zeichen' : undefined}
            onSubmitEditing={submit}
            testID="login-password"
          />
          {error ? <AppText color="danger">{error}</AppText> : null}
          {info ? <AppText color="accent">{info}</AppText> : null}
          <Button
            title={busy ? 'Einen Moment …' : mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
            size="lg"
            onPress={submit}
            disabled={busy}
            testID="login-submit"
          />
          {mode === 'login' ? <Button title="Passwort vergessen?" variant="ghost" onPress={forgot} /> : null}
        </Card>

        <Button
          title={mode === 'login' ? 'Neu hier? Konto anlegen' : 'Schon ein Konto? Anmelden'}
          variant="secondary"
          onPress={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
            setInfo(null);
          }}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xxl, marginBottom: spacing.md },
  logo: { marginBottom: spacing.sm },
  form: { gap: spacing.md },
});

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider, useToast } from '@/components/Toast';
import { SessionProvider, useSession } from '@/db/session';
import { useData } from '@/db/store';
import { registerServiceWorker } from '@/integrations/pwa';
import { colors } from '@/theme';

function ServiceWorkerUpdates() {
  const { showToast } = useToast();
  useEffect(() => {
    registerServiceWorker((applyUpdate) =>
      showToast({ message: 'Update bereit', actionLabel: 'Neu laden', onAction: applyUpdate, duration: 0 }),
    );
  }, [showToast]);
  return null;
}

function AppNavigator() {
  const session = useSession();
  const { status } = useData();
  const signedIn = session.status === 'ready';
  const signedOut = session.status === 'signedOut';

  // Bis klar ist, ob jemand angemeldet ist: nur der dunkle Hintergrund (kein Aufblitzen).
  if (session.status === 'loading' || (signedIn && status !== 'ready')) {
    return <View style={styles.splash} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="ausruestung" />
        <Stack.Screen name="uebungen" />
        <Stack.Screen name="uebung" />
        <Stack.Screen name="eigene-uebung" />
        <Stack.Screen name="plan" />
        <Stack.Screen name="vorlagen" />
        <Stack.Screen name="training" options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="zusammenfassung" options={{ gestureEnabled: false, animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={signedOut}>
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
      </Stack.Protected>
    </Stack>
  );
}

function Root() {
  const { showToast } = useToast();
  const onError = useCallback(
    (error: unknown) => {
      // Fehler nur kurz melden, die App läuft weiter (Daten sind lokal gesichert).
      console.warn(error);
      showToast({ message: 'Synchronisierung hakt – deine Daten sind lokal gesichert.' });
    },
    [showToast],
  );
  return (
    <SessionProvider onError={onError}>
      <ServiceWorkerUpdates />
      <AppNavigator />
    </SessionProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <StatusBar style="light" />
        <Root />
      </ToastProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.background },
});

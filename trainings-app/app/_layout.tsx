import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider, useToast } from '@/components/Toast';
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

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <StatusBar style="light" />
        <ServiceWorkerUpdates />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" />
        </Stack>
      </ToastProvider>
    </SafeAreaProvider>
  );
}

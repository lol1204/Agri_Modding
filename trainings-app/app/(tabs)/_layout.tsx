import { Tabs } from 'expo-router/js-tabs';
import { useEffect } from 'react';
import { TabBar } from '@/components/TabBar';
import { useToast } from '@/components/Toast';
import { colors, layout, spacing } from '@/theme';

export default function TabsLayout() {
  const { setBottomOffset } = useToast();
  // Hinweise (Toasts) erscheinen über der Tab-Leiste.
  useEffect(() => setBottomOffset(layout.tabBarHeight + spacing.md), [setBottomOffset]);
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Heute' }} />
      <Tabs.Screen name="plaene" options={{ title: 'Pläne' }} />
      <Tabs.Screen name="fortschritt" options={{ title: 'Fortschritt' }} />
      <Tabs.Screen name="coach" options={{ title: 'Coach' }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil' }} />
    </Tabs>
  );
}

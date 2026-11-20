import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, spacing, touch } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

const tabMeta: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Heute', icon: 'today' },
  plaene: { label: 'Pläne', icon: 'plans' },
  fortschritt: { label: 'Fortschritt', icon: 'progress' },
  coach: { label: 'Coach', icon: 'coach' },
  profil: { label: 'Profil', icon: 'profile' },
};

/** Feste untere Navigation mit fünf Tabs. */
export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]} accessibilityRole="tablist">
      <View style={styles.inner}>
        {state.routes.map((route, index) => {
          const meta = tabMeta[route.name];
          if (!meta) return null;
          const focused = state.index === index;
          const onPress = () => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };
          return (
            <PressableScale
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={meta.label}
              testID={`tab-${route.name}`}
              style={styles.item}
              scaleTo={0.92}
            >
              <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                <Icon name={meta.icon} size={22} color={focused ? 'accent' : 'textMuted'} />
              </View>
              <AppText variant="caption" color={focused ? 'text' : 'textMuted'} numberOfLines={1}>
                {meta.label}
              </AppText>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.xs,
  },
  inner: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  item: {
    flex: 1,
    minHeight: layout.tabBarHeight,
    minWidth: touch.minTarget,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  iconWrap: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
    borderRadius: 999,
  },
  iconWrapActive: {
    backgroundColor: colors.accentSoft,
  },
});

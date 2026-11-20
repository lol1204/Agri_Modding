import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, motion, radii, spacing, touch } from '@/theme';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

type ToastOptions = {
  message: string;
  /** Beschriftung der Aktion, z. B. „Rückgängig“. */
  actionLabel?: string;
  onAction?: () => void;
  /** Anzeigedauer in ms (Standard 4500). 0 = bleibt stehen. */
  duration?: number;
};

type ToastState = ToastOptions & { id: number };

type ToastContextValue = {
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
  /** Abstand nach unten, z. B. damit der Toast über der Tab-Leiste liegt. */
  setBottomOffset: (offset: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);
const useNativeDriver = Platform.OS !== 'web';

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [bottomOffset, setBottomOffset] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const hideToast = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    Animated.timing(anim, { toValue: 0, duration: motion.fast, useNativeDriver }).start(() => setToast(null));
  }, [anim]);

  const showToast = useCallback(
    (options: ToastOptions) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ ...options, id: Date.now() });
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: motion.fast, useNativeDriver }).start();
      const duration = options.duration ?? 4500;
      if (duration > 0) timer.current = setTimeout(hideToast, duration);
    },
    [anim, hideToast],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const value = useMemo(() => ({ showToast, hideToast, setBottomOffset }), [showToast, hideToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View pointerEvents="box-none" style={[styles.host, { bottom: insets.bottom + bottomOffset + spacing.md }]}>
          <Animated.View
            accessibilityLiveRegion="polite"
            style={[
              styles.toast,
              {
                opacity: anim,
                transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
              },
            ]}
          >
            <AppText variant="body" style={styles.message}>
              {toast.message}
            </AppText>
            {toast.actionLabel ? (
              <PressableScale
                accessibilityRole="button"
                onPress={() => {
                  toast.onAction?.();
                  hideToast();
                }}
                style={styles.action}
              >
                <AppText variant="bodyStrong" color="accent">
                  {toast.actionLabel}
                </AppText>
              </PressableScale>
            ) : null}
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast muss innerhalb von ToastProvider genutzt werden');
  return ctx;
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
  },
  toast: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    minHeight: touch.largeTarget,
  },
  message: { flex: 1, paddingVertical: spacing.md },
  action: {
    minHeight: touch.minTarget,
    minWidth: touch.minTarget,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

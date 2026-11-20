import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, motion, radii, spacing } from '@/theme';
import { AppText } from './AppText';
import { Button } from './Button';

const useNativeDriver = Platform.OS !== 'web';

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  /** Feste Buttons unten. */
  footer?: ReactNode;
  testID?: string;
};

/** Von unten einfahrendes Fenster (gut mit dem Daumen erreichbar). */
export function Sheet({ visible, onClose, title, children, footer, testID }: SheetProps) {
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: motion.normal, useNativeDriver }).start();
    }
  }, [visible, anim]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root} testID={testID}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Schließen" accessibilityRole="button">
          <Animated.View style={[StyleSheet.absoluteFill, styles.backdropColor, { opacity: anim }]} />
        </Pressable>
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + spacing.lg,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }) }],
            },
          ]}
        >
          <View style={styles.handle} />
          {title ? (
            <AppText variant="heading" style={styles.title}>
              {title}
            </AppText>
          ) : null}
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

type ConfirmSheetProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
};

/** Rückfrage – nur für Dinge, die sich nicht rückgängig machen lassen. */
export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Abbrechen',
  destructive,
  onConfirm,
  onCancel,
  children,
}: ConfirmSheetProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button title={confirmLabel} variant={destructive ? 'danger' : 'primary'} size="lg" onPress={onConfirm} />
          <Button title={cancelLabel} variant="secondary" onPress={onCancel} />
        </>
      }
    >
      {message ? <AppText color="textMuted">{message}</AppText> : null}
      {children}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  backdropColor: { backgroundColor: colors.overlay },
  sheet: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    maxHeight: '88%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  title: { paddingHorizontal: layout.screenPadding, marginBottom: spacing.sm },
  scroll: { flexGrow: 0 },
  content: { paddingHorizontal: layout.screenPadding, gap: spacing.md, paddingBottom: spacing.md },
  footer: { paddingHorizontal: layout.screenPadding, gap: spacing.sm, paddingTop: spacing.sm },
});

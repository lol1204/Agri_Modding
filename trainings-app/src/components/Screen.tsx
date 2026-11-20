import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, spacing, touch } from '@/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';

type ScreenProps = {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  /** Rechts neben dem Titel (z. B. ein Icon-Button). */
  headerRight?: ReactNode;
  /** Zeigt einen Zurück-Pfeil. */
  onBack?: () => void;
  /** Fester Bereich unten (z. B. Hauptbutton). */
  footer?: ReactNode;
  scroll?: boolean;
  /** Screens in den Tabs: Abstand unten übernimmt die Tab-Leiste. */
  inTabs?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Scrollen vorübergehend sperren (z. B. während Drag & Drop). */
  scrollEnabled?: boolean;
  testID?: string;
};

/**
 * Grundgerüst jedes Screens: dunkler Hintergrund, Safe-Area (Notch, Home-Balken),
 * großer Titel, zentrierter Inhalt mit maximaler Breite.
 */
export function Screen({
  title,
  subtitle,
  children,
  headerRight,
  onBack,
  footer,
  scroll = true,
  inTabs = false,
  contentStyle,
  scrollEnabled = true,
  testID,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = inTabs ? spacing.xl : insets.bottom + spacing.xl;

  const header =
    title || onBack || headerRight ? (
      <View style={styles.header}>
        {onBack ? (
          <PressableScale
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Zurück"
            style={styles.backButton}
            hitSlop={touch.hitSlop}
          >
            <Icon name="chevronLeft" size={26} />
          </PressableScale>
        ) : null}
        <View style={styles.titleWrap}>
          {title ? (
            <AppText variant={onBack ? 'heading' : 'title'} numberOfLines={2} accessibilityRole="header">
              {title}
            </AppText>
          ) : null}
          {subtitle ? (
            <AppText variant="small" color="textMuted">
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {headerRight}
      </View>
    ) : null;

  const inner = (
    <View style={[styles.content, contentStyle]}>
      {header}
      {children}
    </View>
  );

  return (
    <View style={styles.root} testID={testID}>
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: footer ? spacing.lg : bottomPad }}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={scrollEnabled}
          showsVerticalScrollIndicator={false}
        >
          {inner}
        </ScrollView>
      ) : (
        <View style={[styles.flex, { paddingTop: insets.top + spacing.md, paddingBottom: footer ? 0 : bottomPad }]}>
          {inner}
        </View>
      )}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: (inTabs ? 0 : insets.bottom) + spacing.md }]}>
          <View style={styles.footerInner}>{footer}</View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.screenPadding,
    gap: spacing.lg,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touch.minTarget,
    marginBottom: spacing.xs,
  },
  backButton: {
    width: touch.minTarget,
    height: touch.minTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.md,
  },
  titleWrap: { flex: 1 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.background,
    paddingTop: spacing.md,
    paddingHorizontal: layout.screenPadding,
  },
  footerInner: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    gap: spacing.sm,
  },
});

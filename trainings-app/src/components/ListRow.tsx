import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing, touch, type ColorName } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

type ListRowProps = {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: IconName;
  iconColor?: ColorName;
  onPress?: () => void;
  right?: ReactNode;
  destructive?: boolean;
  testID?: string;
};

/** Zeile in Einstellungs-Listen. */
export function ListRow({ title, subtitle, value, icon, iconColor, onPress, right, destructive, testID }: ListRowProps) {
  const content = (
    <>
      {icon ? <Icon name={icon} size={22} color={destructive ? 'danger' : (iconColor ?? 'textMuted')} /> : null}
      <View style={styles.texts}>
        <AppText variant="bodyStrong" color={destructive ? 'danger' : 'text'}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="small" color="textMuted">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="body" color="textMuted" numberOfLines={1}>
          {value}
        </AppText>
      ) : null}
      {right}
      {onPress && !right ? <Icon name="chevronRight" size={20} color="textFaint" /> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      testID={testID}
      style={styles.row}
      pressedStyle={styles.pressed}
      scaleTo={0.99}
    >
      {content}
    </PressableScale>
  );
}

/** Überschrift über einer Gruppe von Karten. */
export function SectionTitle({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="caption" color="textMuted" style={styles.sectionText}>
        {children.toUpperCase()}
      </AppText>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: touch.largeTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: 12,
  },
  pressed: { backgroundColor: colors.surfacePressed },
  texts: { flex: 1, gap: spacing.xxs },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: -spacing.sm,
    minHeight: 24,
  },
  sectionText: { letterSpacing: 1 },
});

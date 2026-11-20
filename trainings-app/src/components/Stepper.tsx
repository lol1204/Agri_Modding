import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { colors, inputFontSize, radii, spacing, touch, typography } from '@/theme';
import { formatNumber, parseDecimal } from '@/engine/units';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';

type StepperProps = {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  /** Einheit/Beschriftung unter der Zahl, z. B. „kg“ oder „Wdh.“ */
  label?: string;
  /** Große Darstellung für das Live-Training. */
  size?: 'md' | 'lg';
  decimals?: number;
  testID?: string;
  /** Eigene Schritte statt fester Schrittweite (z. B. nächstes machbares Gewicht). */
  nextUp?: (value: number) => number;
  nextDown?: (value: number) => number;
};

/**
 * Zahl mit − / + Buttons. Antippen der Zahl öffnet die Tastatur
 * zum direkten Eintippen.
 */
export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  label,
  size = 'md',
  decimals = 2,
  testID,
  nextUp,
  nextDown,
}: StepperProps) {
  const [text, setText] = useState(formatNumber(value, decimals));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setText(formatNumber(value, decimals));
  }, [value, editing, decimals]);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const down = () => onChange(clamp(nextDown ? nextDown(value) : value - step));
  const up = () => onChange(clamp(nextUp ? nextUp(value) : value + step));

  const commit = () => {
    setEditing(false);
    const parsed = parseDecimal(text);
    if (parsed === null) {
      setText(formatNumber(value, decimals));
      return;
    }
    onChange(clamp(parsed));
  };

  const big = size === 'lg';
  const btnSize = big ? touch.largeTarget + 8 : touch.minTarget;

  return (
    <View style={styles.wrap} testID={testID}>
      <PressableScale
        onPress={down}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? 'Wert'} verringern`}
        style={[styles.btn, { width: btnSize, height: btnSize }]}
        pressedStyle={styles.btnPressed}
        testID={testID ? `${testID}-minus` : undefined}
      >
        <Icon name="minus" size={big ? 26 : 20} />
      </PressableScale>
      <View style={styles.center}>
        <TextInput
          value={text}
          onFocus={() => setEditing(true)}
          onChangeText={setText}
          onBlur={commit}
          onSubmitEditing={commit}
          keyboardType="decimal-pad"
          inputMode="decimal"
          selectTextOnFocus
          selectionColor={colors.accent}
          accessibilityLabel={label}
          testID={testID ? `${testID}-input` : undefined}
          style={[styles.input, big ? styles.inputLg : styles.inputMd]}
        />
        {label ? (
          <AppText variant="caption" color="textMuted" align="center">
            {label}
          </AppText>
        ) : null}
      </View>
      <PressableScale
        onPress={up}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? 'Wert'} erhöhen`}
        style={[styles.btn, { width: btnSize, height: btnSize }]}
        pressedStyle={styles.btnPressed}
        testID={testID ? `${testID}-plus` : undefined}
      >
        <Icon name="plus" size={big ? 26 : 20} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  btn: {
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: { backgroundColor: colors.surfacePressed },
  center: { flex: 1, alignItems: 'center', minWidth: 64 },
  input: {
    color: colors.text,
    textAlign: 'center',
    width: '100%',
    padding: 0,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  inputMd: { fontSize: Math.max(inputFontSize, 22), minHeight: touch.minTarget - 8 },
  inputLg: { fontSize: typography.display.fontSize, minHeight: typography.display.lineHeight },
});

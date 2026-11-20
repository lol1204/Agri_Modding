import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, inputFontSize, radii, spacing, touch } from '@/theme';
import { AppText } from './AppText';

type TextFieldProps = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string | null;
};

/** Eingabefeld mit mind. 17 px Schrift (kein Auto-Zoom in iOS Safari). */
export function TextField({ label, hint, error, style, multiline, ...rest }: TextFieldProps) {
  return (
    <View style={styles.wrap}>
      {label ? (
        <AppText variant="label" color="textMuted">
          {label}
        </AppText>
      ) : null}
      <TextInput
        placeholderTextColor={colors.textFaint}
        selectionColor={colors.accent}
        multiline={multiline}
        accessibilityLabel={label}
        {...rest}
        style={[styles.input, multiline && styles.multiline, error ? styles.inputError : null, style]}
      />
      {error ? (
        <AppText variant="small" color="danger">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="small" color="textFaint">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  input: {
    minHeight: touch.largeTarget,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    color: colors.text,
    fontSize: inputFontSize,
  },
  multiline: {
    minHeight: 96,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    textAlignVertical: 'top',
  },
  inputError: { borderColor: colors.danger },
});

import { Text, type TextProps, type TextStyle } from 'react-native';
import { colors, typography, type ColorName, type TextVariant } from '@/theme';

export type AppTextProps = TextProps & {
  variant?: TextVariant;
  color?: ColorName;
  align?: TextStyle['textAlign'];
  /** Gleich breite Ziffern erzwingen (für Zahlen in Fließtext). */
  tabular?: boolean;
};

/** Text mit den Stilen aus dem Theme. */
export function AppText({
  variant = 'body',
  color = 'text',
  align,
  tabular,
  style,
  ...rest
}: AppTextProps) {
  return (
    <Text
      {...rest}
      style={[
        typography[variant],
        { color: colors[color] },
        align ? { textAlign: align } : null,
        tabular ? { fontVariant: ['tabular-nums'] } : null,
        style,
      ]}
    />
  );
}

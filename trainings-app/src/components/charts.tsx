import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { colors, motion, radii, spacing, type ColorName } from '@/theme';
import { AppText } from './AppText';

const useNativeDriver = Platform.OS !== 'web';

/** Fortschritt 0 → 1 über `duration` ms (für Diagramm-Animationen). */
function useAnimatedProgress(deps: unknown[], duration: number = motion.slow): number {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setP(1 - Math.pow(1 - t, 3)); // sanftes Abbremsen
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    setP(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return p;
}

// ---------- Balkendiagramm (z. B. Wochenvolumen) ----------

export type Bar = { label: string; value: number; secondary?: number; highlight?: boolean };

type BarChartProps = {
  bars: Bar[];
  height?: number;
  color?: ColorName;
  secondaryColor?: ColorName;
  formatValue?: (v: number) => string;
};

/** Animierte Säulen; `secondary` wird oben aufgesetzt (z. B. Dropsatz-Volumen). */
export function BarChart({ bars, height = 120, color = 'accent', secondaryColor = 'setDrop', formatValue }: BarChartProps) {
  const max = Math.max(1, ...bars.map((b) => b.value + (b.secondary ?? 0)));
  const grow = useRef(new Animated.Value(0)).current;
  const key = bars.map((b) => b.value).join(',');
  useEffect(() => {
    grow.setValue(0);
    Animated.timing(grow, { toValue: 1, duration: motion.slow, useNativeDriver: false }).start();
  }, [key, grow]);

  return (
    <View>
      <View style={[styles.bars, { height }]}>
        {bars.map((b, i) => {
          const h = ((b.value + (b.secondary ?? 0)) / max) * (height - 18);
          const secH = ((b.secondary ?? 0) / max) * (height - 18);
          return (
            <View key={i} style={styles.barCol} accessibilityLabel={`${b.label}: ${formatValue ? formatValue(b.value) : b.value}`}>
              {b.highlight && formatValue ? (
                <AppText variant="caption" color="textMuted" numberOfLines={1}>
                  {formatValue(b.value + (b.secondary ?? 0))}
                </AppText>
              ) : null}
              <Animated.View
                style={[
                  styles.bar,
                  {
                    height: grow.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(b.value > 0 ? 3 : 0, h)] }),
                    backgroundColor: b.highlight ? colors[color] : colors.accentSoft,
                  },
                ]}
              >
                {secH > 0 ? <View style={{ height: secH, backgroundColor: colors[secondaryColor], borderTopLeftRadius: radii.sm, borderTopRightRadius: radii.sm }} /> : null}
              </Animated.View>
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {bars.map((b, i) => (
          <AppText key={i} variant="caption" color={b.highlight ? 'text' : 'textFaint'} style={styles.barLabel} numberOfLines={1}>
            {b.label}
          </AppText>
        ))}
      </View>
    </View>
  );
}

// ---------- Liniendiagramm (z. B. 1RM-Verlauf) ----------

type LineChartProps = {
  values: number[];
  width: number;
  height?: number;
  color?: ColorName;
  formatValue?: (v: number) => string;
};

/** Linie, die sich beim Erscheinen von links nach rechts zeichnet. */
export function LineChart({ values, width, height = 140, color = 'accent', formatValue }: LineChartProps) {
  const progress = useAnimatedProgress([values.join(','), width]);
  if (values.length === 0 || width <= 0) return <View style={{ height }} />;
  const pad = 10;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => ({
    x: values.length === 1 ? width / 2 : pad + (i / (values.length - 1)) * (width - pad * 2),
    y: pad + (1 - (v - min) / span) * (height - pad * 2 - 16),
  }));
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  let length = 0;
  for (let i = 1; i < pts.length; i++) length += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
  const last = pts[pts.length - 1]!;
  return (
    <View>
      <Svg width={width} height={height}>
        <Line x1={0} x2={width} y1={height - 16} y2={height - 16} stroke={colors.divider} strokeWidth={1} />
        <Path
          d={d}
          stroke={colors[color]}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={length > 0 ? `${length} ${length}` : undefined}
          strokeDashoffset={length > 0 ? length * (1 - progress) : undefined}
        />
        {progress > 0.98 ? <Circle cx={last.x} cy={last.y} r={5} fill={colors[color]} /> : null}
      </Svg>
      {formatValue ? (
        <View style={styles.lineLegend}>
          <AppText variant="caption" color="textFaint">
            {formatValue(min)}
          </AppText>
          <AppText variant="caption" color="textMuted">
            {formatValue(max)}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

// ---------- Horizontale Balken mit Zielbereich (Sätze pro Muskelgruppe) ----------

type RangeBarProps = {
  label: string;
  value: number;
  targetMin: number;
  targetMax: number;
  scaleMax: number;
};

export function RangeBar({ label, value, targetMin, targetMax, scaleMax }: RangeBarProps) {
  const grow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    grow.setValue(0);
    Animated.timing(grow, { toValue: 1, duration: motion.slow, useNativeDriver }).start();
  }, [value, grow]);
  const pct = Math.min(1, value / scaleMax);
  const inRange = value >= targetMin && value <= targetMax;
  const fill: ColorName = inRange ? 'accent' : value > targetMax ? 'warning' : 'info';
  return (
    <View style={styles.rangeRow} accessibilityLabel={`${label}: ${value} harte Sätze`}>
      <AppText variant="small" style={styles.rangeLabel} numberOfLines={1}>
        {label}
      </AppText>
      <View style={styles.rangeTrack}>
        <View
          style={[
            styles.rangeTarget,
            { left: `${(targetMin / scaleMax) * 100}%`, width: `${((targetMax - targetMin) / scaleMax) * 100}%` },
          ]}
        />
        <Animated.View
          style={[
            styles.rangeFill,
            { width: `${pct * 100}%`, backgroundColor: colors[fill], transform: [{ scaleX: grow }] },
          ]}
        />
      </View>
      <AppText variant="label" tabular style={styles.rangeValue}>
        {value.toLocaleString('de-DE', { maximumFractionDigits: 1 })}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: spacing.xxs },
  bar: { width: '100%', borderRadius: radii.sm, overflow: 'hidden', justifyContent: 'flex-start' },
  labels: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  barLabel: { flex: 1, textAlign: 'center' },
  lineLegend: { flexDirection: 'row', justifyContent: 'space-between' },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 28 },
  rangeLabel: { width: 84 },
  rangeTrack: {
    flex: 1,
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  rangeTarget: { position: 'absolute', top: 0, bottom: 0, backgroundColor: colors.accentFaint, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.accentSoft },
  rangeFill: { height: '100%', borderRadius: radii.pill, transformOrigin: 'left' },
  rangeValue: { width: 36, textAlign: 'right' },
});

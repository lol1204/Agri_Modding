import { useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, View, type PanResponderInstance, type ViewStyle } from 'react-native';
import { colors, radii, touch } from '@/theme';
import { Icon } from './Icon';

type Layout = { y: number; height: number };

type ReorderListProps<T> = {
  items: T[];
  keyOf: (item: T) => string;
  /** `handle` ist der Griff zum Ziehen – irgendwo im Eintrag platzieren. */
  renderItem: (item: T, index: number, handle: ReactNode) => ReactNode;
  /** Inhalt zwischen Eintrag i und i+1 (z. B. Supersatz-Verbindung). */
  renderBetween?: (index: number) => ReactNode;
  onMove: (from: number, to: number) => void;
  /** Während des Ziehens z. B. das Scrollen sperren. */
  onDragStateChange?: (dragging: boolean) => void;
};

// Im Browser: Ziehen am Griff darf die Seite nicht scrollen.
const webHandleStyle = Platform.select({
  web: { touchAction: 'none', cursor: 'grab', userSelect: 'none' } as unknown as ViewStyle,
  default: {},
});

/**
 * Liste mit Drag & Drop: Griff festhalten und an die neue Position ziehen.
 * Eine Linie zeigt, wo der Eintrag landet.
 */
export function ReorderList<T>({ items, keyOf, renderItem, renderBetween, onMove, onDragStateChange }: ReorderListProps<T>) {
  const layouts = useRef<Layout[]>([]);
  const dy = useRef(new Animated.Value(0)).current;
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const responders = useRef(new Map<number, PanResponderInstance>());
  const state = useRef({ from: -1, to: -1 });
  const latest = useRef({ onMove, onDragStateChange, count: items.length });
  latest.current = { onMove, onDragStateChange, count: items.length };

  const computeTarget = (from: number, offset: number): number => {
    const l = layouts.current[from];
    if (!l) return from;
    const center = l.y + l.height / 2 + offset;
    let target = from;
    for (let i = 0; i < latest.current.count; i++) {
      const li = layouts.current[i];
      if (!li) continue;
      if (center >= li.y && center < li.y + li.height) target = i;
    }
    const first = layouts.current[0];
    const last = layouts.current[latest.current.count - 1];
    if (first && center < first.y) target = 0;
    if (last && center >= last.y + last.height) target = latest.current.count - 1;
    return target;
  };

  const getResponder = (index: number): PanResponderInstance => {
    const existing = responders.current.get(index);
    if (existing) return existing;
    const responder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        state.current = { from: index, to: index };
        dy.setValue(0);
        setDragIndex(index);
        setTargetIndex(index);
        latest.current.onDragStateChange?.(true);
      },
      onPanResponderMove: (_e, g) => {
        dy.setValue(g.dy);
        const to = computeTarget(state.current.from, g.dy);
        if (to !== state.current.to) {
          state.current.to = to;
          setTargetIndex(to);
        }
      },
      onPanResponderRelease: () => finish(true),
      onPanResponderTerminate: () => finish(false),
    });
    responders.current.set(index, responder);
    return responder;
  };

  const finish = (commit: boolean) => {
    const { from, to } = state.current;
    dy.setValue(0);
    setDragIndex(null);
    setTargetIndex(null);
    latest.current.onDragStateChange?.(false);
    if (commit && from >= 0 && to >= 0 && from !== to) latest.current.onMove(from, to);
    state.current = { from: -1, to: -1 };
  };

  return (
    <View>
      {items.map((item, index) => {
        const dragging = dragIndex === index;
        const showLineBefore = dragIndex !== null && targetIndex === index && targetIndex < dragIndex;
        const showLineAfter = dragIndex !== null && targetIndex === index && targetIndex > dragIndex;
        const handle = (
          <View
            {...getResponder(index).panHandlers}
            style={[styles.handle, webHandleStyle]}
            accessibilityLabel="Zum Verschieben ziehen"
            accessibilityRole="adjustable"
          >
            <Icon name="grip" size={20} color={dragging ? 'accent' : 'textFaint'} />
          </View>
        );
        return (
          <View
            key={keyOf(item)}
            onLayout={(e) => {
              layouts.current[index] = { y: e.nativeEvent.layout.y, height: e.nativeEvent.layout.height };
            }}
          >
            {showLineBefore ? <View style={styles.line} /> : null}
            <Animated.View
              style={
                dragging
                  ? [styles.dragging, { transform: [{ translateY: dy }] }]
                  : undefined
              }
            >
              {renderItem(item, index, handle)}
            </Animated.View>
            {showLineAfter ? <View style={styles.line} /> : null}
            {renderBetween && index < items.length - 1 ? renderBetween(index) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  handle: {
    width: touch.minTarget,
    height: touch.minTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragging: {
    zIndex: 10,
    opacity: 0.92,
    shadowColor: colors.background,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  line: {
    height: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    marginVertical: 2,
  },
});

import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { spacing, touch } from '@/theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Sheet } from './Sheet';

/** Erklärungen für Fachbegriffe – per Tap abrufbar. */
export const glossary: Record<string, { title: string; text: string }> = {
  rir: {
    title: 'RIR – Wiederholungen in Reserve',
    text:
      'Wie viele saubere Wiederholungen wären noch gegangen? 0 = nichts mehr drin, 2 = zwei hättest du noch geschafft. ' +
      'Für Muskelaufbau sind 1–2 meist ideal. Am Anfang ist das Schätzen ungewohnt – das wird schnell besser.',
  },
  dropsatz: {
    title: 'Dropsatz',
    text:
      'Direkt nach dem letzten Satz das Gewicht um etwa 20–30 % senken und ohne Pause weitermachen. ' +
      'Am besten bei Maschinen und Isolationsübungen, nicht bei schweren Grundübungen.',
  },
  e1rm: {
    title: 'Geschätztes 1RM',
    text:
      'Das Gewicht, das du für genau eine Wiederholung schaffen würdest – geschätzt aus Gewicht und Wiederholungen. ' +
      'Damit lassen sich Sätze mit unterschiedlichen Wiederholungen vergleichen.',
  },
  supersatz: {
    title: 'Supersatz',
    text: 'Zwei Übungen im Wechsel ohne Pause dazwischen, Pause erst nach der Runde. Spart Zeit.',
  },
  hartesatz: {
    title: 'Harte Sätze',
    text:
      'Arbeitssätze nahe am Muskelversagen (etwa 0–3 RIR). Für Muskelaufbau gelten 10–20 harte Sätze pro Muskelgruppe und Woche als guter Richtwert.',
  },
  tastsatz: {
    title: 'Tastsatz',
    text:
      'Bei einer neuen Übung startest du mit einem Gewicht, das sich eher leicht anfühlt. Danach passt der Assistent das Gewicht Satz für Satz an.',
  },
};

type InfoTermProps = { term: keyof typeof glossary; label?: string };

/** Kleiner „?“-Button neben einem Fachbegriff. */
export function InfoTerm({ term, label }: InfoTermProps) {
  const [open, setOpen] = useState(false);
  const entry = glossary[term];
  if (!entry) return null;
  return (
    <>
      <PressableScale
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Erklärung: ${entry.title}`}
        style={styles.btn}
        hitSlop={touch.hitSlop}
      >
        {label ? (
          <AppText variant="label" color="info">
            {label}
          </AppText>
        ) : null}
        <Icon name="info" size={18} color="info" />
      </PressableScale>
      <Sheet visible={open} onClose={() => setOpen(false)} title={entry.title} footer={<Button title="Verstanden" onPress={() => setOpen(false)} />}>
        <AppText color="textMuted">{entry.text}</AppText>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 32,
    minWidth: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    justifyContent: 'center',
  },
});

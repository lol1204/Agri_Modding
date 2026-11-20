import type { Equipment, Exercise, Plan, PlanExercise, SplitType } from '@/domain/types';
import { findAlternatives, isEquipmentAvailable } from './exercises';
import { createId } from './ids';

/** Kurzform für Vorlagen: [Übungs-ID, Sätze, Wdh. min, Wdh. max, Supersatz-Gruppe?] */
type T = [string, number, number, number, string?];

export interface PlanTemplate {
  id: string;
  name: string;
  split: SplitType;
  daysPerWeek: string;
  description: string;
  location: 'gym' | 'zuhause';
  days: { name: string; exercises: T[] }[];
}

export const planTemplates: PlanTemplate[] = [
  {
    id: 'ganzkoerper',
    name: 'Ganzkörper A/B',
    split: 'ganzkoerper',
    daysPerWeek: '2–3 Tage',
    description: 'Jede Einheit trainiert den ganzen Körper. Ideal bei 2–3 Trainings pro Woche.',
    location: 'gym',
    days: [
      {
        name: 'Ganzkörper A',
        exercises: [
          ['kniebeuge-lh', 3, 6, 8],
          ['bankdruecken-lh', 3, 6, 10],
          ['rudern-lh', 3, 8, 10],
          ['rumaenisches-kreuzheben-kh', 2, 8, 12],
          ['seitheben-kh', 2, 12, 20],
          ['bizepscurl-kh', 2, 10, 12, 'arme'],
          ['trizepsdruecken-kabel', 2, 10, 15, 'arme'],
        ],
      },
      {
        name: 'Ganzkörper B',
        exercises: [
          ['beinpresse', 3, 8, 12],
          ['schulterdruecken-kh', 3, 8, 12],
          ['latziehen', 3, 8, 12],
          ['hip-thrust', 2, 8, 12],
          ['schraegbank-kh', 2, 8, 12],
          ['face-pulls', 2, 12, 20],
          ['kabelcrunch', 2, 10, 15],
        ],
      },
    ],
  },
  {
    id: 'upper-lower',
    name: 'Upper/Lower',
    split: 'upper_lower',
    daysPerWeek: '4 Tage',
    description: 'Oberkörper und Beine im Wechsel – jede Muskelgruppe zweimal pro Woche.',
    location: 'gym',
    days: [
      {
        name: 'Oberkörper A',
        exercises: [
          ['bankdruecken-lh', 3, 6, 10],
          ['rudern-lh', 3, 6, 10],
          ['schulterdruecken-kh', 3, 8, 12],
          ['latziehen', 3, 8, 12],
          ['seitheben-kh', 2, 12, 20],
          ['sz-curls', 2, 8, 12, 'arme'],
          ['french-press', 2, 8, 12, 'arme'],
        ],
      },
      {
        name: 'Unterkörper A',
        exercises: [
          ['kniebeuge-lh', 3, 5, 8],
          ['rumaenisches-kreuzheben', 3, 6, 10],
          ['beinpresse', 2, 10, 12],
          ['beinbeuger-sitzend', 3, 10, 15],
          ['wadenheben-stehend', 3, 10, 15],
          ['beinheben-haengend', 2, 8, 15],
        ],
      },
      {
        name: 'Oberkörper B',
        exercises: [
          ['schraegbank-kh', 3, 8, 12],
          ['klimmzug', 3, 5, 10],
          ['kabelrudern', 3, 8, 12],
          ['dips', 2, 6, 12],
          ['face-pulls', 2, 12, 20],
          ['hammercurls', 2, 8, 12, 'arme'],
          ['trizeps-ueberkopf-kabel', 2, 10, 15, 'arme'],
        ],
      },
      {
        name: 'Unterkörper B',
        exercises: [
          ['kreuzheben', 3, 4, 6],
          ['bulgarische-kniebeuge', 3, 8, 12],
          ['beinstrecker', 3, 10, 15],
          ['beinbeuger-liegend', 3, 10, 15],
          ['wadenheben-sitzend', 3, 12, 20],
          ['kabelcrunch', 2, 10, 15],
        ],
      },
    ],
  },
  {
    id: 'ppl',
    name: 'Push/Pull/Legs',
    split: 'ppl',
    daysPerWeek: '3 oder 6 Tage',
    description: 'Drücken, Ziehen, Beine. Bei 6 Tagen läuft die Runde zweimal pro Woche.',
    location: 'gym',
    days: [
      {
        name: 'Push',
        exercises: [
          ['bankdruecken-lh', 3, 6, 10],
          ['schulterdruecken-kh', 3, 8, 12],
          ['schraegbank-kh', 2, 8, 12],
          ['seitheben-kh', 3, 12, 20],
          ['butterfly', 2, 10, 15],
          ['trizepsdruecken-kabel', 3, 10, 15],
        ],
      },
      {
        name: 'Pull',
        exercises: [
          ['klimmzug', 3, 5, 10],
          ['rudern-lh', 3, 6, 10],
          ['latziehen-eng', 2, 8, 12],
          ['face-pulls', 3, 12, 20],
          ['sz-curls', 3, 8, 12],
          ['hammercurls', 2, 8, 12],
        ],
      },
      {
        name: 'Legs',
        exercises: [
          ['kniebeuge-lh', 3, 5, 8],
          ['rumaenisches-kreuzheben', 3, 6, 10],
          ['beinpresse', 2, 10, 12],
          ['beinbeuger-liegend', 3, 10, 15],
          ['wadenheben-stehend', 3, 10, 15],
          ['kabelcrunch', 2, 10, 15],
        ],
      },
    ],
  },
  {
    id: 'gym-abc',
    name: 'Gym A/B/C',
    split: 'abc',
    daysPerWeek: '3 Tage',
    description: 'A: Brust & Rücken · B: Beine & Bauch · C: Schultern & Arme.',
    location: 'gym',
    days: [
      {
        name: 'A – Brust & Rücken',
        exercises: [
          ['bankdruecken-lh', 4, 6, 10],
          ['latziehen', 3, 8, 12],
          ['schraegbank-kh', 3, 8, 12],
          ['kabelrudern', 3, 8, 12],
          ['butterfly', 2, 10, 15, 'ab'],
          ['reverse-butterfly', 2, 12, 20, 'ab'],
        ],
      },
      {
        name: 'B – Beine & Bauch',
        exercises: [
          ['kniebeuge-lh', 4, 5, 8],
          ['rumaenisches-kreuzheben', 3, 6, 10],
          ['beinpresse', 3, 8, 12],
          ['beinbeuger-sitzend', 3, 10, 15],
          ['wadenheben-stehend', 3, 10, 15],
          ['kabelcrunch', 3, 10, 15],
        ],
      },
      {
        name: 'C – Schultern & Arme',
        exercises: [
          ['schulterdruecken-lh', 3, 5, 8],
          ['seitheben-kh', 4, 12, 20],
          ['face-pulls', 3, 12, 20],
          ['sz-curls', 3, 8, 12, 'arme'],
          ['french-press', 3, 8, 12, 'arme'],
          ['hammercurls', 2, 8, 12],
        ],
      },
    ],
  },
  {
    id: 'calisthenics',
    name: 'Calisthenics zuhause',
    split: 'calisthenics',
    daysPerWeek: '2–4 Tage',
    description: 'Nur Körpergewicht, Klimmzugstange und Dipbarren/Ringe. Mit leichteren und schwereren Varianten.',
    location: 'zuhause',
    days: [
      {
        name: 'Calisthenics A',
        exercises: [
          ['klimmzug', 3, 5, 10],
          ['liegestuetz', 3, 8, 20],
          ['bulgarische-kniebeuge-kg', 3, 8, 15],
          ['pike-liegestuetz', 3, 6, 12],
          ['knieheben-haengend', 3, 10, 15],
        ],
      },
      {
        name: 'Calisthenics B',
        exercises: [
          ['dips', 3, 6, 12],
          ['rudern-koerper', 3, 8, 15],
          ['kniebeuge-kg', 3, 15, 25],
          ['chin-up', 2, 5, 10],
          ['nordic-curls', 2, 3, 8],
          ['ab-roller', 2, 6, 12],
        ],
      },
    ],
  },
];

export interface TemplateResult {
  plan: Plan;
  /** Übungen, die wegen fehlendem Equipment ersetzt wurden. */
  swaps: { from: string; to: string }[];
}

/**
 * Plan aus Vorlage erzeugen. Fehlt Equipment, wird die beste gleichwertige
 * Übung eingesetzt (falls vorhanden).
 */
export function planFromTemplate(
  template: PlanTemplate,
  catalog: Map<string, Exercise>,
  available: Equipment[] | null,
  idFactory: () => string = createId,
  now = Date.now(),
): TemplateResult {
  const all = [...catalog.values()];
  const swaps: TemplateResult['swaps'] = [];
  const days = template.days.map((day) => {
    const groupIds = new Map<string, string>();
    const exercises: PlanExercise[] = [];
    for (const [exerciseId, sets, repMin, repMax, group] of day.exercises) {
      let exercise = catalog.get(exerciseId);
      if (!exercise || sets <= 0) continue;
      if (available && !isEquipmentAvailable(exercise, available)) {
        const alt = findAlternatives(exercise, all, available, 1)[0];
        if (!alt) continue;
        swaps.push({ from: exercise.id, to: alt.id });
        exercise = alt;
      }
      let supersetGroup: string | null = null;
      if (group) {
        if (!groupIds.has(group)) groupIds.set(group, idFactory());
        supersetGroup = groupIds.get(group) ?? null;
      }
      exercises.push({ id: idFactory(), exerciseId: exercise.id, sets, repMin, repMax, restSec: null, supersetGroup });
    }
    return { id: idFactory(), name: day.name, exercises };
  });
  return {
    plan: {
      id: idFactory(),
      name: template.name,
      split: template.split,
      days,
      templateId: template.id,
      createdAt: now,
      updatedAt: now,
    },
    swaps,
  };
}

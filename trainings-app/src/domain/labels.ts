import type { Equipment, ExerciseCategory, Goal, Level, MuscleGroup, SetType, SplitType } from './types';

/** Deutsche Anzeigenamen. */
export const muscleLabels: Record<MuscleGroup, string> = {
  brust: 'Brust',
  lat: 'Latissimus',
  oberer_ruecken: 'Oberer Rücken',
  unterer_ruecken: 'Unterer Rücken',
  schulter_vorne: 'Vordere Schulter',
  schulter_seite: 'Seitliche Schulter',
  schulter_hinten: 'Hintere Schulter',
  bizeps: 'Bizeps',
  trizeps: 'Trizeps',
  unterarme: 'Unterarme',
  bauch: 'Bauch',
  quadrizeps: 'Beinstrecker (Quadrizeps)',
  beinbeuger: 'Beinbeuger',
  gesaess: 'Gesäß',
  waden: 'Waden',
};

/** Grobe Muskelgruppen für Filter und Volumen-Übersicht. */
export const muscleRegions: { id: string; label: string; muscles: MuscleGroup[] }[] = [
  { id: 'brust', label: 'Brust', muscles: ['brust'] },
  { id: 'ruecken', label: 'Rücken', muscles: ['lat', 'oberer_ruecken', 'unterer_ruecken'] },
  { id: 'schultern', label: 'Schultern', muscles: ['schulter_vorne', 'schulter_seite', 'schulter_hinten'] },
  { id: 'arme', label: 'Arme', muscles: ['bizeps', 'trizeps', 'unterarme'] },
  { id: 'beine', label: 'Beine', muscles: ['quadrizeps', 'beinbeuger', 'gesaess', 'waden'] },
  { id: 'bauch', label: 'Bauch', muscles: ['bauch'] },
];

export const equipmentLabels: Record<Equipment, string> = {
  langhantel: 'Langhantel',
  sz_stange: 'SZ-Stange',
  kurzhantel: 'Kurzhanteln',
  kettlebell: 'Kettlebell',
  maschine: 'Maschine',
  kabelzug: 'Kabelzug',
  koerpergewicht: 'Körpergewicht',
  klimmzugstange: 'Klimmzugstange',
  dipbarren: 'Dipbarren',
  ringe: 'Ringe',
  widerstandsband: 'Widerstandsband',
};

export const categoryLabels: Record<ExerciseCategory, string> = {
  grund: 'Grundübung',
  isolation: 'Isolationsübung',
};

export const difficultyLabels: Record<1 | 2 | 3, string> = {
  1: 'Leicht',
  2: 'Mittel',
  3: 'Schwer',
};

export const goalLabels: Record<Goal, string> = {
  muskelaufbau: 'Muskelaufbau',
  kraft: 'Kraft',
  fitness: 'Fit bleiben',
};

export const levelLabels: Record<Level, string> = {
  einsteiger: 'Einsteiger',
  fortgeschritten: 'Fortgeschritten',
  erfahren: 'Erfahren',
};

export const setTypeLabels: Record<SetType, string> = {
  warmup: 'Aufwärmen',
  work: 'Arbeitssatz',
  drop: 'Dropsatz',
  failure: 'Bis zum Versagen',
};

export const setTypeShort: Record<SetType, string> = {
  warmup: 'A',
  work: '',
  drop: 'D',
  failure: 'V',
};

export const splitLabels: Record<SplitType, string> = {
  ganzkoerper: 'Ganzkörper',
  upper_lower: 'Upper/Lower',
  ppl: 'Push/Pull/Legs',
  abc: 'Gym A/B/C',
  calisthenics: 'Calisthenics',
  eigener: 'Eigener Plan',
};

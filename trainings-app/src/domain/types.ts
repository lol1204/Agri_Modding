/**
 * Datenmodell der App (Typen ohne Logik).
 * Gewichte werden IMMER in kg gespeichert, Zeitpunkte als Millisekunden (Date.now()),
 * Kalendertage als 'YYYY-MM-DD' (lokale Zeit).
 */

// ---------- Übungen ----------

export type MuscleGroup =
  | 'brust'
  | 'lat'
  | 'oberer_ruecken'
  | 'unterer_ruecken'
  | 'schulter_vorne'
  | 'schulter_seite'
  | 'schulter_hinten'
  | 'bizeps'
  | 'trizeps'
  | 'unterarme'
  | 'bauch'
  | 'quadrizeps'
  | 'beinbeuger'
  | 'gesaess'
  | 'waden';

export type Equipment =
  | 'langhantel'
  | 'sz_stange'
  | 'kurzhantel'
  | 'kettlebell'
  | 'maschine'
  | 'kabelzug'
  | 'koerpergewicht'
  | 'klimmzugstange'
  | 'dipbarren'
  | 'ringe'
  | 'widerstandsband';

/** Grundübung (mehrgelenkig) oder Isolationsübung (eingelenkig). */
export type ExerciseCategory = 'grund' | 'isolation';

export type MovementPattern =
  | 'horizontal_druecken'
  | 'vertikal_druecken'
  | 'horizontal_ziehen'
  | 'vertikal_ziehen'
  | 'kniebeuge'
  | 'hueftstreckung'
  | 'ausfallschritt'
  | 'beinstrecken'
  | 'beinbeugen'
  | 'wade'
  | 'brust_isolation'
  | 'seitheben'
  | 'hintere_schulter'
  | 'bizeps'
  | 'trizeps'
  | 'bauch'
  | 'unterarm';

export type Difficulty = 1 | 2 | 3;

export interface Exercise {
  id: string;
  name: string;
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  equipment: Equipment;
  category: ExerciseCategory;
  /** Körpergewicht ist die Basis; eingetragenes Gewicht = Zusatzgewicht. */
  bodyweight: boolean;
  difficulty: Difficulty;
  pattern: MovementPattern;
  /** Standard-Wiederholungsbereich [min, max]. */
  repRange: [number, number];
  tips: string[];
  /** Calisthenics: Progressionskette (z. B. „liegestuetz“) und Stufe (1 = leichteste). */
  progression?: { chain: string; level: number } | null;
  /** Eine Seite nach der anderen (z. B. einarmiges Rudern). */
  unilateral?: boolean;
  /** Vom Nutzer angelegt. */
  custom?: boolean;
  createdAt?: number;
}

// ---------- Profil ----------

export type Goal = 'muskelaufbau' | 'kraft' | 'fitness';
export type Level = 'einsteiger' | 'fortgeschritten' | 'erfahren';
export type WeightUnit = 'kg' | 'lb';

/** Gewichtsstufen des Equipments – der Assistent schlägt nur machbare Gewichte vor. */
export interface EquipmentSettings {
  /** Welches Equipment steht zur Verfügung (Gym und/oder zuhause)? */
  available: Equipment[];
  barbellKg: number;
  ezBarKg: number;
  /** Kleinste Hantelscheibe (eine Scheibe, nicht das Paar). */
  smallestPlateKg: number;
  /** Vorhandene Scheiben (je Größe), für den Scheibenrechner. */
  platesKg: number[];
  /** Vorhandene Kurzhantel-Gewichte (pro Hantel). */
  dumbbellsKg: number[];
  kettlebellsKg: number[];
  /** Schrittweite an Maschinen (Steckgewicht). */
  machineStepKg: number;
  cableStepKg: number;
  /** Schrittweite für Zusatzgewicht (Dipgürtel/Weste), 0 = keins vorhanden. */
  addedWeightStepKg: number;
}

export interface UserProfile {
  goal: Goal;
  level: Level;
  /** Wochenziel: Trainingstage pro Woche. */
  trainingDaysPerWeek: number;
  /** Bevorzugte Trainingsdauer in Minuten. */
  sessionMinutes: number;
  unit: WeightUnit;
  equipment: EquipmentSettings;
  activePlanId: string | null;
  favorites: string[];
  /** Hilfetexte, die schon einmal gezeigt wurden. */
  seenHints: string[];
  /** Ausgeblendete Statistiken im Fortschritt. */
  hiddenStats: string[];
  /** Aktuelle Krank-/Pause-Phase (ID aus pauses), sonst null. */
  activePauseId: string | null;
  createdAt: number;
  updatedAt: number;
}

// ---------- Pläne ----------

export type SplitType = 'ganzkoerper' | 'upper_lower' | 'ppl' | 'abc' | 'calisthenics' | 'eigener';

export interface PlanExercise {
  /** ID innerhalb des Plans (eine Übung kann mehrfach vorkommen). */
  id: string;
  exerciseId: string;
  /** Zielsatzzahl (Arbeitssätze). */
  sets: number;
  repMin: number;
  repMax: number;
  /** Optional abweichende Pause in Sekunden. */
  restSec?: number | null;
  /** Gleiche Gruppe = Supersatz (abwechselnd ohne Pause). */
  supersetGroup?: string | null;
  note?: string;
}

export interface PlanDay {
  id: string;
  name: string;
  exercises: PlanExercise[];
}

export interface Plan {
  id: string;
  name: string;
  split: SplitType;
  days: PlanDay[];
  templateId?: string | null;
  createdAt: number;
  updatedAt: number;
}

// ---------- Training ----------

export type SetType = 'warmup' | 'work' | 'drop' | 'failure';

/** Tagesform-Empfehlung. */
export type Readiness = 'voll' | 'leichter' | 'ruhetag';

/** Eine Übung im laufenden/abgeschlossenen Training (Kopie aus dem Plan, ggf. getauscht/gekürzt). */
export interface SessionItem {
  id: string;
  exerciseId: string;
  /** Ursprüngliche Übung, falls getauscht. */
  swappedFrom?: string | null;
  swapReason?: string | null;
  targetSets: number;
  repMin: number;
  repMax: number;
  restSec?: number | null;
  supersetGroup?: string | null;
  skipped?: boolean;
  note?: string;
}

export type WorkoutStatus = 'aktiv' | 'beendet' | 'abgebrochen';

/** Kennzahlen je Übung, beim Beenden berechnet (für Fortschritt ohne alle Sätze zu laden). */
export interface ExerciseSummary {
  exerciseId: string;
  /** Schwerster Arbeitssatz. */
  topWeightKg: number;
  topReps: number;
  /** Geschätztes 1RM (Epley) aus Arbeits-/Versagenssätzen. */
  e1rmKg: number;
  /** Bestes Volumen eines Einzelsatzes (Gewicht × Wdh.). */
  bestSetVolumeKg: number;
  /** Meiste Wiederholungen in einem Satz (für Bodyweight). */
  maxReps: number;
  workSets: number;
  /** Volumen aus Arbeits- und Versagenssätzen. */
  volumeKg: number;
  /** Volumen aus Dropsätzen (getrennt, damit Vergleiche fair bleiben). */
  dropVolumeKg: number;
  totalReps: number;
  bodyweight: boolean;
}

export interface WorkoutSummary {
  exercises: ExerciseSummary[];
  /** Harte Sätze pro Muskelgruppe (primär 1, sekundär 0,5). */
  hardSetsByMuscle: Partial<Record<MuscleGroup, number>>;
  totalVolumeKg: number;
  dropVolumeKg: number;
  workSets: number;
  /** Neue Rekorde in diesem Training (exerciseId + Art). */
  records: RecordEntry[];
}

export type RecordKind = 'e1rm' | 'gewicht' | 'wiederholungen' | 'satzvolumen';

export interface RecordEntry {
  exerciseId: string;
  kind: RecordKind;
  value: number;
  previous: number | null;
}

export interface Workout {
  id: string;
  name: string;
  status: WorkoutStatus;
  startedAt: number;
  endedAt: number | null;
  planId: string | null;
  planDayId: string | null;
  items: SessionItem[];
  note?: string;
  timeBudgetMin?: number | null;
  readiness?: Readiness | null;
  /** Empfundene Belastung 1–10 (nach dem Training). */
  rpe?: number | null;
  score?: number | null;
  /** Sanfte Woche nach Pause/Krankheit. */
  gentle?: boolean;
  summary?: WorkoutSummary | null;
  updatedAt: number;
}

export interface SetEntry {
  id: string;
  /** Besitzer (für die Sammelabfrage über alle Sätze). */
  uid: string;
  workoutId: string;
  itemId: string;
  exerciseId: string;
  type: SetType;
  /** Gewicht in kg; bei Bodyweight-Übungen das Zusatzgewicht. */
  weightKg: number;
  reps: number;
  /** Wiederholungen in Reserve (0 = nichts mehr drin). Null bei Drops. */
  rir: number | null;
  painFlag: boolean;
  performedAt: number;
  /** Vorschlag des Assistenten (zum Lernen aus Korrekturen). */
  suggestedKg?: number | null;
  /** Dropsatz: ID des vorherigen Satzes in der Kette. */
  dropOf?: string | null;
}

// ---------- Tagesform & Pausen ----------

export interface Checkin {
  /** = Datum 'YYYY-MM-DD' */
  id: string;
  sleepHours: number | null;
  /** 1 (leer) bis 5 (topfit) */
  energy: number | null;
  /** 1 (kein Muskelkater) bis 5 (starker) */
  soreness: number | null;
  /** Optionaler Body-Battery-Wert 0–100 (von Hand oder später von der Uhr). */
  bodyBattery?: number | null;
  /** Quelle der Werte – später auch Smartwatch-Daten. */
  source?: 'manuell' | 'uhr';
  createdAt: number;
}

export type PauseKind = 'krank' | 'pause';

export interface Pause {
  id: string;
  kind: PauseKind;
  /** 'YYYY-MM-DD' */
  start: string;
  /** 'YYYY-MM-DD' oder null = läuft noch */
  end: string | null;
  createdAt: number;
}

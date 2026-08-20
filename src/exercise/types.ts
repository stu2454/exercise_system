export type ExerciseDoseType =
  | "repetitions"
  | "repetitions-each-side"
  | "duration"
  | "hold"
  | "free";

export interface ExerciseDose {
  repetitions?: number;
  repetitionsPerSide?: number;
  durationSeconds?: number;
  holdSeconds?: number;
}

export type ExerciseRecognitionType = "none" | "generic-repetition-event";
export type RecognitionConfigValue = string | number | boolean;

export interface ExerciseRecognitionConfig {
  type: ExerciseRecognitionType;
  parameters?: Readonly<Record<string, RecognitionConfigValue>>;
}

export interface Exercise {
  id: string;
  name: string;
  shortInstruction: string;
  description?: string;
  category?: string;
  tags?: string[];
  equipment?: string[];
  difficulty?: "easy" | "moderate" | "hard";
  doseType: ExerciseDoseType;
  recognition: ExerciseRecognitionConfig;
  referenceVideo?: string;
  defaultPrescription: ExercisePrescriptionDefaults;
}

export interface ExercisePrescriptionDefaults {
  doseType: ExerciseDoseType;
  dose: ExerciseDose;
  sets: number;
  restBetweenSetsSeconds: number;
  showDemonstrationBeforeExercise: boolean;
  showDemonstrationBetweenSets: boolean;
}

export interface ExercisePrescription {
  exerciseId: string;
  /** Optional programme-specific override; the library definition is immutable. */
  doseType?: ExerciseDoseType;
  dose: ExerciseDose;
  sets?: number;
  restBetweenSetsSeconds?: number;
  showDemonstrationBeforeExercise?: boolean;
  showDemonstrationBetweenSets?: boolean;
}

export interface ExerciseProgramme {
  id: string;
  name: string;
  description?: string;
  exercises: ExercisePrescription[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

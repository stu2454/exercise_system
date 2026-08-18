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

export interface Exercise {
  id: string;
  name: string;
  shortInstruction: string;
  description?: string;
  doseType: ExerciseDoseType;
  referenceVideo?: string;
  defaultDose?: ExerciseDose;
  defaultSets?: number;
  defaultRestBetweenSetsSeconds?: number;
}

export interface ExercisePrescription {
  exerciseId: string;
  dose: ExerciseDose;
  sets?: number;
  restBetweenSetsSeconds?: number;
  restAfterSeconds?: number;
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

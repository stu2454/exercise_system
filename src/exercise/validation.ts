import type {
  Exercise,
  ExerciseDose,
  ExerciseDoseType,
  ExercisePrescription,
  ValidationResult,
} from "./types";
import { referenceVideoFilename } from "./videoAssets";

const DOSE_FIELDS = [
  "repetitions",
  "repetitionsPerSide",
  "durationSeconds",
  "holdSeconds",
] as const;

const REQUIRED_FIELD: Record<Exclude<ExerciseDoseType, "free">, keyof ExerciseDose> = {
  repetitions: "repetitions",
  "repetitions-each-side": "repetitionsPerSide",
  duration: "durationSeconds",
  hold: "holdSeconds",
};

function positiveInteger(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function result(errors: string[]): ValidationResult {
  return { valid: errors.length === 0, errors };
}

function validateOptionalNonNegativeInteger(
  name: string,
  value: number | undefined,
): string[] {
  return value === undefined || (Number.isInteger(value) && value >= 0)
    ? []
    : [`${name} must be a non-negative integer.`];
}

export function validateDose(doseType: ExerciseDoseType, dose: ExerciseDose): ValidationResult {
  const populated = DOSE_FIELDS.filter((field) => dose[field] !== undefined);
  if (doseType === "free") {
    return result(populated.length === 0 ? [] : ["Free movement must not define a numeric dose."]);
  }

  const required = REQUIRED_FIELD[doseType];
  const errors: string[] = [];
  if (!positiveInteger(dose[required])) {
    errors.push(`${required} must be a positive integer for dose type ${doseType}.`);
  }
  const unexpected = populated.filter((field) => field !== required);
  if (unexpected.length > 0) {
    errors.push(`Unexpected dose fields for ${doseType}: ${unexpected.join(", ")}.`);
  }
  return result(errors);
}

export function validateExercise(exercise: Exercise): ValidationResult {
  const errors: string[] = [];
  if (!exercise.id.trim()) errors.push("Exercise id is required.");
  if (!exercise.name.trim()) errors.push("Exercise name is required.");
  if (!exercise.shortInstruction.trim()) errors.push("Exercise shortInstruction is required.");
  if (exercise.referenceVideo && referenceVideoFilename(exercise.referenceVideo) === null) {
    errors.push("Exercise referenceVideo must be a /videos/*.mov or /videos/*.mp4 path.");
  }
  errors.push(...validateDose(
    exercise.defaultPrescription.doseType,
    exercise.defaultPrescription.dose,
  ).errors);
  if (!positiveInteger(exercise.defaultPrescription.sets)) {
    errors.push("defaultPrescription sets must be a positive integer.");
  }
  errors.push(...validateOptionalNonNegativeInteger(
    "defaultPrescription restBetweenSetsSeconds",
    exercise.defaultPrescription.restBetweenSetsSeconds,
  ));
  return result(errors);
}

export function validatePrescription(
  prescription: ExercisePrescription,
  exercise: Exercise | undefined,
): ValidationResult {
  const errors: string[] = [];
  if (!exercise) {
    errors.push(`Exercise not found: ${prescription.exerciseId}.`);
    return result(errors);
  }
  errors.push(...validateDose(prescription.doseType ?? exercise.doseType, prescription.dose).errors);
  if (prescription.sets !== undefined && !positiveInteger(prescription.sets)) {
    errors.push("sets must be a positive integer.");
  }
  errors.push(...validateOptionalNonNegativeInteger(
    "restBetweenSetsSeconds",
    prescription.restBetweenSetsSeconds,
  ));
  return result(errors);
}

export function findExerciseById(
  exercises: readonly Exercise[],
  exerciseId: string,
): Exercise | undefined {
  return exercises.find((exercise) => exercise.id === exerciseId);
}

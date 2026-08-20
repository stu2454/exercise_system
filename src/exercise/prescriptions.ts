import type { Exercise, ExercisePrescription } from "./types";

/** Creates an independent programme prescription from immutable library data. */
export function prescriptionFromExerciseDefaults(
  exercise: Exercise,
): ExercisePrescription {
  const defaults = exercise.defaultPrescription;
  return {
    exerciseId: exercise.id,
    doseType: defaults.doseType,
    dose: { ...defaults.dose },
    sets: defaults.sets,
    restBetweenSetsSeconds: defaults.restBetweenSetsSeconds,
    showDemonstrationBeforeExercise: defaults.showDemonstrationBeforeExercise,
    showDemonstrationBetweenSets: defaults.showDemonstrationBetweenSets,
  };
}

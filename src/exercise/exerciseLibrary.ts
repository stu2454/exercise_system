import type { Exercise, ExerciseProgramme } from "./types";
import { referenceVideoPath } from "./videoAssets";
import { prescriptionFromExerciseDefaults } from "./prescriptions";

const temporaryExercise = (number: number): Exercise => ({
  id: `exercise-${String(number).padStart(2, "0")}`,
  name: `Exercise ${String(number).padStart(2, "0")}`,
  shortInstruction: "Follow the reference demonstration.",
  description: "Current programme configuration; not a clinically validated prescription.",
  category: "Development exercises",
  tags: ["duration", "reference-video"],
  equipment: [],
  referenceVideo: referenceVideoPath(`exercise-${String(number).padStart(2, "0")}.mov`)!,
  doseType: "duration",
  recognition: { type: "none" },
  defaultPrescription: {
    doseType: "duration",
    dose: { durationSeconds: 60 },
    sets: 3,
    restBetweenSetsSeconds: 20,
    showDemonstrationBeforeExercise: true,
    showDemonstrationBetweenSets: false,
  },
});

export const EXERCISE_LIBRARY: readonly Exercise[] = Array.from(
  { length: 9 },
  (_, index) => temporaryExercise(index + 1),
);

export const DEVELOPMENT_PROGRAMME: ExerciseProgramme = {
  id: "programme-a",
  name: "Programme A",
  description: "Current supplied programme configuration; not clinically validated.",
  exercises: EXERCISE_LIBRARY.map(prescriptionFromExerciseDefaults),
};

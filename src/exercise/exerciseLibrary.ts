import type { Exercise, ExerciseProgramme } from "./types";
import { referenceVideoPath } from "./videoAssets";

const temporaryExercise = (number: number): Exercise => ({
  id: `exercise-${String(number).padStart(2, "0")}`,
  name: `Exercise ${String(number).padStart(2, "0")}`,
  shortInstruction: "Follow the reference demonstration.",
  description: "Current programme configuration; not a clinically validated prescription.",
  referenceVideo: referenceVideoPath(`exercise-${String(number).padStart(2, "0")}.mov`)!,
  doseType: "duration",
  defaultDose: { durationSeconds: 60 },
  defaultSets: 3,
  defaultRestBetweenSetsSeconds: 20,
});

export const EXERCISE_LIBRARY: readonly Exercise[] = Array.from(
  { length: 9 },
  (_, index) => temporaryExercise(index + 1),
);

export const DEVELOPMENT_PROGRAMME: ExerciseProgramme = {
  id: "programme-a",
  name: "Programme A",
  description: "Current supplied programme configuration; not clinically validated.",
  exercises: EXERCISE_LIBRARY.map((exercise) => ({
    exerciseId: exercise.id,
    dose: { durationSeconds: 60 },
    sets: 3,
    restBetweenSetsSeconds: 20,
  })),
};

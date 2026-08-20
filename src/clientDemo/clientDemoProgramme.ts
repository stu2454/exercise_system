import type { ExerciseProgramme } from "../exercise/types";

export const CLIENT_DEMO_EXERCISE_COUNT = 9;

/** Derives a one-circuit demo without weakening the shared runner's set support. */
export function createClientDemoProgramme(source: ExerciseProgramme): ExerciseProgramme {
  return {
    ...source,
    id: `${source.id}-client-demo`,
    name: "Exercise Programme",
    description: "Prototype demonstration programme.",
    exercises: source.exercises.map((prescription) => ({
      ...prescription,
      dose: { ...prescription.dose },
      sets: 1,
    })),
  };
}

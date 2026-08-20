import { prescriptionFromExerciseDefaults } from "../exercise/prescriptions";
import type { Exercise, ExerciseDoseType, ExercisePrescription, ExerciseProgramme } from "../exercise/types";

export function searchExerciseLibrary(exercises: readonly Exercise[], query: string): Exercise[] {
  const term = query.trim().toLocaleLowerCase();
  if (!term) return [...exercises];
  return exercises.filter((exercise) =>
    [exercise.name, exercise.category, ...(exercise.tags ?? [])]
      .some((value) => value?.toLocaleLowerCase().includes(term)),
  );
}

export function addExerciseToProgramme(programme: ExerciseProgramme, exercise: Exercise): ExerciseProgramme {
  if (programme.exercises.some((item) => item.exerciseId === exercise.id)) return programme;
  const prescription = prescriptionFromExerciseDefaults(exercise);
  prescription.sets = programme.exercises[0]?.sets ?? prescription.sets;
  return { ...programme, exercises: [...programme.exercises, prescription] };
}

export function removeExerciseFromProgramme(programme: ExerciseProgramme, index: number): ExerciseProgramme {
  if (programme.exercises.length <= 1 || index < 0 || index >= programme.exercises.length) return programme;
  return { ...programme, exercises: programme.exercises.filter((_, itemIndex) => itemIndex !== index) };
}

export function moveProgrammeExercise(programme: ExerciseProgramme, index: number, offset: -1 | 1): ExerciseProgramme {
  const destination = index + offset;
  if (index < 0 || index >= programme.exercises.length || destination < 0 || destination >= programme.exercises.length) return programme;
  const exercises = [...programme.exercises];
  [exercises[index], exercises[destination]] = [exercises[destination], exercises[index]];
  return { ...programme, exercises };
}

export function updateProgrammePrescription(
  programme: ExerciseProgramme,
  index: number,
  update: Partial<ExercisePrescription>,
): ExerciseProgramme {
  if (index < 0 || index >= programme.exercises.length) return programme;
  return {
    ...programme,
    exercises: programme.exercises.map((item, itemIndex) => itemIndex === index
      ? { ...item, ...update, dose: update.dose ? { ...update.dose } : { ...item.dose } }
      : item),
  };
}

export function changePrescriptionDoseType(
  programme: ExerciseProgramme,
  index: number,
  doseType: Extract<ExerciseDoseType, "duration" | "repetitions">,
): ExerciseProgramme {
  return updateProgrammePrescription(programme, index, {
    doseType,
    dose: doseType === "duration" ? { durationSeconds: 60 } : { repetitions: 10 },
  });
}

/** Circuit mode uses one shared set count for every exercise. */
export function updateCircuitSetCount(programme: ExerciseProgramme, sets: number): ExerciseProgramme {
  return { ...programme, exercises: programme.exercises.map((item) => ({ ...item, dose: { ...item.dose }, sets })) };
}

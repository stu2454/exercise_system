import type { Exercise } from "./types";

export function searchExerciseLibraryItems(exercises: readonly Exercise[], query: string): Exercise[] {
  const term = query.trim().toLocaleLowerCase();
  if (!term) return [...exercises];
  return exercises.filter((exercise) =>
    [exercise.name, exercise.id, exercise.category, exercise.doseType, exercise.recognition.type, ...(exercise.tags ?? [])]
      .some((value) => value?.toLocaleLowerCase().includes(term)),
  );
}

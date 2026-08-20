import type { Exercise, ExerciseProgramme, ExercisePrescription } from "../exercise/types";
import { findExerciseById, validatePrescription } from "../exercise/validation";

export const PROGRAMME_STORAGE_SCHEMA_VERSION = 1;
export const PROGRAMME_STORAGE_KEY = "exercise-engagement.programmes.v1";

export interface ProgrammeCollection {
  schemaVersion: typeof PROGRAMME_STORAGE_SCHEMA_VERSION;
  activeProgrammeId: string;
  programmes: ExerciseProgramme[];
}

export interface ProgrammeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function cloneProgramme(programme: ExerciseProgramme): ExerciseProgramme {
  return {
    ...programme,
    exercises: programme.exercises.map((item) => ({
      ...item,
      dose: { ...item.dose },
    })),
  };
}

export function defaultProgrammeCollection(
  defaultProgramme: ExerciseProgramme,
): ProgrammeCollection {
  const cloned = cloneProgramme(defaultProgramme);
  return {
    schemaVersion: PROGRAMME_STORAGE_SCHEMA_VERSION,
    activeProgrammeId: cloned.id,
    programmes: [cloned],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStoredPrescription(
  value: unknown,
  exercises: readonly Exercise[],
): value is ExercisePrescription {
  if (!isRecord(value) || typeof value.exerciseId !== "string" || !isRecord(value.dose)) return false;
  if (value.showDemonstrationBeforeExercise !== undefined && typeof value.showDemonstrationBeforeExercise !== "boolean") return false;
  if (value.showDemonstrationBetweenSets !== undefined && typeof value.showDemonstrationBetweenSets !== "boolean") return false;
  const exercise = findExerciseById(exercises, value.exerciseId);
  return validatePrescription(value as unknown as ExercisePrescription, exercise).valid;
}

function isStoredProgramme(
  value: unknown,
  exercises: readonly Exercise[],
): value is ExerciseProgramme {
  return isRecord(value) &&
    typeof value.id === "string" && value.id.trim().length > 0 &&
    typeof value.name === "string" && value.name.trim().length > 0 &&
    (value.description === undefined || typeof value.description === "string") &&
    Array.isArray(value.exercises) && value.exercises.length > 0 &&
    value.exercises.every((item) => isStoredPrescription(item, exercises));
}

export function parseProgrammeCollection(
  json: string,
  exercises: readonly Exercise[],
): ProgrammeCollection | null {
  try {
    const value: unknown = JSON.parse(json);
    if (!isRecord(value) || value.schemaVersion !== PROGRAMME_STORAGE_SCHEMA_VERSION ||
      typeof value.activeProgrammeId !== "string" || !Array.isArray(value.programmes) ||
      value.programmes.length === 0 || !value.programmes.every((item) => isStoredProgramme(item, exercises))) return null;
    const ids = value.programmes.map((item) => (item as ExerciseProgramme).id);
    if (new Set(ids).size !== ids.length || !ids.includes(value.activeProgrammeId)) return null;
    return {
      schemaVersion: PROGRAMME_STORAGE_SCHEMA_VERSION,
      activeProgrammeId: value.activeProgrammeId,
      programmes: (value.programmes as ExerciseProgramme[]).map(cloneProgramme),
    };
  } catch {
    return null;
  }
}

export function loadProgrammeCollection(
  storage: ProgrammeStorage | null,
  defaultProgramme: ExerciseProgramme,
  exercises: readonly Exercise[],
): ProgrammeCollection {
  if (storage) {
    try {
      const stored = storage.getItem(PROGRAMME_STORAGE_KEY);
      const parsed = stored ? parseProgrammeCollection(stored, exercises) : null;
      if (parsed) return parsed;
    } catch {
      // Storage may be blocked; retain an immediately usable in-memory default.
    }
  }
  return defaultProgrammeCollection(defaultProgramme);
}

export function saveProgrammeCollection(
  storage: ProgrammeStorage | null,
  collection: ProgrammeCollection,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(PROGRAMME_STORAGE_KEY, JSON.stringify(collection));
    return true;
  } catch {
    return false;
  }
}

export function activeProgramme(collection: ProgrammeCollection): ExerciseProgramme {
  return collection.programmes.find((item) => item.id === collection.activeProgrammeId) ?? collection.programmes[0];
}

export function createProgramme(
  collection: ProgrammeCollection,
  programme: ExerciseProgramme,
): ProgrammeCollection {
  if (collection.programmes.some((item) => item.id === programme.id)) return collection;
  return { ...collection, activeProgrammeId: programme.id, programmes: [...collection.programmes.map(cloneProgramme), cloneProgramme(programme)] };
}

export function updateProgramme(
  collection: ProgrammeCollection,
  programme: ExerciseProgramme,
): ProgrammeCollection {
  if (!collection.programmes.some((item) => item.id === programme.id)) return collection;
  return { ...collection, programmes: collection.programmes.map((item) => item.id === programme.id ? cloneProgramme(programme) : cloneProgramme(item)) };
}

export function deleteProgramme(
  collection: ProgrammeCollection,
  programmeId: string,
): ProgrammeCollection {
  if (collection.programmes.length <= 1 || !collection.programmes.some((item) => item.id === programmeId)) return collection;
  const programmes = collection.programmes.filter((item) => item.id !== programmeId).map(cloneProgramme);
  return { ...collection, programmes, activeProgrammeId: collection.activeProgrammeId === programmeId ? programmes[0].id : collection.activeProgrammeId };
}

export function selectProgramme(
  collection: ProgrammeCollection,
  programmeId: string,
): ProgrammeCollection {
  return collection.programmes.some((item) => item.id === programmeId)
    ? { ...collection, activeProgrammeId: programmeId }
    : collection;
}

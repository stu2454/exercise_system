import type { Exercise, ExerciseProgramme, ExercisePrescription } from "../exercise/types";
import { findExerciseById, validatePrescription } from "../exercise/validation";
import { referenceVideoFilename } from "../exercise/videoAssets";

export type ProgrammePhase =
  | "idle"
  | "ready"
  | "exercising"
  | "resting"
  | "set-complete"
  | "programme-complete";

export interface ProgrammeRunnerState {
  programmeId: string;
  currentSetIndex: number;
  currentExerciseIndex: number;
  phase: ProgrammePhase;
  exerciseTimeRemainingSeconds: number;
  restTimeRemainingSeconds: number;
  paused: boolean;
}

export interface ProgrammeValidation {
  valid: boolean;
  errors: string[];
  totalSets: number;
}

function positiveInteger(value: number | undefined): value is number {
  return value !== undefined && Number.isInteger(value) && value > 0;
}

export function validateRunnerProgramme(
  programme: ExerciseProgramme,
  exercises: readonly Exercise[],
): ProgrammeValidation {
  const errors: string[] = [];
  if (programme.exercises.length === 0) errors.push("Programme contains no exercises.");
  const setCounts = new Set<number>();
  for (const prescription of programme.exercises) {
    const exercise = findExerciseById(exercises, prescription.exerciseId);
    errors.push(...validatePrescription(prescription, exercise).errors);
    if (!exercise?.referenceVideo || referenceVideoFilename(exercise.referenceVideo) === null) {
      errors.push(`Reference video unavailable: ${prescription.exerciseId}.`);
    }
    if (exercise?.doseType !== "duration" || !positiveInteger(prescription.dose.durationSeconds)) {
      errors.push(`Runner requires a duration dose: ${prescription.exerciseId}.`);
    }
    if (positiveInteger(prescription.sets)) setCounts.add(prescription.sets);
  }
  if (setCounts.size > 1) errors.push("All programme exercises must use the same set count.");
  const totalSets = setCounts.values().next().value ?? 0;
  if (totalSets !== 2 && totalSets !== 3) {
    errors.push("Programme set count must be 2 or 3.");
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)], totalSets };
}

function prescriptionAt(
  programme: ExerciseProgramme,
  index: number,
): ExercisePrescription {
  return programme.exercises[index];
}

function durationAt(programme: ExerciseProgramme, index: number): number {
  return prescriptionAt(programme, index).dose.durationSeconds ?? 0;
}

function restAt(programme: ExerciseProgramme, index: number): number {
  return prescriptionAt(programme, index).restBetweenSetsSeconds ?? 0;
}

export function createProgrammeRunnerState(programme: ExerciseProgramme): ProgrammeRunnerState {
  return {
    programmeId: programme.id,
    currentSetIndex: 0,
    currentExerciseIndex: 0,
    phase: "idle",
    exerciseTimeRemainingSeconds: programme.exercises.length > 0 ? durationAt(programme, 0) : 0,
    restTimeRemainingSeconds: 0,
    paused: false,
  };
}

export function startProgramme(
  state: ProgrammeRunnerState,
  programme: ExerciseProgramme,
): ProgrammeRunnerState {
  return {
    ...createProgrammeRunnerState(programme),
    phase: "ready",
    exerciseTimeRemainingSeconds: durationAt(programme, 0),
  };
}

export function startCurrentExercise(
  state: ProgrammeRunnerState,
  programme: ExerciseProgramme,
): ProgrammeRunnerState {
  if (!(["ready", "resting", "set-complete"] as ProgrammePhase[]).includes(state.phase)) return state;
  const next = state.phase === "ready" ? state : nextPosition(state, programme);
  return {
    ...state,
    ...next,
    phase: "exercising",
    paused: false,
    exerciseTimeRemainingSeconds: durationAt(programme, next.currentExerciseIndex),
    restTimeRemainingSeconds: 0,
  };
}

function totalSets(programme: ExerciseProgramme): number {
  return programme.exercises[0]?.sets ?? 0;
}

function isFinalExercise(state: ProgrammeRunnerState, programme: ExerciseProgramme): boolean {
  return state.currentSetIndex === totalSets(programme) - 1 &&
    state.currentExerciseIndex === programme.exercises.length - 1;
}

function nextPosition(
  state: ProgrammeRunnerState,
  programme: ExerciseProgramme,
): Pick<ProgrammeRunnerState, "currentSetIndex" | "currentExerciseIndex"> {
  if (state.currentExerciseIndex < programme.exercises.length - 1) {
    return { currentSetIndex: state.currentSetIndex, currentExerciseIndex: state.currentExerciseIndex + 1 };
  }
  return { currentSetIndex: state.currentSetIndex + 1, currentExerciseIndex: 0 };
}

function finishExercise(
  state: ProgrammeRunnerState,
  programme: ExerciseProgramme,
): ProgrammeRunnerState {
  if (isFinalExercise(state, programme)) {
    return { ...state, phase: "programme-complete", exerciseTimeRemainingSeconds: 0, restTimeRemainingSeconds: 0 };
  }
  const setComplete = state.currentExerciseIndex === programme.exercises.length - 1;
  return {
    ...state,
    phase: setComplete ? "set-complete" : "resting",
    exerciseTimeRemainingSeconds: 0,
    restTimeRemainingSeconds: restAt(programme, state.currentExerciseIndex),
  };
}

export function tickProgramme(
  state: ProgrammeRunnerState,
  programme: ExerciseProgramme,
  elapsedSeconds: number,
): ProgrammeRunnerState {
  if (state.paused || elapsedSeconds <= 0) return state;
  if (state.phase === "exercising") {
    const remaining = Math.max(0, state.exerciseTimeRemainingSeconds - elapsedSeconds);
    return remaining === 0
      ? finishExercise(state, programme)
      : { ...state, exerciseTimeRemainingSeconds: remaining };
  }
  if (state.phase === "resting" || state.phase === "set-complete") {
    const remaining = Math.max(0, state.restTimeRemainingSeconds - elapsedSeconds);
    return remaining === 0
      ? startCurrentExercise(state, programme)
      : { ...state, restTimeRemainingSeconds: remaining };
  }
  return state;
}

export function pauseProgramme(state: ProgrammeRunnerState): ProgrammeRunnerState {
  return state.phase === "exercising" || state.phase === "resting" || state.phase === "set-complete"
    ? { ...state, paused: true }
    : state;
}

export function resumeProgramme(state: ProgrammeRunnerState): ProgrammeRunnerState {
  return { ...state, paused: false };
}

export function suspendProgrammeForExit(state: ProgrammeRunnerState): ProgrammeRunnerState {
  return { ...state, paused: true };
}

export function restoreProgrammeAfterExit(state: ProgrammeRunnerState, wasPaused: boolean): ProgrammeRunnerState {
  return { ...state, paused: wasPaused };
}

export function restartCurrentExercise(
  state: ProgrammeRunnerState,
  programme: ExerciseProgramme,
): ProgrammeRunnerState {
  if (state.phase === "idle" || state.phase === "programme-complete") return state;
  return {
    ...state,
    phase: "exercising",
    paused: false,
    exerciseTimeRemainingSeconds: durationAt(programme, state.currentExerciseIndex),
    restTimeRemainingSeconds: 0,
  };
}

export function skipToNextExercise(
  state: ProgrammeRunnerState,
  programme: ExerciseProgramme,
): ProgrammeRunnerState {
  if (state.phase === "idle" || state.phase === "programme-complete") return state;
  if (isFinalExercise(state, programme)) {
    return { ...state, phase: "programme-complete", paused: false, exerciseTimeRemainingSeconds: 0, restTimeRemainingSeconds: 0 };
  }
  const next = nextPosition(state, programme);
  return {
    ...state,
    ...next,
    phase: "ready",
    paused: false,
    exerciseTimeRemainingSeconds: durationAt(programme, next.currentExerciseIndex),
    restTimeRemainingSeconds: 0,
  };
}

export function programmeExerciseOrder(
  programme: ExerciseProgramme,
): string[] {
  const sets = totalSets(programme);
  return Array.from({ length: sets }, () => programme.exercises.map((item) => item.exerciseId)).flat();
}

export function currentRunnerExercise(
  state: ProgrammeRunnerState,
  programme: ExerciseProgramme,
  exercises: readonly Exercise[],
): Exercise | undefined {
  const prescription = programme.exercises[state.currentExerciseIndex];
  return prescription ? findExerciseById(exercises, prescription.exerciseId) : undefined;
}

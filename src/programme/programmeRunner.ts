import type { Exercise, ExerciseProgramme, ExercisePrescription } from "../exercise/types";
import { findExerciseById, validatePrescription } from "../exercise/validation";
import { referenceVideoFilename } from "../exercise/videoAssets";
import type { ProgrammeRunnerEvent } from "./runnerEvents";

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
  completedRepetitions: number;
  restTimeRemainingSeconds: number;
  paused: boolean;
  transitionCause?: "exercise-completed" | "skipped";
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
  const setCounts = new Set<number>();
  if (programme.exercises.length === 0) errors.push("Programme contains no exercises.");
  for (const prescription of programme.exercises) {
    if (positiveInteger(prescription.sets)) setCounts.add(prescription.sets);
    const exercise = findExerciseById(exercises, prescription.exerciseId);
    errors.push(...validatePrescription(prescription, exercise).errors);
    if (!exercise?.referenceVideo || referenceVideoFilename(exercise.referenceVideo) === null) {
      errors.push(`Reference video unavailable: ${prescription.exerciseId}.`);
    }
    const doseType = prescription.doseType ?? exercise?.doseType;
    if (doseType !== "duration" && doseType !== "repetitions") {
      errors.push(`Runner supports duration or repetitions doses: ${prescription.exerciseId}.`);
    }
  }
  if (setCounts.size > 1) {
    errors.push("Circuit sequencing requires the same number of sets for every exercise.");
  }
  return {
    valid: errors.length === 0,
    errors: [...new Set(errors)],
    totalSets: setCounts.values().next().value ?? 0,
  };
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

function doseTypeAt(programme: ExerciseProgramme, index: number): "duration" | "repetitions" | undefined {
  const prescription = prescriptionAt(programme, index);
  if (prescription.doseType === "duration" || prescription.doseType === "repetitions") {
    return prescription.doseType;
  }
  if (prescription.dose.repetitions !== undefined) return "repetitions";
  if (prescription.dose.durationSeconds !== undefined) return "duration";
  return undefined;
}

function repetitionTargetAt(programme: ExerciseProgramme, index: number): number {
  return prescriptionAt(programme, index).dose.repetitions ?? 0;
}

function restAt(programme: ExerciseProgramme, index: number): number {
  return prescriptionAt(programme, index).restBetweenSetsSeconds ?? 0;
}

function totalSets(programme: ExerciseProgramme): number {
  return prescriptionAt(programme, 0)?.sets ?? 1;
}

export function createProgrammeRunnerState(programme: ExerciseProgramme): ProgrammeRunnerState {
  return {
    programmeId: programme.id,
    currentSetIndex: 0,
    currentExerciseIndex: 0,
    phase: "idle",
    exerciseTimeRemainingSeconds: programme.exercises.length > 0 ? durationAt(programme, 0) : 0,
    completedRepetitions: 0,
    restTimeRemainingSeconds: 0,
    paused: false,
    transitionCause: undefined,
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
  const next = state.phase === "ready" ? state : nextCircuitPosition(state, programme);
  return {
    ...state,
    ...next,
    phase: "exercising",
    paused: false,
    exerciseTimeRemainingSeconds: durationAt(programme, next.currentExerciseIndex),
    completedRepetitions: 0,
    restTimeRemainingSeconds: 0,
    transitionCause: undefined,
  };
}

function isFinalExercise(state: ProgrammeRunnerState, programme: ExerciseProgramme): boolean {
  return state.currentSetIndex === totalSets(programme) - 1 &&
    state.currentExerciseIndex === programme.exercises.length - 1;
}

function nextCircuitPosition(
  state: ProgrammeRunnerState,
  programme: ExerciseProgramme,
): Pick<ProgrammeRunnerState, "currentSetIndex" | "currentExerciseIndex"> {
  return state.currentExerciseIndex < programme.exercises.length - 1
    ? { currentSetIndex: state.currentSetIndex, currentExerciseIndex: state.currentExerciseIndex + 1 }
    : { currentSetIndex: state.currentSetIndex + 1, currentExerciseIndex: 0 };
}

function finishExercise(
  state: ProgrammeRunnerState,
  programme: ExerciseProgramme,
): ProgrammeRunnerState {
  if (isFinalExercise(state, programme)) {
    return { ...state, phase: "programme-complete", exerciseTimeRemainingSeconds: 0, restTimeRemainingSeconds: 0, transitionCause: "exercise-completed" };
  }
  const restSeconds = restAt(programme, state.currentExerciseIndex);
  if (restSeconds === 0) {
    const next = nextCircuitPosition(state, programme);
    return {
      ...state,
      ...next,
      phase: "ready",
      exerciseTimeRemainingSeconds: durationAt(programme, next.currentExerciseIndex),
      completedRepetitions: 0,
      restTimeRemainingSeconds: 0,
      transitionCause: "exercise-completed",
    };
  }
  return {
    ...state,
    phase: state.currentExerciseIndex === programme.exercises.length - 1 ? "set-complete" : "resting",
    exerciseTimeRemainingSeconds: 0,
    restTimeRemainingSeconds: restSeconds,
    transitionCause: "exercise-completed",
  };
}

export function tickProgramme(
  state: ProgrammeRunnerState,
  programme: ExerciseProgramme,
  elapsedSeconds: number,
): ProgrammeRunnerState {
  if (state.paused || elapsedSeconds <= 0) return state;
  if (state.phase === "exercising") {
    if (doseTypeAt(programme, state.currentExerciseIndex) !== "duration") return state;
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

export function processProgrammeRunnerEvent(
  state: ProgrammeRunnerState,
  programme: ExerciseProgramme,
  event: ProgrammeRunnerEvent,
): ProgrammeRunnerState {
  const prescription = programme.exercises[state.currentExerciseIndex];
  if (
    state.phase !== "exercising" ||
    state.paused ||
    event.type !== "repetition-completed" ||
    event.exerciseId !== prescription?.exerciseId ||
    doseTypeAt(programme, state.currentExerciseIndex) !== "repetitions"
  ) return state;

  const target = repetitionTargetAt(programme, state.currentExerciseIndex);
  if (target <= 0 || state.completedRepetitions >= target) return state;
  const completedRepetitions = Math.min(target, state.completedRepetitions + 1);
  return completedRepetitions === target
    ? finishExercise({ ...state, completedRepetitions }, programme)
    : { ...state, completedRepetitions };
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
    completedRepetitions: 0,
    restTimeRemainingSeconds: 0,
    transitionCause: undefined,
  };
}

export function skipToNextExercise(
  state: ProgrammeRunnerState,
  programme: ExerciseProgramme,
): ProgrammeRunnerState {
  if (state.phase === "idle" || state.phase === "programme-complete") return state;
  if (isFinalExercise(state, programme)) {
    return { ...state, phase: "programme-complete", paused: false, exerciseTimeRemainingSeconds: 0, restTimeRemainingSeconds: 0, transitionCause: "skipped" };
  }
  const next = nextCircuitPosition(state, programme);
  return {
    ...state,
    ...next,
    phase: "ready",
    paused: false,
    exerciseTimeRemainingSeconds: durationAt(programme, next.currentExerciseIndex),
    completedRepetitions: 0,
    restTimeRemainingSeconds: 0,
    transitionCause: "skipped",
  };
}

export function programmeExerciseOrder(
  programme: ExerciseProgramme,
): string[] {
  return Array.from({ length: totalSets(programme) }, () =>
    programme.exercises.map((item) => item.exerciseId),
  ).flat();
}

export function currentRunnerExercise(
  state: ProgrammeRunnerState,
  programme: ExerciseProgramme,
  exercises: readonly Exercise[],
): Exercise | undefined {
  const prescription = programme.exercises[state.currentExerciseIndex];
  return prescription ? findExerciseById(exercises, prescription.exerciseId) : undefined;
}

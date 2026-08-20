import type { CameraStatus } from "../camera/cameraState";
import type { Exercise, ExerciseProgramme } from "../exercise/types";
import type { PoseQuality } from "../pose/types";
import type { ProgrammeRunnerState } from "./programmeRunner";

export type ParticipantModeAction = "launch" | "exit";

export function participantModeReducer(active: boolean, action: ParticipantModeAction): boolean {
  return action === "launch" ? true : false;
}

export type ParticipantScreen = "ready" | "exercising" | "rest" | "complete" | "idle";

export interface ParticipantViewModel {
  screen: ParticipantScreen;
  setNumber: number;
  totalSets: number;
  exerciseNumber: number;
  exerciseCount: number;
  exerciseName: string | null;
  nextExerciseName: string | null;
  nextSetNumber: number;
  nextExerciseNumber: number;
  completedExerciseIndices: number[];
  currentExerciseIndex: number;
  durationSeconds: number;
  doseType: Exercise["doseType"];
  repetitionTarget: number;
  completedRepetitions: number;
  exerciseSecondsRemaining: number;
  restSecondsRemaining: number;
}

export interface ParticipantSplitScreenModel {
  leftPanel: "reference-video";
  rightPanel: "participant-camera-with-pose-overlay";
  displayedExerciseIndex: number;
}

export function createParticipantSplitScreenModel(view: ParticipantViewModel): ParticipantSplitScreenModel {
  return { leftPanel: "reference-video", rightPanel: "participant-camera-with-pose-overlay", displayedExerciseIndex: view.screen === "rest" ? view.nextExerciseNumber - 1 : view.currentExerciseIndex };
}

export function createParticipantViewModel(
  state: ProgrammeRunnerState,
  programme: ExerciseProgramme,
  exercises: readonly Exercise[],
  totalSets: number,
): ParticipantViewModel {
  const exerciseCount = programme.exercises.length;
  const currentPrescription = programme.exercises[state.currentExerciseIndex];
  const currentExercise = exercises.find((item) => item.id === currentPrescription?.exerciseId);
  const exerciseName = currentExercise?.name ?? null;
  const nextExerciseIndex = state.currentExerciseIndex === exerciseCount - 1
    ? 0
    : state.currentExerciseIndex + 1;
  const nextSetNumber = state.currentExerciseIndex === exerciseCount - 1
    ? state.currentSetIndex + 2
    : state.currentSetIndex + 1;
  const nextPrescription = programme.exercises[nextExerciseIndex];
  const nextExerciseName = exercises.find((item) => item.id === nextPrescription?.exerciseId)?.name ?? null;
  const completedThrough = state.phase === "resting" || state.phase === "set-complete"
    ? state.currentExerciseIndex
    : state.currentExerciseIndex - 1;
  const screen: ParticipantScreen = state.phase === "ready"
    ? "ready"
    : state.phase === "exercising"
      ? "exercising"
      : state.phase === "resting" || state.phase === "set-complete"
        ? "rest"
        : state.phase === "programme-complete"
          ? "complete"
          : "idle";

  return {
    screen,
    setNumber: state.currentSetIndex + 1,
    totalSets,
    exerciseNumber: state.currentExerciseIndex + 1,
    exerciseCount,
    exerciseName,
    nextExerciseName,
    nextSetNumber,
    nextExerciseNumber: nextExerciseIndex + 1,
    completedExerciseIndices: Array.from({ length: Math.max(0, completedThrough + 1) }, (_, index) => index),
    currentExerciseIndex: state.currentExerciseIndex,
    durationSeconds: currentPrescription?.dose.durationSeconds ?? 0,
    doseType: currentPrescription?.doseType ?? currentExercise?.doseType ?? "free",
    repetitionTarget: currentPrescription?.dose.repetitions ?? 0,
    completedRepetitions: state.completedRepetitions,
    exerciseSecondsRemaining: Math.max(0, Math.ceil(state.exerciseTimeRemainingSeconds)),
    restSecondsRemaining: Math.max(0, Math.ceil(state.restTimeRemainingSeconds)),
  };
}

/** @deprecated Participant mode uses the debounced FramingGuidanceAssessor. */
export function criticalTrackingWarning(
  cameraStatus: CameraStatus,
  poseQuality: PoseQuality,
): string | null {
  if (cameraStatus === "requesting") return "CAMERA STARTING";
  if (cameraStatus !== "active") return "CAMERA IS OFF";
  if (!poseQuality.personPresent) return "STEP INTO VIEW";
  if (!poseQuality.fullBodyVisible) return "MOVE BACK SO YOUR FULL BODY IS VISIBLE";
  if (poseQuality.level === "insufficient") return "CAMERA TRACKING LOST";
  return null;
}

import type { ProgrammePhase } from "./programmeRunner";

/**
 * Demonstration playback follows presentation state only. Camera readiness,
 * pose landmarks, recognition and ready gestures must never gate the video.
 */
export function shouldPlayDemonstration(
  phase: ProgrammePhase,
  paused: boolean,
  preferences: {
    showBeforeExercise?: boolean;
    showBetweenSets?: boolean;
  } = {},
): boolean {
  if (phase === "exercising") return !paused;
  if (phase === "ready") return preferences.showBeforeExercise ?? true;
  if (phase === "resting") return preferences.showBeforeExercise ?? true;
  if (phase === "set-complete") return preferences.showBetweenSets ?? false;
  return false;
}

import { describe, expect, it } from "vitest";
import type { CameraStatus } from "../camera/cameraState";
import { DEVELOPMENT_PROGRAMME, EXERCISE_LIBRARY } from "../exercise/exerciseLibrary";
import type { PoseQuality } from "../pose/types";
import {
  createProgrammeRunnerState,
  startCurrentExercise,
  startProgramme,
  tickProgramme,
} from "./programmeRunner";
import {
  createParticipantViewModel,
  createParticipantSplitScreenModel,
  criticalTrackingWarning,
  participantModeReducer,
} from "./participantMode";

const GOOD: PoseQuality = {
  level: "good",
  personPresent: true,
  fullBodyVisible: true,
  missingRequiredLandmarks: [],
  warnings: [],
};

function view(state = startProgramme(
  createProgrammeRunnerState(DEVELOPMENT_PROGRAMME),
  DEVELOPMENT_PROGRAMME,
)) {
  return createParticipantViewModel(state, DEVELOPMENT_PROGRAMME, EXERCISE_LIBRARY, 3);
}

describe("participant mode view model", () => {
  it("launches and exits participant mode", () => {
    expect(participantModeReducer(false, "launch")).toBe(true);
    expect(participantModeReducer(true, "exit")).toBe(false);
  });

  it("represents an unstarted participant programme as the idle start screen", () => {
    expect(view(createProgrammeRunnerState(DEVELOPMENT_PROGRAMME))).toMatchObject({
      screen: "idle",
      exerciseCount: 9,
      totalSets: 3,
    });
  });

  it("starts on the READY screen with human-readable set and exercise values", () => {
    expect(view()).toMatchObject({
      screen: "ready",
      setNumber: 1,
      totalSets: 3,
      exerciseNumber: 1,
      exerciseCount: 9,
      exerciseName: "Exercise 01",
      durationSeconds: 60,
    });
  });

  it("provides the active countdown without developer metrics", () => {
    const ready = startProgramme(createProgrammeRunnerState(DEVELOPMENT_PROGRAMME), DEVELOPMENT_PROGRAMME);
    const active = tickProgramme(startCurrentExercise(ready, DEVELOPMENT_PROGRAMME), DEVELOPMENT_PROGRAMME, 18);
    const model = view(active);
    expect(model).toMatchObject({ screen: "exercising", exerciseSecondsRemaining: 42 });
    expect(model).not.toHaveProperty("poseQuality");
    expect(model).not.toHaveProperty("gestureStatus");
  });

  it("models rest before the next exercise in the same set", () => {
    const active = startCurrentExercise(
      startProgramme(createProgrammeRunnerState(DEVELOPMENT_PROGRAMME), DEVELOPMENT_PROGRAMME),
      DEVELOPMENT_PROGRAMME,
    );
    expect(view(tickProgramme(active, DEVELOPMENT_PROGRAMME, 60))).toMatchObject({
      screen: "rest",
      nextExerciseName: "Exercise 02",
      nextExerciseNumber: 2,
      nextSetNumber: 1,
      restSecondsRemaining: 20,
    });
  });

  it("assigns reference left and the existing participant pose surface right", () => {
    expect(createParticipantSplitScreenModel(view())).toEqual({ leftPanel: "reference-video", rightPanel: "participant-camera-with-pose-overlay", displayedExerciseIndex: 0 });
  });

  it("shows the next exercise reference during a transition", () => {
    const active = startCurrentExercise(startProgramme(createProgrammeRunnerState(DEVELOPMENT_PROGRAMME), DEVELOPMENT_PROGRAMME), DEVELOPMENT_PROGRAMME);
    expect(createParticipantSplitScreenModel(view(tickProgramme(active, DEVELOPMENT_PROGRAMME, 60))).displayedExerciseIndex).toBe(1);
  });

  it("advances to Exercise 1 of the next set after Exercise 9", () => {
    const state = {
      ...createProgrammeRunnerState(DEVELOPMENT_PROGRAMME),
      phase: "exercising" as const,
      currentSetIndex: 0,
      currentExerciseIndex: 8,
      exerciseTimeRemainingSeconds: 60,
    };
    expect(view(tickProgramme(state, DEVELOPMENT_PROGRAMME, 60))).toMatchObject({
      screen: "rest",
      nextSetNumber: 2,
      nextExerciseNumber: 1,
      nextExerciseName: "Exercise 01",
    });
  });

  it("models programme completion totals", () => {
    const state = {
      ...createProgrammeRunnerState(DEVELOPMENT_PROGRAMME),
      phase: "exercising" as const,
      currentSetIndex: 2,
      currentExerciseIndex: 8,
      exerciseTimeRemainingSeconds: 60,
    };
    const model = view(tickProgramme(state, DEVELOPMENT_PROGRAMME, 60));
    expect(model).toMatchObject({ screen: "complete", totalSets: 3, exerciseCount: 9 });
    expect(DEVELOPMENT_PROGRAMME.exercises.reduce((sum, item) => sum + (item.sets ?? 1), 0)).toBe(27);
  });

  it.each([
    ["idle", GOOD, "CAMERA IS OFF"],
    ["active", { ...GOOD, personPresent: false }, "STEP INTO VIEW"],
    ["active", { ...GOOD, fullBodyVisible: false }, "MOVE BACK SO YOUR FULL BODY IS VISIBLE"],
    ["active", { ...GOOD, level: "insufficient" }, "CAMERA TRACKING LOST"],
  ] as [CameraStatus, PoseQuality, string][])(
    "maps critical tracking conditions to concise warnings",
    (cameraStatus, quality, expected) => {
      expect(criticalTrackingWarning(cameraStatus, quality)).toBe(expected);
    },
  );
});

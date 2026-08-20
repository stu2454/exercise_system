import { describe, expect, it } from "vitest";
import type { ParticipantViewModel } from "./participantMode";
import {
  participantSpeechPrompt,
} from "./speechPrompts";

function view(overrides: Partial<ParticipantViewModel> = {}): ParticipantViewModel {
  return {
    screen: "ready",
    setNumber: 1,
    totalSets: 3,
    exerciseNumber: 4,
    exerciseCount: 9,
    exerciseName: "Exercise 04",
    nextExerciseName: "Exercise 05",
    nextSetNumber: 1,
    nextExerciseNumber: 5,
    completedExerciseIndices: [0, 1, 2],
    currentExerciseIndex: 3,
    doseType: "duration",
    repetitionTarget: 0,
    completedRepetitions: 0,
    durationSeconds: 60,
    exerciseSecondsRemaining: 60,
    restSecondsRemaining: 20,
    ...overrides,
  };
}

describe("participant speech prompts", () => {
  it("selects READY, start, midpoint, rest, set and completion prompts", () => {
    expect(participantSpeechPrompt(view())?.text).toContain("Exercise 4");
    expect(participantSpeechPrompt(view({ screen: "exercising", exerciseSecondsRemaining: 60 }))?.text).toBe("Begin.");
    expect(participantSpeechPrompt(view({ screen: "exercising", exerciseSecondsRemaining: 30 }))?.text).toBe("30 seconds remaining.");
    expect(participantSpeechPrompt(view({ screen: "rest" }))?.text).toContain("Exercise complete");
    expect(participantSpeechPrompt(view({ screen: "rest", exerciseNumber: 9 }))?.text).toContain("Set 1 complete");
    expect(participantSpeechPrompt(view({ screen: "complete" }))?.text).toBe("Programme complete.");
  });

  it("maps transitions to semantic events and natural-audio paths", () => {
    expect(participantSpeechPrompt(view())).toMatchObject({ event: "exerciseReady", assetPath: "/audio/exercise-ready.mp3" });
    expect(participantSpeechPrompt(view({ screen: "exercising", exerciseSecondsRemaining: 30 }))).toMatchObject({ event: "midpoint", assetPath: "/audio/thirty-seconds-remaining.mp3" });
  });
});

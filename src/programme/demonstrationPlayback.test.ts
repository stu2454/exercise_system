import { describe, expect, it } from "vitest";
import { shouldPlayDemonstration } from "./demonstrationPlayback";

describe("exercise demonstration playback", () => {
  it("starts on READY without waiting for a gesture or exercise recognition", () => {
    expect(shouldPlayDemonstration("ready", false)).toBe(true);
    expect(shouldPlayDemonstration("ready", false, { showBeforeExercise: true })).toBe(true);
  });

  it("continues during an active exercise and follows explicit pause", () => {
    expect(shouldPlayDemonstration("exercising", false)).toBe(true);
    expect(shouldPlayDemonstration("exercising", true)).toBe(false);
  });

  it("does not autoplay on non-exercise screens", () => {
    expect(shouldPlayDemonstration("idle", false)).toBe(false);
    expect(shouldPlayDemonstration("programme-complete", false)).toBe(false);
  });

  it("previews the next exercise while resting before the ready gesture", () => {
    expect(shouldPlayDemonstration("resting", false)).toBe(true);
    expect(shouldPlayDemonstration("resting", false, { showBeforeExercise: true })).toBe(true);
    expect(shouldPlayDemonstration("resting", false, { showBeforeExercise: false })).toBe(false);
  });

  it("honours programme-specific demonstration preferences", () => {
    expect(shouldPlayDemonstration("ready", false, { showBeforeExercise: false })).toBe(false);
    expect(shouldPlayDemonstration("set-complete", false, { showBetweenSets: true })).toBe(true);
    expect(shouldPlayDemonstration("set-complete", false, { showBetweenSets: false })).toBe(false);
  });
});

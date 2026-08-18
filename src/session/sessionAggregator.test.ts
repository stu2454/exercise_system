import { describe, expect, it } from "vitest";
import { createInvalidMovementFeatures } from "../movement/movementFeatures";
import type { MovementFeatures } from "../movement/types";
import type { PoseQuality } from "../pose/types";
import { SessionAggregator } from "./sessionAggregator";

const GOOD: PoseQuality = {
  level: "good",
  personPresent: true,
  fullBodyVisible: true,
  missingRequiredLandmarks: [],
  warnings: [],
};

const ABSENT: PoseQuality = {
  level: "insufficient",
  personPresent: false,
  fullBodyVisible: false,
  missingRequiredLandmarks: [],
  warnings: ["No person detected"],
};

function features(timestampMs: number, activity: number | null): MovementFeatures {
  const result = createInvalidMovementFeatures(timestampMs);
  if (activity === null) return result;
  const value = { value: activity, valid: true, confidence: 0.9 };
  return {
    ...result,
    activityLevel: activity >= 0.2 ? "low" : "still",
    wholeBodyActivity: value,
    upperBodyActivity: value,
    lowerBodyActivity: value,
    trunkActivity: value,
  };
}

describe("SessionAggregator", () => {
  it("excludes tracking loss from active and inactive calculations", () => {
    const session = new SessionAggregator(0);
    session.add({ timestampMs: 0, poseQuality: GOOD, movementFeatures: features(0, 0) });
    // Even a mistakenly valid-looking value must be excluded when tracking is insufficient.
    session.add({ timestampMs: 1000, poseQuality: ABSENT, movementFeatures: features(1000, 5) });
    session.add({ timestampMs: 2000, poseQuality: GOOD, movementFeatures: features(2000, 1) });

    const summary = session.finish(3000);

    expect(summary.durationMs).toBe(3000);
    expect(summary.validObservationFraction).toBeCloseTo(2 / 3);
    expect(summary.visibleFraction).toBeCloseTo(2 / 3);
    expect(summary.activeFraction).toBe(0.5);
    expect(summary.longestInactiveIntervalMs).toBe(1000);
    expect(summary.wholeBodyActivityMean).toBe(0.5);
  });

  it("calculates duration-weighted activity means", () => {
    const session = new SessionAggregator(0);
    session.add({ timestampMs: 0, poseQuality: GOOD, movementFeatures: features(0, 1) });
    session.add({ timestampMs: 1000, poseQuality: GOOD, movementFeatures: features(1000, 3) });

    const summary = session.finish(3000);

    expect(summary.wholeBodyActivityMean).toBeCloseTo(7 / 3);
    expect(summary.upperBodyActivityMean).toBeCloseTo(7 / 3);
    expect(summary.lowerBodyActivityMean).toBeCloseTo(7 / 3);
    expect(summary.trunkActivityMean).toBeCloseTo(7 / 3);
  });
});

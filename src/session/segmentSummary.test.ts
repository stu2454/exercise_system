import { describe, expect, it } from "vitest";
import { createInvalidMovementFeatures } from "../movement/movementFeatures";
import type { ActivityLevel, MovementFeatures } from "../movement/types";
import type { PoseQualityLevel } from "../pose/types";
import type { ReplayOutput } from "./replayProcessor";
import { selectSegmentOutputs, summarizeSegment } from "./segmentSummary";

function output(
  timestampMs: number,
  quality: PoseQualityLevel,
  whole: number | null,
  level: ActivityLevel | null = null,
): ReplayOutput {
  const movementFeatures: MovementFeatures = createInvalidMovementFeatures(timestampMs);
  movementFeatures.activityLevel = level;
  for (const name of [
    "wholeBodyActivity", "upperBodyActivity", "lowerBodyActivity", "trunkActivity",
    "leftUpperLimbActivity", "rightUpperLimbActivity", "leftLowerLimbActivity", "rightLowerLimbActivity",
  ] as const) {
    movementFeatures[name] = { value: whole, valid: whole !== null };
  }
  return {
    timestampMs,
    rawPoseFrame: null,
    filteredPoseFrame: null,
    poseQuality: {
      level: quality,
      personPresent: quality !== "insufficient",
      fullBodyVisible: quality === "good",
      missingRequiredLandmarks: [],
      warnings: [],
    },
    movementFeatures,
  };
}

describe("segment summaries", () => {
  it("uses inclusive start and exclusive end segment boundaries", () => {
    const outputs = [output(1000, "good", 1), output(1100, "good", 2), output(1200, "good", 3)];
    expect(selectSegmentOutputs(outputs, 1000, 100, 200).map((item) => item.timestampMs)).toEqual([1100]);
  });

  it("excludes invalid features from means and reports valid fractions", () => {
    const summary = summarizeSegment([
      output(1000, "good", 2, "low"),
      output(1100, "insufficient", null),
      output(1200, "degraded", 4, "moderate"),
    ]);
    expect(summary.featureMeans.wholeBodyActivity).toBe(3);
    expect(summary.featureValidFractions.wholeBodyActivity).toBeCloseTo(2 / 3);
    expect(summary.validObservationFraction).toBeCloseTo(2 / 3);
    expect(summary.poseQualityDistribution.insufficient).toBeCloseTo(1 / 3);
    expect(summary.activityLevelProportions.low).toBeCloseTo(1 / 3);
  });
});

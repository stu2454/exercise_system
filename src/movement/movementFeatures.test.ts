import { describe, expect, it } from "vitest";
import type { LandmarkName } from "../types/landmarks";
import type { Landmark, PoseFrame, PoseQuality } from "../pose/types";
import { MovementFeatureExtractor } from "./movementFeatures";

const POSITIONS: Record<LandmarkName, [number, number]> = {
  nose: [0.5, 0.1],
  leftShoulder: [0.4, 0.3],
  rightShoulder: [0.6, 0.3],
  leftElbow: [0.35, 0.45],
  rightElbow: [0.65, 0.45],
  leftWrist: [0.3, 0.6],
  rightWrist: [0.7, 0.6],
  leftHip: [0.43, 0.55],
  rightHip: [0.57, 0.55],
  leftKnee: [0.43, 0.75],
  rightKnee: [0.57, 0.75],
  leftAnkle: [0.43, 0.9],
  rightAnkle: [0.57, 0.9],
  leftHeel: [0.42, 0.92],
  rightHeel: [0.58, 0.92],
  leftFootIndex: [0.4, 0.94],
  rightFootIndex: [0.6, 0.94],
};

const GOOD_QUALITY: PoseQuality = {
  level: "good",
  personPresent: true,
  fullBodyVisible: true,
  missingRequiredLandmarks: [],
  warnings: [],
};

const INSUFFICIENT_QUALITY: PoseQuality = {
  level: "insufficient",
  personPresent: false,
  fullBodyVisible: false,
  missingRequiredLandmarks: ["leftShoulder"],
  warnings: ["No person detected"],
};

function pose(
  timestampMs: number,
  offsets: Partial<Record<LandmarkName, [number, number]>> = {},
): PoseFrame {
  const landmarks: PoseFrame["landmarks"] = {};
  for (const [name, [x, y]] of Object.entries(POSITIONS) as [
    LandmarkName,
    [number, number],
  ][]) {
    const [dx, dy] = offsets[name] ?? [0, 0];
    landmarks[name] = { x: x + dx, y: y + dy, confidence: 0.9 };
  }
  return {
    timestampMs,
    source: "participant",
    personConfidence: 0.9,
    landmarks,
  };
}

function featuresFor(
  offsets: Partial<Record<LandmarkName, [number, number]>>,
  elapsedMs = 100,
) {
  const extractor = new MovementFeatureExtractor();
  extractor.process(pose(0), GOOD_QUALITY);
  return extractor.process(pose(elapsedMs, offsets), GOOD_QUALITY);
}

describe("MovementFeatureExtractor synthetic sequences", () => {
  it("reports a stationary participant as still with low activity", () => {
    const features = featuresFor({});

    expect(features.wholeBodyActivity.valid).toBe(true);
    expect(features.wholeBodyActivity.value).toBe(0);
    expect(features.activityLevel).toBe("still");
  });

  it("attributes left-arm-only movement to the upper body and left arm", () => {
    const features = featuresFor({
      leftElbow: [0.05, 0],
      leftWrist: [0.08, 0],
    });

    expect(features.leftUpperLimbActivity.value).toBeGreaterThan(0);
    expect(features.rightUpperLimbActivity.value).toBe(0);
    expect(features.upperBodyActivity.value!).toBeGreaterThan(
      features.lowerBodyActivity.value!,
    );
  });

  it("detects both arms moving", () => {
    const features = featuresFor({
      leftElbow: [-0.05, 0],
      leftWrist: [-0.08, 0],
      rightElbow: [0.05, 0],
      rightWrist: [0.08, 0],
    });

    expect(features.leftUpperLimbActivity.value).toBeGreaterThan(0);
    expect(features.rightUpperLimbActivity.value).toBeGreaterThan(0);
    expect(features.upperBodyActivity.value!).toBeGreaterThan(
      features.lowerBodyActivity.value!,
    );
  });

  it("attributes one-leg stepping to that leg and the lower body", () => {
    const features = featuresFor({
      leftKnee: [0.04, -0.03],
      leftAnkle: [0.08, -0.04],
    });

    expect(features.leftLowerLimbActivity.value).toBeGreaterThan(0);
    expect(features.rightLowerLimbActivity.value).toBe(0);
    expect(features.lowerBodyActivity.value!).toBeGreaterThan(
      features.upperBodyActivity.value!,
    );
  });

  it("detects both legs moving", () => {
    const features = featuresFor({
      leftKnee: [-0.04, 0],
      leftAnkle: [-0.08, 0],
      rightKnee: [0.04, 0],
      rightAnkle: [0.08, 0],
    });

    expect(features.leftLowerLimbActivity.value).toBeGreaterThan(0);
    expect(features.rightLowerLimbActivity.value).toBeGreaterThan(0);
    expect(features.lowerBodyActivity.value!).toBeGreaterThan(
      features.upperBodyActivity.value!,
    );
  });

  it("increases whole-body activity for whole-body translation", () => {
    const offsets = Object.fromEntries(
      Object.keys(POSITIONS).map((name) => [name, [0.05, 0]]),
    ) as Partial<Record<LandmarkName, [number, number]>>;
    const features = featuresFor(offsets);

    expect(features.wholeBodyActivity.value).toBeGreaterThan(1);
    expect(features.trunkActivity.value).toBeGreaterThan(1);
  });

  it("suppresses small artificial jitter", () => {
    const offsets = Object.fromEntries(
      Object.keys(POSITIONS).map((name) => [name, [0.0005, -0.0005]]),
    ) as Partial<Record<LandmarkName, [number, number]>>;
    const features = featuresFor(offsets);

    expect(features.wholeBodyActivity.value).toBe(0);
    expect(features.activityLevel).toBe("still");
  });

  it("invalidates features during tracking loss", () => {
    const extractor = new MovementFeatureExtractor();
    extractor.process(pose(0), GOOD_QUALITY);
    const features = extractor.process(null, INSUFFICIENT_QUALITY, 250);

    expect(features.wholeBodyActivity).toEqual({ value: null, valid: false });
    expect(features.activityLevel).toBeNull();
    expect(features.timestampMs).toBe(250);
  });

  it("does not bridge velocity across a participant leaving and returning", () => {
    const extractor = new MovementFeatureExtractor();
    extractor.process(pose(0), GOOD_QUALITY);
    extractor.process(null, INSUFFICIENT_QUALITY);
    const returned = extractor.process(pose(1000, { leftWrist: [0.2, 0] }), GOOD_QUALITY);
    const next = extractor.process(pose(1100, { leftWrist: [0.21, 0] }), GOOD_QUALITY);

    expect(returned.wholeBodyActivity.valid).toBe(false);
    expect(next.leftWristSpeed.valid).toBe(true);
  });

  it("uses elapsed time so irregular intervals preserve equivalent speed", () => {
    const shortInterval = featuresFor({ leftWrist: [0.05, 0] }, 100);
    const longInterval = featuresFor({ leftWrist: [0.1, 0] }, 200);

    expect(longInterval.leftWristSpeed.value).toBeCloseTo(
      shortInterval.leftWristSpeed.value!,
      8,
    );
  });
});

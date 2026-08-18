import { describe, expect, it } from "vitest";
import type { LandmarkName } from "../types/landmarks";
import type { PoseFrame } from "../pose/types";
import type { PoseObservationRecord } from "./recording";
import type { FeatureValue, MovementFeatures } from "../movement/types";
import {
  COMPARISON_ABSOLUTE_TOLERANCE,
  ReplayProcessor,
  compareFeatureValues,
} from "./replayProcessor";

const positions: Partial<Record<LandmarkName, [number, number]>> = {
  nose: [0.5, 0.12],
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
};

function pose(timestampMs: number, wristOffset = 0): PoseFrame {
  const landmarks: PoseFrame["landmarks"] = {};
  for (const [name, [x, y]] of Object.entries(positions) as [
    LandmarkName,
    [number, number],
  ][]) {
    landmarks[name] = {
      x: name === "leftWrist" ? x + wristOffset : x,
      y,
      confidence: 0.9,
    };
  }
  return {
    timestampMs,
    source: "participant",
    personConfidence: 0.9,
    landmarks,
  };
}

function observation(timestampMs: number, frame: PoseFrame | null): PoseObservationRecord {
  return { type: "pose-observation", timestampMs, pose: frame };
}

function emptyDiagnostics() {
  return {
    poseQualityByTimestamp: new Map(),
    movementFeaturesByTimestamp: new Map(),
  };
}

describe("ReplayProcessor", () => {
  it("processes warm-up observations but excludes them from comparison", () => {
    const observations = [
      observation(100, pose(100)),
      observation(600, pose(600, 0.02)),
      observation(1100, pose(1100, 0.04)),
    ];
    const baseline = new ReplayProcessor(emptyDiagnostics(), { warmupMs: 0 });
    const outputs = observations.map((item) => baseline.process(item));
    const diagnostics = emptyDiagnostics();
    outputs.forEach((output) => {
      diagnostics.poseQualityByTimestamp.set(output.timestampMs, output.poseQuality);
      diagnostics.movementFeaturesByTimestamp.set(output.timestampMs, output.movementFeatures);
    });
    const replay = new ReplayProcessor(diagnostics, { warmupMs: 1000 });
    const replayOutputs = observations.map((item) => replay.process(item));

    expect(replayOutputs).toHaveLength(3);
    expect(replay.getSummary()).toMatchObject({
      observationsProcessed: 3,
      observationsBeforeWarmup: 2,
      observationsCompared: 1,
      qualityComparisons: 1,
    });
  });

  it("evaluates the first observation when warmupMs is zero", () => {
    const diagnostics = emptyDiagnostics();
    diagnostics.poseQualityByTimestamp.set(100, {
      level: "insufficient",
      personPresent: false,
      fullBodyVisible: false,
      missingRequiredLandmarks: [],
      warnings: [],
    });
    const replay = new ReplayProcessor(diagnostics, { warmupMs: 0 });
    replay.process(observation(100, null));
    expect(replay.getSummary()).toMatchObject({
      observationsBeforeWarmup: 0,
      observationsCompared: 1,
      qualityMatches: 1,
    });
  });

  it("propagates no-pose observations without interpolation or fake landmarks", () => {
    const processor = new ReplayProcessor(emptyDiagnostics(), { warmupMs: 0 });
    processor.process(observation(100, pose(100)));
    const output = processor.process(observation(200, null));

    expect(output.rawPoseFrame).toBeNull();
    expect(output.filteredPoseFrame).toBeNull();
    expect(output.poseQuality.level).toBe("insufficient");
    expect(output.movementFeatures.wholeBodyActivity.valid).toBe(false);
  });

  it("produces identical output for the same canonical input after reset", () => {
    const processor = new ReplayProcessor(emptyDiagnostics(), { warmupMs: 0 });
    const observations = [
      observation(100, pose(100)),
      observation(200, pose(200, 0.05)),
      observation(300, null),
    ];
    const first = observations.map((item) => processor.process(item));
    processor.reset();
    const second = observations.map((item) => processor.process(item));

    expect(second).toEqual(first);
  });

  it("uses diagnostics only for comparison, never as replay input", () => {
    const diagnostics = emptyDiagnostics();
    diagnostics.poseQualityByTimestamp.set(100, {
      level: "good",
      personPresent: true,
      fullBodyVisible: true,
      missingRequiredLandmarks: [],
      warnings: [],
    });
    const processor = new ReplayProcessor(diagnostics, { warmupMs: 0 });
    const output = processor.process(observation(100, null));

    expect(output.poseQuality.level).toBe("insufficient");
    expect(processor.getSummary()).toMatchObject({
      qualityMatches: 0,
      qualityComparisons: 1,
    });
  });

  it("reports deterministic diagnostic matches and numerical differences", () => {
    const observations = [
      observation(100, pose(100)),
      observation(200, pose(200, 0.05)),
    ];
    const baseline = new ReplayProcessor(emptyDiagnostics(), { warmupMs: 0 });
    const expected = observations.map((item) => baseline.process(item));
    const diagnostics = emptyDiagnostics();
    expected.forEach((output) => {
      diagnostics.poseQualityByTimestamp.set(output.timestampMs, output.poseQuality);
      diagnostics.movementFeaturesByTimestamp.set(
        output.timestampMs,
        output.movementFeatures,
      );
    });
    const replay = new ReplayProcessor(diagnostics, { warmupMs: 0 });
    observations.forEach((item) => replay.process(item));

    expect(replay.getSummary()).toMatchObject({
      observationsCompared: 2,
      qualityMatches: 2,
      qualityComparisons: 2,
      activityLevelMatches: 2,
      activityLevelComparisons: 2,
      numericalMismatches: [],
      activityLevelMismatches: [],
    });
    for (const feature of Object.values(replay.getSummary().features)) {
      expect(feature).toMatchObject({
        statusComparisons: 2,
        validityStatusMatches: 2,
        validityMismatches: 0,
        nonFiniteValueErrors: 0,
      });
    }
  });

  it("reports activity-level mismatch timestamp and tracking context", () => {
    const observations = [
      observation(100, pose(100)),
      observation(1200, null),
      observation(1300, pose(1300, 0.05)),
    ];
    const baseline = new ReplayProcessor(emptyDiagnostics(), { warmupMs: 0 });
    const expected = observations.map((item) => baseline.process(item));
    const diagnostics = emptyDiagnostics();
    expected.forEach((output) => {
      diagnostics.poseQualityByTimestamp.set(output.timestampMs, output.poseQuality);
      diagnostics.movementFeaturesByTimestamp.set(output.timestampMs, output.movementFeatures);
    });
    diagnostics.movementFeaturesByTimestamp.set(1300, {
      ...expected[2].movementFeatures,
      activityLevel: "still",
    });

    const replay = new ReplayProcessor(diagnostics, { warmupMs: 0 });
    observations.forEach((item) => replay.process(item));

    expect(replay.getSummary().activityLevelMismatches).toEqual([
      expect.objectContaining({
        observationIndex: 2,
        timestampMs: 1300,
        originalActivityLevel: "still",
        replayActivityLevel: null,
        originalPoseQuality: "good",
        replayPoseQuality: "good",
        context: {
          immediatelyPrecededByPoseNull: true,
          qualityTransition: true,
          filterReset: true,
          trackingReacquisition: true,
        },
      }),
    ]);
  });

  it("ignores invalid and non-finite values when calculating max finite delta", () => {
    const observations = [observation(100, pose(100)), observation(200, pose(200, 0.05))];
    const baseline = new ReplayProcessor(emptyDiagnostics(), { warmupMs: 0 });
    const expected = observations.map((item) => baseline.process(item));
    const diagnostics = emptyDiagnostics();
    expected.forEach((output) => {
      diagnostics.poseQualityByTimestamp.set(output.timestampMs, output.poseQuality);
      diagnostics.movementFeaturesByTimestamp.set(output.timestampMs, output.movementFeatures);
    });
    diagnostics.movementFeaturesByTimestamp.set(200, {
      ...expected[1].movementFeatures,
      wholeBodyActivity: { value: null, valid: false },
      upperBodyActivity: { value: Infinity, valid: true },
    });
    const replay = new ReplayProcessor(diagnostics, { warmupMs: 0 });
    observations.forEach((item) => replay.process(item));
    const summary = replay.getSummary();

    expect(summary.features.wholeBodyActivity).toMatchObject({
      validityMismatches: 1,
      maxFiniteDelta: null,
    });
    expect(summary.features.upperBodyActivity).toMatchObject({
      nonFiniteValueErrors: 1,
      maxFiniteDelta: null,
    });
  });

  it("sorts finite numerical mismatches by largest delta", () => {
    const observations = [observation(100, pose(100)), observation(200, pose(200, 0.05))];
    const baseline = new ReplayProcessor(emptyDiagnostics(), { warmupMs: 0 });
    const expected = observations.map((item) => baseline.process(item));
    const diagnostics = emptyDiagnostics();
    expected.forEach((output) => {
      diagnostics.poseQualityByTimestamp.set(output.timestampMs, output.poseQuality);
      diagnostics.movementFeaturesByTimestamp.set(output.timestampMs, output.movementFeatures);
    });
    const second = expected[1].movementFeatures;
    diagnostics.movementFeaturesByTimestamp.set(200, {
      ...second,
      wholeBodyActivity: { ...second.wholeBodyActivity, value: second.wholeBodyActivity.value! + 0.01 },
      upperBodyActivity: { ...second.upperBodyActivity, value: second.upperBodyActivity.value! + 0.02 },
    });
    const replay = new ReplayProcessor(diagnostics, { warmupMs: 0 });
    observations.forEach((item) => replay.process(item));

    expect(replay.getSummary().numericalMismatches.map((item) => item.feature)).toEqual([
      "upperBodyActivity",
      "wholeBodyActivity",
    ]);
  });
});

describe("compareFeatureValues", () => {
  const feature = (value: number | null, valid: boolean): FeatureValue => ({ value, valid });

  it("matches invalid values without a numeric delta, including null vs null", () => {
    const result = compareFeatureValues(feature(null, false), feature(null, false));
    expect(result).toMatchObject({
      kind: "match",
      validityMatches: true,
      numericCompared: false,
      absoluteDelta: null,
    });
  });

  it("reports valid vs invalid as a validity mismatch", () => {
    expect(compareFeatureValues(feature(1, true), feature(null, false))).toMatchObject({
      kind: "validity-mismatch",
      validityMatches: false,
      absoluteDelta: null,
    });
  });

  it("matches finite values within absolute/relative tolerance", () => {
    const result = compareFeatureValues(
      feature(1 + COMPARISON_ABSOLUTE_TOLERANCE / 2, true),
      feature(1, true),
    );
    expect(result).toMatchObject({ kind: "match", numericMatches: true });
  });

  it("reports finite values outside tolerance as numerical mismatches", () => {
    const result = compareFeatureValues(feature(1.01, true), feature(1, true));
    expect(result).toMatchObject({
      kind: "numerical-mismatch",
      numericMatches: false,
      absoluteDelta: expect.closeTo(0.01),
    });
  });

  it.each([Infinity, -Infinity, Number.NaN, null])(
    "reports a valid non-finite/non-numeric value %s explicitly",
    (value) => {
      expect(compareFeatureValues(feature(value, true), feature(1, true))).toMatchObject({
        kind: "non-finite-error",
        numericCompared: false,
        absoluteDelta: null,
      });
    },
  );
});

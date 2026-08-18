import { describe, expect, it } from "vitest";
import realFixtureManifest from "../../test-data/regression/staged-movement-01/expectations.json?raw";
import realFixtureRecording from "../../test-data/regression/staged-movement-01/recording.jsonl?raw";
import type { PoseFrame } from "../pose/types";
import type { PoseObservationRecord } from "./recording";
import {
  RegressionFixtureError,
  evaluateSegmentExpectations,
  parseRegressionFixtureManifest,
  runRegressionFixture,
  runRegressionFixtureFromText,
  type RegressionSegment,
} from "./regressionFixture";
import { ReplayProcessor } from "./replayProcessor";
import type { ReplayRecording } from "./replayRecording";
import type { SegmentSummary } from "./segmentSummary";

function summary(overrides: Partial<SegmentSummary> = {}): SegmentSummary {
  return {
    observationCount: 10,
    validObservationFraction: 1,
    poseQualityDistribution: { good: 1, degraded: 0, insufficient: 0 },
    featureMeans: {
      wholeBodyActivity: 0.5,
      upperBodyActivity: 0.6,
      lowerBodyActivity: 0.2,
      trunkActivity: 0.3,
      leftUpperLimbActivity: 0.8,
      rightUpperLimbActivity: 0.1,
      leftLowerLimbActivity: 0.2,
      rightLowerLimbActivity: 0.2,
    },
    featureValidFractions: {
      wholeBodyActivity: 1,
      upperBodyActivity: 1,
      lowerBodyActivity: 1,
      trunkActivity: 1,
      leftUpperLimbActivity: 1,
      rightUpperLimbActivity: 1,
      leftLowerLimbActivity: 1,
      rightLowerLimbActivity: 1,
    },
    activityLevelProportions: { still: 0.1, low: 0.7, moderate: 0.2, high: 0 },
    ...overrides,
  };
}

function segment(expect: RegressionSegment["expect"]): RegressionSegment {
  return { name: "active", startMs: 0, endMs: 1000, expect };
}

function minimalManifest(): string {
  return JSON.stringify({
    id: "fixture-1",
    description: "Synthetic fixture",
    recordingFile: "recording.jsonl",
    warmupMs: 1000,
    segments: [{ name: "still", startMs: 0, endMs: 1000, expect: { activityLevelMostly: "still" } }],
  });
}

describe("regression fixture properties", () => {
  it("passes and fails left-greater-than-right with diagnostics", () => {
    const passing = evaluateSegmentExpectations(segment({ leftUpperLimbGreaterThanRightUpperLimb: true }), summary(), undefined)[0];
    const failingSummary = summary({ featureMeans: { ...summary().featureMeans, leftUpperLimbActivity: 0.1, rightUpperLimbActivity: 0.8 } });
    const failing = evaluateSegmentExpectations(segment({ leftUpperLimbGreaterThanRightUpperLimb: true }), failingSummary, undefined)[0];
    expect(passing.passed).toBe(true);
    expect(failing).toMatchObject({ passed: false, observed: { leftUpperLimbMean: 0.1, rightUpperLimbMean: 0.8 } });
    expect(failing.message).toContain("Expected leftUpperLimbMean");
  });

  it("evaluates upper greater than lower", () => {
    expect(evaluateSegmentExpectations(segment({ upperBodyGreaterThanLowerBody: true }), summary(), undefined)[0].passed).toBe(true);
    const failing = summary({ featureMeans: { ...summary().featureMeans, upperBodyActivity: 0.1, lowerBodyActivity: 0.2 } });
    expect(evaluateSegmentExpectations(segment({ upperBodyGreaterThanLowerBody: true }), failing, undefined)[0].passed).toBe(false);
  });

  it("compares active segments with the still baseline", () => {
    const still = summary({ featureMeans: { ...summary().featureMeans, wholeBodyActivity: 0.05, lowerBodyActivity: 0.03 } });
    const checks = evaluateSegmentExpectations(segment({ wholeBodyGreaterThanStillSegment: true, lowerBodyGreaterThanStillSegment: true }), summary(), still);
    expect(checks.every((check) => check.passed)).toBe(true);
  });

  it("checks insufficient quality and invalid movement during no-pose periods", () => {
    const noPose = summary({
      validObservationFraction: 0,
      poseQualityDistribution: { good: 0, degraded: 0, insufficient: 1 },
      featureValidFractions: Object.fromEntries(Object.keys(summary().featureValidFractions).map((name) => [name, 0])) as SegmentSummary["featureValidFractions"],
    });
    const checks = evaluateSegmentExpectations(segment({ poseQualityMostly: "insufficient", insufficientQualityProportionAtLeast: 0.95, movementFeaturesInvalid: true }), noPose, undefined);
    expect(checks).toHaveLength(3);
    expect(checks.every((check) => check.passed)).toBe(true);
  });
});

describe("regression fixture parsing and running", () => {
  it("parses a valid JSON fixture manifest", () => {
    expect(parseRegressionFixtureManifest(minimalManifest())).toMatchObject({ id: "fixture-1", warmupMs: 1000 });
  });

  it.each([
    "not json",
    JSON.stringify({ id: "bad" }),
    JSON.stringify({ id: "bad", description: "", recordingFile: "x", warmupMs: -1, segments: [] }),
    JSON.stringify({ id: "bad", description: "", recordingFile: "x", warmupMs: 0, segments: [{ name: "x", startMs: 2, endMs: 1, expect: {} }] }),
  ])("rejects malformed fixture manifests", (json) => {
    expect(() => parseRegressionFixtureManifest(json)).toThrow(RegressionFixtureError);
  });

  it("retains deterministic comparison after warm-up", () => {
    const pose = (timestampMs: number, x: number): PoseFrame => ({
      timestampMs,
      source: "participant",
      personConfidence: 0.9,
      landmarks: Object.fromEntries(["leftShoulder", "rightShoulder", "leftHip", "rightHip", "leftKnee", "rightKnee", "leftAnkle", "rightAnkle"].map((name, index) => [name, { x: x + index * 0.01, y: 0.2 + index * 0.08, confidence: 0.9 }])),
    });
    const observations: PoseObservationRecord[] = [0, 500, 1000, 1500].map((timestampMs, index) => ({ type: "pose-observation", timestampMs, pose: pose(timestampMs, 0.2 + index * 0.01) }));
    const baseline = new ReplayProcessor({ poseQualityByTimestamp: new Map(), movementFeaturesByTimestamp: new Map() }, { warmupMs: 0 });
    const baselineOutputs = observations.map((observation) => baseline.process(observation));
    const diagnostics = {
      poseQualityByTimestamp: new Map(baselineOutputs.map((output) => [output.timestampMs, output.poseQuality])),
      movementFeaturesByTimestamp: new Map(baselineOutputs.map((output) => [output.timestampMs, output.movementFeatures])),
    };
    const recording: ReplayRecording = { metadata: {} as ReplayRecording["metadata"], observations, diagnostics, durationMs: 1500 };
    const manifest = parseRegressionFixtureManifest(JSON.stringify({ id: "determinism", description: "Known empty state", recordingFile: "recording.jsonl", warmupMs: 1000, segments: [{ name: "active", startMs: 1000, endMs: 1600, expect: { validObservationFractionAtLeast: 1 } }] }));
    const result = runRegressionFixture(recording, manifest);

    expect(result.determinism).toMatchObject({ observationsProcessed: 4, observationsBeforeWarmup: 2, observationsCompared: 2, qualityMatches: 2, qualityComparisons: 2, activityLevelMatches: 2, activityLevelComparisons: 2 });
    expect(result.determinism.numericalMismatches).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it("runs the checked-in real fixture through the canonical replay pipeline", () => {
    const result = runRegressionFixtureFromText(
      realFixtureRecording,
      realFixtureManifest,
    );

    expect(result.passed, result.checks.filter((check) => !check.passed).map((check) => check.message).join("\n")).toBe(true);
    expect(result.determinism).toMatchObject({
      observationsProcessed: 3621,
      observationsBeforeWarmup: 60,
      observationsCompared: 3561,
      qualityMatches: 3561,
      qualityComparisons: 3561,
      activityLevelMatches: 3561,
      activityLevelComparisons: 3561,
    });
    expect(result.determinism.numericalMismatches).toEqual([]);
  });
});

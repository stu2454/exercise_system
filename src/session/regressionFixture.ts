import { MOVEMENT_CONFIG } from "../movement/movementConfig";
import type { ActivityLevel } from "../movement/types";
import type { PoseQualityLevel } from "../pose/types";
import { REGRESSION_CONFIG } from "./regressionConfig";
import type { DeterminismSummary, ReplayOutput } from "./replayProcessor";
import { ReplayProcessor } from "./replayProcessor";
import type { ReplayRecording } from "./replayRecording";
import { parseReplayRecording } from "./replayRecording";
import {
  selectSegmentOutputs,
  summarizeSegment,
  type SegmentSummary,
} from "./segmentSummary";

export interface SegmentExpectations {
  activityLevelMostly?: ActivityLevel;
  leftUpperLimbGreaterThanRightUpperLimb?: boolean;
  upperBodyGreaterThanLowerBody?: boolean;
  lowerBodyGreaterThanStillSegment?: boolean;
  wholeBodyGreaterThanStillSegment?: boolean;
  upperBodyActive?: boolean;
  lowerBodyActive?: boolean;
  poseQualityMostly?: PoseQualityLevel;
  insufficientQualityProportionAtLeast?: number;
  movementFeaturesInvalid?: boolean;
  validObservationFractionAtLeast?: number;
}

export interface RegressionSegment {
  name: string;
  startMs: number;
  endMs: number;
  expect: SegmentExpectations;
}

export interface RegressionFixtureManifest {
  id: string;
  description: string;
  recordingFile: string;
  warmupMs: number;
  segments: RegressionSegment[];
}

export interface RegressionCheck {
  name: string;
  passed: boolean;
  observed: Record<string, string | number | boolean | null>;
  message: string;
}

export interface RegressionResult {
  fixture: string;
  passed: boolean;
  warmupMs: number;
  checks: RegressionCheck[];
  segmentSummaries: Record<string, SegmentSummary>;
  determinism: DeterminismSummary;
}

export class RegressionFixtureError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isProportion(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function parseExpectations(value: unknown, segmentName: string): SegmentExpectations {
  if (!isRecord(value)) {
    throw new RegressionFixtureError(`Segment "${segmentName}" must have an expect object.`);
  }
  const activityLevels = ["still", "low", "moderate", "high"];
  const qualityLevels = ["good", "degraded", "insufficient"];
  if (value.activityLevelMostly !== undefined && !activityLevels.includes(String(value.activityLevelMostly))) {
    throw new RegressionFixtureError(`Segment "${segmentName}" has an invalid activityLevelMostly value.`);
  }
  if (value.poseQualityMostly !== undefined && !qualityLevels.includes(String(value.poseQualityMostly))) {
    throw new RegressionFixtureError(`Segment "${segmentName}" has an invalid poseQualityMostly value.`);
  }
  for (const key of ["insufficientQualityProportionAtLeast", "validObservationFractionAtLeast"] as const) {
    if (value[key] !== undefined && !isProportion(value[key])) {
      throw new RegressionFixtureError(`Segment "${segmentName}" has an invalid ${key} value.`);
    }
  }
  for (const key of [
    "leftUpperLimbGreaterThanRightUpperLimb",
    "upperBodyGreaterThanLowerBody",
    "lowerBodyGreaterThanStillSegment",
    "wholeBodyGreaterThanStillSegment",
    "upperBodyActive",
    "lowerBodyActive",
    "movementFeaturesInvalid",
  ] as const) {
    if (value[key] !== undefined && typeof value[key] !== "boolean") {
      throw new RegressionFixtureError(`Segment "${segmentName}" has an invalid ${key} value.`);
    }
  }
  return value as SegmentExpectations;
}

export function parseRegressionFixtureManifest(json: string): RegressionFixtureManifest {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new RegressionFixtureError("Fixture manifest is not valid JSON.");
  }
  if (!isRecord(value) || typeof value.id !== "string" || value.id.trim() === "" ||
      typeof value.description !== "string" || typeof value.recordingFile !== "string" ||
      !isFiniteNonNegative(value.warmupMs) || !Array.isArray(value.segments) || value.segments.length === 0) {
    throw new RegressionFixtureError("Fixture manifest is malformed.");
  }

  const names = new Set<string>();
  const segments = value.segments.map((entry, index): RegressionSegment => {
    if (!isRecord(entry) || typeof entry.name !== "string" || entry.name.trim() === "" ||
        !isFiniteNonNegative(entry.startMs) || !isFiniteNonNegative(entry.endMs) || entry.endMs <= entry.startMs) {
      throw new RegressionFixtureError(`Fixture segment at index ${index} is malformed.`);
    }
    if (names.has(entry.name)) throw new RegressionFixtureError(`Duplicate segment name: "${entry.name}".`);
    names.add(entry.name);
    return { name: entry.name, startMs: entry.startMs, endMs: entry.endMs, expect: parseExpectations(entry.expect, entry.name) };
  });
  return { id: value.id, description: value.description, recordingFile: value.recordingFile, warmupMs: value.warmupMs, segments };
}

function comparisonCheck(
  name: string,
  leftName: string,
  left: number | null,
  rightName: string,
  right: number | null,
): RegressionCheck {
  const passed = left !== null && right !== null && left > right;
  return {
    name,
    passed,
    observed: { [leftName]: left, [rightName]: right },
    message: passed
      ? `${leftName} (${left}) was greater than ${rightName} (${right}).`
      : `Expected ${leftName} to be greater than ${rightName}; observed ${left} versus ${right}.`,
  };
}

function booleanCheck(
  name: string,
  passed: boolean,
  observed: RegressionCheck["observed"],
  failureMessage: string,
): RegressionCheck {
  return { name, passed, observed, message: passed ? "Expectation satisfied." : failureMessage };
}

export function evaluateSegmentExpectations(
  segment: RegressionSegment,
  summary: SegmentSummary,
  stillSummary: SegmentSummary | undefined,
): RegressionCheck[] {
  const checks: RegressionCheck[] = [];
  const expect = segment.expect;
  const means = summary.featureMeans;
  if (expect.activityLevelMostly) {
    const expected = expect.activityLevelMostly;
    const expectedProportion = summary.activityLevelProportions[expected];
    const maximum = Math.max(...Object.values(summary.activityLevelProportions));
    checks.push(booleanCheck(`${segment.name}.activityLevelMostly`, expectedProportion === maximum && maximum > 0,
      { expected, expectedProportion, maximum }, `Expected ${expected} to be the most common activity level.`));
  }
  if (expect.leftUpperLimbGreaterThanRightUpperLimb) {
    checks.push(comparisonCheck(`${segment.name}.leftUpperLimbGreaterThanRightUpperLimb`, "leftUpperLimbMean", means.leftUpperLimbActivity, "rightUpperLimbMean", means.rightUpperLimbActivity));
  }
  if (expect.upperBodyGreaterThanLowerBody) {
    checks.push(comparisonCheck(`${segment.name}.upperBodyGreaterThanLowerBody`, "upperBodyMean", means.upperBodyActivity, "lowerBodyMean", means.lowerBodyActivity));
  }
  if (expect.lowerBodyGreaterThanStillSegment) {
    checks.push(comparisonCheck(`${segment.name}.lowerBodyGreaterThanStillSegment`, "lowerBodyMean", means.lowerBodyActivity, "stillLowerBodyMean", stillSummary?.featureMeans.lowerBodyActivity ?? null));
  }
  if (expect.wholeBodyGreaterThanStillSegment) {
    checks.push(comparisonCheck(`${segment.name}.wholeBodyGreaterThanStillSegment`, "wholeBodyMean", means.wholeBodyActivity, "stillWholeBodyMean", stillSummary?.featureMeans.wholeBodyActivity ?? null));
  }
  for (const [expectation, feature] of [["upperBodyActive", "upperBodyActivity"], ["lowerBodyActive", "lowerBodyActivity"]] as const) {
    if (expect[expectation]) {
      const mean = means[feature];
      checks.push(booleanCheck(`${segment.name}.${expectation}`, mean !== null && mean >= MOVEMENT_CONFIG.activeThreshold,
        { mean, activeThreshold: MOVEMENT_CONFIG.activeThreshold }, `Expected ${feature} mean to meet the active threshold.`));
    }
  }
  if (expect.poseQualityMostly) {
    const expected = expect.poseQualityMostly;
    const expectedProportion = summary.poseQualityDistribution[expected];
    const maximum = Math.max(...Object.values(summary.poseQualityDistribution));
    checks.push(booleanCheck(`${segment.name}.poseQualityMostly`, expectedProportion === maximum && maximum > 0,
      { expected, expectedProportion, maximum }, `Expected ${expected} to be the most common pose quality.`));
  }
  if (expect.insufficientQualityProportionAtLeast !== undefined) {
    const observed = summary.poseQualityDistribution.insufficient;
    checks.push(booleanCheck(`${segment.name}.insufficientQualityProportionAtLeast`, observed >= expect.insufficientQualityProportionAtLeast,
      { observed, minimum: expect.insufficientQualityProportionAtLeast }, `Expected insufficient-quality proportion of at least ${expect.insufficientQualityProportionAtLeast}; observed ${observed}.`));
  }
  if (expect.movementFeaturesInvalid) {
    const maximumValidFraction = Math.max(
      summary.featureValidFractions.wholeBodyActivity,
      summary.featureValidFractions.upperBodyActivity,
      summary.featureValidFractions.lowerBodyActivity,
      summary.featureValidFractions.trunkActivity,
    );
    checks.push(booleanCheck(`${segment.name}.movementFeaturesInvalid`, maximumValidFraction === 0,
      { maximumMajorFeatureValidFraction: maximumValidFraction }, "Expected all major movement features to be invalid throughout the segment."));
  }
  if (expect.validObservationFractionAtLeast !== undefined) {
    checks.push(booleanCheck(`${segment.name}.validObservationFractionAtLeast`, summary.validObservationFraction >= expect.validObservationFractionAtLeast,
      { observed: summary.validObservationFraction, minimum: expect.validObservationFractionAtLeast }, `Expected valid-observation fraction of at least ${expect.validObservationFractionAtLeast}; observed ${summary.validObservationFraction}.`));
  }
  return checks;
}

export function runRegressionFixture(
  recording: ReplayRecording,
  manifest: RegressionFixtureManifest,
): RegressionResult {
  const warmupMs = manifest.warmupMs ?? REGRESSION_CONFIG.defaultWarmupMs;
  const processor = new ReplayProcessor(recording.diagnostics, { warmupMs });
  const outputs: ReplayOutput[] = recording.observations.map((observation) => processor.process(observation));
  const startTimestampMs = recording.observations[0].timestampMs;
  const segmentSummaries = Object.fromEntries(manifest.segments.map((segment) => [
    segment.name,
    summarizeSegment(selectSegmentOutputs(outputs, startTimestampMs, segment.startMs, segment.endMs)),
  ]));
  const stillSummary = segmentSummaries.still;
  const checks = manifest.segments.flatMap((segment) =>
    evaluateSegmentExpectations(segment, segmentSummaries[segment.name], stillSummary));
  return {
    fixture: manifest.id,
    passed: checks.length > 0 && checks.every((check) => check.passed),
    warmupMs,
    checks,
    segmentSummaries,
    determinism: processor.getSummary(),
  };
}

export function runRegressionFixtureFromText(
  recordingJsonl: string,
  manifestJson: string,
): RegressionResult {
  return runRegressionFixture(
    parseReplayRecording(recordingJsonl),
    parseRegressionFixtureManifest(manifestJson),
  );
}

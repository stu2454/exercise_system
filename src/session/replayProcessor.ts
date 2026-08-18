import { MovementFeatureExtractor } from "../movement/movementFeatures";
import type { FeatureValue, MovementFeatures } from "../movement/types";
import { PoseLandmarkFilter } from "../pose/poseFilter";
import { POSE_PROCESSING_CONFIG } from "../pose/poseProcessingConfig";
import { PoseQualityAssessor } from "../pose/poseQuality";
import type { PoseFrame, PoseQuality, PoseQualityLevel } from "../pose/types";
import type { PoseObservationRecord } from "./recording";
import type { ReplayDiagnostics } from "./replayRecording";
import { REGRESSION_CONFIG } from "./regressionConfig";

export const COMPARISON_ABSOLUTE_TOLERANCE = 1e-9;
export const COMPARISON_RELATIVE_TOLERANCE = 1e-9;

export const MAJOR_FEATURES = [
  "wholeBodyActivity",
  "upperBodyActivity",
  "lowerBodyActivity",
  "trunkActivity",
] as const;

export type MajorFeatureName = (typeof MAJOR_FEATURES)[number];

export interface ReplayOutput {
  timestampMs: number;
  rawPoseFrame: PoseFrame | null;
  filteredPoseFrame: PoseFrame | null;
  poseQuality: PoseQuality;
  movementFeatures: MovementFeatures;
}

export interface FeatureComparison {
  kind: "match" | "validity-mismatch" | "numerical-mismatch" | "non-finite-error";
  validityMatches: boolean;
  numericCompared: boolean;
  numericMatches: boolean | null;
  absoluteDelta: number | null;
  tolerance: number | null;
}

export interface FeatureComparisonSummary {
  statusComparisons: number;
  validityStatusMatches: number;
  validNumericComparisons: number;
  numericMatchesWithinTolerance: number;
  maxFiniteDelta: number | null;
  validityMismatches: number;
  nonFiniteValueErrors: number;
}

export interface FeatureDiagnosticValue {
  value: number | null;
  valid: boolean;
}

export interface ActivityLevelMismatchDiagnostic {
  observationIndex: number;
  timestampMs: number;
  originalActivityLevel: MovementFeatures["activityLevel"];
  replayActivityLevel: MovementFeatures["activityLevel"];
  originalWholeBodyActivity: FeatureDiagnosticValue;
  replayWholeBodyActivity: FeatureDiagnosticValue;
  originalPoseQuality: PoseQualityLevel | null;
  replayPoseQuality: PoseQualityLevel;
  context: {
    immediatelyPrecededByPoseNull: boolean;
    qualityTransition: boolean;
    filterReset: boolean;
    trackingReacquisition: boolean;
  };
}

export interface NumericalMismatchDiagnostic {
  observationIndex: number;
  timestampMs: number;
  feature: MajorFeatureName;
  originalValue: number;
  replayValue: number;
  absoluteDelta: number;
}

export interface DeterminismSummary {
  observationsProcessed: number;
  observationsBeforeWarmup: number;
  observationsCompared: number;
  qualityMatches: number;
  qualityComparisons: number;
  activityLevelMatches: number;
  activityLevelComparisons: number;
  features: Record<MajorFeatureName, FeatureComparisonSummary>;
  activityLevelMismatches: ActivityLevelMismatchDiagnostic[];
  numericalMismatches: NumericalMismatchDiagnostic[];
}

export function compareFeatureValues(
  replay: FeatureValue,
  original: FeatureValue,
): FeatureComparison {
  if (replay.valid !== original.valid) {
    return { kind: "validity-mismatch", validityMatches: false, numericCompared: false, numericMatches: null, absoluteDelta: null, tolerance: null };
  }
  if (!replay.valid) {
    return { kind: "match", validityMatches: true, numericCompared: false, numericMatches: null, absoluteDelta: null, tolerance: null };
  }
  if (
    typeof replay.value !== "number" ||
    typeof original.value !== "number" ||
    !Number.isFinite(replay.value) ||
    !Number.isFinite(original.value)
  ) {
    return { kind: "non-finite-error", validityMatches: true, numericCompared: false, numericMatches: null, absoluteDelta: null, tolerance: null };
  }

  const absoluteDelta = Math.abs(replay.value - original.value);
  const tolerance = COMPARISON_ABSOLUTE_TOLERANCE +
    COMPARISON_RELATIVE_TOLERANCE * Math.max(Math.abs(replay.value), Math.abs(original.value));
  const numericMatches = absoluteDelta <= tolerance;
  return {
    kind: numericMatches ? "match" : "numerical-mismatch",
    validityMatches: true,
    numericCompared: true,
    numericMatches,
    absoluteDelta,
    tolerance,
  };
}

function diagnosticValue(feature: FeatureValue): FeatureDiagnosticValue {
  return { value: feature.value, valid: feature.valid };
}

function emptyFeatureSummary(): FeatureComparisonSummary {
  return {
    statusComparisons: 0,
    validityStatusMatches: 0,
    validNumericComparisons: 0,
    numericMatchesWithinTolerance: 0,
    maxFiniteDelta: null,
    validityMismatches: 0,
    nonFiniteValueErrors: 0,
  };
}

export class ReplayProcessor {
  private readonly qualityAssessor = new PoseQualityAssessor();
  private readonly landmarkFilter = new PoseLandmarkFilter();
  private readonly movementExtractor = new MovementFeatureExtractor();
  private summary: DeterminismSummary = this.emptySummary();
  private previousObservation: PoseObservationRecord | null = null;
  private previousReplayQuality: PoseQualityLevel | null = null;
  private lastPoseTimestampMs: number | null = null;
  private filterResetPendingReacquisition = false;
  private processingStateWasReset = true;
  private firstTimestampMs: number | null = null;
  private readonly warmupMs: number;

  constructor(
    private readonly diagnostics: ReplayDiagnostics,
    options: { warmupMs?: number } = {},
  ) {
    const requestedWarmupMs = options.warmupMs ?? REGRESSION_CONFIG.defaultWarmupMs;
    this.warmupMs = Number.isFinite(requestedWarmupMs) && requestedWarmupMs >= 0
      ? requestedWarmupMs
      : REGRESSION_CONFIG.defaultWarmupMs;
  }

  reset(): void {
    this.qualityAssessor.reset();
    this.landmarkFilter.reset();
    this.movementExtractor.reset();
    this.summary = this.emptySummary();
    this.previousObservation = null;
    this.previousReplayQuality = null;
    this.lastPoseTimestampMs = null;
    this.filterResetPendingReacquisition = false;
    this.processingStateWasReset = true;
    this.firstTimestampMs = null;
  }

  process(observation: PoseObservationRecord): ReplayOutput {
    const observationIndex = this.summary.observationsProcessed;
    this.firstTimestampMs ??= observation.timestampMs;
    const context = this.makeContext(observation);
    const rawPoseFrame = observation.pose;
    const poseQuality = this.qualityAssessor.assess(rawPoseFrame, observation.timestampMs);
    const filteredPoseFrame = this.landmarkFilter.filter(rawPoseFrame, observation.timestampMs);
    const movementFeatures = this.movementExtractor.process(filteredPoseFrame, poseQuality, observation.timestampMs);
    const output = { timestampMs: observation.timestampMs, rawPoseFrame, filteredPoseFrame, poseQuality, movementFeatures };
    this.summary.observationsProcessed += 1;
    if (observation.timestampMs - this.firstTimestampMs < this.warmupMs) {
      this.summary.observationsBeforeWarmup += 1;
    } else {
      this.compare(output, observationIndex, context);
    }
    this.previousObservation = observation;
    this.previousReplayQuality = poseQuality.level;
    return output;
  }

  getSummary(): DeterminismSummary {
    return {
      ...this.summary,
      features: Object.fromEntries(
        MAJOR_FEATURES.map((name) => [name, { ...this.summary.features[name] }]),
      ) as Record<MajorFeatureName, FeatureComparisonSummary>,
      activityLevelMismatches: this.summary.activityLevelMismatches.map((item) => ({ ...item, context: { ...item.context } })),
      numericalMismatches: [...this.summary.numericalMismatches].sort((left, right) => right.absoluteDelta - left.absoluteDelta),
    };
  }

  private makeContext(observation: PoseObservationRecord) {
    const immediatelyPrecededByPoseNull = this.previousObservation?.pose === null;
    const trackingReacquisition = observation.pose !== null && immediatelyPrecededByPoseNull;
    let filterReset = this.processingStateWasReset;
    this.processingStateWasReset = false;

    if (observation.pose === null) {
      if (
        this.lastPoseTimestampMs !== null &&
        !this.filterResetPendingReacquisition &&
        observation.timestampMs - this.lastPoseTimestampMs >= POSE_PROCESSING_CONFIG.filter.resetAfterLossMs
      ) {
        this.filterResetPendingReacquisition = true;
      }
    } else {
      filterReset = this.filterResetPendingReacquisition ||
        (this.lastPoseTimestampMs !== null &&
          observation.timestampMs - this.lastPoseTimestampMs >= POSE_PROCESSING_CONFIG.filter.resetAfterLossMs);
      this.lastPoseTimestampMs = observation.timestampMs;
      this.filterResetPendingReacquisition = false;
    }

    return { immediatelyPrecededByPoseNull, trackingReacquisition, filterReset };
  }

  private compare(
    output: ReplayOutput,
    observationIndex: number,
    context: { immediatelyPrecededByPoseNull: boolean; trackingReacquisition: boolean; filterReset: boolean },
  ): void {
    this.summary.observationsCompared += 1;
    const expectedQuality = this.diagnostics.poseQualityByTimestamp.get(output.timestampMs);
    if (expectedQuality) {
      this.summary.qualityComparisons += 1;
      if (expectedQuality.level === output.poseQuality.level) this.summary.qualityMatches += 1;
    }

    const expectedMovement = this.diagnostics.movementFeaturesByTimestamp.get(output.timestampMs);
    if (!expectedMovement) return;

    this.summary.activityLevelComparisons += 1;
    if (expectedMovement.activityLevel === output.movementFeatures.activityLevel) {
      this.summary.activityLevelMatches += 1;
    } else {
      this.summary.activityLevelMismatches.push({
        observationIndex,
        timestampMs: output.timestampMs,
        originalActivityLevel: expectedMovement.activityLevel,
        replayActivityLevel: output.movementFeatures.activityLevel,
        originalWholeBodyActivity: diagnosticValue(expectedMovement.wholeBodyActivity),
        replayWholeBodyActivity: diagnosticValue(output.movementFeatures.wholeBodyActivity),
        originalPoseQuality: expectedQuality?.level ?? null,
        replayPoseQuality: output.poseQuality.level,
        context: {
          ...context,
          qualityTransition: this.previousReplayQuality !== null && this.previousReplayQuality !== output.poseQuality.level,
        },
      });
    }

    for (const name of MAJOR_FEATURES) {
      const featureSummary = this.summary.features[name];
      const comparison = compareFeatureValues(output.movementFeatures[name], expectedMovement[name]);
      featureSummary.statusComparisons += 1;
      if (comparison.validityMatches) featureSummary.validityStatusMatches += 1;
      else featureSummary.validityMismatches += 1;
      if (comparison.kind === "non-finite-error") featureSummary.nonFiniteValueErrors += 1;
      if (!comparison.numericCompared || comparison.absoluteDelta === null) continue;

      featureSummary.validNumericComparisons += 1;
      if (comparison.numericMatches) {
        featureSummary.numericMatchesWithinTolerance += 1;
      } else {
        this.summary.numericalMismatches.push({
          observationIndex,
          timestampMs: output.timestampMs,
          feature: name,
          originalValue: expectedMovement[name].value!,
          replayValue: output.movementFeatures[name].value!,
          absoluteDelta: comparison.absoluteDelta,
        });
      }
      featureSummary.maxFiniteDelta = Math.max(featureSummary.maxFiniteDelta ?? 0, comparison.absoluteDelta);
    }
  }

  private emptySummary(): DeterminismSummary {
    return {
      observationsProcessed: 0,
      observationsBeforeWarmup: 0,
      observationsCompared: 0,
      qualityMatches: 0,
      qualityComparisons: 0,
      activityLevelMatches: 0,
      activityLevelComparisons: 0,
      features: {
        wholeBodyActivity: emptyFeatureSummary(),
        upperBodyActivity: emptyFeatureSummary(),
        lowerBodyActivity: emptyFeatureSummary(),
        trunkActivity: emptyFeatureSummary(),
      },
      activityLevelMismatches: [],
      numericalMismatches: [],
    };
  }
}

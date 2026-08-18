import type { ActivityLevel, MovementFeatures } from "../movement/types";
import type { PoseQualityLevel } from "../pose/types";
import type { ReplayOutput } from "./replayProcessor";

export const SUMMARY_FEATURES = [
  "wholeBodyActivity",
  "upperBodyActivity",
  "lowerBodyActivity",
  "trunkActivity",
  "leftUpperLimbActivity",
  "rightUpperLimbActivity",
  "leftLowerLimbActivity",
  "rightLowerLimbActivity",
] as const satisfies readonly (keyof MovementFeatures)[];

export type SummaryFeatureName = (typeof SUMMARY_FEATURES)[number];

export interface SegmentSummary {
  observationCount: number;
  validObservationFraction: number;
  poseQualityDistribution: Record<PoseQualityLevel, number>;
  featureMeans: Record<SummaryFeatureName, number | null>;
  featureValidFractions: Record<SummaryFeatureName, number>;
  activityLevelProportions: Record<ActivityLevel, number>;
}

function fraction(count: number, total: number): number {
  return total === 0 ? 0 : count / total;
}

export function selectSegmentOutputs(
  outputs: readonly ReplayOutput[],
  recordingStartTimestampMs: number,
  startMs: number,
  endMs: number,
): ReplayOutput[] {
  return outputs.filter((output) => {
    const elapsedMs = output.timestampMs - recordingStartTimestampMs;
    return elapsedMs >= startMs && elapsedMs < endMs;
  });
}

export function summarizeSegment(outputs: readonly ReplayOutput[]): SegmentSummary {
  const observationCount = outputs.length;
  const poseQualityDistribution = {
    good: fraction(outputs.filter((output) => output.poseQuality.level === "good").length, observationCount),
    degraded: fraction(outputs.filter((output) => output.poseQuality.level === "degraded").length, observationCount),
    insufficient: fraction(outputs.filter((output) => output.poseQuality.level === "insufficient").length, observationCount),
  };
  const featureMeans = {} as Record<SummaryFeatureName, number | null>;
  const featureValidFractions = {} as Record<SummaryFeatureName, number>;

  for (const name of SUMMARY_FEATURES) {
    const validValues = outputs
      .map((output) => output.movementFeatures[name])
      .filter((feature) => feature.valid && feature.value !== null && Number.isFinite(feature.value))
      .map((feature) => feature.value!);
    featureMeans[name] = validValues.length === 0
      ? null
      : validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
    featureValidFractions[name] = fraction(validValues.length, observationCount);
  }

  const activityLevelProportions = Object.fromEntries(
    (["still", "low", "moderate", "high"] as const).map((level) => [
      level,
      fraction(outputs.filter((output) => output.movementFeatures.activityLevel === level).length, observationCount),
    ]),
  ) as Record<ActivityLevel, number>;

  return {
    observationCount,
    validObservationFraction: fraction(
      outputs.filter((output) => output.poseQuality.level !== "insufficient").length,
      observationCount,
    ),
    poseQualityDistribution,
    featureMeans,
    featureValidFractions,
    activityLevelProportions,
  };
}

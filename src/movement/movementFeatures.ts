import type { LandmarkName } from "../types/landmarks";
import type { Landmark, PoseFrame, PoseQuality } from "../pose/types";
import { distance2d, estimateBodyScale, midpoint } from "./geometry";
import {
  MOVEMENT_CONFIG,
  type MovementConfig,
} from "./movementConfig";
import type {
  ActivityLevel,
  FeatureValue,
  MovementFeatures,
} from "./types";

const INVALID_FEATURE: FeatureValue = { value: null, valid: false };

function invalidFeature(): FeatureValue {
  return { ...INVALID_FEATURE };
}

export function createInvalidMovementFeatures(timestampMs: number): MovementFeatures {
  return {
    timestampMs,
    activityLevel: null,
    wholeBodyActivity: invalidFeature(),
    upperBodyActivity: invalidFeature(),
    lowerBodyActivity: invalidFeature(),
    trunkActivity: invalidFeature(),
    leftUpperLimbActivity: invalidFeature(),
    rightUpperLimbActivity: invalidFeature(),
    leftLowerLimbActivity: invalidFeature(),
    rightLowerLimbActivity: invalidFeature(),
    leftWristSpeed: invalidFeature(),
    rightWristSpeed: invalidFeature(),
    leftAnkleSpeed: invalidFeature(),
    rightAnkleSpeed: invalidFeature(),
    hipCentreSpeed: invalidFeature(),
    shoulderCentreSpeed: invalidFeature(),
  };
}

function meanFeature(features: readonly FeatureValue[]): FeatureValue {
  const valid = features.filter(
    (feature): feature is FeatureValue & { value: number } =>
      feature.valid && feature.value !== null,
  );
  if (valid.length === 0) {
    return invalidFeature();
  }

  return {
    value: valid.reduce((sum, feature) => sum + feature.value, 0) / valid.length,
    valid: true,
    confidence: Math.min(...valid.map((feature) => feature.confidence ?? 1)),
  };
}

function normalizedSpeed(
  previous: Pick<Landmark, "x" | "y" | "confidence"> | null | undefined,
  current: Pick<Landmark, "x" | "y" | "confidence"> | null | undefined,
  elapsedSeconds: number,
  bodyScale: number,
  config: MovementConfig,
): FeatureValue {
  if (
    !previous ||
    !current ||
    previous.confidence < config.minLandmarkConfidence ||
    current.confidence < config.minLandmarkConfidence
  ) {
    return invalidFeature();
  }

  const rawSpeed = distance2d(previous, current) / elapsedSeconds / bodyScale;
  return {
    value: Math.max(0, rawSpeed - config.jitterFloorBodyLengthsPerSecond),
    valid: true,
    confidence: Math.min(previous.confidence, current.confidence),
  };
}

function landmarkSpeed(
  previousFrame: PoseFrame,
  currentFrame: PoseFrame,
  name: LandmarkName,
  elapsedSeconds: number,
  bodyScale: number,
  config: MovementConfig,
): FeatureValue {
  return normalizedSpeed(
    previousFrame.landmarks[name],
    currentFrame.landmarks[name],
    elapsedSeconds,
    bodyScale,
    config,
  );
}

export function classifyActivity(
  activity: FeatureValue,
  config: MovementConfig = MOVEMENT_CONFIG,
): ActivityLevel | null {
  if (!activity.valid || activity.value === null) {
    return null;
  }

  if (activity.value < config.activityLevels.stillBelow) return "still";
  if (activity.value < config.activityLevels.lowBelow) return "low";
  if (activity.value < config.activityLevels.moderateBelow) return "moderate";
  return "high";
}

export class MovementFeatureExtractor {
  private previousFrame: PoseFrame | null = null;

  constructor(private readonly config: MovementConfig = MOVEMENT_CONFIG) {}

  reset(): void {
    this.previousFrame = null;
  }

  process(
    frame: PoseFrame | null,
    quality: PoseQuality,
    fallbackTimestampMs = 0,
  ): MovementFeatures {
    const timestampMs = frame?.timestampMs ?? fallbackTimestampMs;
    if (!frame || quality.level === "insufficient") {
      this.reset();
      return createInvalidMovementFeatures(timestampMs);
    }

    const previousFrame = this.previousFrame;
    this.previousFrame = frame;
    if (!previousFrame) {
      return createInvalidMovementFeatures(frame.timestampMs);
    }

    const elapsedMs = frame.timestampMs - previousFrame.timestampMs;
    if (elapsedMs <= 0 || elapsedMs > this.config.maxFrameGapMs) {
      return createInvalidMovementFeatures(frame.timestampMs);
    }

    const bodyScale = estimateBodyScale(
      frame,
      this.config.minLandmarkConfidence,
      this.config.minBodyScaleNormalized,
    );
    if (!bodyScale.valid || bodyScale.value === null) {
      return createInvalidMovementFeatures(frame.timestampMs);
    }

    const elapsedSeconds = elapsedMs / 1000;
    const speed = (name: LandmarkName) =>
      landmarkSpeed(
        previousFrame,
        frame,
        name,
        elapsedSeconds,
        bodyScale.value!,
        this.config,
      );

    const leftWristSpeed = speed("leftWrist");
    const rightWristSpeed = speed("rightWrist");
    const leftAnkleSpeed = speed("leftAnkle");
    const rightAnkleSpeed = speed("rightAnkle");
    const leftShoulderSpeed = speed("leftShoulder");
    const rightShoulderSpeed = speed("rightShoulder");
    const leftElbowSpeed = speed("leftElbow");
    const rightElbowSpeed = speed("rightElbow");
    const leftHipSpeed = speed("leftHip");
    const rightHipSpeed = speed("rightHip");
    const leftKneeSpeed = speed("leftKnee");
    const rightKneeSpeed = speed("rightKnee");

    const previousHipCentre = midpoint(
      previousFrame.landmarks.leftHip,
      previousFrame.landmarks.rightHip,
      this.config.minLandmarkConfidence,
    );
    const hipCentre = midpoint(
      frame.landmarks.leftHip,
      frame.landmarks.rightHip,
      this.config.minLandmarkConfidence,
    );
    const previousShoulderCentre = midpoint(
      previousFrame.landmarks.leftShoulder,
      previousFrame.landmarks.rightShoulder,
      this.config.minLandmarkConfidence,
    );
    const shoulderCentre = midpoint(
      frame.landmarks.leftShoulder,
      frame.landmarks.rightShoulder,
      this.config.minLandmarkConfidence,
    );

    const hipCentreSpeed = normalizedSpeed(
      previousHipCentre,
      hipCentre,
      elapsedSeconds,
      bodyScale.value,
      this.config,
    );
    const shoulderCentreSpeed = normalizedSpeed(
      previousShoulderCentre,
      shoulderCentre,
      elapsedSeconds,
      bodyScale.value,
      this.config,
    );

    const leftUpperLimbActivity = meanFeature([
      leftShoulderSpeed,
      leftElbowSpeed,
      leftWristSpeed,
    ]);
    const rightUpperLimbActivity = meanFeature([
      rightShoulderSpeed,
      rightElbowSpeed,
      rightWristSpeed,
    ]);
    const leftLowerLimbActivity = meanFeature([
      leftHipSpeed,
      leftKneeSpeed,
      leftAnkleSpeed,
    ]);
    const rightLowerLimbActivity = meanFeature([
      rightHipSpeed,
      rightKneeSpeed,
      rightAnkleSpeed,
    ]);
    const upperBodyActivity = meanFeature([
      leftUpperLimbActivity,
      rightUpperLimbActivity,
    ]);
    const lowerBodyActivity = meanFeature([
      leftLowerLimbActivity,
      rightLowerLimbActivity,
    ]);
    const trunkActivity = meanFeature([hipCentreSpeed, shoulderCentreSpeed]);
    const wholeBodyActivity = meanFeature([
      upperBodyActivity,
      lowerBodyActivity,
      trunkActivity,
    ]);

    return {
      timestampMs: frame.timestampMs,
      activityLevel: classifyActivity(wholeBodyActivity, this.config),
      wholeBodyActivity,
      upperBodyActivity,
      lowerBodyActivity,
      trunkActivity,
      leftUpperLimbActivity,
      rightUpperLimbActivity,
      leftLowerLimbActivity,
      rightLowerLimbActivity,
      leftWristSpeed,
      rightWristSpeed,
      leftAnkleSpeed,
      rightAnkleSpeed,
      hipCentreSpeed,
      shoulderCentreSpeed,
    };
  }
}

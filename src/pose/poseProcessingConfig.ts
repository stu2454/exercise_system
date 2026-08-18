import type { LandmarkName } from "../types/landmarks";

export interface PoseProcessingConfig {
  version: string;
  quality: {
    requiredLandmarks: readonly LandmarkName[];
    fullBodyLandmarks: readonly LandmarkName[];
    lowerBodyLandmarks: readonly LandmarkName[];
    minLandmarkConfidence: number;
    insufficientPersonConfidence: number;
    frameBoundaryMargin: number;
    maxLandmarkJumpNormalized: number;
    prolongedLandmarkLossMs: number;
    insufficientMissingRequiredCount: number;
  };
  filter: {
    emaAlpha: number;
    resetAfterLossMs: number;
  };
}

export const POSE_PROCESSING_CONFIG: PoseProcessingConfig = {
  version: "build-3-v1",
  quality: {
    requiredLandmarks: [
      "leftShoulder",
      "rightShoulder",
      "leftHip",
      "rightHip",
      "leftKnee",
      "rightKnee",
      "leftAnkle",
      "rightAnkle",
    ],
    fullBodyLandmarks: [
      "nose",
      "leftShoulder",
      "rightShoulder",
      "leftHip",
      "rightHip",
      "leftKnee",
      "rightKnee",
      "leftAnkle",
      "rightAnkle",
    ],
    lowerBodyLandmarks: [
      "leftHip",
      "rightHip",
      "leftKnee",
      "rightKnee",
      "leftAnkle",
      "rightAnkle",
    ],
    minLandmarkConfidence: 0.5,
    insufficientPersonConfidence: 0.25,
    frameBoundaryMargin: 0.04,
    maxLandmarkJumpNormalized: 0.35,
    prolongedLandmarkLossMs: 1000,
    insufficientMissingRequiredCount: 3,
  },
  filter: {
    emaAlpha: 0.35,
    resetAfterLossMs: 1000,
  },
};

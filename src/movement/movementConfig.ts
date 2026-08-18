export interface MovementConfig {
  version: string;
  minLandmarkConfidence: number;
  minBodyScaleNormalized: number;
  maxFrameGapMs: number;
  jitterFloorBodyLengthsPerSecond: number;
  activeThreshold: number;
  activityLevels: {
    stillBelow: number;
    lowBelow: number;
    moderateBelow: number;
  };
}

export const MOVEMENT_CONFIG: MovementConfig = {
  version: "build-4-v1",
  minLandmarkConfidence: 0.5,
  minBodyScaleNormalized: 0.05,
  maxFrameGapMs: 500,
  jitterFloorBodyLengthsPerSecond: 0.05,
  activeThreshold: 0.2,
  activityLevels: {
    stillBelow: 0.1,
    lowBelow: 0.75,
    moderateBelow: 2,
  },
};

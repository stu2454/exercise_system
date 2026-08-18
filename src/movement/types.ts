export interface FeatureValue {
  value: number | null;
  valid: boolean;
  confidence?: number;
}

export type ActivityLevel = "still" | "low" | "moderate" | "high";

export interface MovementFeatures {
  timestampMs: number;
  activityLevel: ActivityLevel | null;
  wholeBodyActivity: FeatureValue;
  upperBodyActivity: FeatureValue;
  lowerBodyActivity: FeatureValue;
  trunkActivity: FeatureValue;
  leftUpperLimbActivity: FeatureValue;
  rightUpperLimbActivity: FeatureValue;
  leftLowerLimbActivity: FeatureValue;
  rightLowerLimbActivity: FeatureValue;
  leftWristSpeed: FeatureValue;
  rightWristSpeed: FeatureValue;
  leftAnkleSpeed: FeatureValue;
  rightAnkleSpeed: FeatureValue;
  hipCentreSpeed: FeatureValue;
  shoulderCentreSpeed: FeatureValue;
}

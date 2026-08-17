export interface FeatureValue {
  value: number | null;
  valid: boolean;
  confidence?: number;
}

export interface MovementFeatures {
  timestampMs: number;
  wholeBodyActivity: FeatureValue;
  upperBodyActivity: FeatureValue;
  lowerBodyActivity: FeatureValue;
  trunkActivity: FeatureValue;
}

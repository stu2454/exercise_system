import type { LandmarkName } from "../types/landmarks";

export interface Landmark {
  x: number;
  y: number;
  z?: number;
  confidence: number;
}

export type PoseSource = "participant" | "reference" | "replay";

export interface PoseFrame {
  timestampMs: number;
  source: PoseSource;
  personConfidence: number;
  landmarks: Partial<Record<LandmarkName, Landmark>>;
}

export type PoseQualityLevel = "good" | "degraded" | "insufficient";

export interface PoseQuality {
  level: PoseQualityLevel;
  personPresent: boolean;
  fullBodyVisible: boolean;
  missingRequiredLandmarks: LandmarkName[];
  warnings: string[];
}

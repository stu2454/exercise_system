import type { LandmarkName } from "../types/landmarks";
import {
  POSE_PROCESSING_CONFIG,
  type PoseProcessingConfig,
} from "./poseProcessingConfig";
import type { Landmark, PoseFrame, PoseQuality } from "./types";

const WARNING = {
  noPerson: "No person detected",
  feetNotVisible: "Move backwards so your feet are visible",
  offCentre: "Move towards the centre of the camera",
  lowConfidence: "Tracking confidence is low",
  lowerBodyNotVisible: "Lower body is not fully visible",
  bodyClipped: "Body is close to the edge of the camera frame",
  suddenJump: "Sudden landmark position change detected",
  prolongedLoss: "Important landmarks have been missing for too long",
} as const;

function normalizedDistance(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isNearFrameBoundary(landmark: Landmark, margin: number): boolean {
  return (
    landmark.x <= margin ||
    landmark.x >= 1 - margin ||
    landmark.y <= margin ||
    landmark.y >= 1 - margin
  );
}

export class PoseQualityAssessor {
  private previousFrame: PoseFrame | null = null;
  private lastFrameTimestampMs: number | null = null;
  private readonly missingSinceMs = new Map<LandmarkName, number>();

  constructor(
    private readonly config: PoseProcessingConfig = POSE_PROCESSING_CONFIG,
  ) {}

  reset(): void {
    this.previousFrame = null;
    this.lastFrameTimestampMs = null;
    this.missingSinceMs.clear();
  }

  assess(frame: PoseFrame | null, timestampMs: number): PoseQuality {
    const { quality: thresholds } = this.config;

    if (
      this.lastFrameTimestampMs !== null &&
      timestampMs - this.lastFrameTimestampMs > thresholds.prolongedLandmarkLossMs
    ) {
      this.previousFrame = null;
    }

    if (!frame) {
      this.lastFrameTimestampMs = timestampMs;
      return {
        level: "insufficient",
        personPresent: false,
        fullBodyVisible: false,
        missingRequiredLandmarks: [...thresholds.requiredLandmarks],
        warnings: [WARNING.noPerson],
      };
    }

    const warnings = new Set<string>();
    const missingRequiredLandmarks = thresholds.requiredLandmarks.filter(
      (name) => !frame.landmarks[name],
    );
    const lowConfidenceLandmarks = thresholds.requiredLandmarks.filter((name) => {
      const landmark = frame.landmarks[name];
      return landmark !== undefined && landmark.confidence < thresholds.minLandmarkConfidence;
    });

    if (lowConfidenceLandmarks.length > 0) {
      warnings.add(WARNING.lowConfidence);
    }

    const missingLowerBody = thresholds.lowerBodyLandmarks.some(
      (name) => !frame.landmarks[name],
    );
    if (missingLowerBody) {
      warnings.add(WARNING.lowerBodyNotVisible);
    }

    const feetClipped = (["leftAnkle", "rightAnkle"] as const).some((name) => {
      const landmark = frame.landmarks[name];
      return !landmark || landmark.y >= 1 - thresholds.frameBoundaryMargin;
    });
    if (feetClipped) {
      warnings.add(WARNING.feetNotVisible);
    }

    const keyLandmarks = thresholds.fullBodyLandmarks
      .map((name) => frame.landmarks[name])
      .filter((landmark): landmark is Landmark => landmark !== undefined);
    if (
      keyLandmarks.some(
        (landmark) =>
          landmark.x <= thresholds.frameBoundaryMargin ||
          landmark.x >= 1 - thresholds.frameBoundaryMargin,
      )
    ) {
      warnings.add(WARNING.offCentre);
    }

    const boundaryClipped = keyLandmarks.some((landmark) =>
      isNearFrameBoundary(landmark, thresholds.frameBoundaryMargin),
    );
    if (boundaryClipped) {
      warnings.add(WARNING.bodyClipped);
    }

    let prolongedLoss = false;
    for (const name of thresholds.requiredLandmarks) {
      if (frame.landmarks[name]) {
        this.missingSinceMs.delete(name);
        continue;
      }

      const missingSinceMs = this.missingSinceMs.get(name) ?? timestampMs;
      this.missingSinceMs.set(name, missingSinceMs);
      if (timestampMs - missingSinceMs >= thresholds.prolongedLandmarkLossMs) {
        prolongedLoss = true;
      }
    }
    if (prolongedLoss) {
      warnings.add(WARNING.prolongedLoss);
    }

    let suddenJump = false;
    if (this.previousFrame) {
      suddenJump = thresholds.requiredLandmarks.some((name) => {
        const current = frame.landmarks[name];
        const previous = this.previousFrame?.landmarks[name];
        return (
          current !== undefined &&
          previous !== undefined &&
          normalizedDistance(current, previous) > thresholds.maxLandmarkJumpNormalized
        );
      });
    }
    if (suddenJump) {
      warnings.add(WARNING.suddenJump);
    }

    const fullBodyVisible =
      thresholds.fullBodyLandmarks.every((name) => {
        const landmark = frame.landmarks[name];
        return (
          landmark !== undefined &&
          landmark.confidence >= thresholds.minLandmarkConfidence
        );
      }) && !boundaryClipped;

    const insufficient =
      frame.personConfidence < thresholds.insufficientPersonConfidence ||
      missingRequiredLandmarks.length >=
        thresholds.insufficientMissingRequiredCount ||
      prolongedLoss;

    const level = insufficient
      ? "insufficient"
      : warnings.size > 0 || !fullBodyVisible
        ? "degraded"
        : "good";

    this.previousFrame = frame;
    this.lastFrameTimestampMs = timestampMs;

    return {
      level,
      personPresent: true,
      fullBodyVisible,
      missingRequiredLandmarks,
      warnings: [...warnings],
    };
  }
}

import type { LandmarkName } from "../types/landmarks";
import {
  POSE_PROCESSING_CONFIG,
  type PoseProcessingConfig,
} from "./poseProcessingConfig";
import type { Landmark, PoseFrame } from "./types";

function interpolate(previous: number, current: number, alpha: number): number {
  return previous + alpha * (current - previous);
}

function smoothLandmark(
  previous: Landmark,
  current: Landmark,
  alpha: number,
): Landmark {
  const landmark: Landmark = {
    x: interpolate(previous.x, current.x, alpha),
    y: interpolate(previous.y, current.y, alpha),
    confidence: current.confidence,
  };

  if (current.z !== undefined) {
    landmark.z =
      previous.z === undefined
        ? current.z
        : interpolate(previous.z, current.z, alpha);
  }

  return landmark;
}

export class PoseLandmarkFilter {
  private previousFilteredFrame: PoseFrame | null = null;
  private lastPoseTimestampMs: number | null = null;
  private readonly lastLandmarkSeenMs = new Map<LandmarkName, number>();

  constructor(
    private readonly config: PoseProcessingConfig = POSE_PROCESSING_CONFIG,
  ) {}

  reset(): void {
    this.previousFilteredFrame = null;
    this.lastPoseTimestampMs = null;
    this.lastLandmarkSeenMs.clear();
  }

  filter(frame: PoseFrame | null, timestampMs: number): PoseFrame | null {
    const { emaAlpha, resetAfterLossMs } = this.config.filter;

    if (!frame) {
      if (
        this.lastPoseTimestampMs !== null &&
        timestampMs - this.lastPoseTimestampMs >= resetAfterLossMs
      ) {
        this.reset();
      }
      return null;
    }

    if (
      this.lastPoseTimestampMs !== null &&
      timestampMs - this.lastPoseTimestampMs >= resetAfterLossMs
    ) {
      this.reset();
    }

    const landmarks: PoseFrame["landmarks"] = {};
    for (const [name, current] of Object.entries(frame.landmarks) as [
      LandmarkName,
      Landmark | undefined,
    ][]) {
      if (!current) {
        continue;
      }

      const previous = this.previousFilteredFrame?.landmarks[name];
      const lastSeenMs = this.lastLandmarkSeenMs.get(name);
      const historyIsFresh =
        lastSeenMs !== undefined && timestampMs - lastSeenMs < resetAfterLossMs;

      landmarks[name] =
        previous && historyIsFresh
          ? smoothLandmark(previous, current, emaAlpha)
          : { ...current };
      this.lastLandmarkSeenMs.set(name, timestampMs);
    }

    const filteredFrame: PoseFrame = {
      timestampMs: frame.timestampMs,
      source: frame.source,
      personConfidence: frame.personConfidence,
      landmarks,
    };

    this.previousFilteredFrame = filteredFrame;
    this.lastPoseTimestampMs = timestampMs;
    return filteredFrame;
  }
}

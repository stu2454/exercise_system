import type { CameraStatus } from "../camera/cameraState";
import type { PoseFrame, PoseQuality } from "../pose/types";

export type FramingGuidance = "CAMERA STARTING" | "CAMERA IS OFF" | "STEP INTO VIEW" | "STEP BACK" | "STEP FORWARD" | "MOVE LEFT" | "MOVE RIGHT" | "FULL BODY VISIBLE" | "TRACKING LOST";

export interface FramingGuidanceConfig {
  dwellMs: number;
  lostTrackingMs: number;
  centreMinX: number;
  centreMaxX: number;
  minimumBodyHeight: number;
  boundaryMargin: number;
}

export const FRAMING_GUIDANCE_CONFIG: FramingGuidanceConfig = {
  dwellMs: 750,
  lostTrackingMs: 1500,
  centreMinX: 0.42,
  centreMaxX: 0.58,
  minimumBodyHeight: 0.48,
  boundaryMargin: 0.035,
};

function candidate(frame: PoseFrame | null, quality: PoseQuality): FramingGuidance {
  if (!frame || !quality.personPresent) return "STEP INTO VIEW";
  const landmarks = Object.values(frame.landmarks).filter((item) => item && item.confidence >= 0.4);
  if (landmarks.length < 4) return "TRACKING LOST";
  const xs = landmarks.map((item) => item!.x);
  const ys = landmarks.map((item) => item!.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const centreX = (minX + maxX) / 2;
  // Guidance follows the mirrored preview; canonical/anatomical x is unchanged.
  if (centreX < FRAMING_GUIDANCE_CONFIG.centreMinX) return "MOVE LEFT";
  if (centreX > FRAMING_GUIDANCE_CONFIG.centreMaxX) return "MOVE RIGHT";
  if (quality.fullBodyVisible) {
    return maxY - minY < FRAMING_GUIDANCE_CONFIG.minimumBodyHeight ? "STEP FORWARD" : "FULL BODY VISIBLE";
  }
  const clipped = minX <= FRAMING_GUIDANCE_CONFIG.boundaryMargin || maxX >= 1 - FRAMING_GUIDANCE_CONFIG.boundaryMargin || minY <= FRAMING_GUIDANCE_CONFIG.boundaryMargin || maxY >= 1 - FRAMING_GUIDANCE_CONFIG.boundaryMargin;
  return clipped ? "STEP BACK" : "TRACKING LOST";
}

export class FramingGuidanceAssessor {
  private displayed: FramingGuidance = "STEP INTO VIEW";
  private pending: FramingGuidance | null = null;
  private pendingSinceMs = 0;
  private lastSeenMs: number | null = null;

  update(cameraStatus: CameraStatus, frame: PoseFrame | null, quality: PoseQuality, timestampMs: number): FramingGuidance {
    if (cameraStatus === "requesting") return "CAMERA STARTING";
    if (cameraStatus !== "active") return "CAMERA IS OFF";
    if (quality.personPresent) this.lastSeenMs = timestampMs;
    let next = candidate(frame, quality);
    if (next === "STEP INTO VIEW" && this.lastSeenMs !== null && timestampMs - this.lastSeenMs >= FRAMING_GUIDANCE_CONFIG.lostTrackingMs) next = "TRACKING LOST";
    if (next === this.displayed) { this.pending = null; return this.displayed; }
    if (next !== this.pending) { this.pending = next; this.pendingSinceMs = timestampMs; return this.displayed; }
    if (timestampMs - this.pendingSinceMs >= FRAMING_GUIDANCE_CONFIG.dwellMs) { this.displayed = next; this.pending = null; }
    return this.displayed;
  }

  reset(): void { this.displayed = "STEP INTO VIEW"; this.pending = null; this.lastSeenMs = null; }
}

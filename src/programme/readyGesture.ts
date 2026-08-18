import type { PoseFrame, PoseQuality } from "../pose/types";
import {
  PROGRAMME_RUNNER_CONFIG,
  type ProgrammeRunnerConfig,
} from "./programmeRunnerConfig";

export type ReadyGestureStatus = "not-detected" | "holding" | "triggered";

export interface ReadyGestureResult {
  status: ReadyGestureStatus;
  triggered: boolean;
  diagnostics: ReadyGestureDiagnostics;
}

export interface ReadyGestureDiagnostics {
  rightWristY: number | null;
  rightShoulderY: number | null;
  wristAboveShoulder: boolean;
  poseQuality: PoseQuality["level"];
  armed: boolean;
  dwellElapsedMs: number;
  dwellRequiredMs: number;
  triggerCount: number;
}

function hasUsableRightArm(
  frame: PoseFrame | null,
  quality: PoseQuality,
  config: ProgrammeRunnerConfig,
): boolean {
  const wrist = frame?.landmarks.rightWrist;
  const shoulder = frame?.landmarks.rightShoulder;
  return quality.level !== "insufficient" &&
    wrist !== undefined &&
    shoulder !== undefined &&
    wrist.confidence >= config.readyGesture.minLandmarkConfidence &&
    shoulder.confidence >= config.readyGesture.minLandmarkConfidence;
}

export function isRightArmRaised(
  frame: PoseFrame | null,
  quality: PoseQuality,
  config: ProgrammeRunnerConfig = PROGRAMME_RUNNER_CONFIG,
): boolean {
  if (!hasUsableRightArm(frame, quality, config)) return false;
  const wrist = frame!.landmarks.rightWrist;
  const shoulder = frame!.landmarks.rightShoulder;
  return wrist!.y <= shoulder!.y - config.readyGesture.wristAboveShoulderMarginNormalized;
}

export class RightArmReadyGestureDetector {
  private holdingSinceMs: number | null = null;
  private armed = true;
  private status: ReadyGestureStatus = "not-detected";
  private triggerCount = 0;
  private diagnostics: ReadyGestureDiagnostics;

  constructor(private readonly config: ProgrammeRunnerConfig = PROGRAMME_RUNNER_CONFIG) {
    this.diagnostics = { rightWristY: null, rightShoulderY: null, wristAboveShoulder: false, poseQuality: "insufficient", armed: true, dwellElapsedMs: 0, dwellRequiredMs: config.readyGesture.dwellMs, triggerCount: 0 };
  }

  reset(requireRelease = true): void {
    this.holdingSinceMs = null;
    this.armed = !requireRelease;
    this.status = "not-detected";
    this.diagnostics = { ...this.diagnostics, armed: this.armed, dwellElapsedMs: 0, wristAboveShoulder: false };
  }

  getDiagnostics(): ReadyGestureDiagnostics { return this.diagnostics; }

  update(
    frame: PoseFrame | null,
    quality: PoseQuality,
    timestampMs: number,
    enabled: boolean,
  ): ReadyGestureResult {
    const wrist = frame?.landmarks.rightWrist;
    const shoulder = frame?.landmarks.rightShoulder;
    const usable = hasUsableRightArm(frame, quality, this.config);
    const raised = usable && isRightArmRaised(frame, quality, this.config);
    const result = (triggered: boolean): ReadyGestureResult => {
      const elapsed = this.holdingSinceMs === null ? 0 : Math.max(0, timestampMs - this.holdingSinceMs);
      this.diagnostics = { rightWristY: wrist?.y ?? null, rightShoulderY: shoulder?.y ?? null, wristAboveShoulder: raised, poseQuality: quality.level, armed: this.armed, dwellElapsedMs: elapsed, dwellRequiredMs: this.config.readyGesture.dwellMs, triggerCount: this.triggerCount };
      return { status: this.status, triggered, diagnostics: this.diagnostics };
    };
    if (!usable) {
      this.holdingSinceMs = null;
      this.status = "not-detected";
      return result(false);
    }
    if (!raised) {
      this.holdingSinceMs = null;
      this.armed = true;
      this.status = "not-detected";
      return result(false);
    }

    if (!enabled || !this.armed) {
      return result(false);
    }
    if (this.holdingSinceMs === null) {
      this.holdingSinceMs = timestampMs;
      this.status = "holding";
      return result(false);
    }
    if (timestampMs - this.holdingSinceMs < this.config.readyGesture.dwellMs) {
      this.status = "holding";
      return result(false);
    }

    this.armed = false;
    this.status = "triggered";
    this.triggerCount += 1;
    return result(true);
  }
}

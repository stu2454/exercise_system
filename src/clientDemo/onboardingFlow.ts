import type { PoseFrame, PoseQuality } from "../pose/types";
import type { CameraStatus } from "../camera/cameraState";

export type ClientDemoOnboardingStage =
  | "welcome"
  | "prepare-space"
  | "camera-setup"
  | "positioning"
  | "tutorial-stand"
  | "tutorial-arms"
  | "tutorial-step"
  | "ready"
  | "programme";

export const CLIENT_DEMO_ONBOARDING_ORDER: readonly ClientDemoOnboardingStage[] = [
  "welcome",
  "prepare-space",
  "camera-setup",
  "positioning",
  "tutorial-stand",
  "tutorial-arms",
  "tutorial-step",
  "ready",
  "programme",
];

export function nextOnboardingStage(stage: ClientDemoOnboardingStage): ClientDemoOnboardingStage {
  const index = CLIENT_DEMO_ONBOARDING_ORDER.indexOf(stage);
  return CLIENT_DEMO_ONBOARDING_ORDER[Math.min(index + 1, CLIENT_DEMO_ONBOARDING_ORDER.length - 1)];
}

export function canStartClientDemoProgramme(stage: ClientDemoOnboardingStage): boolean {
  return stage === "ready";
}

export function stageAfterCameraStatus(
  stage: ClientDemoOnboardingStage,
  cameraStatus: CameraStatus,
): ClientDemoOnboardingStage {
  return stage === "camera-setup" && cameraStatus === "active" ? "positioning" : stage;
}

export function onboardingGestureEnabled(
  stage: ClientDemoOnboardingStage,
  positioningSuccessful: boolean,
  tutorialMovementDetected: boolean,
): boolean {
  if (stage === "positioning") return positioningSuccessful;
  if (stage.startsWith("tutorial-")) return tutorialMovementDetected;
  return false;
}

export const TUTORIAL_MOVEMENTS = [
  { stage: "tutorial-stand", title: "Stand in the Centre" },
  { stage: "tutorial-arms", title: "Raise Your Arms" },
  { stage: "tutorial-step", title: "Step to the Side" },
] as const;

export interface TutorialDetectionConfig {
  confidence: number;
  stablePoseMs: number;
  toleratedLossMs: number;
  wristsAboveShouldersMargin: number;
  wristsReturnedMargin: number;
  sidewaysDisplacement: number;
  returnDisplacement: number;
}

export const TUTORIAL_DETECTION_CONFIG: TutorialDetectionConfig = {
  confidence: 0.4,
  stablePoseMs: 750,
  toleratedLossMs: 350,
  wristsAboveShouldersMargin: 0.02,
  wristsReturnedMargin: 0.01,
  sidewaysDisplacement: 0.075,
  returnDisplacement: 0.035,
};

function confident(frame: PoseFrame | null, name: keyof PoseFrame["landmarks"]) {
  const landmark = frame?.landmarks[name];
  return landmark && landmark.confidence >= TUTORIAL_DETECTION_CONFIG.confidence ? landmark : null;
}

function bodyCentreX(frame: PoseFrame | null): number | null {
  const points = ["leftHip", "rightHip", "leftShoulder", "rightShoulder"]
    .map((name) => confident(frame, name as keyof PoseFrame["landmarks"]))
    .filter((point) => point !== null);
  if (points.length < 2) return null;
  return points.reduce((sum, point) => sum + point.x, 0) / points.length;
}

export class TutorialMovementDetector {
  private stage: ClientDemoOnboardingStage | null = null;
  private stableSinceMs: number | null = null;
  private lastUsableMs: number | null = null;
  private armsRaised = false;
  private baselineCentreX: number | null = null;
  private movedSideways = false;

  update(
    stage: ClientDemoOnboardingStage,
    frame: PoseFrame | null,
    quality: PoseQuality,
    timestampMs: number,
  ): boolean {
    if (stage !== this.stage) this.reset(stage);
    if (stage === "tutorial-stand") return this.detectStablePose(frame, quality, timestampMs);
    if (stage === "tutorial-arms") return this.detectArmRaise(frame);
    if (stage === "tutorial-step") return this.detectSideStep(frame);
    return false;
  }

  reset(stage: ClientDemoOnboardingStage | null = null): void {
    this.stage = stage;
    this.stableSinceMs = null;
    this.lastUsableMs = null;
    this.armsRaised = false;
    this.baselineCentreX = null;
    this.movedSideways = false;
  }

  private detectStablePose(frame: PoseFrame | null, quality: PoseQuality, timestampMs: number): boolean {
    const usable = frame !== null && quality.personPresent && quality.level !== "insufficient" &&
      confident(frame, "leftShoulder") !== null && confident(frame, "rightShoulder") !== null &&
      confident(frame, "leftHip") !== null && confident(frame, "rightHip") !== null &&
      confident(frame, "leftWrist") !== null && confident(frame, "rightWrist") !== null &&
      confident(frame, "leftWrist")!.y > confident(frame, "leftShoulder")!.y &&
      confident(frame, "rightWrist")!.y > confident(frame, "rightShoulder")!.y;
    if (usable) {
      if (this.stableSinceMs === null) this.stableSinceMs = timestampMs;
      this.lastUsableMs = timestampMs;
      return timestampMs - this.stableSinceMs >= TUTORIAL_DETECTION_CONFIG.stablePoseMs;
    }
    if (this.lastUsableMs === null || timestampMs - this.lastUsableMs > TUTORIAL_DETECTION_CONFIG.toleratedLossMs) {
      this.stableSinceMs = null;
    }
    return false;
  }

  private detectArmRaise(frame: PoseFrame | null): boolean {
    const leftWrist = confident(frame, "leftWrist");
    const rightWrist = confident(frame, "rightWrist");
    const leftShoulder = confident(frame, "leftShoulder");
    const rightShoulder = confident(frame, "rightShoulder");
    if (!leftWrist || !rightWrist || !leftShoulder || !rightShoulder) return false;
    const bothAbove = leftWrist.y < leftShoulder.y - TUTORIAL_DETECTION_CONFIG.wristsAboveShouldersMargin &&
      rightWrist.y < rightShoulder.y - TUTORIAL_DETECTION_CONFIG.wristsAboveShouldersMargin;
    if (bothAbove) this.armsRaised = true;
    const bothReturned = leftWrist.y > leftShoulder.y + TUTORIAL_DETECTION_CONFIG.wristsReturnedMargin &&
      rightWrist.y > rightShoulder.y + TUTORIAL_DETECTION_CONFIG.wristsReturnedMargin;
    return this.armsRaised && bothReturned;
  }

  private detectSideStep(frame: PoseFrame | null): boolean {
    const centreX = bodyCentreX(frame);
    if (centreX === null) return false;
    if (this.baselineCentreX === null) {
      this.baselineCentreX = centreX;
      return false;
    }
    const displacement = Math.abs(centreX - this.baselineCentreX);
    if (displacement >= TUTORIAL_DETECTION_CONFIG.sidewaysDisplacement) this.movedSideways = true;
    return this.movedSideways && displacement <= TUTORIAL_DETECTION_CONFIG.returnDisplacement;
  }
}

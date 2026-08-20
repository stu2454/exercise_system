import { describe, expect, it } from "vitest";
import type { PoseFrame, PoseQuality } from "../pose/types";
import { canStartClientDemoProgramme, CLIENT_DEMO_ONBOARDING_ORDER, nextOnboardingStage, onboardingGestureEnabled, stageAfterCameraStatus, TutorialMovementDetector } from "./onboardingFlow";

const GOOD: PoseQuality = { level: "good", personPresent: true, fullBodyVisible: true, missingRequiredLandmarks: [], warnings: [] };
const LOST: PoseQuality = { level: "insufficient", personPresent: false, fullBodyVisible: false, missingRequiredLandmarks: [], warnings: [] };

function pose(centreX = 0.5, wristsY = 0.65): PoseFrame {
  const point = (x: number, y: number) => ({ x, y, confidence: 0.9 });
  return {
    timestampMs: 0, source: "participant", personConfidence: 0.9,
    landmarks: {
      leftShoulder: point(centreX - 0.1, 0.35), rightShoulder: point(centreX + 0.1, 0.35),
      leftHip: point(centreX - 0.08, 0.55), rightHip: point(centreX + 0.08, 0.55),
      leftWrist: point(centreX - 0.16, wristsY), rightWrist: point(centreX + 0.16, wristsY),
      leftAnkle: point(centreX - 0.08, 0.85), rightAnkle: point(centreX + 0.08, 0.85),
    },
  };
}

describe("Client Demo onboarding", () => {
  it("follows the concise setup order before programme", () => {
    expect(CLIENT_DEMO_ONBOARDING_ORDER).toEqual([
      "welcome", "prepare-space", "camera-setup", "positioning",
      "tutorial-stand", "tutorial-arms", "tutorial-step", "ready", "programme",
    ]);
    expect(nextOnboardingStage("welcome")).toBe("prepare-space");
    expect(nextOnboardingStage("tutorial-step")).toBe("ready");
    expect(nextOnboardingStage("ready")).toBe("programme");
  });

  it("keeps the programme session outside every onboarding stage", () => {
    for (const stage of CLIENT_DEMO_ONBOARDING_ORDER.slice(0, -2)) {
      expect(canStartClientDemoProgramme(stage)).toBe(false);
    }
    expect(canStartClientDemoProgramme("ready")).toBe(true);
  });

  it("advances only successful camera setup to positioning", () => {
    expect(stageAfterCameraStatus("camera-setup", "active")).toBe("positioning");
    expect(stageAfterCameraStatus("camera-setup", "error")).toBe("camera-setup");
    expect(stageAfterCameraStatus("welcome", "active")).toBe("welcome");
  });

  it("enables hands-free continuation only after the current check succeeds", () => {
    expect(onboardingGestureEnabled("positioning", true, false)).toBe(true);
    expect(onboardingGestureEnabled("positioning", false, false)).toBe(false);
    expect(onboardingGestureEnabled("tutorial-arms", false, true)).toBe(true);
    expect(onboardingGestureEnabled("tutorial-arms", false, false)).toBe(false);
    expect(onboardingGestureEnabled("ready", true, true)).toBe(false);
  });

  it("recognises a stable centred pose while tolerating brief landmark loss", () => {
    const detector = new TutorialMovementDetector();
    expect(detector.update("tutorial-stand", pose(), GOOD, 0)).toBe(false);
    expect(detector.update("tutorial-stand", null, LOST, 200)).toBe(false);
    expect(detector.update("tutorial-stand", pose(), GOOD, 800)).toBe(true);
  });

  it("requires both wrists above shoulders and then returned", () => {
    const detector = new TutorialMovementDetector();
    expect(detector.update("tutorial-arms", pose(0.5, 0.2), GOOD, 0)).toBe(false);
    expect(detector.update("tutorial-arms", pose(0.5, 0.65), GOOD, 1000)).toBe(true);
  });

  it("recognises sideways body-centre displacement followed by return", () => {
    const detector = new TutorialMovementDetector();
    expect(detector.update("tutorial-step", pose(0.5), GOOD, 0)).toBe(false);
    expect(detector.update("tutorial-step", pose(0.6), GOOD, 500)).toBe(false);
    expect(detector.update("tutorial-step", pose(0.52), GOOD, 1000)).toBe(true);
  });

  it("does not invent tutorial success from absent pose data", () => {
    const detector = new TutorialMovementDetector();
    expect(detector.update("tutorial-stand", null, LOST, 1000)).toBe(false);
    expect(detector.update("tutorial-arms", null, LOST, 1000)).toBe(false);
    expect(detector.update("tutorial-step", null, LOST, 1000)).toBe(false);
  });
});

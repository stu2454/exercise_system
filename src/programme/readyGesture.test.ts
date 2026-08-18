import { describe, expect, it } from "vitest";
import type { PoseFrame, PoseQuality } from "../pose/types";
import { RightArmReadyGestureDetector, isRightArmRaised } from "./readyGesture";

const GOOD: PoseQuality = {
  level: "good",
  personPresent: true,
  fullBodyVisible: true,
  missingRequiredLandmarks: [],
  warnings: [],
};

function pose(wristY: number): PoseFrame {
  return {
    timestampMs: 0,
    source: "participant",
    personConfidence: 0.9,
    landmarks: {
      rightShoulder: { x: 0.6, y: 0.5, confidence: 0.9 },
      rightWrist: { x: 0.6, y: wristY, confidence: 0.9 },
    },
  };
}

describe("right-arm ready gesture", () => {
  it("recognises a canonical right wrist above the right shoulder", () => {
    expect(isRightArmRaised(pose(0.4), GOOD)).toBe(true);
    expect(isRightArmRaised(pose(0.49), GOOD)).toBe(false);
  });

  it("a sustained raise triggers READY after the dwell", () => {
    const detector = new RightArmReadyGestureDetector();
    expect(detector.update(pose(0.4), GOOD, 100, true)).toMatchObject({ status: "holding", triggered: false });
    expect(detector.update(pose(0.4), GOOD, 749, true).triggered).toBe(false);
    expect(detector.update(pose(0.4), GOOD, 750, true)).toMatchObject({ status: "triggered", triggered: true });
  });

  it("does not trigger while EXERCISING/disabled", () => {
    const detector = new RightArmReadyGestureDetector();
    detector.update(pose(0.4), GOOD, 0, false);
    expect(detector.update(pose(0.4), GOOD, 1000, false).triggered).toBe(false);
  });

  it("triggers only once for one sustained raise", () => {
    const detector = new RightArmReadyGestureDetector();
    detector.update(pose(0.4), GOOD, 0, true);
    expect(detector.update(pose(0.4), GOOD, 650, true).triggered).toBe(true);
    expect(detector.update(pose(0.4), GOOD, 1300, true).triggered).toBe(false);
  });

  it("lowering the arm rearms the detector", () => {
    const detector = new RightArmReadyGestureDetector();
    detector.update(pose(0.4), GOOD, 0, true);
    detector.update(pose(0.4), GOOD, 650, true);
    detector.update(pose(0.6), GOOD, 700, true);
    expect(detector.update(pose(0.4), GOOD, 800, true).status).toBe("holding");
    expect(detector.update(pose(0.4), GOOD, 1450, true).triggered).toBe(true);
  });

  it("pose loss resets an in-progress gesture safely", () => {
    const detector = new RightArmReadyGestureDetector();
    detector.update(pose(0.4), GOOD, 0, true);
    expect(detector.update(null, { ...GOOD, level: "insufficient" }, 400, true)).toMatchObject({ status: "not-detected", triggered: false });
    expect(detector.update(pose(0.4), GOOD, 500, true).status).toBe("holding");
    expect(detector.update(pose(0.4), GOOD, 1150, true).triggered).toBe(true);
  });

  it("reports anatomical diagnostics without changing right-arm semantics", () => {
    const detector = new RightArmReadyGestureDetector();
    const result = detector.update(pose(0.4), GOOD, 100, true);
    expect(result.diagnostics).toMatchObject({ rightWristY: 0.4, rightShoulderY: 0.5, wristAboveShoulder: true, armed: true, dwellRequiredMs: 650 });
  });
});

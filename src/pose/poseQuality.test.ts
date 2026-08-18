import { describe, expect, it } from "vitest";
import { PoseQualityAssessor } from "./poseQuality";
import type { Landmark, PoseFrame } from "./types";
import type { LandmarkName } from "../types/landmarks";

const ALL_NAMES: LandmarkName[] = [
  "nose",
  "leftShoulder",
  "rightShoulder",
  "leftElbow",
  "rightElbow",
  "leftWrist",
  "rightWrist",
  "leftHip",
  "rightHip",
  "leftKnee",
  "rightKnee",
  "leftAnkle",
  "rightAnkle",
  "leftHeel",
  "rightHeel",
  "leftFootIndex",
  "rightFootIndex",
];

function makeFrame(
  timestampMs = 0,
  overrides: Partial<Record<LandmarkName, Landmark | null>> = {},
): PoseFrame {
  const landmarks: PoseFrame["landmarks"] = {};
  ALL_NAMES.forEach((name, index) => {
    landmarks[name] = {
      x: 0.35 + (index % 4) * 0.1,
      y: name.includes("Ankle") ? 0.9 : 0.2 + (index % 5) * 0.12,
      z: 0,
      confidence: 0.9,
    };
  });

  for (const [name, value] of Object.entries(overrides) as [
    LandmarkName,
    Landmark | null,
  ][]) {
    if (value === null) {
      delete landmarks[name];
    } else {
      landmarks[name] = value;
    }
  }

  return {
    timestampMs,
    source: "participant",
    personConfidence: 0.9,
    landmarks,
  };
}

describe("PoseQualityAssessor", () => {
  it("rates a complete high-confidence pose as good", () => {
    const quality = new PoseQualityAssessor().assess(makeFrame(), 0);

    expect(quality).toEqual({
      level: "good",
      personPresent: true,
      fullBodyVisible: true,
      missingRequiredLandmarks: [],
      warnings: [],
    });
  });

  it("allows a missing non-critical wrist without reducing quality", () => {
    const quality = new PoseQualityAssessor().assess(
      makeFrame(0, { leftWrist: null }),
      0,
    );

    expect(quality.level).toBe("good");
    expect(quality.missingRequiredLandmarks).toEqual([]);
  });

  it("degrades when required lower-body landmarks are newly missing", () => {
    const quality = new PoseQualityAssessor().assess(
      makeFrame(0, { leftAnkle: null, rightAnkle: null }),
      0,
    );

    expect(quality.level).toBe("degraded");
    expect(quality.fullBodyVisible).toBe(false);
    expect(quality.missingRequiredLandmarks).toEqual([
      "leftAnkle",
      "rightAnkle",
    ]);
    expect(quality.warnings).toContain("Lower body is not fully visible");
  });

  it("rates an absent participant as insufficient", () => {
    const quality = new PoseQualityAssessor().assess(null, 100);

    expect(quality.level).toBe("insufficient");
    expect(quality.personPresent).toBe(false);
  });

  it("warns when a key landmark is near the frame boundary", () => {
    const quality = new PoseQualityAssessor().assess(
      makeFrame(0, {
        leftShoulder: { x: 0.01, y: 0.3, confidence: 0.9 },
      }),
      0,
    );

    expect(quality.level).toBe("degraded");
    expect(quality.fullBodyVisible).toBe(false);
    expect(quality.warnings).toContain("Move towards the centre of the camera");
  });

  it("detects an implausible adjacent-frame landmark jump", () => {
    const assessor = new PoseQualityAssessor();
    assessor.assess(makeFrame(0), 0);
    const quality = assessor.assess(
      makeFrame(33, {
        leftShoulder: { x: 0.95, y: 0.9, confidence: 0.9 },
      }),
      33,
    );

    expect(quality.level).toBe("degraded");
    expect(quality.warnings).toContain("Sudden landmark position change detected");
  });

  it("rates prolonged required-landmark loss as insufficient", () => {
    const assessor = new PoseQualityAssessor();
    assessor.assess(makeFrame(0, { leftAnkle: null }), 0);
    const quality = assessor.assess(
      makeFrame(1000, { leftAnkle: null }),
      1000,
    );

    expect(quality.level).toBe("insufficient");
    expect(quality.warnings).toContain(
      "Important landmarks have been missing for too long",
    );
  });
});

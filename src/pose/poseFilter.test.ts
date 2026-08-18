import { describe, expect, it } from "vitest";
import { PoseLandmarkFilter } from "./poseFilter";
import type { PoseFrame } from "./types";

function frame(timestampMs: number, leftWristX?: number): PoseFrame {
  return {
    timestampMs,
    source: "participant",
    personConfidence: 0.9,
    landmarks:
      leftWristX === undefined
        ? {}
        : {
            leftWrist: {
              x: leftWristX,
              y: 0.5,
              z: -0.1,
              confidence: 0.8,
            },
          },
  };
}

describe("PoseLandmarkFilter", () => {
  it("reduces artificial frame-to-frame jitter", () => {
    const filter = new PoseLandmarkFilter();
    filter.filter(frame(0, 0.4), 0);
    const filtered = filter.filter(frame(33, 0.6), 33);

    expect(filtered?.timestampMs).toBe(33);
    expect(filtered?.landmarks.leftWrist?.x).toBeCloseTo(0.47);
    expect(filtered?.landmarks.leftWrist?.confidence).toBe(0.8);
  });

  it("handles missing landmarks without carrying stale observations", () => {
    const filter = new PoseLandmarkFilter();
    filter.filter(frame(0, 0.4), 0);

    expect(() => filter.filter(frame(33), 33)).not.toThrow();
    expect(filter.filter(frame(66), 66)?.landmarks.leftWrist).toBeUndefined();
  });

  it("handles explicitly undefined landmark entries", () => {
    const filter = new PoseLandmarkFilter();
    const missingFrame = frame(0);
    missingFrame.landmarks.leftWrist = undefined;

    expect(() => filter.filter(missingFrame, 0)).not.toThrow();
    expect(filter.filter(missingFrame, 33)?.landmarks.leftWrist).toBeUndefined();
  });

  it("resets landmark history after prolonged tracking loss", () => {
    const filter = new PoseLandmarkFilter();
    filter.filter(frame(0, 0.4), 0);
    filter.filter(null, 1000);
    const filtered = filter.filter(frame(1033, 0.8), 1033);

    expect(filtered?.landmarks.leftWrist?.x).toBe(0.8);
  });

  it("resets an individual landmark after prolonged landmark loss", () => {
    const filter = new PoseLandmarkFilter();
    filter.filter(frame(0, 0.4), 0);
    filter.filter(frame(500), 500);
    const filtered = filter.filter(frame(1100, 0.8), 1100);

    expect(filtered?.landmarks.leftWrist?.x).toBe(0.8);
  });
});

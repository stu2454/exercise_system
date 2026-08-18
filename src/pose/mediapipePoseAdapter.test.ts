import { describe, expect, it } from "vitest";
import { convertMediaPipeResultToPoseFrame } from "./mediapipePoseAdapter";

interface MockLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

function landmark(index: number): MockLandmark {
  return {
    x: index / 100,
    y: index / 50,
    z: -index / 200,
    visibility: 0.8,
  };
}

function canonicalLandmark(index: number) {
  const input = landmark(index);
  return {
    x: input.x,
    y: input.y,
    z: input.z,
    confidence: input.visibility,
  };
}

function mockResult() {
  return {
    landmarks: [Array.from({ length: 33 }, (_, index) => landmark(index))],
    worldLandmarks: [],
  };
}

describe("convertMediaPipeResultToPoseFrame", () => {
  it("maps left and right MediaPipe landmarks to canonical names", () => {
    const frame = convertMediaPipeResultToPoseFrame(mockResult(), 1234);

    expect(frame).toMatchObject({
      timestampMs: 1234,
      source: "participant",
    });
    expect(frame?.personConfidence).toBeCloseTo(0.8);
    expect(frame?.landmarks.leftShoulder).toEqual(canonicalLandmark(11));
    expect(frame?.landmarks.rightShoulder).toEqual(canonicalLandmark(12));
    expect(frame?.landmarks.leftWrist).toEqual(canonicalLandmark(15));
    expect(frame?.landmarks.rightWrist).toEqual(canonicalLandmark(16));
    expect(frame?.landmarks.leftAnkle).toEqual(canonicalLandmark(27));
    expect(frame?.landmarks.rightAnkle).toEqual(canonicalLandmark(28));
    expect(Object.keys(frame?.landmarks ?? {})).toHaveLength(17);
  });

  it("omits missing landmarks without shifting left/right mappings", () => {
    const result = mockResult();
    result.landmarks[0][15] = undefined as unknown as MockLandmark;

    const frame = convertMediaPipeResultToPoseFrame(result, 50);

    expect(frame?.landmarks.leftWrist).toBeUndefined();
    expect(frame?.landmarks.rightWrist).toEqual(canonicalLandmark(16));
  });

  it("omits malformed individual landmarks and normalises confidence", () => {
    const result = mockResult();
    result.landmarks[0][11] = {
      x: Number.NaN,
      y: 0.2,
      z: 0,
      visibility: 0.9,
    };
    result.landmarks[0][15].visibility = 5;
    result.landmarks[0][16].visibility = Number.NaN;

    const frame = convertMediaPipeResultToPoseFrame(result, 50);

    expect(frame?.landmarks.leftShoulder).toBeUndefined();
    expect(frame?.landmarks.leftWrist?.confidence).toBe(1);
    expect(frame?.landmarks.rightWrist?.confidence).toBe(0);
  });

  it.each([
    null,
    undefined,
    {},
    { landmarks: [] },
    { landmarks: [null] },
    { landmarks: [[null]] },
  ])("returns null without throwing for malformed input %#", (input) => {
    expect(() => convertMediaPipeResultToPoseFrame(input, 10)).not.toThrow();
    expect(convertMediaPipeResultToPoseFrame(input, 10)).toBeNull();
  });

  it("returns null for a malformed timestamp", () => {
    expect(convertMediaPipeResultToPoseFrame(mockResult(), Number.NaN)).toBeNull();
  });
});

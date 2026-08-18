import { describe, expect, it } from "vitest";
import { toMirroredDisplayLandmark } from "./displayCoordinates";

describe("mirrored pose display", () => {
  it("mirrors x only and preserves anatomical landmark data", () => {
    expect(toMirroredDisplayLandmark({ x: 0.2, y: 0.4, z: -0.1, confidence: 0.9 })).toEqual({ x: 0.8, y: 0.4, z: -0.1, confidence: 0.9 });
  });
});

import { describe, expect, it } from "vitest";
import { CANONICAL_POSE_CONNECTIONS } from "./canonicalPoseOverlay";

describe("canonical participant pose overlay", () => {
  it("connects canonical anatomical landmarks without MediaPipe indices", () => {
    expect(CANONICAL_POSE_CONNECTIONS).toContainEqual(["rightShoulder", "rightElbow"]);
    expect(CANONICAL_POSE_CONNECTIONS).toContainEqual(["rightElbow", "rightWrist"]);
    expect(JSON.stringify(CANONICAL_POSE_CONNECTIONS)).not.toMatch(/\b(?:12|14|16)\b/);
  });
});

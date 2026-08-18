import { describe, expect, it } from "vitest";
import type { PoseFrame, PoseQuality } from "../pose/types";
import { FramingGuidanceAssessor } from "./framingGuidance";

const GOOD: PoseQuality = { level: "good", personPresent: true, fullBodyVisible: true, missingRequiredLandmarks: [], warnings: [] };
function pose(xs = [0.3, 0.7], ys = [0.2, 0.8]): PoseFrame { return { timestampMs: 0, source: "participant", personConfidence: 0.9, landmarks: { leftShoulder: { x: xs[0], y: ys[0], confidence: 0.9 }, rightShoulder: { x: xs[1], y: ys[0], confidence: 0.9 }, leftAnkle: { x: xs[0], y: ys[1], confidence: 0.9 }, rightAnkle: { x: xs[1], y: ys[1], confidence: 0.9 } } }; }

describe("participant framing guidance", () => {
  it("debounces warning changes", () => { const a = new FramingGuidanceAssessor(); expect(a.update("active", pose(), GOOD, 0)).toBe("STEP INTO VIEW"); expect(a.update("active", pose(), GOOD, 749)).toBe("STEP INTO VIEW"); expect(a.update("active", pose(), GOOD, 750)).toBe("FULL BODY VISIBLE"); });
  it("full-body visibility suppresses STEP BACK", () => { const a = new FramingGuidanceAssessor(); a.update("active", pose(), GOOD, 0); expect(a.update("active", pose(), GOOD, 800)).toBe("FULL BODY VISIBLE"); });
  it("distinguishes initial absence and prolonged tracking loss", () => { const a = new FramingGuidanceAssessor(); const absent = { ...GOOD, personPresent: false, fullBodyVisible: false, level: "insufficient" as const }; expect(a.update("active", null, absent, 0)).toBe("STEP INTO VIEW"); a.update("active", pose(), GOOD, 100); a.update("active", null, absent, 1700); expect(a.update("active", null, absent, 2500)).toBe("TRACKING LOST"); });
});

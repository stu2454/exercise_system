import { describe, expect, it } from "vitest";
import {
  appendInferenceTimestamp,
  calculateInferenceFps,
} from "./inferenceFps";

describe("calculateInferenceFps", () => {
  it("calculates inference rate from timestamp intervals", () => {
    expect(calculateInferenceFps([0, 50, 100, 150])).toBe(20);
  });

  it("returns zero without a measurable interval", () => {
    expect(calculateInferenceFps([])).toBe(0);
    expect(calculateInferenceFps([100])).toBe(0);
    expect(calculateInferenceFps([100, 100])).toBe(0);
  });
});

describe("appendInferenceTimestamp", () => {
  it("retains a bounded rolling window", () => {
    const timestamps = Array.from({ length: 30 }, (_, index) => index);
    const next = appendInferenceTimestamp(timestamps, 30);

    expect(next).toHaveLength(30);
    expect(next[0]).toBe(1);
    expect(next.at(-1)).toBe(30);
  });
});

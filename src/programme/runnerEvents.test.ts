import { describe, expect, it } from "vitest";
import { isRepetitionCompletedEvent, type RepetitionCompletedEvent } from "./runnerEvents";

describe("generic programme runner events", () => {
  it("accepts recognition and developer repetition events", () => {
    const event: RepetitionCompletedEvent = { type: "repetition-completed", exerciseId: "exercise-01", timestampMs: 1234, source: "recognition" };
    expect(isRepetitionCompletedEvent(event)).toBe(true);
    expect(isRepetitionCompletedEvent({ ...event, source: "developer" })).toBe(true);
  });

  it("rejects malformed, negative-time and untyped input", () => {
    expect(isRepetitionCompletedEvent(null)).toBe(false);
    expect(isRepetitionCompletedEvent({ type: "repetition-completed", exerciseId: "", timestampMs: 0, source: "developer" })).toBe(false);
    expect(isRepetitionCompletedEvent({ type: "repetition-completed", exerciseId: "exercise-01", timestampMs: -1, source: "recognition" })).toBe(false);
    expect(isRepetitionCompletedEvent({ type: "landmarks", exerciseId: "exercise-01", timestampMs: 1, source: "recognition" })).toBe(false);
  });
});

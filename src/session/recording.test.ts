import { describe, expect, it } from "vitest";
import { createInvalidMovementFeatures } from "../movement/movementFeatures";
import type { PoseFrame, PoseQuality, ProcessedPoseFrame } from "../pose/types";
import {
  CanonicalDataRecorder,
  parsePoseObservationJsonLine,
} from "./recording";

const pose: PoseFrame = {
  timestampMs: 100,
  source: "participant",
  personConfidence: 0.9,
  landmarks: {
    leftWrist: { x: 0.2, y: 0.3, z: -0.1, confidence: 0.8 },
  },
};

const quality: PoseQuality = {
  level: "good",
  personPresent: true,
  fullBodyVisible: true,
  missingRequiredLandmarks: [],
  warnings: [],
};

function processed(rawPoseFrame: PoseFrame | null = pose): ProcessedPoseFrame {
  return {
    timestampMs: 100,
    rawPoseFrame,
    filteredPoseFrame: rawPoseFrame,
    poseQuality: rawPoseFrame
      ? quality
      : {
          level: "insufficient",
          personPresent: false,
          fullBodyVisible: false,
          missingRequiredLandmarks: ["leftShoulder"],
          warnings: ["No person detected"],
        },
  };
}

function start(recorder: CanonicalDataRecorder): void {
  recorder.start({
    startTimestampMs: 50,
    recordingStartedAt: "2026-08-18T00:00:00.000Z",
    applicationVersion: "test-version",
  });
}

describe("CanonicalDataRecorder", () => {
  it("starts and stops an explicit in-memory recording", () => {
    const recorder = new CanonicalDataRecorder();

    expect(recorder.isRecording).toBe(false);
    expect(recorder.start({ startTimestampMs: 50 })).toBe(true);
    expect(recorder.isRecording).toBe(true);
    expect(recorder.stop()).not.toBeNull();
    expect(recorder.isRecording).toBe(false);
  });

  it("writes metadata first, followed by pose observation, quality, and features", () => {
    const recorder = new CanonicalDataRecorder();
    start(recorder);
    recorder.record(processed(), createInvalidMovementFeatures(100));

    const result = recorder.stop()!;
    const records = result.jsonl.trim().split("\n").map((line) => JSON.parse(line));

    expect(records.map((record) => record.type)).toEqual([
      "metadata",
      "pose-observation",
      "pose-quality",
      "movement-features",
    ]);
    expect(records[0]).toMatchObject({
      schemaVersion: "2.0.0",
      recordingStartedAt: "2026-08-18T00:00:00.000Z",
      applicationVersion: "test-version",
      source: "participant",
      rawVideoRecorded: false,
    });
  });

  it("records every processed observation, including explicit no-pose observations", () => {
    const recorder = new CanonicalDataRecorder();
    start(recorder);
    recorder.record(processed(), createInvalidMovementFeatures(100));
    recorder.record(processed(null), createInvalidMovementFeatures(100));

    const records = recorder.stop()!.jsonl
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    const observations = records.filter(
      (record) => record.type === "pose-observation",
    );

    expect(observations).toHaveLength(2);
    expect(observations[0].pose).toEqual(pose);
    expect(observations[1]).toEqual({
      type: "pose-observation",
      timestampMs: 100,
      pose: null,
    });
    expect(observations[1]).not.toHaveProperty("landmarks");
    expect(observations[1]).not.toHaveProperty("personConfidence");
  });

  it("preserves timestamps throughout a no-pose period", () => {
    const recorder = new CanonicalDataRecorder();
    start(recorder);
    for (const timestampMs of [100, 133, 167]) {
      const observation = processed(null);
      observation.timestampMs = timestampMs;
      recorder.record(observation, createInvalidMovementFeatures(timestampMs));
    }

    const observations = recorder
      .stop()!
      .jsonl.trim()
      .split("\n")
      .map((line) => JSON.parse(line))
      .filter((record) => record.type === "pose-observation");

    expect(observations.map((record) => record.timestampMs)).toEqual([
      100, 133, 167,
    ]);
    expect(observations.every((record) => record.pose === null)).toBe(true);
  });

  it("classifies present, no-pose, malformed, and missing lines distinctly", () => {
    const present = JSON.stringify({
      type: "pose-observation",
      timestampMs: 100,
      pose,
    });
    const noPose = JSON.stringify({
      type: "pose-observation",
      timestampMs: 200,
      pose: null,
    });

    expect(parsePoseObservationJsonLine(present).kind).toBe("pose");
    const parsedNoPose = parsePoseObservationJsonLine(noPose);
    expect(parsedNoPose.kind).toBe("no-pose");
    if (parsedNoPose.kind === "no-pose") {
      expect(parsedNoPose.record.pose).toBeNull();
    }
    expect(parsePoseObservationJsonLine('{"type":"pose-observation"}').kind).toBe(
      "malformed",
    );
    expect(parsePoseObservationJsonLine("not-json").kind).toBe("malformed");
    expect(parsePoseObservationJsonLine(null).kind).toBe("missing");
  });

  it("handles malformed and circular input without throwing", () => {
    const recorder = new CanonicalDataRecorder();
    start(recorder);
    const circular: Record<string, unknown> = { timestampMs: 100 };
    circular.poseQuality = circular;

    expect(() => recorder.record(null, null)).not.toThrow();
    expect(() => recorder.record({ timestampMs: Number.NaN }, {})).not.toThrow();
    expect(() => recorder.record(circular, circular)).not.toThrow();
    expect(recorder.stop()?.recordCount).toBe(1);
  });

  it("does not record before start or after stop", () => {
    const recorder = new CanonicalDataRecorder();
    recorder.record(processed(), createInvalidMovementFeatures(100));
    expect(recorder.recordCount).toBe(0);

    start(recorder);
    recorder.record(processed(), createInvalidMovementFeatures(100));
    const completed = recorder.stop()!;
    recorder.record(processed(), createInvalidMovementFeatures(100));

    expect(recorder.recordCount).toBe(completed.recordCount);
    expect(recorder.stop()).toBeNull();
  });

  it("exports additive aborted-session termination metadata", () => {
    const recorder = new CanonicalDataRecorder();
    start(recorder);
    const completed = recorder.stop({ sessionId: "session-a", programmeId: "programme-a", programmeNameSnapshot: "Programme A", startedAtTimestampMs: 100, status: "aborted", endedReason: "participant_exit", endedAtTimestampMs: 500, exercises: [], intervals: [] })!;
    expect(JSON.parse(completed.jsonl.split("\n")[0]).sessionResult).toMatchObject({ status: "aborted", endedReason: "participant_exit" });
  });
});

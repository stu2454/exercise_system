import { describe, expect, it } from "vitest";
import { parseReplayRecording, ReplayRecordingError } from "./replayRecording";

const metadata = JSON.stringify({
  type: "metadata",
  schemaVersion: "2.0.0",
  recordingStartedAt: "2026-08-18T00:00:00.000Z",
  startTimestampMs: 100,
  applicationVersion: "test",
  source: "participant",
  movementConfigVersion: "build-4-v1",
  poseProcessingConfigVersion: "build-3-v1",
  poseVariant: "raw-canonical-observations",
  rawVideoRecorded: false,
});

function observation(timestampMs: number, pose: object | null = null): string {
  return JSON.stringify({ type: "pose-observation", timestampMs, pose });
}

describe("parseReplayRecording", () => {
  it("parses schema 2.0.0 input and keeps diagnostics separate", () => {
    const pose = {
      timestampMs: 100,
      source: "participant",
      personConfidence: 0.9,
      landmarks: {},
    };
    const recording = parseReplayRecording(
      [
        metadata,
        observation(100, pose),
        JSON.stringify({
          type: "pose-quality",
          timestampMs: 100,
          poseQuality: { level: "degraded" },
        }),
        JSON.stringify({
          type: "movement-features",
          timestampMs: 100,
          movementFeatures: { activityLevel: null },
        }),
      ].join("\n"),
    );

    expect(recording.observations).toHaveLength(1);
    expect(recording.observations[0].pose).toEqual(pose);
    expect(recording.diagnostics.poseQualityByTimestamp.get(100)?.level).toBe(
      "degraded",
    );
  });

  it("parses pose:null as an explicit no-pose input", () => {
    const recording = parseReplayRecording(
      [metadata, observation(100, null)].join("\n"),
    );

    expect(recording.observations[0]).toEqual({
      type: "pose-observation",
      timestampMs: 100,
      pose: null,
    });
  });

  it("rejects invalid JSONL", () => {
    expect(() => parseReplayRecording(`${metadata}\nnot-json`)).toThrow(
      ReplayRecordingError,
    );
  });

  it("rejects incompatible schema versions", () => {
    const incompatible = metadata.replace('"2.0.0"', '"1.0.0"');
    expect(() => parseReplayRecording(incompatible)).toThrow(
      "Unsupported schema version",
    );
  });

  it("rejects pose observations with decreasing timestamps", () => {
    expect(() =>
      parseReplayRecording(
        [metadata, observation(200), observation(100)].join("\n"),
      ),
    ).toThrow("timestamps are out of order");
  });
});

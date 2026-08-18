import type { MovementFeatures } from "../movement/types";
import type { PoseQuality } from "../pose/types";
import {
  parsePoseObservationJsonLine,
  RECORDING_SCHEMA_VERSION,
  type PoseObservationRecord,
  type RecordingMetadataRecord,
} from "./recording";

export interface ReplayDiagnostics {
  poseQualityByTimestamp: Map<number, PoseQuality>;
  movementFeaturesByTimestamp: Map<number, MovementFeatures>;
}

export interface ReplayRecording {
  metadata: RecordingMetadataRecord;
  observations: PoseObservationRecord[];
  diagnostics: ReplayDiagnostics;
  durationMs: number;
}

export class ReplayRecordingError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseJsonLine(line: string, lineNumber: number): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(line);
    if (!isRecord(value)) throw new Error();
    return value;
  } catch {
    throw new ReplayRecordingError(`Invalid JSONL record at line ${lineNumber}.`);
  }
}

function requireTimestamp(value: Record<string, unknown>, lineNumber: number): number {
  if (typeof value.timestampMs !== "number" || !Number.isFinite(value.timestampMs)) {
    throw new ReplayRecordingError(`Invalid timestamp at line ${lineNumber}.`);
  }
  return value.timestampMs;
}

export function parseReplayRecording(jsonl: string): ReplayRecording {
  const lines = jsonl
    .split(/\r?\n/)
    .map((line, index) => ({ text: line.trim(), lineNumber: index + 1 }))
    .filter((line) => line.text !== "");

  if (lines.length === 0) {
    throw new ReplayRecordingError("Recording is empty.");
  }

  const first = parseJsonLine(lines[0].text, lines[0].lineNumber);
  if (first.type !== "metadata") {
    throw new ReplayRecordingError("The first JSONL record must be metadata.");
  }
  if (first.schemaVersion !== RECORDING_SCHEMA_VERSION) {
    throw new ReplayRecordingError(
      `Unsupported schema version: ${String(first.schemaVersion)}. Expected ${RECORDING_SCHEMA_VERSION}.`,
    );
  }
  if (
    typeof first.startTimestampMs !== "number" ||
    !Number.isFinite(first.startTimestampMs) ||
    typeof first.recordingStartedAt !== "string" ||
    typeof first.applicationVersion !== "string" ||
    first.source !== "participant" ||
    typeof first.movementConfigVersion !== "string" ||
    typeof first.poseProcessingConfigVersion !== "string" ||
    first.poseVariant !== "raw-canonical-observations" ||
    first.rawVideoRecorded !== false
  ) {
    throw new ReplayRecordingError("Recording metadata is malformed.");
  }

  const observations: PoseObservationRecord[] = [];
  const poseQualityByTimestamp = new Map<number, PoseQuality>();
  const movementFeaturesByTimestamp = new Map<number, MovementFeatures>();

  for (const line of lines.slice(1)) {
    const value = parseJsonLine(line.text, line.lineNumber);
    if (value.type === "pose-observation") {
      const parsed = parsePoseObservationJsonLine(line.text);
      if (parsed.kind !== "pose" && parsed.kind !== "no-pose") {
        throw new ReplayRecordingError(
          `Malformed pose observation at line ${line.lineNumber}.`,
        );
      }
      const record = parsed.record;
      const previous = observations.at(-1);
      if (previous && record.timestampMs < previous.timestampMs) {
        throw new ReplayRecordingError(
          `Pose observation timestamps are out of order at line ${line.lineNumber}.`,
        );
      }
      observations.push(record);
      continue;
    }

    if (value.type === "pose-quality") {
      const timestampMs = requireTimestamp(value, line.lineNumber);
      if (!isRecord(value.poseQuality)) {
        throw new ReplayRecordingError(
          `Malformed pose-quality record at line ${line.lineNumber}.`,
        );
      }
      poseQualityByTimestamp.set(timestampMs, value.poseQuality as unknown as PoseQuality);
      continue;
    }

    if (value.type === "movement-features") {
      const timestampMs = requireTimestamp(value, line.lineNumber);
      if (!isRecord(value.movementFeatures)) {
        throw new ReplayRecordingError(
          `Malformed movement-feature record at line ${line.lineNumber}.`,
        );
      }
      movementFeaturesByTimestamp.set(
        timestampMs,
        value.movementFeatures as unknown as MovementFeatures,
      );
      continue;
    }

    throw new ReplayRecordingError(
      `Unsupported record type at line ${line.lineNumber}: ${String(value.type)}.`,
    );
  }

  if (observations.length === 0) {
    throw new ReplayRecordingError("Recording contains no pose observations.");
  }

  return {
    metadata: first as unknown as RecordingMetadataRecord,
    observations,
    diagnostics: { poseQualityByTimestamp, movementFeaturesByTimestamp },
    durationMs:
      observations.at(-1)!.timestampMs - observations[0].timestampMs,
  };
}

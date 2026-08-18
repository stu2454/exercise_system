import packageJson from "../../package.json";
import { MOVEMENT_CONFIG } from "../movement/movementConfig";
import type { MovementFeatures } from "../movement/types";
import { POSE_PROCESSING_CONFIG } from "../pose/poseProcessingConfig";
import type { PoseFrame, PoseQuality, ProcessedPoseFrame } from "../pose/types";
import type { ProgrammeSessionResult } from "./programmeSession";

export const RECORDING_SCHEMA_VERSION = "2.0.0";

export interface RecordingMetadataRecord {
  type: "metadata";
  schemaVersion: string;
  recordingStartedAt: string;
  startTimestampMs: number;
  applicationVersion: string;
  source: "participant";
  movementConfigVersion: string;
  poseProcessingConfigVersion: string;
  poseVariant: "raw-canonical-observations";
  rawVideoRecorded: false;
  sessionResult?: ProgrammeSessionResult;
}

export interface PoseObservationRecord {
  type: "pose-observation";
  timestampMs: number;
  pose: PoseFrame | null;
}

export interface PoseQualityRecord {
  type: "pose-quality";
  timestampMs: number;
  poseQuality: PoseQuality;
}

export interface MovementFeatureRecord {
  type: "movement-features";
  timestampMs: number;
  movementFeatures: MovementFeatures;
}

export type RecordingRecord =
  | RecordingMetadataRecord
  | PoseObservationRecord
  | PoseQualityRecord
  | MovementFeatureRecord;

export interface StartRecordingOptions {
  startTimestampMs: number;
  recordingStartedAt?: string;
  applicationVersion?: string;
}

export interface CompletedRecording {
  filename: string;
  jsonl: string;
  recordCount: number;
}

export type PoseObservationParseResult =
  | { kind: "pose"; record: PoseObservationRecord & { pose: PoseFrame } }
  | { kind: "no-pose"; record: PoseObservationRecord & { pose: null } }
  | { kind: "malformed" }
  | { kind: "missing" };

function cloneSerializable<T>(value: T): T | null {
  try {
    const json = JSON.stringify(value);
    if (json === undefined) return null;
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCanonicalPoseFrame(value: unknown): value is PoseFrame {
  return (
    isRecord(value) &&
    typeof value.timestampMs === "number" &&
    Number.isFinite(value.timestampMs) &&
    value.source === "participant" &&
    isRecord(value.landmarks)
  );
}

function safeFilenameTimestamp(isoTimestamp: string): string {
  return isoTimestamp.replaceAll(":", "-").replaceAll(".", "-");
}

export function parsePoseObservationJsonLine(
  line: string | null | undefined,
): PoseObservationParseResult {
  if (line === null || line === undefined || line.trim() === "") {
    return { kind: "missing" };
  }

  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return { kind: "malformed" };
  }

  if (
    !isRecord(value) ||
    value.type !== "pose-observation" ||
    typeof value.timestampMs !== "number" ||
    !Number.isFinite(value.timestampMs) ||
    !("pose" in value)
  ) {
    return { kind: "malformed" };
  }

  if (value.pose === null) {
    return {
      kind: "no-pose",
      record: value as unknown as PoseObservationRecord & { pose: null },
    };
  }

  if (
    !isCanonicalPoseFrame(value.pose) ||
    value.pose.timestampMs !== value.timestampMs
  ) {
    return { kind: "malformed" };
  }

  return {
    kind: "pose",
    record: value as unknown as PoseObservationRecord & { pose: PoseFrame },
  };
}

export class CanonicalDataRecorder {
  private records: RecordingRecord[] = [];
  private active = false;
  private startedAtIso = "";

  get isRecording(): boolean {
    return this.active;
  }

  get recordCount(): number {
    return this.records.length;
  }

  start(options: StartRecordingOptions): boolean {
    if (this.active || !Number.isFinite(options.startTimestampMs)) {
      return false;
    }

    this.startedAtIso = options.recordingStartedAt ?? new Date().toISOString();
    this.records = [
      {
        type: "metadata",
        schemaVersion: RECORDING_SCHEMA_VERSION,
        recordingStartedAt: this.startedAtIso,
        startTimestampMs: options.startTimestampMs,
        applicationVersion: options.applicationVersion ?? packageJson.version,
        source: "participant",
        movementConfigVersion: MOVEMENT_CONFIG.version,
        poseProcessingConfigVersion: POSE_PROCESSING_CONFIG.version,
        poseVariant: "raw-canonical-observations",
        rawVideoRecorded: false,
      },
    ];
    this.active = true;
    return true;
  }

  record(processed: ProcessedPoseFrame | unknown, movementFeatures: unknown): void {
    if (!this.active || !isRecord(processed)) return;

    const timestampMs = processed.timestampMs;
    if (typeof timestampMs !== "number" || !Number.isFinite(timestampMs)) return;

    if (processed.rawPoseFrame === null) {
      this.records.push({ type: "pose-observation", timestampMs, pose: null });
    } else if (isCanonicalPoseFrame(processed.rawPoseFrame)) {
      const pose = cloneSerializable(processed.rawPoseFrame);
      if (pose) {
        this.records.push({ type: "pose-observation", timestampMs, pose });
      }
    }

    const poseQuality = cloneSerializable(processed.poseQuality);
    if (poseQuality && isRecord(poseQuality)) {
      this.records.push({
        type: "pose-quality",
        timestampMs,
        poseQuality: poseQuality as unknown as PoseQuality,
      });
    }

    const features = cloneSerializable(movementFeatures);
    if (features && isRecord(features)) {
      this.records.push({
        type: "movement-features",
        timestampMs,
        movementFeatures: features as unknown as MovementFeatures,
      });
    }
  }

  stop(sessionResult?: ProgrammeSessionResult): CompletedRecording | null {
    if (!this.active) return null;

    this.active = false;
    if (sessionResult && this.records[0]?.type === "metadata") this.records[0].sessionResult = cloneSerializable(sessionResult) ?? undefined;
    const jsonl = `${this.records.map((record) => JSON.stringify(record)).join("\n")}\n`;
    return {
      filename: `exercise-engagement-${safeFilenameTimestamp(this.startedAtIso)}.jsonl`,
      jsonl,
      recordCount: this.records.length,
    };
  }
}

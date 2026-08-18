import type { Landmark, PoseFrame } from "./types";
import type { LandmarkName } from "../types/landmarks";

interface MediaPipeLandmarkLike {
  x?: unknown;
  y?: unknown;
  z?: unknown;
  visibility?: unknown;
}

interface MediaPipeResultLike {
  landmarks?: unknown;
}

// MediaPipe model indices must remain private to this adapter.
const MEDIAPIPE_LANDMARK_INDEX: Readonly<Record<LandmarkName, number>> = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
  leftHeel: 29,
  rightHeel: 30,
  leftFootIndex: 31,
  rightFootIndex: 32,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clampConfidence(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

function toCanonicalLandmark(value: unknown): Landmark | null {
  if (!isRecord(value)) {
    return null;
  }

  const landmark = value as MediaPipeLandmarkLike;
  if (
    typeof landmark.x !== "number" ||
    !Number.isFinite(landmark.x) ||
    typeof landmark.y !== "number" ||
    !Number.isFinite(landmark.y)
  ) {
    return null;
  }

  const canonical: Landmark = {
    x: landmark.x,
    y: landmark.y,
    confidence: clampConfidence(landmark.visibility),
  };

  if (typeof landmark.z === "number" && Number.isFinite(landmark.z)) {
    canonical.z = landmark.z;
  }

  return canonical;
}

function getFirstPoseLandmarks(result: unknown): unknown[] | null {
  if (!isRecord(result)) {
    return null;
  }

  const landmarks = (result as MediaPipeResultLike).landmarks;
  if (!Array.isArray(landmarks) || !Array.isArray(landmarks[0])) {
    return null;
  }

  return landmarks[0];
}

export function convertMediaPipeResultToPoseFrame(
  result: unknown,
  timestampMs: number,
): PoseFrame | null {
  if (!Number.isFinite(timestampMs)) {
    return null;
  }

  const poseLandmarks = getFirstPoseLandmarks(result);
  if (!poseLandmarks) {
    return null;
  }

  const landmarks: PoseFrame["landmarks"] = {};
  let confidenceTotal = 0;
  let mappedLandmarkCount = 0;

  for (const [name, index] of Object.entries(MEDIAPIPE_LANDMARK_INDEX) as [
    LandmarkName,
    number,
  ][]) {
    const landmark = toCanonicalLandmark(poseLandmarks[index]);
    if (!landmark) {
      continue;
    }

    landmarks[name] = landmark;
    confidenceTotal += landmark.confidence;
    mappedLandmarkCount += 1;
  }

  if (mappedLandmarkCount === 0) {
    return null;
  }

  return {
    timestampMs,
    source: "participant",
    personConfidence: confidenceTotal / mappedLandmarkCount,
    landmarks,
  };
}

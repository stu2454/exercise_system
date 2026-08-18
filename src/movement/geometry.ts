import type { Landmark, PoseFrame } from "../pose/types";
import type { FeatureValue } from "./types";

export interface PointWithConfidence {
  x: number;
  y: number;
  confidence: number;
}

export function distance2d(
  a: Pick<Landmark, "x" | "y">,
  b: Pick<Landmark, "x" | "y">,
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function midpoint(
  a: Landmark | undefined,
  b: Landmark | undefined,
  minConfidence: number,
): PointWithConfidence | null {
  if (
    !a ||
    !b ||
    a.confidence < minConfidence ||
    b.confidence < minConfidence
  ) {
    return null;
  }

  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    confidence: Math.min(a.confidence, b.confidence),
  };
}

export function estimateBodyScale(
  frame: PoseFrame,
  minConfidence: number,
  minScale: number,
): FeatureValue {
  const leftShoulder = frame.landmarks.leftShoulder;
  const rightShoulder = frame.landmarks.rightShoulder;
  const shoulderCentre = midpoint(leftShoulder, rightShoulder, minConfidence);
  const hipCentre = midpoint(
    frame.landmarks.leftHip,
    frame.landmarks.rightHip,
    minConfidence,
  );

  const candidates: { value: number; confidence: number }[] = [];
  if (
    leftShoulder &&
    rightShoulder &&
    leftShoulder.confidence >= minConfidence &&
    rightShoulder.confidence >= minConfidence
  ) {
    candidates.push({
      value: distance2d(leftShoulder, rightShoulder),
      confidence: Math.min(leftShoulder.confidence, rightShoulder.confidence),
    });
  }
  if (shoulderCentre && hipCentre) {
    candidates.push({
      value: distance2d(shoulderCentre, hipCentre),
      confidence: Math.min(shoulderCentre.confidence, hipCentre.confidence),
    });
  }

  const usable = candidates.filter((candidate) => candidate.value >= minScale);
  if (usable.length === 0) {
    return { value: null, valid: false };
  }

  return {
    value:
      usable.reduce((total, candidate) => total + candidate.value, 0) /
      usable.length,
    valid: true,
    confidence: Math.min(...usable.map((candidate) => candidate.confidence)),
  };
}

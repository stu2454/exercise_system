import type { LandmarkName } from "../types/landmarks";
import type { PoseFrame } from "./types";

export const CANONICAL_POSE_CONNECTIONS: readonly (readonly [LandmarkName, LandmarkName])[] = [
  ["leftShoulder", "rightShoulder"], ["leftShoulder", "leftElbow"], ["leftElbow", "leftWrist"],
  ["rightShoulder", "rightElbow"], ["rightElbow", "rightWrist"], ["leftShoulder", "leftHip"],
  ["rightShoulder", "rightHip"], ["leftHip", "rightHip"], ["leftHip", "leftKnee"],
  ["leftKnee", "leftAnkle"], ["rightHip", "rightKnee"], ["rightKnee", "rightAnkle"],
  ["leftAnkle", "leftHeel"], ["leftHeel", "leftFootIndex"], ["rightAnkle", "rightHeel"], ["rightHeel", "rightFootIndex"],
];

export function drawCanonicalPoseOverlay(context: CanvasRenderingContext2D, frame: PoseFrame, width: number, height: number): void {
  context.strokeStyle = "#7ef2ad"; context.lineWidth = 3; context.lineCap = "round";
  for (const [fromName, toName] of CANONICAL_POSE_CONNECTIONS) {
    const from = frame.landmarks[fromName], to = frame.landmarks[toName];
    if (!from || !to) continue;
    context.beginPath(); context.moveTo(from.x * width, from.y * height); context.lineTo(to.x * width, to.y * height); context.stroke();
  }
  context.fillStyle = "#f5fff8";
  for (const landmark of Object.values(frame.landmarks)) {
    if (!landmark) continue;
    context.beginPath(); context.arc(landmark.x * width, landmark.y * height, 4, 0, Math.PI * 2); context.fill();
  }
}

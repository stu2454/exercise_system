import type { Landmark } from "./types";

export function toMirroredDisplayLandmark(landmark: Landmark): Landmark {
  return { ...landmark, x: 1 - landmark.x };
}

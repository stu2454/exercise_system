import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import {
  appendInferenceTimestamp,
  calculateInferenceFps,
} from "./inferenceFps";
import { convertMediaPipeResultToPoseFrame } from "./mediapipePoseAdapter";
import { PoseLandmarkFilter } from "./poseFilter";
import { PoseQualityAssessor } from "./poseQuality";
import type { PoseFrame, PoseQuality, ProcessedPoseFrame } from "./types";
import { drawCanonicalPoseOverlay } from "./canonicalPoseOverlay";

const MEDIAPIPE_VERSION = "0.10.35";
const WASM_ASSET_PATH = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_ASSET_PATH =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const DEBUG_UPDATE_INTERVAL_MS = 500;

export interface PoseInferenceUpdate {
  personDetected: boolean;
  inferenceFps: number;
  rawPoseFrame: PoseFrame | null;
  filteredPoseFrame: PoseFrame | null;
  poseQuality: PoseQuality;
}

interface PoseEngineOptions {
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  showOverlay: () => boolean;
  onUpdate: (update: PoseInferenceUpdate) => void;
  onFrame?: (frame: ProcessedPoseFrame) => void;
}

export interface PoseEngine {
  dispose: () => void;
  resetProcessing: () => void;
}

function sizeCanvasToVideo(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
): void {
  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }
}

export async function createPoseEngine({
  video,
  canvas,
  showOverlay,
  onUpdate,
  onFrame,
}: PoseEngineOptions): Promise<PoseEngine> {
  let disposed = false;
  let animationFrameId: number | null = null;
  let lastVideoTime = -1;
  let lastDebugUpdateMs = 0;
  let lastPersonDetected: boolean | null = null;
  let inferenceTimestampsMs: number[] = [];
  const qualityAssessor = new PoseQualityAssessor();
  const landmarkFilter = new PoseLandmarkFilter();

  const vision = await FilesetResolver.forVisionTasks(WASM_ASSET_PATH);
  const landmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_ASSET_PATH,
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numPoses: 1,
    outputSegmentationMasks: false,
  });

  if (disposed) {
    landmarker.close();
    return {
      dispose: () => undefined,
      resetProcessing: () => undefined,
    };
  }

  const context = canvas.getContext("2d");
  if (!context) {
    landmarker.close();
    throw new Error("Canvas drawing is not supported by this browser.");
  }

  const renderFrame = () => {
    if (disposed) {
      return;
    }

    if (
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      video.videoWidth > 0 &&
      video.currentTime !== lastVideoTime
    ) {
      lastVideoTime = video.currentTime;
      const timestampMs = performance.now();
      const result = landmarker.detectForVideo(video, timestampMs);
      const rawPoseFrame = convertMediaPipeResultToPoseFrame(result, timestampMs);
      const filteredPoseFrame = landmarkFilter.filter(rawPoseFrame, timestampMs);
      const poseQuality = qualityAssessor.assess(rawPoseFrame, timestampMs);
      const personDetected = rawPoseFrame !== null;
      const processedFrame: ProcessedPoseFrame = {
        timestampMs,
        rawPoseFrame,
        filteredPoseFrame,
        poseQuality,
      };
      onFrame?.(processedFrame);

      sizeCanvasToVideo(canvas, video);
      context.clearRect(0, 0, canvas.width, canvas.height);

      if (filteredPoseFrame && showOverlay()) drawCanonicalPoseOverlay(context, filteredPoseFrame, canvas.width, canvas.height);

      inferenceTimestampsMs = appendInferenceTimestamp(
        inferenceTimestampsMs,
        timestampMs,
      );

      if (
        personDetected !== lastPersonDetected ||
        timestampMs - lastDebugUpdateMs >= DEBUG_UPDATE_INTERVAL_MS
      ) {
        lastPersonDetected = personDetected;
        lastDebugUpdateMs = timestampMs;
        onUpdate({
          personDetected,
          inferenceFps: calculateInferenceFps(inferenceTimestampsMs),
          rawPoseFrame,
          filteredPoseFrame,
          poseQuality,
        });
      }
    }

    animationFrameId = requestAnimationFrame(renderFrame);
  };

  animationFrameId = requestAnimationFrame(renderFrame);

  return {
    resetProcessing: () => {
      qualityAssessor.reset();
      landmarkFilter.reset();
    },
    dispose: () => {
      disposed = true;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      context.clearRect(0, 0, canvas.width, canvas.height);
      landmarker.close();
      qualityAssessor.reset();
      landmarkFilter.reset();
    },
  };
}

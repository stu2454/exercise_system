import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { PoseQuality, ProcessedPoseFrame } from "./types";
import {
  createPoseEngine,
  type PoseEngine,
  type PoseInferenceUpdate,
} from "./mediapipePoseLandmarker";

export type PoseEngineStatus = "idle" | "loading" | "running" | "error";

export interface PoseDisplayState extends PoseInferenceUpdate {
  status: PoseEngineStatus;
  errorMessage: string | null;
}

const initialPoseState: PoseDisplayState = {
  status: "idle",
  personDetected: false,
  inferenceFps: 0,
  rawPoseFrame: null,
  filteredPoseFrame: null,
  poseQuality: {
    level: "insufficient",
    personPresent: false,
    fullBodyVisible: false,
    missingRequiredLandmarks: [],
    warnings: [],
  } satisfies PoseQuality,
  errorMessage: null,
};

interface UsePoseLandmarkerOptions {
  active: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  surfaceKey?: string;
  onFrame?: (frame: ProcessedPoseFrame) => void;
}

export function usePoseLandmarker({
  active,
  videoRef,
  surfaceKey,
  onFrame,
}: UsePoseLandmarkerOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PoseEngine | null>(null);
  const showOverlayRef = useRef(true);
  const [showOverlay, setShowOverlayState] = useState(true);
  const [state, setState] = useState<PoseDisplayState>(initialPoseState);

  const setShowOverlay = (visible: boolean) => {
    showOverlayRef.current = visible;
    setShowOverlayState(visible);
  };

  useEffect(() => {
    if (!active) {
      setState(initialPoseState);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      return;
    }

    let cancelled = false;
    let engine: PoseEngine | null = null;
    setState({ ...initialPoseState, status: "loading" });

    void createPoseEngine({
      video,
      canvas,
      showOverlay: () => showOverlayRef.current,
      onUpdate: (update) => {
        if (!cancelled) {
          setState({
            status: "running",
            ...update,
            errorMessage: null,
          });
        }
      },
      onFrame,
    })
      .then((createdEngine) => {
        if (cancelled) {
          createdEngine.dispose();
        } else {
          engine = createdEngine;
          engineRef.current = createdEngine;
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const detail = error instanceof Error ? ` ${error.message}` : "";
          setState({
            ...initialPoseState,
            status: "error",
            errorMessage: `Pose model could not be loaded.${detail}`,
          });
        }
      });

    return () => {
      cancelled = true;
      engine?.dispose();
      if (engineRef.current === engine) {
        engineRef.current = null;
      }
    };
  }, [active, videoRef, onFrame, surfaceKey]);

  const resetProcessing = () => engineRef.current?.resetProcessing();

  return { state, canvasRef, showOverlay, setShowOverlay, resetProcessing };
}

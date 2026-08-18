import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  cameraStateReducer,
  getCameraErrorMessage,
  initialCameraState,
} from "./cameraState";

function stopMediaStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

export function useCamera() {
  const [state, dispatch] = useReducer(cameraStateReducer, initialCameraState);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  const clearStream = useCallback(() => {
    stopMediaStream(streamRef.current);
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    requestIdRef.current += 1;
    clearStream();
    dispatch({ type: "stopped" });
  }, [clearStream]);

  const reattachVideo = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, []);

  const startCamera = useCallback(async () => {
    const mediaDevices = navigator.mediaDevices;

    if (!mediaDevices?.getUserMedia) {
      dispatch({
        type: "failed",
        message:
          "Camera access is not supported here. Use a current browser on localhost or a secure HTTPS page.",
      });
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    clearStream();
    dispatch({ type: "request" });

    try {
      const stream = await mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user" },
      });

      if (!mountedRef.current || requestId !== requestIdRef.current) {
        stopMediaStream(stream);
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      dispatch({ type: "started" });
    } catch (error) {
      if (mountedRef.current && requestId === requestIdRef.current) {
        dispatch({ type: "failed", message: getCameraErrorMessage(error) });
      }
    }
  }, [clearStream]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    };
  }, []);

  return { state, startCamera, stopCamera, videoRef, reattachVideo };
}

import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionSummary } from "../engagement/types";
import {
  createInvalidMovementFeatures,
  MovementFeatureExtractor,
} from "../movement/movementFeatures";
import type { MovementFeatures } from "../movement/types";
import type { ProcessedPoseFrame } from "../pose/types";
import { SessionAggregator } from "./sessionAggregator";
import { CanonicalDataRecorder, type CompletedRecording } from "./recording";
import { downloadRecording as downloadRecordingFile } from "./downloadRecording";
import type { ProgrammeSessionResult } from "./programmeSession";

const LIVE_UPDATE_INTERVAL_MS = 250;

export function useMovementSession() {
  const extractorRef = useRef(new MovementFeatureExtractor());
  const aggregatorRef = useRef<SessionAggregator | null>(null);
  const sessionActiveRef = useRef(false);
  const recorderRef = useRef(new CanonicalDataRecorder());
  const lastUiUpdateMsRef = useRef(0);
  const [movementFeatures, setMovementFeatures] = useState<MovementFeatures>(
    createInvalidMovementFeatures(0),
  );
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [recordingActive, setRecordingActive] = useState(false);
  const [completedRecording, setCompletedRecording] =
    useState<CompletedRecording | null>(null);

  const processFrame = useCallback((processed: ProcessedPoseFrame) => {
    const features = extractorRef.current.process(
      processed.filteredPoseFrame,
      processed.poseQuality,
      processed.timestampMs,
    );

    recorderRef.current.record(processed, features);

    if (sessionActiveRef.current) {
      aggregatorRef.current?.add({
        timestampMs: processed.timestampMs,
        poseQuality: processed.poseQuality,
        movementFeatures: features,
      });
    }

    if (
      processed.timestampMs - lastUiUpdateMsRef.current >= LIVE_UPDATE_INTERVAL_MS ||
      !features.wholeBodyActivity.valid
    ) {
      lastUiUpdateMsRef.current = processed.timestampMs;
      setMovementFeatures(features);
    }
  }, []);

  const startSession = useCallback(() => {
    const timestampMs = performance.now();
    extractorRef.current.reset();
    aggregatorRef.current = new SessionAggregator(timestampMs);
    sessionActiveRef.current = true;
    setSessionSummary(null);
    setSessionActive(true);
  }, []);

  const stopSession = useCallback(() => {
    if (!sessionActiveRef.current) return;

    sessionActiveRef.current = false;
    const summary = aggregatorRef.current?.finish(performance.now()) ?? null;
    aggregatorRef.current = null;
    setSessionActive(false);
    setSessionSummary(summary);
  }, []);

  const startRecording = useCallback(() => {
    const started = recorderRef.current.start({
      startTimestampMs: performance.now(),
    });
    if (started) {
      extractorRef.current.reset();
      setCompletedRecording(null);
      setRecordingActive(true);
    }
  }, []);

  const stopRecording = useCallback((sessionResult?: ProgrammeSessionResult) => {
    const completed = recorderRef.current.stop(sessionResult);
    if (completed) {
      setCompletedRecording(completed);
    }
    setRecordingActive(false);
  }, []);

  const finalizeAndDownloadRecording = useCallback((sessionResult: ProgrammeSessionResult) => {
    const completed = recorderRef.current.stop(sessionResult);
    if (completed) { setCompletedRecording(completed); downloadRecordingFile(completed); }
    setRecordingActive(false);
    return completed;
  }, []);

  const downloadRecording = useCallback(() => {
    if (completedRecording) {
      downloadRecordingFile(completedRecording);
    }
  }, [completedRecording]);

  useEffect(
    () => () => {
      recorderRef.current.stop();
      aggregatorRef.current = null;
      sessionActiveRef.current = false;
    },
    [],
  );

  return {
    movementFeatures,
    sessionActive,
    sessionSummary,
    recordingActive,
    completedRecording,
    processFrame,
    startSession,
    stopSession,
    startRecording,
    stopRecording,
    downloadRecording,
    finalizeAndDownloadRecording,
  };
}

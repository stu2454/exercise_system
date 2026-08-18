import { useCallback, useEffect, useRef, useState } from "react";
import type { ReplayOutput } from "./replayProcessor";
import { ReplayPlayer, type ReplayState } from "./replayPlayer";
import { parseReplayRecording } from "./replayRecording";

const EMPTY_STATE: ReplayState = {
  status: "stopped",
  elapsedMs: 0,
  totalDurationMs: 0,
  progress: 0,
  processedObservations: 0,
  totalObservations: 0,
  summary: null,
};

export function useReplay() {
  const playerRef = useRef<ReplayPlayer | null>(null);
  const [state, setState] = useState<ReplayState>(EMPTY_STATE);
  const [output, setOutput] = useState<ReplayOutput | null>(null);
  const [recordingName, setRecordingName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadFile = useCallback(async (file: File) => {
    try {
      const recording = parseReplayRecording(await file.text());
      playerRef.current?.dispose();
      setOutput(null);
      setErrorMessage(null);
      setRecordingName(file.name);
      playerRef.current = new ReplayPlayer(recording, {
        onOutput: setOutput,
        onStateChange: setState,
      });
    } catch (error) {
      playerRef.current?.dispose();
      playerRef.current = null;
      setRecordingName(null);
      setOutput(null);
      setState(EMPTY_STATE);
      setErrorMessage(
        error instanceof Error ? error.message : "Recording could not be loaded.",
      );
    }
  }, []);

  const play = useCallback(() => playerRef.current?.play(), []);
  const pause = useCallback(() => playerRef.current?.pause(), []);
  const restart = useCallback(() => {
    setOutput(null);
    playerRef.current?.restart();
  }, []);
  const stopReplay = useCallback(() => {
    playerRef.current?.dispose();
    playerRef.current = null;
    setRecordingName(null);
    setOutput(null);
    setState(EMPTY_STATE);
    setErrorMessage(null);
  }, []);

  useEffect(() => () => playerRef.current?.dispose(), []);

  return {
    state,
    output,
    recordingName,
    errorMessage,
    replayMode: recordingName !== null,
    loadFile,
    play,
    pause,
    restart,
    stopReplay,
  };
}

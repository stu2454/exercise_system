import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_PARTICIPANT_PROMPT_SETTINGS } from "../audio/participantPrompts";
import { useCamera } from "../camera/useCamera";
import { DEVELOPMENT_PROGRAMME, EXERCISE_LIBRARY } from "../exercise/exerciseLibrary";
import { usePoseLandmarker } from "../pose/usePoseLandmarker";
import { useProgrammeRunner } from "../programme/useProgrammeRunner";
import { useMovementSession } from "../session/useMovementSession";
import { ProgrammeSessionTracker, type ProgrammeSessionResult } from "../session/programmeSession";
import { createClientDemoProgramme } from "../clientDemo/clientDemoProgramme";
import { ClientDemoLanding } from "./ClientDemoLanding";
import { ParticipantMode } from "./ParticipantMode";

const CLIENT_DEMO_PROGRAMME = createClientDemoProgramme(DEVELOPMENT_PROGRAMME);

export default function ClientDemoApp() {
  const camera = useCamera();
  const movementSession = useMovementSession();
  const runner = useProgrammeRunner(CLIENT_DEMO_PROGRAMME, EXERCISE_LIBRARY);
  const trackerRef = useRef<ProgrammeSessionTracker | null>(null);
  const previousRunnerStateRef = useRef(runner.state);
  const [started, setStarted] = useState(false);
  const [sessionResult, setSessionResult] = useState<ProgrammeSessionResult | null>(null);
  const [promptSettings, setPromptSettings] = useState(DEFAULT_PARTICIPANT_PROMPT_SETTINGS);

  const handlePoseFrame = useCallback((frame: Parameters<typeof movementSession.processFrame>[0]) => {
    movementSession.processFrame(frame);
    runner.processPoseFrame(frame);
    trackerRef.current?.observe(frame.poseQuality);
  }, [movementSession.processFrame, runner.processPoseFrame]);

  const pose = usePoseLandmarker({
    active: camera.state.status === "active",
    videoRef: camera.videoRef,
    onFrame: handlePoseFrame,
    surfaceKey: "client-demo",
  });

  useEffect(() => {
    camera.reattachVideo();
  }, [camera.reattachVideo, camera.state.status, started]);

  useEffect(() => {
    const previous = previousRunnerStateRef.current;
    const timestampMs = Date.now();
    trackerRef.current?.transition(previous, runner.state, timestampMs);
    if (runner.state.phase === "programme-complete" && previous.phase !== "programme-complete") {
      setSessionResult(trackerRef.current?.finish("completed", "completed", timestampMs) ?? null);
    }
    previousRunnerStateRef.current = runner.state;
  }, [runner.state]);

  const startProgramme = () => {
    if (!runner.validation.valid) return;
    trackerRef.current = new ProgrammeSessionTracker(CLIENT_DEMO_PROGRAMME, Date.now());
    setSessionResult(null);
    pose.setShowOverlay(true);
    runner.returnToProgramme();
    runner.beginProgramme();
    setStarted(true);
    if (camera.state.status !== "active" && camera.state.status !== "requesting") void camera.startCamera();
  };

  const returnToStart = () => {
    runner.returnToProgramme();
    trackerRef.current = null;
    setSessionResult(null);
    camera.stopCamera();
    setStarted(false);
  };

  const exitProgramme = () => {
    trackerRef.current?.finish("aborted", "participant_exit", Date.now());
    returnToStart();
  };

  if (!started) {
    return <ClientDemoLanding exerciseCount={CLIENT_DEMO_PROGRAMME.exercises.length} onStart={startProgramme} />;
  }

  return (
    <ParticipantMode
      presentation="client-demo"
      programme={CLIENT_DEMO_PROGRAMME}
      exercises={EXERCISE_LIBRARY}
      runner={runner}
      cameraStatus={camera.state.status}
      cameraMessage={camera.state.message}
      poseQuality={pose.state.poseQuality}
      poseFrame={pose.state.filteredPoseFrame}
      poseStatus={pose.state.status}
      videoRef={camera.videoRef}
      canvasRef={pose.canvasRef}
      onStartCamera={camera.startCamera}
      onCameraSurfaceReady={camera.reattachVideo}
      onStartProgramme={() => undefined}
      onEndAndSave={exitProgramme}
      onFinish={returnToStart}
      onStartAgain={startProgramme}
      sessionResult={sessionResult}
      promptSettings={promptSettings}
      onPromptSettingsChange={setPromptSettings}
    />
  );
}

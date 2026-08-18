import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useCamera } from "../camera/useCamera";
import { usePoseLandmarker } from "../pose/usePoseLandmarker";
import { useMovementSession } from "../session/useMovementSession";
import { useReplay } from "../session/useReplay";
import { CameraPanel } from "./CameraPanel";
import { ReplayPanel } from "./ReplayPanel";
import { DEVELOPMENT_PROGRAMME, EXERCISE_LIBRARY } from "../exercise/exerciseLibrary";
import { ExerciseLibraryView } from "./ExerciseLibraryView";
import { ProgrammeView } from "./ProgrammeView";
import { useProgrammeRunner } from "../programme/useProgrammeRunner";
import { ProgrammeRunner } from "./ProgrammeRunner";
import { ParticipantMode } from "./ParticipantMode";
import { participantModeReducer } from "../programme/participantMode";
import { ProgrammeSessionTracker } from "../session/programmeSession";
import { DEFAULT_PARTICIPANT_PROMPT_SETTINGS } from "../audio/participantPrompts";
import { ParticipantAudioSettings } from "./ParticipantAudioSettings";

export default function App() {
  const { state, startCamera, stopCamera, videoRef, reattachVideo } = useCamera();
  const movementSession = useMovementSession();
  const replay = useReplay();
  const [participantMode, dispatchParticipantMode] = useReducer(participantModeReducer, false);
  const [promptSettings, setPromptSettings] = useState(DEFAULT_PARTICIPANT_PROMPT_SETTINGS);
  const programmeRunner = useProgrammeRunner(DEVELOPMENT_PROGRAMME, EXERCISE_LIBRARY);
  const programmeSessionRef = useRef<ProgrammeSessionTracker | null>(null);
  const previousRunnerStateRef = useRef(programmeRunner.state);
  const handlePoseFrame = useCallback((frame: Parameters<typeof movementSession.processFrame>[0]) => {
    movementSession.processFrame(frame);
    programmeRunner.processPoseFrame(frame);
    programmeSessionRef.current?.observe(frame.poseQuality);
  }, [movementSession.processFrame, programmeRunner.processPoseFrame]);
  const pose = usePoseLandmarker({
    active: state.status === "active",
    videoRef,
    onFrame: handlePoseFrame,
    surfaceKey: participantMode ? "participant" : "developer",
  });

  useEffect(() => { reattachVideo(); }, [participantMode, reattachVideo, state.status]);

  useEffect(() => {
    const previous = previousRunnerStateRef.current;
    const prescription = DEVELOPMENT_PROGRAMME.exercises[programmeRunner.state.currentExerciseIndex];
    programmeSessionRef.current?.transition(previous, programmeRunner.state, prescription?.exerciseId ?? null, prescription?.dose.durationSeconds ?? 0, performance.now());
    previousRunnerStateRef.current = programmeRunner.state;
  }, [programmeRunner.state]);

  const handleStopCamera = () => {
    movementSession.stopRecording();
    movementSession.stopSession();
    stopCamera();
  };

  const handleStartCamera = () => {
    replay.stopReplay();
    startCamera();
  };

  const handleStartRecording = () => {
    pose.resetProcessing();
    movementSession.startRecording();
  };

  const handleImportRecording = async (file: File) => {
    handleStopCamera();
    await replay.loadFile(file);
  };

  const launchParticipantMode = () => {
    if (!programmeRunner.validation.valid) return;
    pose.setShowOverlay(true);
    programmeSessionRef.current = new ProgrammeSessionTracker();
    movementSession.startRecording();
    if (programmeRunner.state.phase === "idle" || programmeRunner.state.phase === "programme-complete") {
      programmeRunner.beginProgramme();
    }
    dispatchParticipantMode("launch");
  };

  const finishParticipantMode = () => {
    const result = programmeSessionRef.current?.finish("completed", "completed", performance.now());
    if (result) movementSession.finalizeAndDownloadRecording(result);
    programmeRunner.returnToProgramme();
    dispatchParticipantMode("exit");
  };

  const abortParticipantMode = () => {
    const result = programmeSessionRef.current?.finish("aborted", "participant_exit", performance.now());
    if (result) movementSession.finalizeAndDownloadRecording(result);
    programmeRunner.returnToProgramme();
    dispatchParticipantMode("exit");
  };

  if (participantMode) {
    return (
      <ParticipantMode
        programme={DEVELOPMENT_PROGRAMME}
        exercises={EXERCISE_LIBRARY}
        runner={programmeRunner}
        cameraStatus={state.status}
        poseQuality={pose.state.poseQuality}
        poseFrame={pose.state.filteredPoseFrame}
        videoRef={videoRef}
        canvasRef={pose.canvasRef}
        onStartCamera={handleStartCamera}
        onEndAndSave={abortParticipantMode}
        onFinish={finishParticipantMode}
        promptSettings={promptSettings}
        onPromptSettingsChange={setPromptSettings}
      />
    );
  }

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Technical prototype</p>
        <h1>Exercise Engagement</h1>
        <p>
          A privacy-first browser experiment for measuring participation in
          video-delivered exercise.
        </p>
      </section>

      <CameraPanel
        cameraState={state}
        poseState={pose.state}
        movementFeatures={movementSession.movementFeatures}
        sessionActive={movementSession.sessionActive}
        sessionSummary={movementSession.sessionSummary}
        recordingActive={movementSession.recordingActive}
        completedRecording={movementSession.completedRecording}
        canvasRef={pose.canvasRef}
        showOverlay={pose.showOverlay}
        onOverlayChange={pose.setShowOverlay}
        onStart={handleStartCamera}
        onStop={handleStopCamera}
        onStartSession={movementSession.startSession}
        onStopSession={movementSession.stopSession}
        onStartRecording={handleStartRecording}
        onStopRecording={movementSession.stopRecording}
        onDownloadRecording={movementSession.downloadRecording}
        videoRef={videoRef}
      />

      <ReplayPanel
        replayMode={replay.replayMode}
        recordingName={replay.recordingName}
        state={replay.state}
        output={replay.output}
        errorMessage={replay.errorMessage}
        onImport={handleImportRecording}
        onPlay={replay.play}
        onPause={replay.pause}
        onRestart={replay.restart}
        onStop={replay.stopReplay}
      />

      <ExerciseLibraryView exercises={EXERCISE_LIBRARY} />
      <ProgrammeView programme={DEVELOPMENT_PROGRAMME} exercises={EXERCISE_LIBRARY} />
      <ProgrammeRunner
        programme={DEVELOPMENT_PROGRAMME}
        exercises={EXERCISE_LIBRARY}
        runner={programmeRunner}
        onLaunchParticipantMode={launchParticipantMode}
      />
      <ParticipantAudioSettings settings={promptSettings} onChange={setPromptSettings} />
    </main>
  );
}

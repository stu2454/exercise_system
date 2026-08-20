import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useCamera } from "../camera/useCamera";
import { usePoseLandmarker } from "../pose/usePoseLandmarker";
import { useMovementSession } from "../session/useMovementSession";
import { useReplay } from "../session/useReplay";
import { CameraPanel } from "./CameraPanel";
import { ReplayPanel } from "./ReplayPanel";
import { DEVELOPMENT_PROGRAMME, EXERCISE_LIBRARY } from "../exercise/exerciseLibrary";
import { ExerciseLibraryView } from "./ExerciseLibraryView";
import { useProgrammeRunner } from "../programme/useProgrammeRunner";
import { ProgrammeRunner } from "./ProgrammeRunner";
import { ParticipantMode } from "./ParticipantMode";
import { participantModeReducer } from "../programme/participantMode";
import { ProgrammeSessionTracker, type ProgrammeSessionResult } from "../session/programmeSession";
import { DEFAULT_PARTICIPANT_PROMPT_SETTINGS } from "../audio/participantPrompts";
import { ParticipantAudioSettings } from "./ParticipantAudioSettings";
import { useProgrammeCollection } from "../programme/useProgrammeCollection";
import { ProgrammesPanel } from "./ProgrammesPanel";
import { DeveloperNavigation } from "./DeveloperNavigation";
import { OverviewPanel } from "./OverviewPanel";
import type { DeveloperTab } from "./developerTabs";
import { useSessionHistory } from "../session/useSessionHistory";
import { SessionsPanel } from "./SessionsPanel";

export default function App() {
  const { state, startCamera, stopCamera, videoRef, reattachVideo } = useCamera();
  const movementSession = useMovementSession();
  const replay = useReplay();
  const sessionHistory = useSessionHistory();
  const [participantMode, dispatchParticipantMode] = useReducer(participantModeReducer, false);
  const [promptSettings, setPromptSettings] = useState(DEFAULT_PARTICIPANT_PROMPT_SETTINGS);
  const [activeDeveloperTab, setActiveDeveloperTab] = useState<DeveloperTab>("overview");
  const programmes = useProgrammeCollection(DEVELOPMENT_PROGRAMME, EXERCISE_LIBRARY);
  const activeProgramme = programmes.activeProgramme;
  const programmeRunner = useProgrammeRunner(activeProgramme, EXERCISE_LIBRARY);
  const programmeSessionRef = useRef<ProgrammeSessionTracker | null>(null);
  const [programmeSessionResult, setProgrammeSessionResult] = useState<ProgrammeSessionResult | null>(null);
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
    const timestampMs = Date.now();
    programmeSessionRef.current?.transition(previous, programmeRunner.state, timestampMs);
    if (programmeRunner.state.phase === "programme-complete" && previous.phase !== "programme-complete") {
      const result = programmeSessionRef.current?.finish("completed", "completed", timestampMs) ?? null;
      setProgrammeSessionResult(result);
      if (result) sessionHistory.save(result);
    }
    previousRunnerStateRef.current = programmeRunner.state;
  }, [activeProgramme, programmeRunner.state]);

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
    programmeRunner.returnToProgramme();
    setProgrammeSessionResult(null);
    programmeSessionRef.current = null;
    dispatchParticipantMode("launch");
  };

  const startParticipantProgramme = () => {
    if (!programmeRunner.validation.valid || programmeRunner.state.phase !== "idle") return;
    const timestampMs = Date.now();
    programmeSessionRef.current = new ProgrammeSessionTracker(activeProgramme, timestampMs);
    setProgrammeSessionResult(null);
    movementSession.startRecording();
    programmeRunner.beginProgramme();
  };

  const finishParticipantMode = () => {
    const result = programmeSessionResult ?? programmeSessionRef.current?.finish("completed", "completed", Date.now());
    if (result) { sessionHistory.save(result); movementSession.finalizeAndDownloadRecording(result); }
    programmeRunner.returnToProgramme();
    dispatchParticipantMode("exit");
  };

  const abortParticipantMode = () => {
    const result = programmeSessionRef.current?.finish("aborted", "participant_exit", Date.now());
    if (result) { sessionHistory.save(result); movementSession.finalizeAndDownloadRecording(result); }
    programmeRunner.returnToProgramme();
    dispatchParticipantMode("exit");
  };

  const restartParticipantProgramme = () => {
    const previousResult = programmeSessionResult ?? programmeSessionRef.current?.finish("completed", "completed", Date.now());
    if (previousResult) { sessionHistory.save(previousResult); movementSession.finalizeAndDownloadRecording(previousResult); }
    programmeSessionRef.current = new ProgrammeSessionTracker(activeProgramme, Date.now());
    setProgrammeSessionResult(null);
    movementSession.startRecording();
    programmeRunner.startAgain();
  };

  if (participantMode) {
    return (
      <ParticipantMode
        programme={activeProgramme}
        exercises={EXERCISE_LIBRARY}
        runner={programmeRunner}
        cameraStatus={state.status}
        poseQuality={pose.state.poseQuality}
        poseFrame={pose.state.filteredPoseFrame}
        videoRef={videoRef}
        canvasRef={pose.canvasRef}
        onStartCamera={handleStartCamera}
        onCameraSurfaceReady={reattachVideo}
        onStartProgramme={startParticipantProgramme}
        onEndAndSave={abortParticipantMode}
        onFinish={finishParticipantMode}
        onStartAgain={restartParticipantProgramme}
        sessionResult={programmeSessionResult}
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

      <DeveloperNavigation activeTab={activeDeveloperTab} onChange={setActiveDeveloperTab} />

      <div id="developer-panel-overview" role="tabpanel" aria-labelledby="developer-tab-overview" hidden={activeDeveloperTab !== "overview"}>
        <OverviewPanel programme={activeProgramme} cameraStatus={state.status} canLaunch={programmeRunner.validation.valid} onLaunchParticipantMode={launchParticipantMode} />
      </div>

      <div id="developer-panel-programmes" role="tabpanel" aria-labelledby="developer-tab-programmes" hidden={activeDeveloperTab !== "programmes"}>
        <ProgrammesPanel
          collection={programmes.collection}
          activeProgramme={activeProgramme}
          exercises={EXERCISE_LIBRARY}
          onCreate={programmes.create}
          onUpdate={programmes.update}
          onDelete={programmes.remove}
          onSelect={programmes.select}
        />
      </div>

      <div id="developer-panel-exercise-library" role="tabpanel" aria-labelledby="developer-tab-exercise-library" hidden={activeDeveloperTab !== "exercise-library"}>
        <ExerciseLibraryView exercises={EXERCISE_LIBRARY} />
      </div>

      <div id="developer-panel-sessions" role="tabpanel" aria-labelledby="developer-tab-sessions" hidden={activeDeveloperTab !== "sessions"}>
        <SessionsPanel sessions={sessionHistory.sessions} />
      </div>

      <div id="developer-panel-developer" role="tabpanel" aria-labelledby="developer-tab-developer" hidden={activeDeveloperTab !== "developer"}>
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
        <ProgrammeRunner programme={activeProgramme} exercises={EXERCISE_LIBRARY} runner={programmeRunner} />
        <ParticipantAudioSettings settings={promptSettings} onChange={setPromptSettings} />
      </div>
    </main>
  );
}

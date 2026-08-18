import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { CameraStatus } from "../camera/cameraState";
import type { Exercise, ExerciseProgramme } from "../exercise/types";
import type { PoseFrame, PoseQuality } from "../pose/types";
import { enterParticipantFullscreen, exitParticipantFullscreen } from "../programme/fullscreen";
import { FramingGuidanceAssessor, type FramingGuidance } from "../programme/framingGuidance";
import { createParticipantViewModel } from "../programme/participantMode";
import { participantSpeechPrompt } from "../programme/speechPrompts";
import { useParticipantPrompts } from "../audio/useParticipantPrompts";
import type { ParticipantPromptSettings } from "../audio/participantPrompts";
import type { ReturnTypeOfProgrammeRunner } from "../programme/useProgrammeRunnerTypes";
import { LiveCameraSurface } from "./LiveCameraSurface";
import { ReferenceVideo } from "./ReferenceVideo";

interface ParticipantModeProps {
  programme: ExerciseProgramme; exercises: readonly Exercise[]; runner: ReturnTypeOfProgrammeRunner;
  cameraStatus: CameraStatus; poseQuality: PoseQuality; poseFrame: PoseFrame | null;
  videoRef: RefObject<HTMLVideoElement | null>; canvasRef: RefObject<HTMLCanvasElement | null>;
  onStartCamera: () => void; onEndAndSave: () => void; onFinish: () => void;
  promptSettings: ParticipantPromptSettings; onPromptSettingsChange: (settings: ParticipantPromptSettings) => void;
}

function gestureMessage(status: ReturnTypeOfProgrammeRunner["gestureStatus"]): string {
  return status === "triggered" ? "READY ✓" : status === "holding" ? "HOLD YOUR ARM UP" : "RAISE YOUR RIGHT ARM WHEN READY";
}

export function ParticipantMode({ programme, exercises, runner, cameraStatus, poseQuality, poseFrame, videoRef, canvasRef, onStartCamera, onEndAndSave, onFinish, promptSettings, onPromptSettingsChange }: ParticipantModeProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const framingRef = useRef(new FramingGuidanceAssessor());
  const [fullscreenMessage, setFullscreenMessage] = useState<string | null>(null);
  const [exitConfirmation, setExitConfirmation] = useState(false);
  const [wasPaused, setWasPaused] = useState(false);
  const [guidance, setGuidance] = useState<FramingGuidance>("STEP INTO VIEW");
  const view = useMemo(() => createParticipantViewModel(runner.state, programme, exercises, runner.totalSets), [exercises, programme, runner.state, runner.totalSets]);
  const prompts = useParticipantPrompts(participantSpeechPrompt(view), promptSettings);
  const currentExercise = runner.currentExercise;
  const nextPrescription = programme.exercises[view.nextExerciseNumber - 1];
  const nextExercise = exercises.find((item) => item.id === nextPrescription?.exerciseId) ?? currentExercise;
  const displayedExercise = view.screen === "rest" ? nextExercise : currentExercise;

  useEffect(() => {
    setGuidance(framingRef.current.update(cameraStatus, poseFrame, poseQuality, poseFrame?.timestampMs ?? performance.now()));
  }, [cameraStatus, poseFrame, poseQuality]);

  const requestExit = () => { setWasPaused(runner.state.paused); runner.pauseForExit(); setExitConfirmation(true); };
  const continueSession = () => { setExitConfirmation(false); runner.continueAfterExit(wasPaused); };
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && !exitConfirmation) requestExit(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (exitConfirmation) return <div className="participant-mode participant-exit-confirmation" ref={rootRef}><main><h1>END THIS SESSION?</h1><p>Your progress will be saved.</p><div><button className="participant-secondary-action" onClick={continueSession}>CONTINUE SESSION</button><button className="participant-primary-action" onClick={() => { void exitParticipantFullscreen(document); onEndAndSave(); }}>END AND SAVE</button></div></main></div>;

  return <div className="participant-mode" ref={rootRef}>
    <header className="participant-mode__controls">
      <button onClick={() => void enterParticipantFullscreen(rootRef.current ?? {}).then((result) => setFullscreenMessage(result.message))}>ENTER FULL SCREEN</button>
      <button onClick={() => onPromptSettingsChange({ ...promptSettings, enabled: !promptSettings.enabled })} disabled={!prompts.available}>{!prompts.available ? "VOICE UNAVAILABLE" : promptSettings.enabled ? "MUTE VOICE" : "UNMUTE VOICE"}</button>
      {runner.state.phase !== "ready" && runner.state.phase !== "programme-complete" && (runner.state.paused ? <button onClick={runner.resume}>RESUME</button> : <button onClick={runner.pause}>PAUSE</button>)}
      <button className="participant-end-session" onClick={requestExit}>END SESSION</button>
    </header>
    {fullscreenMessage && <p className="participant-mode__notice">{fullscreenMessage}</p>}
    {view.screen !== "complete" && view.screen !== "idle" && <div className="participant-progress"><strong>SET {view.setNumber} OF {view.totalSets}</strong><span>EXERCISE {view.exerciseNumber} OF {view.exerciseCount}</span></div>}
    {view.screen !== "complete" && view.screen !== "idle" && displayedExercise && <main className="participant-split-screen">
      <section className="participant-media-panel participant-reference-panel" aria-label="Reference exercise video"><h2>FOLLOW THIS EXERCISE</h2><ReferenceVideo src={displayedExercise.referenceVideo} title={displayedExercise.name} active={view.screen === "exercising" && !runner.state.paused} loop muted showControls={false} /></section>
      <section className="participant-media-panel participant-live-panel" aria-label="Participant camera and pose"><h2>YOUR MOVEMENT</h2><LiveCameraSurface videoRef={videoRef} canvasRef={canvasRef} active={cameraStatus === "active"} />{cameraStatus !== "active" && <button className="participant-camera-start" onClick={onStartCamera}>START CAMERA</button>}<div className={`participant-framing participant-framing--${guidance === "FULL BODY VISIBLE" ? "good" : "warning"}`}>{guidance}</div></section>
      <div className="participant-split-status">
        {view.screen === "exercising" ? <><div className="participant-countdown">{view.exerciseSecondsRemaining}</div><p className="participant-instruction">{runner.state.paused ? "PAUSED" : "KEEP MOVING"}</p></> : view.screen === "ready" ? <><p className="participant-instruction">PERFORM FOR {view.durationSeconds} SECONDS</p><p className="participant-gesture">{gestureMessage(runner.gestureStatus)}</p><button className="participant-primary-action" onClick={runner.beginExercise}>START</button></> : <><p className="participant-next">NEXT: {view.nextExerciseName}</p><div className="participant-countdown">{view.restSecondsRemaining}</div><p className="participant-gesture">{gestureMessage(runner.gestureStatus)}</p><button className="participant-primary-action" onClick={runner.beginExercise}>CONTINUE NOW</button></>}
      </div>
    </main>}
    {view.screen === "complete" && <main className="participant-screen participant-complete-screen"><h1>PROGRAMME COMPLETE</h1><p>{view.totalSets} SETS COMPLETED</p><p>{view.exerciseCount * view.totalSets} EXERCISE INTERVALS COMPLETED</p><div><button className="participant-secondary-action" onClick={() => { void exitParticipantFullscreen(document); onFinish(); }}>FINISH AND SAVE</button><button className="participant-primary-action" onClick={runner.startAgain}>START AGAIN</button></div></main>}
  </div>;
}

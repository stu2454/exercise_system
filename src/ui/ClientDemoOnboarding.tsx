import { useEffect, useRef, useState, type RefObject } from "react";
import type { CameraState } from "../camera/cameraState";
import type { PoseFrame, PoseQuality } from "../pose/types";
import type { PoseEngineStatus } from "../pose/usePoseLandmarker";
import {
  TUTORIAL_MOVEMENTS,
  TutorialMovementDetector,
  onboardingGestureEnabled,
  type ClientDemoOnboardingStage,
} from "../clientDemo/onboardingFlow";
import { FramingGuidanceAssessor, type FramingGuidance } from "../programme/framingGuidance";
import { RightArmReadyGestureDetector, type ReadyGestureStatus } from "../programme/readyGesture";
import { LiveCameraSurface } from "./LiveCameraSurface";
import { ClientDemoLanding } from "./ClientDemoLanding";

interface ClientDemoOnboardingProps {
  stage: Exclude<ClientDemoOnboardingStage, "programme">;
  cameraState: CameraState;
  poseStatus: PoseEngineStatus;
  poseFrame: PoseFrame | null;
  poseQuality: PoseQuality;
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onNext: () => void;
  onEnableCamera: () => void;
  onStartProgramme: () => void;
  onCameraSurfaceReady: () => void;
}

const GUIDANCE_COPY: Record<FramingGuidance, string> = {
  "CAMERA STARTING": "Camera starting…",
  "CAMERA IS OFF": "Enable the camera when you're ready.",
  "STEP INTO VIEW": "Step into view.",
  "STEP BACK": "Move back a little so more of your body is visible.",
  "STEP FORWARD": "Move a little closer.",
  "MOVE LEFT": "Move slightly left.",
  "MOVE RIGHT": "Move slightly right.",
  "FULL BODY VISIBLE": "Great — we can see you clearly.",
  "TRACKING LOST": "Make sure your arms and feet are visible.",
};

function SetupProgress({ stage }: { stage: ClientDemoOnboardingStage }) {
  const active = stage === "welcome" || stage === "prepare-space" ? 0
    : stage === "camera-setup" || stage === "positioning" ? 1
      : stage.startsWith("tutorial-") ? 2 : 3;
  return <ol className="client-demo-setup-progress" aria-label="Setup progress">{["Setup", "Camera", "Try a movement", "Programme"].map((label, index) => <li key={label} aria-current={index === active ? "step" : undefined}>{label}</li>)}</ol>;
}

function CameraSurface({ cameraState, videoRef, canvasRef, message }: Pick<ClientDemoOnboardingProps, "cameraState" | "videoRef" | "canvasRef"> & { message: string }) {
  return <div className="client-demo-camera-card"><LiveCameraSurface videoRef={videoRef} canvasRef={canvasRef} active={cameraState.status === "active"} /><p className="client-demo-camera-feedback" role="status">{message}</p></div>;
}

export function ClientDemoOnboarding(props: ClientDemoOnboardingProps) {
  const { stage, cameraState, poseStatus, poseFrame, poseQuality, videoRef, canvasRef, onNext, onEnableCamera, onStartProgramme, onCameraSurfaceReady } = props;
  const framingRef = useRef(new FramingGuidanceAssessor());
  const tutorialRef = useRef(new TutorialMovementDetector());
  const continueGestureRef = useRef(new RightArmReadyGestureDetector());
  const [guidance, setGuidance] = useState<FramingGuidance>("STEP INTO VIEW");
  const [movementDetected, setMovementDetected] = useState(false);
  const [continueGestureStatus, setContinueGestureStatus] = useState<ReadyGestureStatus>("not-detected");

  useEffect(() => {
    if (stage !== "camera-setup") onCameraSurfaceReady();
  }, [onCameraSurfaceReady, stage]);

  useEffect(() => {
    if (stage === "positioning") {
      setGuidance(framingRef.current.update(cameraState.status, poseFrame, poseQuality, poseFrame?.timestampMs ?? performance.now()));
    }
  }, [cameraState.status, poseFrame, poseQuality, stage]);

  useEffect(() => {
    tutorialRef.current.reset(stage);
    continueGestureRef.current.reset(true);
    setMovementDetected(false);
    setContinueGestureStatus("not-detected");
  }, [stage]);

  useEffect(() => {
    if (!stage.startsWith("tutorial-") || movementDetected) return;
    setMovementDetected(tutorialRef.current.update(stage, poseFrame, poseQuality, poseFrame?.timestampMs ?? performance.now()));
  }, [movementDetected, poseFrame, poseQuality, stage]);

  const positioningSuccessful = guidance === "FULL BODY VISIBLE";
  const gestureEnabled = onboardingGestureEnabled(stage, positioningSuccessful, movementDetected);

  useEffect(() => {
    const result = continueGestureRef.current.update(
      poseFrame,
      poseQuality,
      poseFrame?.timestampMs ?? performance.now(),
      gestureEnabled,
    );
    setContinueGestureStatus(result.status);
    if (result.triggered) onNext();
  }, [gestureEnabled, onNext, poseFrame, poseQuality]);

  const gestureInstruction = continueGestureStatus === "holding"
    ? "Keep your right arm raised…"
    : "Raise your right arm and hold it up to continue.";

  if (stage === "welcome") return <div className="client-demo-onboarding"><SetupProgress stage={stage} /><ClientDemoLanding exerciseCount={9} onStart={onNext} /></div>;

  if (stage === "prepare-space") return <div className="client-demo-onboarding"><SetupProgress stage={stage} /><main className="client-demo-card"><p className="eyebrow">Before we begin</p><h1>Prepare Your Space</h1><ul><li><strong>Stable device</strong> — place it where the camera faces you.</li><li><strong>Good light</strong> — avoid bright light behind you.</li><li><strong>Step back</strong> — make room for your whole body.</li><li><strong>Clear the area</strong> — give your arms and legs space to move.</li></ul><p className="client-demo-safety"><strong>Stop if you feel unwell or uncomfortable.</strong></p><button className="participant-primary-action" onClick={onNext}>CONTINUE TO CAMERA</button></main></div>;

  if (stage === "camera-setup") {
    const failed = cameraState.status === "error";
    const message = failed ? cameraState.message : cameraState.status === "requesting" ? "Waiting for camera permission…" : "Your camera preview will appear here.";
    return <div className="client-demo-onboarding"><SetupProgress stage={stage} /><main className="client-demo-camera-layout"><div><p className="eyebrow">Camera</p><h1>{failed ? "Camera Access Needed" : "Camera Setup"}</h1><p className="client-demo-lead">{failed ? "Allow camera access in your browser settings, then try again." : "The camera lets you see and track your movement."}</p><p className="client-demo-privacy">Images stay on this device.</p></div><CameraSurface cameraState={cameraState} videoRef={videoRef} canvasRef={canvasRef} message={message} /><button className="participant-primary-action" onClick={onEnableCamera} disabled={cameraState.status === "requesting"}>{cameraState.status === "requesting" ? "STARTING CAMERA…" : failed ? "TRY AGAIN" : "ENABLE CAMERA"}</button></main></div>;
  }

  if (stage === "positioning") {
    const success = positioningSuccessful;
    const message = poseStatus === "error" ? "Movement tracking is unavailable. You can continue anyway." : GUIDANCE_COPY[guidance];
    return <div className="client-demo-onboarding"><SetupProgress stage={stage} /><main className="client-demo-camera-layout"><div><p className="eyebrow">Positioning check</p><h1>Position Yourself</h1><p className="client-demo-lead">Step back until your whole body is visible.</p>{success && <p className="client-demo-gesture-instruction">{gestureInstruction}</p>}</div><CameraSurface cameraState={cameraState} videoRef={videoRef} canvasRef={canvasRef} message={message} /><button className="participant-secondary-action" onClick={onNext}>{success ? "USE BUTTON INSTEAD" : "CONTINUE ANYWAY"}</button></main></div>;
  }

  if (stage.startsWith("tutorial-")) {
    const index = TUTORIAL_MOVEMENTS.findIndex((item) => item.stage === stage);
    const movement = TUTORIAL_MOVEMENTS[index];
    const instruction = stage === "tutorial-stand" ? "Stand comfortably facing the camera with your arms by your sides." : stage === "tutorial-arms" ? "Slowly raise both arms above your head, then lower them again." : "Take one comfortable step sideways, then return to the centre.";
    const feedback = movementDetected ? (stage === "tutorial-stand" ? "Great — you're in position." : "Great — movement detected.") : "Try the movement, or continue when you're ready.";
    return <div className="client-demo-onboarding"><SetupProgress stage={stage} /><main className="client-demo-camera-layout"><div><p className="eyebrow">Movement tutorial · {index + 1} of 3</p><h1>{index + 1} of 3 — {movement.title}</h1><p className="client-demo-lead">{instruction}</p>{movementDetected && <p className="client-demo-gesture-instruction">{gestureInstruction}</p>}</div><CameraSurface cameraState={cameraState} videoRef={videoRef} canvasRef={canvasRef} message={feedback} /><button className="participant-secondary-action" onClick={onNext}>{movementDetected ? "USE BUTTON INSTEAD" : "CONTINUE ANYWAY"}</button></main></div>;
  }

  return <div className="client-demo-onboarding"><SetupProgress stage={stage} /><main className="client-demo-camera-layout"><div><p className="eyebrow">Setup complete</p><h1>You&apos;re Ready</h1><p className="client-demo-lead">Nine exercises. Follow each video and move with the demonstration.</p></div><CameraSurface cameraState={cameraState} videoRef={videoRef} canvasRef={canvasRef} message="Ready when you are." /><button className="participant-primary-action" onClick={onStartProgramme}>START PROGRAMME</button></main></div>;
}
